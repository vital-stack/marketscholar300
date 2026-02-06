// =============================================================================
// MarketScholar Mock Data Generator
// Generates realistic physics data for development and demo
// =============================================================================

import type {
  UnifiedPhysicsPoint,
  UnifiedPhysicsState,
  CatalystEvent,
  CandleData,
  PhysicsEvent,
  RegimeThresholds,
} from './types';
import { computeNPI, computeNPINormalized, computeDecayCurveParams, timeToExhaustion } from './npi-calculator';
import { processPhysicsPoints, THRESHOLD_PRESETS } from './regime-engine';

/**
 * Generate realistic OHLC candle data with some volatility.
 */
function generateCandle(basePrice: number, volatility: number = 0.02): CandleData {
  const change = (Math.random() - 0.45) * volatility * basePrice;
  const o = basePrice + (Math.random() - 0.5) * volatility * basePrice * 0.3;
  const c = basePrice + change;
  const h = Math.max(o, c) + Math.random() * volatility * basePrice * 0.5;
  const l = Math.min(o, c) - Math.random() * volatility * basePrice * 0.5;
  return { o: +o.toFixed(2), h: +h.toFixed(2), l: +l.toFixed(2), c: +c.toFixed(2) };
}

/**
 * Generate a price series that reacts to narrative energy.
 * Price tends to rise with narrative support and fall without it.
 */
function generatePriceSeries(
  days: number,
  basePrice: number,
  anchorPrice: number,
  catalyst: CatalystEvent,
  startTs: number
): Array<{ ts: number; price: number; candle: CandleData; volume: number }> {
  const points: Array<{ ts: number; price: number; candle: CandleData; volume: number }> = [];
  let currentPrice = basePrice;
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = 0; i < days; i++) {
    const ts = startTs + i * dayMs;
    const npiNorm = computeNPINormalized(ts, catalyst);

    // Price drift: biased upward when NPI is high, mean-reverts when low
    const narrativePull = (npiNorm - 0.3) * 0.008;
    const anchorPull = (anchorPrice - currentPrice) / anchorPrice * 0.02 * (1 - npiNorm);
    const noise = (Math.random() - 0.5) * 0.015;

    currentPrice = currentPrice * (1 + narrativePull + anchorPull + noise);
    currentPrice = Math.max(currentPrice * 0.9, currentPrice); // floor at -10%

    const candle = generateCandle(currentPrice);
    const baseVolume = 5_000_000 + Math.random() * 10_000_000;
    const npiVolumeBoost = npiNorm * 8_000_000;
    const volume = Math.round(baseVolume + npiVolumeBoost);

    points.push({
      ts,
      price: +currentPrice.toFixed(2),
      candle,
      volume,
    });
  }

  return points;
}

/**
 * Generate sample events scattered across the timeline.
 */
function generateEvents(
  startTs: number,
  days: number,
  ticker: string
): Map<number, PhysicsEvent[]> {
  const eventMap = new Map<number, PhysicsEvent[]>();
  const dayMs = 24 * 60 * 60 * 1000;

  const sampleEvents: Array<{ dayOffset: number; event: PhysicsEvent }> = [
    {
      dayOffset: 0,
      event: {
        type: 'catalyst',
        title: `${ticker}: Major AI partnership announced, revenue guidance raised 40%`,
        source: 'Bloomberg',
        sentiment: 85,
        intensity: 95,
      },
    },
    {
      dayOffset: 3,
      event: {
        type: 'analyst',
        title: `Morgan Stanley raises price target to $180, maintains Overweight`,
        source: 'Morgan Stanley',
        sentiment: 72,
        intensity: 65,
      },
    },
    {
      dayOffset: 7,
      event: {
        type: 'headline',
        title: `${ticker} datacenter demand "unprecedented" says CEO in interview`,
        source: 'CNBC',
        sentiment: 68,
        intensity: 55,
      },
    },
    {
      dayOffset: 14,
      event: {
        type: 'filing',
        title: `10-Q filed: Revenue $35.1B vs $33.9B expected`,
        source: 'SEC EDGAR',
        sentiment: 60,
        intensity: 70,
      },
    },
    {
      dayOffset: 21,
      event: {
        type: 'headline',
        title: `Competition intensifies: rival announces similar AI chip`,
        source: 'Reuters',
        sentiment: -25,
        intensity: 40,
      },
    },
    {
      dayOffset: 28,
      event: {
        type: 'analyst',
        title: `Goldman Sachs notes "narrative fatigue" in AI semiconductor space`,
        source: 'Goldman Sachs',
        sentiment: -15,
        intensity: 50,
      },
    },
    {
      dayOffset: 35,
      event: {
        type: 'headline',
        title: `Volume declining as initial catalyst momentum fades`,
        source: 'MarketWatch',
        sentiment: -10,
        intensity: 30,
      },
    },
    {
      dayOffset: 45,
      event: {
        type: 'earnings',
        title: `Upcoming earnings: consensus expects EPS $0.82`,
        source: 'FactSet',
        sentiment: 20,
        intensity: 45,
      },
    },
  ];

  for (const { dayOffset, event } of sampleEvents) {
    if (dayOffset < days) {
      const ts = startTs + dayOffset * dayMs;
      eventMap.set(ts, [event]);
    }
  }

  return eventMap;
}

