// =============================================================================
// MarketScholar NPI Calculator
// Narrative Pressure Index computation from decay parameters
// Patent-Protected: Application 63/971,478
// =============================================================================

import type { DecayCurveParams, CatalystEvent } from './types';

/**
 * Compute NPI at a given timestamp.
 *
 * Formula: NPI(t) = E0 * e^(-lambda * t)
 *
 * Where:
 * - E0 = Initial narrative energy at catalyst
 * - lambda = Decay constant
 * - t = Time elapsed since catalyst (in days)
 */
export function computeNPI(
  timestamp: number,
  catalyst: CatalystEvent
): number {
  const elapsedMs = timestamp - catalyst.timestamp;
  if (elapsedMs < 0) return 0;

  const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
  return catalyst.e0 * Math.exp(-catalyst.lambda * elapsedDays);
}

/**
 * Compute normalized NPI in [0..1] range.
 */
export function computeNPINormalized(
  timestamp: number,
  catalyst: CatalystEvent
): number {
  const npi = computeNPI(timestamp, catalyst);
  return Math.min(1, Math.max(0, npi / catalyst.e0));
}

/**
 * Compute the decay curve parameters from a catalyst event.
 */
export function computeDecayCurveParams(catalyst: CatalystEvent): DecayCurveParams {
  const halfLife = Math.LN2 / catalyst.lambda; // ln(2) / lambda in days
  const exhaustionDays = Math.log(10) / catalyst.lambda; // ln(10) / lambda in days
  const exhaustionMs = exhaustionDays * 24 * 60 * 60 * 1000;

  return {
    e0: catalyst.e0,
    lambda: catalyst.lambda,
    catalystTs: catalyst.timestamp,
    halfLife,
    exhaustionTs: catalyst.timestamp + exhaustionMs,
    exhaustionNpi: 0.1 * catalyst.e0,
  };
}

/**
 * Compute time remaining until exhaustion from a given timestamp.
 * Returns hours remaining, or 0 if already exhausted.
 */
export function timeToExhaustion(
  currentTs: number,
  decayCurve: DecayCurveParams
): number {
  const remainingMs = decayCurve.exhaustionTs - currentTs;
  if (remainingMs <= 0) return 0;
  return remainingMs / (1000 * 60 * 60); // convert to hours
}

/**
 * Compute the half-life timestamp.
 */
export function halfLifeTimestamp(decayCurve: DecayCurveParams): number {
  const halfLifeMs = decayCurve.halfLife * 24 * 60 * 60 * 1000;
  return decayCurve.catalystTs + halfLifeMs;
}

/**
 * Compute energy remaining as a percentage.
 */
export function energyRemainingPct(
  currentTs: number,
  catalyst: CatalystEvent
): number {
  const npiNorm = computeNPINormalized(currentTs, catalyst);
  return npiNorm * 100;
}

/**
 * Generate a smooth NPI curve for chart rendering.
 * Returns array of {ts, npi, npiNorm} points.
 */
export function generateNPICurve(
  catalyst: CatalystEvent,
  startTs: number,
  endTs: number,
  resolution: number = 100
): Array<{ ts: number; npi: number; npiNorm: number }> {
  const step = (endTs - startTs) / resolution;
  const points: Array<{ ts: number; npi: number; npiNorm: number }> = [];

  for (let i = 0; i <= resolution; i++) {
    const ts = startTs + step * i;
    const npi = computeNPI(ts, catalyst);
    const npiNorm = computeNPINormalized(ts, catalyst);
    points.push({ ts, npi, npiNorm });
  }

  return points;
}

/**
 * Estimate lambda from observed data points.
 *
 * Given initial and current sentiment + days elapsed:
 * lambda = -ln(current/initial) / days
 */
export function estimateLambda(
  initialSentiment: number,
  currentSentiment: number,
  daysElapsed: number
): number {
  if (daysElapsed <= 0 || initialSentiment <= 0 || currentSentiment <= 0) {
    return 0.1; // default decay constant
  }

  const ratio = currentSentiment / initialSentiment;
  if (ratio >= 1) return 0.01; // barely decaying
  if (ratio <= 0) return 1.0; // instant decay

  return -Math.log(ratio) / daysElapsed;
}
