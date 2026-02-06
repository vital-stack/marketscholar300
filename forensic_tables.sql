-- ============================================================================
-- FORENSIC ANALYSIS TABLES
-- Run this in Supabase SQL Editor to add L3 Forensic Audit tables
-- ============================================================================

-- ============================================================================
-- 1. SPATIAL DIVERGENCE MAP TABLE
-- Stores forensic audit results with quadrant mapping
-- ============================================================================

CREATE TABLE IF NOT EXISTS spatial_divergence_map (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    article_id UUID REFERENCES articles(id) ON DELETE SET NULL,
    ticker VARCHAR(10) NOT NULL,

    -- Spatial coordinates
    evidence_strength INTEGER CHECK (evidence_strength >= 0 AND evidence_strength <= 100),
    narrative_intensity INTEGER CHECK (narrative_intensity >= 0 AND narrative_intensity <= 100),

    -- Quadrant classification
    quadrant VARCHAR(20) CHECK (quadrant IN ('VALID_CATALYST', 'FACTUAL_ANCHOR', 'NARRATIVE_TRAP', 'MARKET_NOISE', 'UNKNOWN')),

    -- Forensic metrics
    epistemic_drift NUMERIC(5,2),
    vms_score NUMERIC(4,3),

    -- Analysis data
    hard_anchors JSONB,
    soft_narrative JSONB,
    verdict VARCHAR(20),
    audit_confidence NUMERIC(3,2),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_spatial_ticker ON spatial_divergence_map(ticker);
CREATE INDEX IF NOT EXISTS idx_spatial_quadrant ON spatial_divergence_map(quadrant);
CREATE INDEX IF NOT EXISTS idx_spatial_drift ON spatial_divergence_map(epistemic_drift DESC);
CREATE INDEX IF NOT EXISTS idx_spatial_article ON spatial_divergence_map(article_id);

-- Enable RLS
ALTER TABLE spatial_divergence_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage spatial_divergence" ON spatial_divergence_map FOR ALL USING (true);

-- ============================================================================
-- 2. TRENDING TICKERS TABLE
-- Stores daily discovered market movers with press audit
-- ============================================================================

CREATE TABLE IF NOT EXISTS trending_tickers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticker VARCHAR(10) NOT NULL,
    company_name VARCHAR(255),

    -- Price action
    price_change_pct NUMERIC(8,2),
    volume_spike NUMERIC(6,2),

    -- Catalyst info
    catalyst TEXT,

    -- Press audit results
    headline_count INTEGER,
    sentiment_avg INTEGER CHECK (sentiment_avg >= -100 AND sentiment_avg <= 100),
    epistemic_drift NUMERIC(5,2),
    evidence_strength INTEGER,
    narrative_intensity INTEGER,

    -- Classification
    verdict VARCHAR(30) CHECK (verdict IN ('VALID_CATALYST', 'NARRATIVE_TRAP', 'EARNINGS_DRIVEN', 'MARKET_CONTAGION', 'MANIPULATION_RISK', 'UNKNOWN')),
    reasoning TEXT,

    -- Discovery metadata
    discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    discovered_date DATE DEFAULT CURRENT_DATE,

    -- Unique per ticker per day
    UNIQUE(ticker, discovered_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trending_ticker ON trending_tickers(ticker);
CREATE INDEX IF NOT EXISTS idx_trending_discovered ON trending_tickers(discovered_at DESC);
CREATE INDEX IF NOT EXISTS idx_trending_verdict ON trending_tickers(verdict);
CREATE INDEX IF NOT EXISTS idx_trending_drift ON trending_tickers(epistemic_drift DESC);

-- Enable RLS
ALTER TABLE trending_tickers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage trending" ON trending_tickers FOR ALL USING (true);

-- ============================================================================
-- 3. UPDATE claim_verifications TABLE
-- Add forensic-specific columns
-- ============================================================================

ALTER TABLE claim_verifications ADD COLUMN IF NOT EXISTS epistemic_drift NUMERIC(5,2);
ALTER TABLE claim_verifications ADD COLUMN IF NOT EXISTS evidence_strength INTEGER;
ALTER TABLE claim_verifications ADD COLUMN IF NOT EXISTS narrative_intensity INTEGER;
ALTER TABLE claim_verifications ADD COLUMN IF NOT EXISTS hard_anchors JSONB;
ALTER TABLE claim_verifications ADD COLUMN IF NOT EXISTS used_grounding BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- 4. VIEWS FOR FORENSIC DASHBOARDS
-- ============================================================================

-- Narrative Traps View (high drift, low evidence)
CREATE OR REPLACE VIEW narrative_traps AS
SELECT
    sdm.ticker,
    a.title as article_title,
    sdm.evidence_strength,
    sdm.narrative_intensity,
    sdm.epistemic_drift,
    sdm.vms_score,
    sdm.verdict,
    sdm.created_at
FROM spatial_divergence_map sdm
LEFT JOIN articles a ON sdm.article_id = a.id
WHERE sdm.quadrant = 'NARRATIVE_TRAP'
  AND sdm.created_at > NOW() - INTERVAL '7 days'
ORDER BY sdm.epistemic_drift DESC;

-- Daily Trending Summary View
CREATE OR REPLACE VIEW trending_summary AS
SELECT
    DATE(discovered_at) as trend_date,
    COUNT(*) as total_trending,
    COUNT(CASE WHEN verdict = 'NARRATIVE_TRAP' THEN 1 END) as narrative_traps,
    COUNT(CASE WHEN verdict = 'VALID_CATALYST' THEN 1 END) as valid_catalysts,
    AVG(epistemic_drift) as avg_drift,
    AVG(ABS(price_change_pct)) as avg_volatility
FROM trending_tickers
WHERE discovered_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(discovered_at)
ORDER BY trend_date DESC;

-- Epistemic Drift Leaderboard
CREATE OR REPLACE VIEW epistemic_drift_leaderboard AS
SELECT
    ticker,
    COUNT(*) as audit_count,
    AVG(epistemic_drift) as avg_drift,
    MAX(epistemic_drift) as max_drift,
    AVG(vms_score) as avg_vms,
    COUNT(CASE WHEN quadrant = 'NARRATIVE_TRAP' THEN 1 END) as trap_count
FROM spatial_divergence_map
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY ticker
HAVING COUNT(*) >= 3
ORDER BY avg_drift DESC;

-- ============================================================================
-- DONE!
-- After running this:
-- 1. Enable Realtime on trending_tickers if desired
-- 2. Views are for querying/dashboards only
-- ============================================================================
