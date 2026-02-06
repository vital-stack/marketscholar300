// =============================================================================
// LunarCrush API Integration
// Social intelligence layer for MarketScholar Narrative Physics
// =============================================================================

const LUNARCRUSH_API_BASE = 'https://lunarcrush.com/api4/public';

/**
 * LunarCrush coin/token data point
 */
export interface LunarCrushAsset {
  id: number;
  symbol: string;
  name: string;
  price: number;
  price_btc?: number;
  volume_24h?: number;
  market_cap?: number;
  percent_change_24h?: number;
  percent_change_7d?: number;
  percent_change_30d?: number;
  galaxy_score?: number;
  alt_rank?: number;
  social_volume?: number;
  social_score?: number;
  social_contributors?: number;
  social_dominance?: number;
  market_dominance?: number;
  sentiment?: number;
  spam?: number;
  categories?: string;
  close?: number;
  interactions_24h?: number;
  social_volume_24h?: number;
}

/**
 * LunarCrush time series data point
 */
export interface LunarCrushTimeSeries {
  time: number;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  market_cap: number;
  galaxy_score: number;
  alt_rank: number;
  sentiment: number;
  social_volume: number;
  social_score: number;
  social_contributors: number;
  social_dominance: number;
  url_shares: number;
  tweets: number;
  reddit_posts: number;
  news: number;
  medium: number;
  youtube: number;
  spam: number;
}

/**
 * LunarCrush social feed post
 */
export interface LunarCrushPost {
  id: string;
  post_type: string;
  post_title?: string;
  body?: string;
  sentiment?: number;
  social_score?: number;
  time: number;
  url?: string;
  source?: string;
  creator_name?: string;
  creator_followers?: number;
  interactions_total?: number;
}

/**
 * LunarCrush topic/category metrics
 */
export interface LunarCrushTopic {
  topic: string;
  title: string;
  social_volume: number;
  social_score: number;
  sentiment: number;
  galaxy_score: number;
  interactions: number;
  contributors: number;
  trend: 'rising' | 'stable' | 'falling';
}

/**
 * Processed LunarCrush data for the Unified Physics Engine
 */
export interface LunarCrushPhysicsData {
  ticker: string;
  galaxyScore: number;
  altRank: number;
  socialVolume24h: number;
  socialScore: number;
  socialDominance: number;
  sentiment: number; // -100 to +100 normalized
  contributors: number;
  interactions24h: number;
  spamScore: number;
  timeSeries: LunarCrushTimeSeries[];
  topPosts: LunarCrushPost[];
  /** Social NPI: narrative pressure derived from social data */
  socialNpi: number;
  /** Social NPI trend */
  socialNpiTrend: 'accelerating' | 'stable' | 'decaying';
}

// =============================================================================
// API Client
// =============================================================================

class LunarCrushClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.LUNARCRUSH_API_KEY || process.env.NEXT_PUBLIC_LUNARCRUSH_API_KEY || '';
    this.baseUrl = LUNARCRUSH_API_BASE;
  }

  private async fetch<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}/${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(url.toString(), {
      headers,
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      throw new Error(`LunarCrush API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get current metrics for a coin/stock
   */
  async getAsset(symbol: string): Promise<LunarCrushAsset | null> {
    try {
      const data = await this.fetch<{ data: LunarCrushAsset[] }>('coins/list', {
        sort: 'galaxy_score',
        limit: '1',
        search: symbol,
      });
      return data?.data?.[0] || null;
    } catch (err) {
      console.error(`LunarCrush getAsset error for ${symbol}:`, err);
      return null;
    }
  }

  /**
   * Get time series data for a coin/stock
   */
  async getTimeSeries(
    symbol: string,
    interval: 'hour' | 'day' | 'week' = 'day',
    limit: number = 60
  ): Promise<LunarCrushTimeSeries[]> {
    try {
      const data = await this.fetch<{ data: LunarCrushTimeSeries[] }>(`coins/${symbol}/time-series/v1`, {
        interval,
        limit: String(limit),
      });
      return data?.data || [];
    } catch (err) {
      console.error(`LunarCrush getTimeSeries error for ${symbol}:`, err);
      return [];
    }
  }

  /**
   * Get social feed posts for a coin/stock
   */
  async getSocialFeed(
    symbol: string,
    limit: number = 20
  ): Promise<LunarCrushPost[]> {
    try {
      const data = await this.fetch<{ data: LunarCrushPost[] }>(`coins/${symbol}/feeds/v1`, {
        limit: String(limit),
        sort: 'interactions_total',
      });
      return data?.data || [];
    } catch (err) {
      console.error(`LunarCrush getSocialFeed error for ${symbol}:`, err);
      return [];
    }
  }

  /**
   * Get trending topics related to a coin
   */
  async getTrendingTopics(limit: number = 10): Promise<LunarCrushTopic[]> {
    try {
      const data = await this.fetch<{ data: LunarCrushTopic[] }>('topics/list', {
        sort: 'social_score',
        limit: String(limit),
      });
      return data?.data || [];
    } catch (err) {
      console.error('LunarCrush getTrendingTopics error:', err);
      return [];
    }
  }

  /**
   * Get market-wide overview for top coins
   */
  async getMarketOverview(limit: number = 50): Promise<LunarCrushAsset[]> {
    try {
      const data = await this.fetch<{ data: LunarCrushAsset[] }>('coins/list', {
        sort: 'galaxy_score',
        limit: String(limit),
      });
      return data?.data || [];
    } catch (err) {
      console.error('LunarCrush getMarketOverview error:', err);
      return [];
    }
  }
}

// =============================================================================
// Data Processing for Physics Engine
// =============================================================================

/**
 * Compute Social NPI from LunarCrush metrics.
 *
 * Social NPI is a narrative pressure metric derived from:
 * - Galaxy Score (0-100): overall social health
 * - Social Volume trends: press velocity equivalent
 * - Sentiment shifts: direction of narrative
 * - Contributor diversity: source density
 *
 * Formula: socialNPI = (galaxyScore * 0.3 + sentimentNorm * 0.25 +
 *                       socialVolumeNorm * 0.25 + contributorDiversityNorm * 0.2)
 */
export function computeSocialNPI(asset: LunarCrushAsset): number {
  const galaxyComponent = (asset.galaxy_score || 0) * 0.3;

  // Normalize sentiment from LunarCrush scale to 0-100
  const rawSentiment = asset.sentiment || 50;
  const sentimentNorm = Math.min(100, Math.max(0, rawSentiment)) * 0.25;

  // Social volume normalized (log scale since it varies wildly)
  const socialVol = asset.social_volume_24h || asset.social_volume || 0;
  const socialVolumeNorm = Math.min(100, Math.log10(socialVol + 1) * 15) * 0.25;

  // Contributor diversity (more contributors = stronger signal)
  const contributors = asset.social_contributors || 0;
  const contributorNorm = Math.min(100, Math.log10(contributors + 1) * 20) * 0.20;

  return Math.min(100, galaxyComponent + sentimentNorm + socialVolumeNorm + contributorNorm);
}

/**
 * Determine social NPI trend from time series data.
 */
export function computeSocialNPITrend(
  timeSeries: LunarCrushTimeSeries[]
): 'accelerating' | 'stable' | 'decaying' {
  if (timeSeries.length < 3) return 'stable';

  const recent = timeSeries.slice(-3);
  const older = timeSeries.slice(-7, -3);

  const recentAvg = recent.reduce((sum, d) => sum + (d.social_score || 0), 0) / recent.length;
  const olderAvg = older.length > 0
    ? older.reduce((sum, d) => sum + (d.social_score || 0), 0) / older.length
    : recentAvg;

  const change = olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0;

  if (change > 0.15) return 'accelerating';
  if (change < -0.15) return 'decaying';
  return 'stable';
}

/**
 * Fetch and process LunarCrush data for the Unified Physics Engine.
 */
export async function fetchLunarCrushPhysicsData(
  symbol: string,
  apiKey?: string
): Promise<LunarCrushPhysicsData | null> {
  const client = new LunarCrushClient(apiKey);

  try {
    // Fetch all data in parallel
    const [asset, timeSeries, topPosts] = await Promise.all([
      client.getAsset(symbol),
      client.getTimeSeries(symbol, 'day', 60),
      client.getSocialFeed(symbol, 20),
    ]);

    if (!asset) return null;

    const socialNpi = computeSocialNPI(asset);
    const socialNpiTrend = computeSocialNPITrend(timeSeries);

    // Normalize sentiment to -100 to +100 scale
    const normalizedSentiment = ((asset.sentiment || 50) - 50) * 2;

    return {
      ticker: symbol,
      galaxyScore: asset.galaxy_score || 0,
      altRank: asset.alt_rank || 0,
      socialVolume24h: asset.social_volume_24h || asset.social_volume || 0,
      socialScore: asset.social_score || 0,
      socialDominance: asset.social_dominance || 0,
      sentiment: normalizedSentiment,
      contributors: asset.social_contributors || 0,
      interactions24h: asset.interactions_24h || 0,
      spamScore: asset.spam || 0,
      timeSeries,
      topPosts,
      socialNpi,
      socialNpiTrend,
    };
  } catch (err) {
    console.error(`Failed to fetch LunarCrush data for ${symbol}:`, err);
    return null;
  }
}

// =============================================================================
// Export client for direct use
// =============================================================================

export { LunarCrushClient };
export default LunarCrushClient;
