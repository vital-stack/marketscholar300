import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type {
  UnifiedPhysicsState,
  UnifiedPhysicsPoint,
  CatalystEvent,
  PhysicsEvent,
} from '../../../lib/physics/types';
import { computeNPI, computeNPINormalized, computeDecayCurveParams, timeToExhaustion } from '../../../lib/physics/npi-calculator';
import { processPhysicsPoints, THRESHOLD_PRESETS } from '../../../lib/physics/regime-engine';
import { estimateLambda } from '../../../lib/physics/npi-calculator';
import { fetchLunarCrushPhysicsData } from '../../../lib/lunarcrush';
import { generateMockPhysicsState } from '../../../lib/physics/mock-data';

// =============================================================================
// Supabase client (server-side with service role)
// =============================================================================

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(url, key);
}

// =============================================================================
// Company name lookup
// =============================================================================

const COMPANY_NAMES: Record<string, string> = {
  NVDA: 'NVIDIA Corporation', TSLA: 'Tesla, Inc.', AAPL: 'Apple Inc.',
  MSFT: 'Microsoft Corporation', GOOGL: 'Alphabet Inc.', META: 'Meta Platforms, Inc.',
  AMZN: 'Amazon.com, Inc.', AMD: 'Advanced Micro Devices', RDDT: 'Reddit, Inc.',
  NFLX: 'Netflix, Inc.', COIN: 'Coinbase Global', AVGO: 'Broadcom Inc.',
  CRM: 'Salesforce, Inc.', UBER: 'Uber Technologies', JPM: 'JPMorgan Chase',
};

