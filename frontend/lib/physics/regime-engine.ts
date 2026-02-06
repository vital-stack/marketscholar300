// =============================================================================
// MarketScholar Regime Engine
// Configurable regime classification for Unified Physics View
// Patent-Protected: Applications 63/971,470 & 63/971,478
// =============================================================================

import type {
  RegimeType,
  SeverityLevel,
  RegimeThresholds,
  UnifiedPhysicsPoint,
} from './types';

// =============================================================================
// Default Threshold Presets
// =============================================================================

export const THRESHOLD_PRESETS: Record<string, RegimeThresholds> = {
  conservative: {
    momentumNpiThreshold: 0.6,
    gravityNpiThreshold: 0.15,
    materialDeviationPct: 0.08,
    sfsWarningThreshold: 0.1,
    watchEnergyThreshold: 0.35,
    watchDeviationPct: 0.06,
    warningEnergyThreshold: 0.25,
    warningDeviationPct: 0.10,
    criticalEnergyThreshold: 0.15,
    criticalDeviationPct: 0.12,
    sensitivity: 'conservative',
  },
  balanced: {
    momentumNpiThreshold: 0.5,
    gravityNpiThreshold: 0.1,
    materialDeviationPct: 0.05,
    sfsWarningThreshold: 0.08,
    watchEnergyThreshold: 0.3,
    watchDeviationPct: 0.05,
    warningEnergyThreshold: 0.2,
    warningDeviationPct: 0.08,
    criticalEnergyThreshold: 0.1,
    criticalDeviationPct: 0.10,
    sensitivity: 'balanced',
  },
  aggressive: {
    momentumNpiThreshold: 0.4,
    gravityNpiThreshold: 0.08,
    materialDeviationPct: 0.03,
    sfsWarningThreshold: 0.05,
    watchEnergyThreshold: 0.25,
    watchDeviationPct: 0.04,
    warningEnergyThreshold: 0.15,
    warningDeviationPct: 0.06,
    criticalEnergyThreshold: 0.08,
    criticalDeviationPct: 0.08,
    sensitivity: 'aggressive',
  },
};

// =============================================================================
// Regime Classification
// =============================================================================

/**
 * Compute the price slope over a window of points.
 * Returns the normalized slope (% change per point).
 */
function computePriceSlope(
  points: UnifiedPhysicsPoint[],
  currentIdx: number,
  windowSize: number = 5
): number {
  const start = Math.max(0, currentIdx - windowSize);
  if (start === currentIdx) return 0;

  const startPrice = points[start].price;
  const endPrice = points[currentIdx].price;

  if (startPrice === 0) return 0;
  return (endPrice - startPrice) / startPrice;
}

/**
 * Classify the regime for a single time slice.
 *
 * Rules (configurable):
 * - Momentum: NPI_norm > threshold AND price slope positive
 * - Inertia: price slope positive BUT NPI < half-life (past threshold)
 * - Gravity: NPI < exhaustion threshold AND price materially above anchor
 * - Reversion: price slope negative AND moving toward anchor
 * - New Catalyst: E0 resets (detected by NPI increase)
 */
export function classifyRegime(
  points: UnifiedPhysicsPoint[],
  currentIdx: number,
  thresholds: RegimeThresholds,
  prevNpi?: number
): RegimeType {
  const point = points[currentIdx];
  const { npiNorm, price, anchor } = point;
  const priceSlope = computePriceSlope(points, currentIdx);
  const deviation = anchor > 0 ? (price - anchor) / anchor : 0;

  // New Catalyst: NPI jumped significantly (energy reset)
  if (prevNpi !== undefined && point.npi > prevNpi * 1.5 && point.npi > point.e0 * 0.5) {
    return 'newCatalyst';
  }

  // Gravity: narrative exhausted + price still elevated
  if (npiNorm < thresholds.gravityNpiThreshold && deviation > thresholds.materialDeviationPct) {
    return 'gravity';
  }

  // Reversion: price falling toward anchor
  if (priceSlope < -0.005 && deviation > 0 && npiNorm < thresholds.momentumNpiThreshold) {
    return 'reversion';
  }

  // Momentum: narrative actively supporting price
  if (npiNorm > thresholds.momentumNpiThreshold && priceSlope >= 0) {
    return 'momentum';
  }

  // Inertia: price continuing but narrative weakening
  if (priceSlope >= 0 && npiNorm < thresholds.momentumNpiThreshold) {
    return 'inertia';
  }

  // Default: if price falling with strong narrative, still momentum
  if (npiNorm > thresholds.momentumNpiThreshold) {
    return 'momentum';
  }

  return 'inertia';
}

// =============================================================================
// Support Failure Score
// =============================================================================

/**
 * Compute the Support Failure Score.
 *
 * Formula: SFS = deviation * (1 - energy)
 *
 * Where:
 * - deviation = |price - anchor| / anchor
 * - energy = NPI normalized [0..1]
 */
export function computeSupportFailureScore(
  price: number,
  anchor: number,
  npiNorm: number
): number {
  if (anchor <= 0) return 0;
  const deviation = Math.abs(price - anchor) / anchor;
  return deviation * (1 - npiNorm);
}

// =============================================================================
// Severity Classification
// =============================================================================

/**
 * Classify severity based on energy + deviation thresholds.
 *
 * Severity bands:
 * - Watch:    energy < 0.3  AND deviation > 5%
 * - Warning:  energy < 0.2  AND deviation > 8%
 * - Critical: energy < 0.1  AND deviation > 10%
 */
export function classifySeverity(
  npiNorm: number,
  price: number,
  anchor: number,
  thresholds: RegimeThresholds
): SeverityLevel {
  if (anchor <= 0) return 'none';
  const deviation = Math.abs(price - anchor) / anchor;

  if (
    npiNorm < thresholds.criticalEnergyThreshold &&
    deviation > thresholds.criticalDeviationPct
  ) {
    return 'critical';
  }

  if (
    npiNorm < thresholds.warningEnergyThreshold &&
    deviation > thresholds.warningDeviationPct
  ) {
    return 'warning';
  }

  if (
    npiNorm < thresholds.watchEnergyThreshold &&
    deviation > thresholds.watchDeviationPct
  ) {
    return 'watch';
  }

  return 'none';
}

// =============================================================================
// Full Pipeline: Process all points
// =============================================================================

/**
 * Process an array of raw data points through the regime engine.
 * Classifies regime, computes SFS, and assigns severity to each point.
 */
export function processPhysicsPoints(
  points: UnifiedPhysicsPoint[],
  thresholds: RegimeThresholds
): UnifiedPhysicsPoint[] {
  return points.map((point, idx) => {
    const prevNpi = idx > 0 ? points[idx - 1].npi : undefined;
    const regime = classifyRegime(points, idx, thresholds, prevNpi);
    const sfs = computeSupportFailureScore(point.price, point.anchor, point.npiNorm);
    const severity = classifySeverity(point.npiNorm, point.price, point.anchor, thresholds);

    return {
      ...point,
      regime,
      supportFailureScore: sfs,
      severity,
    };
  });
}
