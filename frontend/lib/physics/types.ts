// =============================================================================
// MarketScholar Unified Physics Engine - Core Types
// Patent-Protected: Applications 63/971,470 & 63/971,478
// =============================================================================

/** Regime classification for each time slice */
export type RegimeType =
  | 'momentum'
  | 'inertia'
  | 'gravity'
  | 'reversion'
  | 'newCatalyst';

/** Severity bands for Support Failure Score */
export type SeverityLevel = 'none' | 'watch' | 'warning' | 'critical';

/** Event types that appear on the event track */
export type PhysicsEventType =
  | 'earnings'
  | 'filing'
  | 'headline'
  | 'guidance'
  | 'analyst'
  | 'catalyst';

/** A single event on the timeline */
export interface PhysicsEvent {
  type: PhysicsEventType;
  title: string;
  url?: string;
  source?: string;
  sentiment?: number;
  intensity?: number;
}

/** OHLC candle data */
export interface CandleData {
  o: number;
  h: number;
  l: number;
  c: number;
}

/**
 * Core data point for the Unified Physics View.
 * Each point represents a single time slice with all computed metrics.
 */
export interface UnifiedPhysicsPoint {
  /** Unix timestamp in milliseconds */
  ts: number;

  /** OHLC candle data (optional - use price as fallback) */
  candle?: CandleData;

  /** Close/current price (always present) */
  price: number;

  /** VMS structural anchor price (verified fundamentals floor) */
  anchor: number;

  /** Narrative Pressure Index - raw value from decay curve */
  npi: number;

  /** NPI normalized to [0..1] range */
  npiNorm: number;

  /** Decay constant lambda */
  lambda: number;

  /** Initial narrative energy at catalyst */
  e0: number;

  /** Regime classification for this time slice */
  regime: RegimeType;

  /** Support Failure Score: deviation * (1 - energy) */
  supportFailureScore: number;

  /** Severity level derived from SFS + energy thresholds */
  severity: SeverityLevel;

  /** Volume (optional) */
  volume?: number;

  /** Events at this timestamp */
  events?: PhysicsEvent[];
}

/**
 * Catalyst event that initiates a narrative decay curve.
 */
export interface CatalystEvent {
  /** Timestamp of the catalyst */
  timestamp: number;

  /** Initial narrative energy */
  e0: number;

  /** Computed decay constant */
  lambda: number;

  /** Headline / narrative summary */
  headline: string;

  /** Source density score */
  sourceDensity: number;

  /** Related article URLs */
  sources?: string[];

  /** Ticker symbol */
  ticker: string;
}

/**
 * Decay curve parameters for rendering the NPI curve.
 */
export interface DecayCurveParams {
  /** Initial energy at catalyst */
  e0: number;

  /** Decay constant */
  lambda: number;

  /** Catalyst timestamp (curve origin) */
  catalystTs: number;

  /** Half-life: ln(2) / lambda */
  halfLife: number;

  /** Exhaustion timestamp: catalystTs + ln(10)/lambda in ms */
  exhaustionTs: number;

  /** Exhaustion NPI value: 0.1 * E0 */
  exhaustionNpi: number;
}

/**
 * Configurable thresholds for the Regime Engine.
 * All values are adjustable per ticker or volatility profile.
 */
export interface RegimeThresholds {
  /** NPI normalized threshold for momentum (default: 0.5) */
  momentumNpiThreshold: number;

  /** NPI normalized threshold for gravity (default: 0.1) */
  gravityNpiThreshold: number;

  /** Deviation from anchor for material divergence (default: 0.05) */
  materialDeviationPct: number;

  /** Support Failure Score threshold for warnings */
  sfsWarningThreshold: number;

  /** Energy threshold for Watch severity (default: 0.3) */
  watchEnergyThreshold: number;

  /** Deviation threshold for Watch severity (default: 0.05) */
  watchDeviationPct: number;

  /** Energy threshold for Warning severity (default: 0.2) */
  warningEnergyThreshold: number;

  /** Deviation threshold for Warning severity (default: 0.08) */
  warningDeviationPct: number;

  /** Energy threshold for Critical severity (default: 0.1) */
  criticalEnergyThreshold: number;

  /** Deviation threshold for Critical severity (default: 0.10) */
  criticalDeviationPct: number;

  /** Sensitivity preset name */
  sensitivity: 'conservative' | 'balanced' | 'aggressive';
}

/**
 * Narrative audit data for the drill-down drawer.
 */
export interface NarrativeAuditData {
  /** 1-2 sentence summary of what's happening at this point */
  summary: string;

  /** Top headlines/sources at this moment */
  headlines: Array<{
    title: string;
    source: string;
    url?: string;
    sentiment?: number;
  }>;

  /** Factor tags */
  factors: string[];

  /** Credibility weights (if available) */
  credibilityWeights?: Array<{
    analyst: string;
    weight: number;
  }>;

