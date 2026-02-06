// MarketScholar Types - Matching AI Studio App

export interface User {
  id: string;
  email: string;
  name: string;
  isPro: boolean;
  avatar?: string;
}

export type ClaimType = 'OPERATIONAL' | 'FINANCIAL' | 'MARKET_STRUCTURE' | 'BEHAVIORAL' | 'TECHNOLOGICAL';
export type TimeHorizon = 'IMMEDIATE' | 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
export type Certainty = 'DEFINITIVE' | 'PROBABILISTIC' | 'SPECULATIVE';
export type EvidenceQuality = 'HIGH' | 'MEDIUM' | 'LOW' | 'ABSENT';

export interface ForensicClaim {
  text: string;
  type: ClaimType;
  horizon: TimeHorizon;
  certainty: Certainty;
  evidenceQuality: EvidenceQuality;
  sourceName: string;
  deconstruction: string;
  isMisleading: boolean;
  integrity?: string;
  missingEvidence?: string;
  impactAnalysis?: string;
  confidenceScore: number;
}

export interface InstitutionalClaim {
  analyst_name: string;
  institution_bank: string;
  source_type: string;
  medium: string;
  timestamp: string;
  stock_ticker: string;
  claim_text: string;
  numeric_anchor: string;
  claim_direction: string;
  assumptions: string[];
  evidence: string[];
  precedent: string;
  incentive_context: string;
  amplification_score: number;
  outcome_tracking: string;
  credibility_score: number;
}

export interface SentimentDataPoint {
  date: string;
  avgSentiment: number;
  volume: number;
  medianSentiment?: number;
  quarterLabel?: string;
  isEarnings?: boolean;
  newsAccuracy?: number;
}

export interface PressAudit {
  date: string;
  headline: string;
  source: string;
  narrativeClaim: string;
  realityCheck: string;
  verdict: 'FACTUAL_CATALYST' | 'NARRATIVE_TRAP' | 'MARKET_NOISE' | 'SHORT_ATTACK' | 'SIGNAL_DIVERGENCE';
  stockTrajectory: string;
  veracityScore: number;
  eventKeywords: string[];
}

export interface KeywordAnalysis {
  keyword: string;
  mentions: number;
  sentiment: number;
  impactScore: number;
  leadUpSpike: boolean;
  periodLabel?: string;
}

export interface ForensicCalculation {
  vms: { score: number; tableCoordMatch?: number; textMatch?: number; verdict: string; narrative: string; anchor: string };
  unlearning: { verdict: string; status: string };
  overreaction: { ratio: number; priceVelocity: number; fundamentalVelocity: number; verdict: string };
  narrativeEnergy: { verdict: string; description: string };
  halfLife: { days: number; description: string };
  premium: { percentage: number; fairValue: number; impliedPrice: number; verdict: string };
  coordination: { score: number; verdict: string };
  hypeDiscipline: { score: number; level: string; description: string };
}

export interface EpistemicDrift {
  magnitude: number;
  verdict: string;
  narrativeProjection: string;
  structuralReality: string;
}

export interface TimingVector {
  daysRemaining: number;
  totalHorizon: number;
  description: string;
  eventDate: string;
}

export interface MarketMath {
  fairValue: number;
  overreactionRatio: number;
  auditDelta: number;
}

export interface StockAnalysis {
  articleTitle: string;
  articleUrl?: string;
  publicationName: string;
  publicationCredibility: number;
  publicationAuthorityRank: string;
  ticker: string;
  companyName: string;
  sector?: string;
  currentPrice?: number;
  storyCount?: number;
  auditVerdict: 'STRUCTURALLY_SUPPORTED' | 'MIXED_INCOMPLETE' | 'NARRATIVE_TRAP' | 'SPECULATIVE_FRAMING' | 'FACTUALLY_MISLEADING';
  confidenceScore: number;
  riskRating: 'LOW' | 'MODERATE' | 'HIGH';
  manipulationRisk: 'LOW' | 'MEDIUM' | 'HIGH';

  summary: string;
  primaryNarrative: string;
  narrativeType: string;

  sentimentDynamics: SentimentDataPoint[];
  forensicLedger: ForensicClaim[];
  keywordAnalysis: KeywordAnalysis[];

  institutionalClaim: InstitutionalClaim;
  forensicCalculation: ForensicCalculation;

  epistemicDrift?: EpistemicDrift;
  timingVector?: TimingVector;
  marketMath?: MarketMath;

  analystAudit: {
    name: string;
    firm: string;
    pastAccuracy: number;
    expertise: string[];
    grade: string;
    credibilityScore: number;
    focus: string;
    coverageHistory: string[];
  };

