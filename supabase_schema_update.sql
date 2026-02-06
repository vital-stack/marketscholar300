-- ============================================================================
-- MARKETSCHOLAR SUPABASE SCHEMA UPDATE
-- Run this in Supabase SQL Editor to add Gemini Grounding + fix Realtime issues
-- ============================================================================

-- ============================================================================
-- 1. GROUNDING CITATIONS TABLE (for Gemini Google Search)
-- ============================================================================

CREATE TABLE IF NOT EXISTS grounding_citations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticker VARCHAR(10) NOT NULL,
    source_url TEXT NOT NULL,
    source_title TEXT,
    source_domain VARCHAR(255),
    grounding_source VARCHAR(50) DEFAULT 'gemini_google_search',
    citation_index INTEGER DEFAULT 0,
    retrieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    context_snippet TEXT,
    article_id UUID REFERENCES articles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Prevent duplicate citations for same URL and ticker
    UNIQUE(source_url, ticker)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_grounding_citations_ticker ON grounding_citations(ticker);
CREATE INDEX IF NOT EXISTS idx_grounding_citations_retrieved ON grounding_citations(retrieved_at);
CREATE INDEX IF NOT EXISTS idx_grounding_citations_domain ON grounding_citations(source_domain);

-- Enable RLS
ALTER TABLE grounding_citations ENABLE ROW LEVEL SECURITY;

-- Policy for service role access
DROP POLICY IF EXISTS "Service role can manage citations" ON grounding_citations;
CREATE POLICY "Service role can manage citations" ON grounding_citations
    FOR ALL USING (true);

COMMENT ON TABLE grounding_citations IS 'Stores citations from Gemini Grounding with Google Search for source attribution';

-- ============================================================================
-- 2. FIX daily_stats: Convert VIEW to MATERIALIZED TABLE
--
-- PROBLEM: Views cannot have Realtime enabled in Supabase
-- SOLUTION: Create a physical table that we refresh periodically
-- ============================================================================

-- First, check if daily_stats is a view and drop it
DROP VIEW IF EXISTS daily_stats CASCADE;

-- Create the table version
CREATE TABLE IF NOT EXISTS daily_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    stat_date DATE NOT NULL DEFAULT CURRENT_DATE,
    ticker VARCHAR(10) NOT NULL,

    -- Article stats
    articles_count INTEGER DEFAULT 0,
    avg_sentiment NUMERIC(5,2) DEFAULT 0,
    min_sentiment INTEGER DEFAULT 0,
    max_sentiment INTEGER DEFAULT 0,

    -- Narrative stats
    active_narratives INTEGER DEFAULT 0,
    avg_decay_rate NUMERIC(5,2) DEFAULT 0,
    narratives_exhausted INTEGER DEFAULT 0,

    -- Market data
    price_open NUMERIC(12,2),
    price_close NUMERIC(12,2),
    price_change_pct NUMERIC(8,4),
    volume BIGINT,

    -- Analyst stats
    analyst_calls_count INTEGER DEFAULT 0,
    avg_credibility_score NUMERIC(5,2),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique constraint for date + ticker
    UNIQUE(stat_date, ticker)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(stat_date);
CREATE INDEX IF NOT EXISTS idx_daily_stats_ticker ON daily_stats(ticker);
CREATE INDEX IF NOT EXISTS idx_daily_stats_date_ticker ON daily_stats(stat_date, ticker);

-- Enable RLS
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;

-- Policy
DROP POLICY IF EXISTS "Service role can manage daily_stats" ON daily_stats;
CREATE POLICY "Service role can manage daily_stats" ON daily_stats
    FOR ALL USING (true);

-- Now you CAN enable Realtime on this table!
-- Go to Supabase Dashboard > Database > Replication and enable for daily_stats

-- ============================================================================
-- 3. FUNCTION TO REFRESH daily_stats
-- Call this after each scraper run or on a schedule
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_daily_stats(target_date DATE DEFAULT CURRENT_DATE)
RETURNS void AS $$
DECLARE
    t RECORD;