/**
 * Generate a complete UnifiedPhysicsState for a given ticker.
 * This produces realistic demo data showing the full narrative lifecycle.
 */
export function generateMockPhysicsState(
  ticker: string = 'NVDA',
  options?: {
    days?: number;
    basePrice?: number;
    anchorPrice?: number;
    e0?: number;
    lambda?: number;
    sensitivity?: 'conservative' | 'balanced' | 'aggressive';
  }
): UnifiedPhysicsState {
  const {
    days = 60,
    basePrice = 142.50,
    anchorPrice = 128.00,
    e0 = 92,
    lambda = 0.055,
    sensitivity = 'balanced',
  } = options || {};

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const startTs = now - days * dayMs;

  // Create catalyst at the start of the period
  const catalyst: CatalystEvent = {
    timestamp: startTs,
    e0,
    lambda,
    headline: `${ticker}: Transformative AI partnership accelerates revenue trajectory`,
    sourceDensity: 87,
    ticker,
    sources: [
      'https://bloomberg.com/example',
      'https://reuters.com/example',
      'https://cnbc.com/example',
    ],
  };

  const decayCurve = computeDecayCurveParams(catalyst);
  const thresholds = THRESHOLD_PRESETS[sensitivity];
  const events = generateEvents(startTs, days, ticker);

  // Generate price series
  const priceSeries = generatePriceSeries(days, basePrice, anchorPrice, catalyst, startTs);

  // Build raw physics points
  const rawPoints: UnifiedPhysicsPoint[] = priceSeries.map(({ ts, price, candle, volume }) => {
    const npi = computeNPI(ts, catalyst);
    const npiNorm = computeNPINormalized(ts, catalyst);

    return {
      ts,
      candle,
      price,
      anchor: anchorPrice,
      npi,
      npiNorm,
      lambda: catalyst.lambda,
      e0: catalyst.e0,
      regime: 'momentum' as const,
      supportFailureScore: 0,
      severity: 'none' as const,
      volume,
      events: events.get(ts),
    };
  });

  // Process through regime engine
  const processedPoints = processPhysicsPoints(rawPoints, thresholds);

  // Compute current metrics
  const latest = processedPoints[processedPoints.length - 1];
  const currentNpi = computeNPI(now, catalyst);
  const currentNpiNorm = computeNPINormalized(now, catalyst);

  const companyNames: Record<string, string> = {
    NVDA: 'NVIDIA Corporation',
    TSLA: 'Tesla, Inc.',
    AAPL: 'Apple Inc.',
    MSFT: 'Microsoft Corporation',
    GOOGL: 'Alphabet Inc.',
    META: 'Meta Platforms, Inc.',
    AMZN: 'Amazon.com, Inc.',
    AMD: 'Advanced Micro Devices',
    RDDT: 'Reddit, Inc.',
  };

  return {
    ticker,
    companyName: companyNames[ticker] || ticker,
    points: processedPoints,
    catalyst,
    decayCurve,
    thresholds,
    anchorMeta: {
      source: 'SEC 10-Q FY25 Q3 + yfinance',
      lastUpdated: now - 2 * dayMs,
      eps: 0.82,
      fairValuePE: 17,
      revenueGrowth: 0.94,
    },
    metrics: {
      currentPrice: latest.price,
      currentNpi,
      currentNpiNorm,
      currentRegime: latest.regime,
      currentSeverity: latest.severity,
      supportFailureScore: latest.supportFailureScore,
      deviationFromAnchor:
        anchorPrice > 0 ? (latest.price - anchorPrice) / anchorPrice : 0,
      timeToExhaustionHrs: timeToExhaustion(now, decayCurve),
      halfLifeDays: decayCurve.halfLife,
      energyRemainingPct: currentNpiNorm * 100,
    },
  };
}