  primaryThesis: {
    statement: string;
    explanation: string;
  };

  sourceQualityMatrix: {
    trackRecord: number;
    institutionalWeight: number;
    conflictRisk: number;
  };

  structuralRiskAudit: {
    classification: 'LOW' | 'MODERATE' | 'HIGH';
    description: string;
  };

  causalityAudit: {
    contractIntegrity: string;
    marketContext: string;
    behavioralData: string;
  };

  priceTargets: {
    median: number;
    current: number;
    high?: number;
    low?: number;
  };

  socialMomentum: {
    score: number;
    trend: 'RISING' | 'STABLE' | 'DECAYING';
    crowdBias: number;
    expertBias: number;
  };

  pressAudits: PressAudit[];

  narrativeInsights: {
    preEarnings: string;
    volumeBehavior: string;
    narrativeConsistency: string;
    newsAccuracyAnalysis: string;
  };

  timestamp: number;
}

export interface AnalysisState {
  isAnalyzing: boolean;
  result: StockAnalysis | null;
  error: string | null;
}

export type AppView = 'analyzer' | 'history' | 'pricing' | 'intelligence';
export type ResearchMode = 'headline' | 'upload' | 'thesis';
export type AuditStance = 'bullish' | 'bearish' | 'neutral';

// Verdict colors for UI
export const VERDICT_COLORS: Record<string, string> = {
  STRUCTURALLY_SUPPORTED: '#10b981',
  MIXED_INCOMPLETE: '#f59e0b',
  NARRATIVE_TRAP: '#ef4444',
  SPECULATIVE_FRAMING: '#f97316',
  FACTUALLY_MISLEADING: '#dc2626',
  FACTUAL_CATALYST: '#10b981',
  MARKET_NOISE: '#6b7280',
  SHORT_ATTACK: '#7c3aed',
  SIGNAL_DIVERGENCE: '#3b82f6',
};

export const RISK_COLORS: Record<string, string> = {
  LOW: '#10b981',
  MODERATE: '#f59e0b',
  MEDIUM: '#f59e0b',
  HIGH: '#ef4444',
};

// Market Belief Timeline Types (Causal Narrative Mapping)
export interface NarrativeEvent {
  id: string;
  date: string;
  timestamp: number;
  headline: string;
  source: string;
  sourceUrl?: string;

  // Narrative Intensity (determines dot size)
  narrativeIntensity: number; // 0-100

  // Veracity Confidence (determines dot outline: solid=verified, dashed=unverified)
  veracityConfidence: number; // 0-100
  isVerified: boolean;

  // Causality Classification
  causalityType: 'FACTUAL_CATALYST' | 'NARRATIVE_TRAP' | 'MARKET_NOISE' | 'STRUCTURAL_ANCHOR';

  // Forensic Breakdown (shown in expanded audit panel)
  forensicBreakdown: {
    narrativeClaim: string;
    structuralReality: string;
    causalityDelta: number; // -100 to +100 (negative = narrative diverges from reality)
    evidenceCitations: string[];
    filingReference?: string; // e.g., "10-Q FY24 Q3, Revenue section, p.42"
  };

  // Overreaction Ratio components (Reality vs Noise bar chart)
  overreactionMetrics: {
    realityScore: number; // Fundamentals impact 0-100
    noiseScore: number; // Sentiment/hype impact 0-100
    overreactionRatio: number; // OR calculation
    verdict: 'UNDERREACTION' | 'PROPORTIONAL' | 'OVERREACTION' | 'EXTREME';
  };

  // Price impact
  priceImpact?: {
    priceAtEvent: number;
    priceChange24h: number;
    priceChangePercent: number;
  };

  // Grounding citations from Gemini
  groundingCitations?: string[];
}

export interface StructuralAnchor {
  id: string;
  filingType: '10-K' | '10-Q' | '8-K' | 'EARNINGS_CALL';
  filingDate: string;
  fiscalPeriod: string;

  // Key metrics extracted
  metrics: {
    revenue?: number;
    revenueGrowth?: number;
    eps?: number;
    epsGrowth?: number;
    guidance?: string;
    keyHighlights: string[];
  };

  // Used as baseline for narrative comparison
  isBaselineAnchor: boolean;
}

export interface MarketBeliefTimeline {
  ticker: string;
  companyName: string;
  timeframeStart: string;
  timeframeEnd: string;

  // Structural anchors (earnings, filings)
  structuralAnchors: StructuralAnchor[];

  // Narrative events (news dots)
  narrativeEvents: NarrativeEvent[];

