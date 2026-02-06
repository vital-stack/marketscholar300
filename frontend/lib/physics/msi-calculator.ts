// =============================================================================
// MarketScholar MSI (Market Support Integrity) Calculator
// Composite score: How structurally supported is the current price?
// Patent-Protected: Applications 63/971,470 & 63/971,478
// =============================================================================

import type { UnifiedPhysicsState, RegimeType, SeverityLevel } from './types';

// =============================================================================
// MSI Grade System
// =============================================================================

export type MSIGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface MSIComponents {
  /** Narrative energy score (0-100): How much narrative fuel remains */
  narrativeEnergy: number;
  /** Anchor alignment score (0-100): How close price is to structural support */
  anchorAlignment: number;
  /** Stress resistance score (0-100): Inverse of support failure risk */
  stressResistance: number;
}

export interface MSIResult {
  /** Composite MSI score (0-100) */
  score: number;
  /** Letter grade */
  grade: MSIGrade;
  /** Grade color for UI */
  gradeColor: string;
  /** Grade background color */
  gradeBgColor: string;
  /** Grade border color */
  gradeBorderColor: string;
  /** Component scores */
  components: MSIComponents;
  /** Human-readable verdict */
  verdict: string;
  /** Short description */
  description: string;
  /** Regime context */
  regime: RegimeType;
  /** Severity context */
  severity: SeverityLevel;
}

// =============================================================================
// Component Weights
// =============================================================================

const WEIGHTS = {
  narrativeEnergy: 0.40,
  anchorAlignment: 0.35,
  stressResistance: 0.25,
} as const;

// =============================================================================
// Grade Configuration
// =============================================================================

const GRADE_CONFIG: Record<MSIGrade, {
  color: string;
  bgColor: string;
  borderColor: string;
  verdict: string;
  description: string;
}> = {
  A: {
    color: '#059669',
    bgColor: '#D1FAE5',
    borderColor: '#6EE7B7',
    verdict: 'STRONG SUPPORT',
    description: 'Price is well-supported by active narrative energy and structural fundamentals.',
  },
  B: {
    color: '#2563EB',
    bgColor: '#DBEAFE',
    borderColor: '#93C5FD',
    verdict: 'ADEQUATE SUPPORT',
    description: 'Narrative energy is fading but price remains within structural bounds.',
  },
  C: {
    color: '#D97706',
    bgColor: '#FEF3C7',
    borderColor: '#FCD34D',
    verdict: 'WEAKENING SUPPORT',
    description: 'Narrative fuel depleting. Price increasingly dependent on structural anchor alone.',
  },
  D: {
    color: '#EA580C',
    bgColor: '#FFF7ED',
    borderColor: '#FDBA74',
    verdict: 'FRAGILE SUPPORT',
    description: 'Narrative exhaustion imminent. Price deviation from anchor creates snap-back risk.',
  },
  F: {
    color: '#DC2626',
    bgColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    verdict: 'SUPPORT FAILURE',
    description: 'Narrative support has failed. Price is structurally unsupported and vulnerable to reversion.',
  },
};

// =============================================================================
// Score Functions
// =============================================================================

function scoreToGrade(score: number): MSIGrade {
  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  if (score >= 20) return 'D';
  return 'F';
}

/**
 * Compute narrative energy component (0-100).
 * Based on normalized NPI with a curve that penalizes low energy more heavily.
 */
function computeNarrativeEnergyScore(npiNorm: number): number {
  // Apply a curve: sqrt for gentler falloff at top, steeper at bottom
  const curved = Math.pow(npiNorm, 0.7);
  return Math.min(100, Math.max(0, curved * 100));
}

/**
 * Compute anchor alignment component (0-100).
 * Measures how close price is to the structural anchor.
 * Perfect alignment (0% deviation) = 100.
 * 20%+ deviation = 0.
 */
