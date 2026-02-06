import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Fetch articles from Supabase
export async function getRecentArticles(limit = 20) {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

// Fetch trending tickers
export async function getTrendingTickers(limit = 10) {
  const { data, error } = await supabase
    .from('trending_tickers')
    .select('*')
    .order('discovered_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

// Fetch spatial divergence data (forensic audits)
export async function getSpatialDivergence(ticker?: string, limit = 20) {
  let query = supabase
    .from('spatial_divergence_map')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (ticker) {
    query = query.eq('ticker', ticker);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// Fetch narrative traps view
export async function getNarrativeTraps() {
  const { data, error } = await supabase
    .from('narrative_traps')
    .select('*');

  if (error) throw error;
  return data;
}

// Fetch ticker snapshots
export async function getTickerSnapshots(ticker?: string, limit = 30) {
  let query = supabase
    .from('ticker_snapshots')
    .select('*')
    .order('snapshot_date', { ascending: false })
    .limit(limit);

  if (ticker) {
    query = query.eq('ticker', ticker);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// Fetch daily stats
export async function getDailyStats(ticker?: string, days = 30) {
  let query = supabase
    .from('daily_stats')
    .select('*')
    .order('stat_date', { ascending: false })
    .limit(days);

  if (ticker) {
    query = query.eq('ticker', ticker);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// Fetch epistemic drift leaderboard
export async function getEpistemicDriftLeaderboard() {
  const { data, error } = await supabase
    .from('epistemic_drift_leaderboard')
    .select('*');

  if (error) throw error;
  return data;
}

// Fetch trending summary
export async function getTrendingSummary() {
  const { data, error } = await supabase
    .from('trending_summary')
    .select('*');

  if (error) throw error;
  return data;
}

// =============================================================================
// Physics Engine Queries
// =============================================================================

// Fetch narrative with decay metrics for a ticker
export async function getNarrativeWithDecay(ticker: string) {
  const { data, error } = await supabase
    .from('narratives')
    .select(`
      *,
      narrative_decay_metrics (*)
    `)
    .eq('ticker', ticker)
    .in('status', ['ACTIVE', 'PENDING', 'EXHAUSTED'])
    .order('genesis_date', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// Fetch narrative snapshots for NPI curve
export async function getNarrativeSnapshots(
  narrativeId: string,
  days: number = 60
) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const { data, error } = await supabase
    .from('narrative_snapshots')
    .select('*')
    .eq('narrative_id', narrativeId)
    .gte('snapshot_date', cutoff)
    .order('snapshot_date', { ascending: true });

  if (error) throw error;
  return data;
}

// Fetch price history from ticker_snapshots
export async function getTickerPriceHistory(
  ticker: string,
  days: number = 60
) {
  const { data, error } = await supabase
    .from('ticker_snapshots')
    .select('*')
    .eq('ticker', ticker)
    .order('snapshot_date', { ascending: true })
    .limit(days);

  if (error) throw error;
  return data;
}

// Fetch articles for event track
export async function getArticlesForEventTrack(
  ticker: string,
  days: number = 60
) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('articles')
    .select('id, ticker, title, author, publication_name, initial_sentiment, published_at')
    .eq('ticker', ticker)
    .gte('published_at', cutoff)
    .order('published_at', { ascending: true })
    .limit(100);

  if (error) throw error;
  return data;
}

// Fetch analyst scores for credibility weighting
export async function getAnalystScoresForTicker(ticker: string) {
  const { data, error } = await supabase
    .from('analyst_scores')
    .select('*')
    .eq('ticker', ticker)
    .order('last_updated', { ascending: false })
    .limit(10);

  if (error) throw error;
  return data;
}

// Fetch spatial divergence for VMS anchor
export async function getSpatialDivergenceForTicker(ticker: string) {
  const { data, error } = await supabase
    .from('spatial_divergence_map')
    .select('*')
    .eq('ticker', ticker)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) throw error;
  return data;
}