// =============================================================================
// GET /api/physics?ticker=NVDA&sensitivity=balanced&days=60
// =============================================================================

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = (searchParams.get('ticker') || 'NVDA').toUpperCase();
  const sensitivity = (searchParams.get('sensitivity') || 'balanced') as 'conservative' | 'balanced' | 'aggressive';
  const days = parseInt(searchParams.get('days') || '60', 10);
  const useMock = searchParams.get('mock') === 'true';
  const includeLunarCrush = searchParams.get('lunarcrush') !== 'false';

  try {
    // If mock mode or no Supabase configured, return mock data
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (useMock || !supabaseUrl) {
      const mockState = generateMockPhysicsState(ticker, { days, sensitivity });

      // Optionally enrich with LunarCrush
      let lunarCrush = null;
      if (includeLunarCrush) {
        try {
          lunarCrush = await fetchLunarCrushPhysicsData(ticker);
        } catch {
          // LunarCrush is optional
        }
      }

      return NextResponse.json({
        ...mockState,
        lunarCrush,
        dataSource: 'mock',
      });
    }

    const supabase = getSupabase();
    const thresholds = THRESHOLD_PRESETS[sensitivity];

    // Fetch data in parallel
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const [
      narrativesResult,
      snapshotsResult,
      tickerDataResult,
      articlesResult,
      decayMetricsResult,
    ] = await Promise.all([
      supabase
        .from('narratives')
        .select('*')
        .eq('ticker', ticker)
        .in('status', ['ACTIVE', 'PENDING', 'EXHAUSTED'])
        .order('genesis_date', { ascending: false })
        .limit(1),

      supabase
        .from('narrative_snapshots')
        .select('*')
        .gte('snapshot_date', cutoffDate.split('T')[0])
        .order('snapshot_date', { ascending: true }),

      supabase
        .from('ticker_snapshots')
        .select('*')
        .eq('ticker', ticker)
        .order('snapshot_date', { ascending: false })
        .limit(days),

      supabase
        .from('articles')
        .select('id, ticker, title, author, publication_name, initial_sentiment, published_at')
        .eq('ticker', ticker)
        .gte('published_at', cutoffDate)
        .order('published_at', { ascending: true })
        .limit(100),

      supabase
        .from('narrative_decay_metrics')
        .select('*')
        .order('last_calculated', { ascending: false })
        .limit(5),
    ]);

    const narrative = narrativesResult.data?.[0];
    const snapshots = snapshotsResult.data || [];
    const tickerData = (tickerDataResult.data || []).reverse();
    const articles = articlesResult.data || [];
    const decayMetrics = decayMetricsResult.data?.[0];

    // Compute decay parameters
    let e0 = 85;
    let lambda = 0.08;

    if (narrative && decayMetrics) {
      e0 = Math.abs(narrative.initial_sentiment || 85);
      if (decayMetrics.half_life_days && decayMetrics.half_life_days > 0) {
        lambda = Math.LN2 / decayMetrics.half_life_days;
      } else if (narrative.initial_sentiment && narrative.current_sentiment && narrative.days_elapsed) {
        lambda = estimateLambda(
          Math.abs(narrative.initial_sentiment),
          Math.abs(narrative.current_sentiment),
          narrative.days_elapsed
        );
      }
    }

    const catalystTs = narrative
      ? new Date(narrative.genesis_date).getTime()
      : Date.now() - days * 24 * 60 * 60 * 1000;

    const catalyst: CatalystEvent = {
      timestamp: catalystTs,
      e0,
      lambda,
      headline: narrative?.narrative_text || `${ticker} dominant narrative`,
      sourceDensity: articles.length,
      ticker,
    };

    const decayCurve = computeDecayCurveParams(catalyst);

    // Compute anchor price from ticker data
    const latestTickerData = tickerData[tickerData.length - 1];
    let anchorPrice = 0;
    if (latestTickerData) {
      const eps = latestTickerData.eps_trailing || 1;
      const fairPE = 17;
      anchorPrice = eps * fairPE;
      if (anchorPrice <= 0 && latestTickerData.current_price) {
        anchorPrice = latestTickerData.current_price * 0.85;
      }
    }

    // Build article events map
    const articleEvents = new Map<string, PhysicsEvent[]>();
    for (const article of articles) {
      const dateKey = new Date(article.published_at).toISOString().split('T')[0];
      const existing = articleEvents.get(dateKey) || [];
      existing.push({
        type: 'headline',
        title: article.title || 'Untitled',
        source: article.publication_name || 'Unknown',
        sentiment: article.initial_sentiment || 0,
      });
      articleEvents.set(dateKey, existing);
    }

    // Build physics points from ticker data
    const rawPoints: UnifiedPhysicsPoint[] = tickerData.map((td: any) => {
      const ts = new Date(td.snapshot_date).getTime();
      const price = td.current_price || 0;
      const npi = computeNPI(ts, catalyst);
      const npiNorm = computeNPINormalized(ts, catalyst);
      const dateKey = td.snapshot_date;

      return {
        ts,
        price,
        candle: td.full_data?.open ? {
          o: td.full_data.open,
          h: td.full_data.high || price * 1.01,
          l: td.full_data.low || price * 0.99,
          c: price,
        } : undefined,
        anchor: anchorPrice,
        npi,
        npiNorm,
        lambda: catalyst.lambda,
        e0: catalyst.e0,
        regime: 'momentum' as const,
        supportFailureScore: 0,
        severity: 'none' as const,
        volume: td.volume || 0,
        events: articleEvents.get(dateKey),
      };
    });

    // Process through regime engine
    const processedPoints = processPhysicsPoints(rawPoints, thresholds);

    // Fetch LunarCrush data
    let lunarCrush = null;
    if (includeLunarCrush) {
      try {
        lunarCrush = await fetchLunarCrushPhysicsData(ticker);
      } catch {
        // LunarCrush is optional enrichment
      }
    }

    // Build final state
    const latest = processedPoints[processedPoints.length - 1];
    const currentNpi = latest ? computeNPI(Date.now(), catalyst) : 0;
    const currentNpiNorm = latest ? computeNPINormalized(Date.now(), catalyst) : 0;

    const state: UnifiedPhysicsState & { lunarCrush: any; dataSource: string } = {
      ticker,
      companyName: COMPANY_NAMES[ticker] || narrative?.ticker || ticker,
      points: processedPoints,
      catalyst,
      decayCurve,
      thresholds,
      anchorMeta: {
        source: 'Supabase ticker_snapshots + decay_engine',
        lastUpdated: latestTickerData ? new Date(latestTickerData.snapshot_date).getTime() : Date.now(),
        eps: latestTickerData?.eps_trailing,
        fairValuePE: 17,
        revenueGrowth: latestTickerData?.revenue_growth,
      },
      metrics: {
        currentPrice: latest?.price || 0,
        currentNpi,
        currentNpiNorm,
        currentRegime: latest?.regime || 'momentum',
        currentSeverity: latest?.severity || 'none',
        supportFailureScore: latest?.supportFailureScore || 0,
        deviationFromAnchor: anchorPrice > 0 ? ((latest?.price || 0) - anchorPrice) / anchorPrice : 0,
        timeToExhaustionHrs: timeToExhaustion(Date.now(), decayCurve),
        halfLifeDays: decayCurve.halfLife,
        energyRemainingPct: currentNpiNorm * 100,
      },
      lunarCrush,
      dataSource: 'supabase',
    };

    return NextResponse.json(state);
  } catch (error) {
    console.error('Physics API error:', error);

    // Fallback to mock data on error
    const mockState = generateMockPhysicsState(ticker, { days, sensitivity });
    return NextResponse.json({
      ...mockState,
      lunarCrush: null,
      dataSource: 'mock-fallback',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