  /** Changes since last slice */
  delta: {
    npiChange: number;
    deviationChange: number;
    regimeTransitionReason?: string;
  };
}

/**
 * Cognitive Card data for shareable export.
 */
export interface CognitiveCardData {
  ticker: string;
  companyName: string;
  timestamp: number;

  /** Current regime */
  regime: RegimeType;

  /** Current severity */
  severity: SeverityLevel;

  /** Current price */
  price: number;

  /** Structural anchor */
  anchor: number;

  /** NPI normalized */
  npiNorm: number;

  /** Time to exhaustion (hours) */
  timeToExhaustionHrs: number;

  /** 3-bullet summary */
  bullets: [string, string, string];

  /** Support Failure Score */
  sfs: number;
}

/**
 * Complete physics state for a ticker.
 * Returned by the API and consumed by the dashboard.
 */
export interface UnifiedPhysicsState {
  ticker: string;
  companyName: string;

  /** Time series data points */
  points: UnifiedPhysicsPoint[];

  /** Current (latest) catalyst event */
  catalyst: CatalystEvent;

  /** Decay curve parameters */
  decayCurve: DecayCurveParams;

  /** Current regime thresholds */
  thresholds: RegimeThresholds;

  /** Structural anchor metadata */
  anchorMeta: {
    source: string;
    lastUpdated: number;
    eps?: number;
    fairValuePE?: number;
    revenueGrowth?: number;
  };

  /** Summary metrics */
  metrics: {
    currentPrice: number;
    currentNpi: number;
    currentNpiNorm: number;
    currentRegime: RegimeType;
    currentSeverity: SeverityLevel;
    supportFailureScore: number;
    deviationFromAnchor: number;
    timeToExhaustionHrs: number;
    halfLifeDays: number;
    energyRemainingPct: number;
  };
}

// =============================================================================
// UI Configuration Constants
// =============================================================================

/** Regime display configuration - Enterprise Light Theme */
export const REGIME_CONFIG: Record<
  RegimeType,
  { label: string; color: string; bgColor: string; borderColor: string; description: string }
> = {
  momentum: {
    label: 'MOMENTUM',
    color: '#059669',
    bgColor: '#D1FAE5',
    borderColor: '#6EE7B7',
    description: 'Narrative force actively supporting price movement',
  },
  inertia: {
    label: 'INERTIA',
    color: '#D97706',
    bgColor: '#FEF3C7',
    borderColor: '#FCD34D',
    description: 'Price advancing on residual momentum without narrative support',
  },
  gravity: {
    label: 'GRAVITY',
    color: '#DC2626',
    bgColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    description: 'Narrative support has failed. Price vulnerable to mean reversion',
  },
  reversion: {
    label: 'REVERSION',
    color: '#4F46E5',
    bgColor: '#EEF2FF',
    borderColor: '#A5B4FC',
    description: 'Price correcting toward structural anchor',
  },
  newCatalyst: {
    label: 'NEW CATALYST',
    color: '#7C3AED',
    bgColor: '#F5F3FF',
    borderColor: '#C4B5FD',
    description: 'New narrative energy detected. Decay curve reset',
  },
};

/** Severity display configuration - Enterprise Light Theme */
export const SEVERITY_CONFIG: Record<
  SeverityLevel,
  { label: string; color: string; bgColor: string; borderColor: string; icon: string }
> = {
  none: {
    label: 'CLEAR',
    color: '#64748B',
    bgColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    icon: '',
  },
  watch: {
    label: 'WATCH',
    color: '#D97706',
    bgColor: '#FEF3C7',
    borderColor: '#FCD34D',
    icon: 'WATCH',
  },
  warning: {
    label: 'WARNING',
    color: '#EA580C',
    bgColor: '#FFF7ED',
    borderColor: '#FDBA74',
    icon: 'WARNING',
  },
  critical: {
    label: 'CRITICAL',
    color: '#DC2626',
    bgColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    icon: 'CRITICAL',
  },
};

/** Chart color constants - Enterprise Light Theme */
export const PHYSICS_COLORS = {
  price: '#1E40AF',
  priceCandle: {
    up: '#059669',
    down: '#DC2626',
    wick: '#94A3B8',
  },
  npi: '#8B5CF6',
  npiGlow: 'rgba(139, 92, 246, 0.3)',
  npiLight: '#EDE9FE',
  anchor: '#059669',
  anchorLight: '#D1FAE5',
  halfLife: 'rgba(139, 92, 246, 0.6)',
  exhaustionZone: 'rgba(220, 38, 38, 0.06)',
  exhaustionLine: '#DC2626',
  grid: 'rgba(226, 232, 240, 0.8)',
  gridLine: '#F1F5F9',
  background: '#F8FAFC',
  card: '#FFFFFF',
  cardBorder: '#E2E8F0',
  text: '#0F172A',
  textMuted: '#64748B',
  textLight: '#94A3B8',
  primary: '#3B82F6',
  primaryDark: '#1E40AF',
} as const;
