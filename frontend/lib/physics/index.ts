// =============================================================================
// MarketScholar Unified Physics Engine
// Barrel export for all physics modules
// =============================================================================

// Types
export type {
  RegimeType,
  SeverityLevel,
  PhysicsEventType,
  PhysicsEvent,
  CandleData,
  UnifiedPhysicsPoint,
  CatalystEvent,
  DecayCurveParams,
  RegimeThresholds,
  NarrativeAuditData,
  CognitiveCardData,
  UnifiedPhysicsState,
} from './types';

export {
  REGIME_CONFIG,
  SEVERITY_CONFIG,
  PHYSICS_COLORS,
} from './types';

// Regime Engine
export {
  classifyRegime,
  computeSupportFailureScore,
  classifySeverity,
  processPhysicsPoints,
  THRESHOLD_PRESETS,
} from './regime-engine';

// NPI Calculator
export {
  computeNPI,
  computeNPINormalized,
  computeDecayCurveParams,
  timeToExhaustion,
  halfLifeTimestamp,
  energyRemainingPct,
  generateNPICurve,
  estimateLambda,
} from './npi-calculator';

// Mock Data
export { generateMockPhysicsState } from './mock-data';

// MSI Calculator
export {
  computeMSI,
  computeMSITrend,
} from './msi-calculator';

export type {
  MSIGrade,
  MSIComponents,
  MSIResult,
} from './msi-calculator';