BEGIN
    -- Loop through all tickers with activity today
    FOR t IN
        SELECT DISTINCT ticker FROM articles
        WHERE DATE(published_at) = target_date
        UNION
        SELECT DISTINCT ticker FROM narratives
        WHERE DATE(updated_at) = target_date
    LOOP
        INSERT INTO daily_stats (
            stat_date,
            ticker,
            articles_count,
            avg_sentiment,
            min_sentiment,
            max_sentiment,
            active_narratives,
            avg_decay_rate,
            narratives_exhausted,
            analyst_calls_count,
            avg_credibility_score,
            updated_at
        )
        SELECT
            target_date,
            t.ticker,
            -- Article stats
            COALESCE((
                SELECT COUNT(*) FROM articles
                WHERE ticker = t.ticker AND DATE(published_at) = target_date
            ), 0),
            COALESCE((
                SELECT AVG(initial_sentiment) FROM articles
                WHERE ticker = t.ticker AND DATE(published_at) = target_date
            ), 0),
            COALESCE((
                SELECT MIN(initial_sentiment) FROM articles
                WHERE ticker = t.ticker AND DATE(published_at) = target_date
            ), 0),
            COALESCE((
                SELECT MAX(initial_sentiment) FROM articles
                WHERE ticker = t.ticker AND DATE(published_at) = target_date
            ), 0),
            -- Narrative stats
            COALESCE((
                SELECT COUNT(*) FROM narratives
                WHERE ticker = t.ticker AND status = 'ACTIVE'
            ), 0),
            COALESCE((
                SELECT AVG(ndm.decay_rate)
                FROM narrative_decay_metrics ndm
                JOIN narratives n ON n.id = ndm.narrative_id
                WHERE n.ticker = t.ticker
            ), 0),
            COALESCE((
                SELECT COUNT(*) FROM narratives
                WHERE ticker = t.ticker AND status = 'EXHAUSTED'
            ), 0),
            -- Analyst stats
            COALESCE((
                SELECT COUNT(*) FROM analyst_calls
                WHERE ticker = t.ticker AND DATE(call_date) = target_date
            ), 0),
            COALESCE((
                SELECT AVG(credibility_score) FROM analyst_scores
                WHERE ticker = t.ticker
            ), 50),
            NOW()
        ON CONFLICT (stat_date, ticker)
        DO UPDATE SET
            articles_count = EXCLUDED.articles_count,
            avg_sentiment = EXCLUDED.avg_sentiment,
            min_sentiment = EXCLUDED.min_sentiment,
            max_sentiment = EXCLUDED.max_sentiment,
            active_narratives = EXCLUDED.active_narratives,
            avg_decay_rate = EXCLUDED.avg_decay_rate,
            narratives_exhausted = EXCLUDED.narratives_exhausted,
            analyst_calls_count = EXCLUDED.analyst_calls_count,
            avg_credibility_score = EXCLUDED.avg_credibility_score,
            updated_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. ENABLE REALTIME ON TABLES (run these one at a time if needed)
-- ============================================================================

-- These are the tables you can safely enable Realtime on:
-- (Run in Supabase Dashboard > Database > Replication)