function computeAnchorAlignmentScore(deviationFromAnchor: number): number {
  const absDeviation = Math.abs(deviationFromAnchor);
  const maxDeviation = 0.20; // 20% deviation = score of 0
  const score = 1 - Math.min(1, absDeviation / maxDeviation);
  // Apply slight curve to penalize large deviations more
  return Math.min(100, Math.max(0, Math.pow(score, 0.8) * 100));
}

/**
 * Compute stress resistance component (0-100).
 * Inverse of Support Failure Score - lower SFS = higher resistance.
 */
function computeStressResistanceScore(sfs: number): number {
  const maxSfs = 0.15; // SFS of 0.15+ = score of 0
  const score = 1 - Math.min(1, sfs / maxSfs);
  return Math.min(100, Math.max(0, score * 100));
}

// =============================================================================
// Main MSI Calculator
// =============================================================================

/**
 * Compute the Market Support Integrity score from physics state.
 *
 * MSI = 40% * NarrativeEnergy + 35% * AnchorAlignment + 25% * StressResistance
 *
 * This single score answers: "How structurally supported is the current price?"
 */
export function computeMSI(state: UnifiedPhysicsState): MSIResult {
  const { metrics } = state;

  // Compute component scores
  const narrativeEnergy = computeNarrativeEnergyScore(metrics.currentNpiNorm);
  const anchorAlignment = computeAnchorAlignmentScore(metrics.deviationFromAnchor);
  const stressResistance = computeStressResistanceScore(metrics.supportFailureScore);

  const components: MSIComponents = {
    narrativeEnergy,
    anchorAlignment,
    stressResistance,
  };

  // Weighted composite
  const score = Math.min(100, Math.max(0,
    WEIGHTS.narrativeEnergy * narrativeEnergy +
    WEIGHTS.anchorAlignment * anchorAlignment +
    WEIGHTS.stressResistance * stressResistance
  ));

  const grade = scoreToGrade(score);
  const config = GRADE_CONFIG[grade];

  return {
    score,
    grade,
    gradeColor: config.color,
    gradeBgColor: config.bgColor,
    gradeBorderColor: config.borderColor,
    components,
    verdict: config.verdict,
    description: config.description,
    regime: metrics.currentRegime,
    severity: metrics.currentSeverity,
  };
}

/**
 * Get the MSI trend direction based on recent data points.
 */
export function computeMSITrend(
  points: { npiNorm: number; price: number; anchor: number; supportFailureScore: number }[],
  lookback: number = 5
): 'improving' | 'stable' | 'deteriorating' {
  if (points.length < lookback + 1) return 'stable';

  const recent = points.slice(-lookback);
  const prior = points.slice(-(lookback * 2), -lookback);

  if (prior.length === 0) return 'stable';

  const avgRecent = recent.reduce((sum, p) => {
    const ne = computeNarrativeEnergyScore(p.npiNorm);
    const aa = computeAnchorAlignmentScore(p.anchor > 0 ? (p.price - p.anchor) / p.anchor : 0);
    const sr = computeStressResistanceScore(p.supportFailureScore);
    return sum + (WEIGHTS.narrativeEnergy * ne + WEIGHTS.anchorAlignment * aa + WEIGHTS.stressResistance * sr);
  }, 0) / recent.length;

  const avgPrior = prior.reduce((sum, p) => {
    const ne = computeNarrativeEnergyScore(p.npiNorm);
    const aa = computeAnchorAlignmentScore(p.anchor > 0 ? (p.price - p.anchor) / p.anchor : 0);
    const sr = computeStressResistanceScore(p.supportFailureScore);
    return sum + (WEIGHTS.narrativeEnergy * ne + WEIGHTS.anchorAlignment * aa + WEIGHTS.stressResistance * sr);
  }, 0) / prior.length;

  const delta = avgRecent - avgPrior;
  if (delta > 3) return 'improving';
  if (delta < -3) return 'deteriorating';
  return 'stable';
}