  // Aggregate metrics
  aggregateMetrics: {
    totalEvents: number;
    factualCatalysts: number;
    narrativeTraps: number;
    marketNoise: number;
    avgVeracityConfidence: number;
    avgOverreactionRatio: number;
    dominantNarrative: string;
    narrativeHealthScore: number; // 0-100
  };

  // Model metadata
  modelUsed: string;
  isGrounded: boolean;
  generatedAt: number;
}

// Quadrant colors for timeline
export const CAUSALITY_COLORS: Record<string, string> = {
  FACTUAL_CATALYST: '#10b981', // Green
  NARRATIVE_TRAP: '#ef4444', // Red
  MARKET_NOISE: '#6b7280', // Gray
  STRUCTURAL_ANCHOR: '#3b82f6', // Blue
};

export const OVERREACTION_COLORS: Record<string, string> = {
  UNDERREACTION: '#3b82f6', // Blue
  PROPORTIONAL: '#10b981', // Green
  OVERREACTION: '#f59e0b', // Amber
  EXTREME: '#ef4444', // Red
};

// ============================================
// L3 FORENSIC AUDIT PROTOCOL TYPES (Patent-Protected)
// ============================================

/**
 * Coordinate Mapping Evidence - Maps narrative claims to SEC filing coordinates
 * Uses Gemini 3 Pro's media_resolution: high for spatial table parsing
 */
export interface CoordinateMappingEvidence {
  claimId: string;
  claimText: string;
  claimSource: string;

  // SEC Filing Reference
  filingReference: {
    filingType: '10-K' | '10-Q' | '8-K' | 'DEF14A' | 'EARNINGS_TRANSCRIPT';
    filingDate: string;
    fiscalPeriod: string;
    documentUrl?: string;
  };

  // Precise table coordinate mapping
  tableCoordinate: {
    pageNumber: number;
    tableName: string;
    rowIndex: number;
    columnIndex: number;
    cellValue: string;
    cellContext: string; // surrounding row/column headers
  };

  // Match scores
  matchScores: {
    tableCoordMatch: number; // 0-100: How well claim maps to table data
    textMatch: number; // 0-100: Semantic similarity score
    vms: number; // VMS = (0.65 * tableCoordMatch) + (0.35 * textMatch)
  };

  // Verification status
  verificationVerdict: 'VERIFIED' | 'PARTIAL' | 'CONTRADICTED' | 'UNVERIFIED';
  discrepancyNote?: string;
}

/**
 * Verified Match Score (VMS) - Patent #1 Core Calculation
 * VMS = (0.65 * TableCoordMatch) + (0.35 * TextMatch)
 * Tabular evidence overrides narrative text on discrepancy
 */
export interface VMSCalculation {
  score: number; // 0-100
  verdict: 'STRONG' | 'MODERATE' | 'WEAK' | 'CONTRADICTED';

  // Component scores
  tableCoordMatch: number;
  textMatch: number;

  // Evidence chain
  narrativeClaim: string;
  structuralAnchor: string;
  filingCitation: string;

  // Override flag
  tableOverridesNarrative: boolean;
  overrideReason?: string;
}

/**
 * Divergence Decoding - Patent #3 Look-Ahead Bias Prevention
 * Implements Inference-Time Unlearning to prevent "time travel" bias
 * Formula: l_hat_Q = l_P + alpha * (l_past - l_future)
 */
export interface DivergenceDecoding {
  // Temporal context
  cutoffDate: string; // T_cutoff: Point-in-time restriction
  analysisDate: string;

  // Parallel context verification
  pastContextHash: string; // Hash of data available at T_cutoff
  futureDataDetected: boolean;

  // Unlearning metrics
  unlearningApplied: boolean;
  alpha: number; // Divergence coefficient
  logitAdjustment: number;

  // Audit proof
  verdict: 'CLEAN' | 'ADJUSTED' | 'CONTAMINATED';
  auditNote: string;
}

/**
 * Forensic Audit Trail - Cryptographic proof chain
 * Stored in Supabase with hashed verification
 */
export interface ForensicAuditTrail {
  auditId: string;
  timestamp: number;

  // Input hashes (proves what data was used)
  inputHashes: {
    articleHash: string;
    filingHashes: string[];
    priceDataHash: string;
    cutoffTimestamp: number;
  };

  // Output verification
  outputHash: string;
  modelUsed: string;
  thinkingLevel: 'low' | 'medium' | 'high';

  // Thought signature for multi-step reasoning
  thoughtSignature?: string;