-- Core tables that support Realtime:
-- ✓ articles
-- ✓ narratives
-- ✓ narrative_snapshots (or narrative_daily_snapshots)
-- ✓ analysts
-- ✓ analyst_calls
-- ✓ analyst_scores
-- ✓ daily_stats (NOW that it's a table, not a view!)
-- ✓ grounding_citations

-- ============================================================================
-- 5. TRIGGER TO AUTO-REFRESH daily_stats
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_refresh_daily_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Refresh stats for the affected ticker
    PERFORM refresh_daily_stats(CURRENT_DATE);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on articles insert
DROP TRIGGER IF EXISTS articles_refresh_daily_stats ON articles;
CREATE TRIGGER articles_refresh_daily_stats
    AFTER INSERT ON articles
    FOR EACH ROW
    EXECUTE FUNCTION trigger_refresh_daily_stats();

-- ============================================================================
-- 6. VERIFY TABLES ARE READY FOR REALTIME
-- ============================================================================

-- Run this to check which tables can have Realtime enabled:
SELECT
    schemaname,
    tablename,
    CASE
        WHEN tablename IN ('articles', 'narratives', 'analysts', 'analyst_calls',
                          'analyst_scores', 'daily_stats', 'grounding_citations',
                          'narrative_snapshots', 'narrative_daily_snapshots')
        THEN '✓ Ready for Realtime'
        ELSE '○ Check if needed'
    END as realtime_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================================
-- 7. TICKER SNAPSHOTS TABLE (Live Market Data)
-- Stores daily snapshots with earnings dates, analyst targets, financials
-- ============================================================================

CREATE TABLE IF NOT EXISTS ticker_snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticker VARCHAR(10) NOT NULL,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Price data
    current_price NUMERIC(12,2),
    price_change_pct NUMERIC(8,4),
    volume BIGINT,
    market_cap BIGINT,

    -- Valuation
    pe_ratio NUMERIC(10,2),
    eps_trailing NUMERIC(10,2),
    forward_pe NUMERIC(10,2),

    -- Earnings calendar
    next_earnings_date TEXT,
    last_earnings_date TEXT,
    last_earnings_surprise_pct NUMERIC(8,2),

    -- Analyst data
    analyst_target_high NUMERIC(12,2),
    analyst_target_low NUMERIC(12,2),
    analyst_target_mean NUMERIC(12,2),
    analyst_recommendation VARCHAR(20),
    num_analysts INTEGER,

    -- Financials
    revenue_growth NUMERIC(8,4),
    earnings_growth NUMERIC(8,4),
    profit_margin NUMERIC(8,4),
    gross_margin NUMERIC(8,4),
    debt_to_equity NUMERIC(10,2),
    free_cash_flow BIGINT,

    -- 52-week data
    fifty_two_week_high NUMERIC(12,2),
    fifty_two_week_low NUMERIC(12,2),
    fifty_day_avg NUMERIC(12,2),
    two_hundred_day_avg NUMERIC(12,2),

    -- Full JSON data (all yfinance data)
    full_data JSONB,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(ticker, snapshot_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ticker_snapshots_ticker ON ticker_snapshots(ticker);
CREATE INDEX IF NOT EXISTS idx_ticker_snapshots_date ON ticker_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_ticker_snapshots_earnings ON ticker_snapshots(next_earnings_date);
CREATE INDEX IF NOT EXISTS idx_ticker_snapshots_ticker_date ON ticker_snapshots(ticker, snapshot_date DESC);

-- Enable RLS
ALTER TABLE ticker_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage ticker_snapshots" ON ticker_snapshots;
CREATE POLICY "Service role can manage ticker_snapshots" ON ticker_snapshots
    FOR ALL USING (true);

COMMENT ON TABLE ticker_snapshots IS 'Daily snapshots of live market data including earnings dates and analyst targets';

-- ============================================================================
-- 8. UPCOMING EARNINGS VIEW (for dashboard display)
-- ============================================================================

CREATE OR REPLACE VIEW upcoming_earnings AS
SELECT
    ticker,
    next_earnings_date,
    current_price,
    analyst_target_mean,
    analyst_recommendation,
    num_analysts,
    CASE
        WHEN analyst_target_mean IS NOT NULL AND current_price > 0
        THEN ROUND(((analyst_target_mean - current_price) / current_price * 100)::numeric, 2)
        ELSE NULL
    END as upside_pct,
    snapshot_date,
    updated_at
FROM ticker_snapshots
WHERE next_earnings_date IS NOT NULL
  AND snapshot_date = CURRENT_DATE
ORDER BY next_earnings_date;

-- ============================================================================
-- 9. TICKER PERFORMANCE SUMMARY VIEW
-- ============================================================================

CREATE OR REPLACE VIEW ticker_performance AS
SELECT
    ts.ticker,
    ts.current_price,
    ts.price_change_pct as daily_change,
    ts.volume,
    ts.market_cap,
    ts.pe_ratio,
    ts.next_earnings_date,
    ts.analyst_target_mean,
    ts.analyst_recommendation,
    ts.revenue_growth,
    ts.profit_margin,
    -- Recent narrative sentiment
    (SELECT AVG(initial_sentiment) FROM articles a
     WHERE a.ticker = ts.ticker
     AND a.published_at > NOW() - INTERVAL '7 days') as avg_sentiment_7d,
    -- Active narratives count
    (SELECT COUNT(*) FROM narratives n
     WHERE n.ticker = ts.ticker AND n.status = 'ACTIVE') as active_narratives,
    ts.updated_at
FROM ticker_snapshots ts
WHERE ts.snapshot_date = CURRENT_DATE;

-- ============================================================================
-- DONE!
--
-- After running this:
-- 1. Go to Supabase Dashboard > Database > Replication
-- 2. Enable Realtime for the tables you need:
--    - ticker_snapshots (for live price updates)
--    - daily_stats
--    - articles
--    - narratives
-- 3. Views (upcoming_earnings, ticker_performance) are for querying only
-- ============================================================================