  // Litigation-safe proof
  verificationChain: {
    step: string;
    inputHash: string;
    outputHash: string;
    timestamp: number;
  }[];
}

/**
 * Narrative Half-Life Calculation - Patent #2
 * E(t) = E_0 * e^(-λt)
 * λ = ln(2) / t_1/2
 */
export interface NarrativeHalfLife {
  // Initial energy
  initialEnergy: number; // E_0: Starting narrative intensity

  // Decay parameters
  decayRate: number; // λ: Decay constant
  halfLifeDays: number; // t_1/2: Days until 50% energy loss

  // Current state
  currentDay: number;
  currentEnergy: number; // E(t)
  energyRemaining: number; // Percentage

  // Status classification
  narrativeStatus: 'ACTIVE' | 'DECAYING' | 'EXHAUSTED' | 'VALIDATED' | 'FAILED';

  // Prediction
  estimatedExhaustionDate: string;
  persistenceIndex: number; // NPI: 0-100
}

/**
 * Enhanced Forensic Calculation - Complete L3 Protocol
 */
export interface L3ForensicCalculation {
  // Core VMS
  vms: VMSCalculation;

  // Divergence Decoding
  divergenceDecoding: DivergenceDecoding;

  // Narrative Decay
  narrativeHalfLife: NarrativeHalfLife;

  // Overreaction Ratio
  overreactionRatio: {
    priceVelocity: number; // % price change
    fundamentalVelocity: number; // % fundamental change
    ratio: number; // OR = |PV| / |FV|
    verdict: 'NORMAL' | 'SLIGHT' | 'MODERATE' | 'HIGH' | 'EXTREME';
  };

  // Coordination Detection
  coordinationScore: {
    score: number; // 0-100
    timingCluster: boolean;
    identicalPhrasing: boolean;
    crossDeskDetected: boolean;
    verdict: 'NONE' | 'LOW' | 'MODERATE' | 'HIGH' | 'COORDINATED';
  };

  // Hype Discipline Score
  hypeDiscipline: {
    dataDensity: number; // Factual content ratio
    emotionalManipulation: number; // Hype language ratio
    hds: number; // HDS = DataDensity / EmotionalManipulation
    level: 'DISCIPLINED' | 'BALANCED' | 'HYPE_HEAVY' | 'PURE_HYPE';
  };

  // Narrative Premium/Discount
  narrativePremium: {
    fairValue: number; // $FV from DCF/fundamentals
    impliedPrice: number; // $IP from current narrative
    premium: number; // NPP = (IP - FV) / FV * 100
    verdict: 'DISCOUNT' | 'FAIR' | 'MILD_PREMIUM' | 'SIGNIFICANT_PREMIUM' | 'EXTREME_PREMIUM';
  };

  // Analyst Credibility (Bayesian)
  analystCredibility: {
    priorAccuracy: number;
    sampleSize: number;
    bayesianReliability: number; // ARB
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    assessment: string;
  };

  // Audit Trail
  auditTrail: ForensicAuditTrail;
}

/**
 * Gemini 3 Pro API Configuration
 */
export interface Gemini3ProConfig {
  model: 'gemini-3-pro-preview';
  thinkingLevel: 'low' | 'medium' | 'high';
  mediaResolution: 'low' | 'medium' | 'high';
  tools: {
    googleSearch: boolean;
    codeExecution: boolean;
  };
  responseMimeType: 'application/json';
  responseSchema?: object;
}

/**
 * Complete L3 Forensic Audit Response
 */
export interface L3ForensicAuditResponse {
  // Identification
  ticker: string;
  companyName: string;
  auditDate: string;
  auditId: string;

  // Article metadata
  article: {
    title: string;
    url: string;
    publication: string;
    publicationDate: string;
    credibilityScore: number;
  };

  // Core verdict
  verdict: {
    classification: 'STRUCTURALLY_SUPPORTED' | 'MIXED_INCOMPLETE' | 'NARRATIVE_TRAP' | 'SPECULATIVE_FRAMING' | 'FACTUALLY_MISLEADING';
    confidence: number;
    riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
    summary: string;
  };

  // Primary thesis
  primaryThesis: {
    statement: string;
    explanation: string;
    criticalFlaw?: string;
  };

  // Coordinate mapping evidence
  coordinateMappings: CoordinateMappingEvidence[];

  // L3 Forensic Calculation
  forensicCalculation: L3ForensicCalculation;

  // Grounding citations (from Google Search)
  groundingCitations: string[];

  // Model metadata
  modelMetadata: {
    model: string;
    thinkingLevel: string;
    thoughtSignature?: string;
    processingTime: number;
  };
}
