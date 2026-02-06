'use client';

import React, { useState } from 'react';
import { StockAnalysis, VERDICT_COLORS, RISK_COLORS } from '@/types';

interface IntelligenceViewProps {
  onSelect: (analysis: StockAnalysis) => void;
  trendingAudits: StockAnalysis[];
  isLoading: boolean;
  onRefresh: () => void;
  isQuotaExceeded?: boolean;
}

// Default structure for StockAnalysis fields
const getDefaultAnalysisFields = () => ({
  sentimentDynamics: [] as { date: string; avgSentiment: number; volume: number }[],
  pressAudits: [] as { date: string; headline: string; source: string; narrativeClaim: string; realityCheck: string; verdict: 'FACTUAL_CATALYST' | 'NARRATIVE_TRAP' | 'MARKET_NOISE' | 'SHORT_ATTACK' | 'SIGNAL_DIVERGENCE'; stockTrajectory: string; veracityScore: number; eventKeywords: string[] }[],
  forensicLedger: [] as { text: string; type: 'OPERATIONAL' | 'FINANCIAL' | 'MARKET_STRUCTURE' | 'BEHAVIORAL' | 'TECHNOLOGICAL'; horizon: 'IMMEDIATE' | 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM'; certainty: 'DEFINITIVE' | 'PROBABILISTIC' | 'SPECULATIVE'; evidenceQuality: 'HIGH' | 'MEDIUM' | 'LOW' | 'ABSENT'; sourceName: string; deconstruction: string; isMisleading: boolean; confidenceScore: number }[],
  keywordAnalysis: [] as { keyword: string; mentions: number; sentiment: number; impactScore: number; leadUpSpike: boolean }[],
  institutionalClaim: {
    analyst_name: '',
    institution_bank: '',
    source_type: '',
    medium: '',
    timestamp: '',
    stock_ticker: '',
    claim_text: '',
    numeric_anchor: '',
    claim_direction: 'NEUTRAL',
    assumptions: [] as string[],
    evidence: [] as string[],
    precedent: '',
    incentive_context: '',
    amplification_score: 0,
    outcome_tracking: '',
    credibility_score: 70,
  },
  narrativeInsights: {
    preEarnings: '',
    volumeBehavior: '',
    narrativeConsistency: '',
    newsAccuracyAnalysis: '',
  },
  timingVector: { daysRemaining: 30, totalHorizon: 90, description: '', eventDate: '' },
  analystAudit: { name: '', firm: '', pastAccuracy: 0, expertise: [] as string[], grade: '', credibilityScore: 50, focus: '', coverageHistory: [] as string[] },
  primaryThesis: { statement: '', explanation: '' },
  sourceQualityMatrix: { trackRecord: 80, institutionalWeight: 70, conflictRisk: 20 },
  structuralRiskAudit: { classification: 'MODERATE' as 'LOW' | 'MODERATE' | 'HIGH', description: '' },
  causalityAudit: { contractIntegrity: '', marketContext: '', behavioralData: '' },
  priceTargets: { median: 0, current: 0 },
});

// Mock data for narrative radar when API data is unavailable
const MOCK_NARRATIVES: StockAnalysis[] = [
  {
    ...getDefaultAnalysisFields(),
    articleTitle: 'NVIDIA Dominates AI Infrastructure: Is the Rally Sustainable?',
    articleUrl: 'https://marketwatch.com/nvidia-ai-infrastructure',
    publicationName: 'MarketWatch',
    publicationCredibility: 88,
    publicationAuthorityRank: 'A',
    ticker: 'NVDA',
    companyName: 'NVIDIA Corporation',
    sector: 'Technology',
    currentPrice: 878.35,
    storyCount: 15,
    auditVerdict: 'STRUCTURALLY_SUPPORTED',
    confidenceScore: 92,
    riskRating: 'LOW',
    manipulationRisk: 'LOW',
    summary: 'NVIDIA continues to dominate the AI chip market with record data center revenue. The structural thesis remains intact as hyperscaler spending accelerates through 2026.',
    primaryNarrative: 'AI infrastructure demand driving exponential growth',
    narrativeType: 'AI_GROWTH',
    forensicCalculation: { vms: { score: 85, verdict: 'HIGH', narrative: '', anchor: '' }, unlearning: { verdict: 'STABLE', status: '' }, overreaction: { ratio: 1.2, priceVelocity: 0, fundamentalVelocity: 0, verdict: 'SLIGHT' }, narrativeEnergy: { verdict: 'ACTIVE', description: '' }, halfLife: { days: 14, description: '' }, premium: { percentage: 15, fairValue: 0, impliedPrice: 0, verdict: '' }, coordination: { score: 45, verdict: 'MODERATE' }, hypeDiscipline: { score: 7, level: '', description: '' } },
    epistemicDrift: { magnitude: 18, verdict: 'ALIGNED', narrativeProjection: '', structuralReality: '' },
    socialMomentum: { score: 85, trend: 'RISING', crowdBias: 45, expertBias: 60 },
    analystAudit: { name: 'C.J. Muse', firm: 'Cantor Fitzgerald', pastAccuracy: 78, expertise: ['Semiconductors', 'AI'], grade: 'A', credibilityScore: 82, focus: 'Technology', coverageHistory: ['NVDA', 'AMD', 'INTC'] },
    timestamp: Date.now(),
  },
  {
    ...getDefaultAnalysisFields(),
    articleTitle: 'Tesla Price Cuts: Strategic Move or Demand Crisis?',
    articleUrl: 'https://bloomberg.com/tesla-price-cuts',
    publicationName: 'Bloomberg',
    publicationCredibility: 90,
    publicationAuthorityRank: 'A',
    ticker: 'TSLA',
    companyName: 'Tesla Inc',
    sector: 'Automotive',
    currentPrice: 175.21,
    storyCount: 12,
    auditVerdict: 'NARRATIVE_TRAP',
    confidenceScore: 78,
    riskRating: 'HIGH',
    manipulationRisk: 'MEDIUM',
    summary: 'Tesla\'s aggressive price cuts suggest demand softening rather than strategic positioning. Margin compression risks remain elevated as competition intensifies.',
    primaryNarrative: 'EV demand uncertainty amid price wars',
    narrativeType: 'MARKET_SENTIMENT',
    forensicCalculation: { vms: { score: 45, verdict: 'LOW', narrative: '', anchor: '' }, unlearning: { verdict: 'DRIFTING', status: '' }, overreaction: { ratio: 1.8, priceVelocity: 0, fundamentalVelocity: 0, verdict: 'HIGH' }, narrativeEnergy: { verdict: 'DECAYING', description: '' }, halfLife: { days: 5, description: '' }, premium: { percentage: -8, fairValue: 0, impliedPrice: 0, verdict: '' }, coordination: { score: 65, verdict: 'HIGH' }, hypeDiscipline: { score: 3, level: '', description: '' } },
    epistemicDrift: { magnitude: 55, verdict: 'DIVERGENT', narrativeProjection: '', structuralReality: '' },
    socialMomentum: { score: 65, trend: 'DECAYING', crowdBias: -25, expertBias: -15 },
    analystAudit: { name: 'Adam Jonas', firm: 'Morgan Stanley', pastAccuracy: 68, expertise: ['EV', 'Automotive'], grade: 'B', credibilityScore: 71, focus: 'Automotive', coverageHistory: ['TSLA', 'GM', 'F'] },
    timestamp: Date.now() - 3600000,
  },
  {
    ...getDefaultAnalysisFields(),
    articleTitle: 'Apple Services Revenue Hits Record: A New Growth Engine?',
    articleUrl: 'https://reuters.com/apple-services',
    publicationName: 'Reuters',
    publicationCredibility: 92,
    publicationAuthorityRank: 'A',
    ticker: 'AAPL',
    companyName: 'Apple Inc',
    sector: 'Technology',
    currentPrice: 182.52,
    storyCount: 8,
    auditVerdict: 'MIXED_INCOMPLETE',
    confidenceScore: 85,
    riskRating: 'MODERATE',
    manipulationRisk: 'LOW',
    summary: 'Apple\'s services segment continues to outperform, potentially offsetting iPhone cycle concerns. The narrative shift toward services-driven growth requires further validation.',
    primaryNarrative: 'Services growth offsetting hardware dependence',
    narrativeType: 'EARNINGS',
    forensicCalculation: { vms: { score: 70, verdict: 'MODERATE', narrative: '', anchor: '' }, unlearning: { verdict: 'STABLE', status: '' }, overreaction: { ratio: 1.1, priceVelocity: 0, fundamentalVelocity: 0, verdict: 'NORMAL' }, narrativeEnergy: { verdict: 'ACTIVE', description: '' }, halfLife: { days: 10, description: '' }, premium: { percentage: 5, fairValue: 0, impliedPrice: 0, verdict: '' }, coordination: { score: 35, verdict: 'LOW' }, hypeDiscipline: { score: 6, level: '', description: '' } },
    epistemicDrift: { magnitude: 28, verdict: 'ALIGNED', narrativeProjection: '', structuralReality: '' },
    socialMomentum: { score: 70, trend: 'STABLE', crowdBias: 15, expertBias: 20 },
    analystAudit: { name: 'Tim Cook', firm: 'Apple Inc (CEO)', pastAccuracy: 85, expertise: ['Consumer Tech'], grade: 'A', credibilityScore: 88, focus: 'Apple', coverageHistory: ['AAPL'] },
    timestamp: Date.now() - 7200000,
  },
  {
    ...getDefaultAnalysisFields(),
    articleTitle: 'Microsoft Cloud Growth Accelerates: Azure Gaining on AWS',
    articleUrl: 'https://wsj.com/microsoft-azure',
    publicationName: 'Wall Street Journal',
    publicationCredibility: 95,
    publicationAuthorityRank: 'A',
    ticker: 'MSFT',
    companyName: 'Microsoft Corporation',
    sector: 'Technology',
    currentPrice: 425.22,
    storyCount: 10,
    auditVerdict: 'STRUCTURALLY_SUPPORTED',
    confidenceScore: 90,
    riskRating: 'LOW',
    manipulationRisk: 'LOW',
    summary: 'Microsoft Azure continues to gain market share as enterprise AI adoption accelerates. The integration of OpenAI technology provides sustainable competitive advantage.',
    primaryNarrative: 'Cloud and AI synergy driving growth',
    narrativeType: 'AI_GROWTH',
    forensicCalculation: { vms: { score: 82, verdict: 'HIGH', narrative: '', anchor: '' }, unlearning: { verdict: 'STABLE', status: '' }, overreaction: { ratio: 1.0, priceVelocity: 0, fundamentalVelocity: 0, verdict: 'NORMAL' }, narrativeEnergy: { verdict: 'ACTIVE', description: '' }, halfLife: { days: 12, description: '' }, premium: { percentage: 10, fairValue: 0, impliedPrice: 0, verdict: '' }, coordination: { score: 40, verdict: 'MODERATE' }, hypeDiscipline: { score: 7, level: '', description: '' } },
    epistemicDrift: { magnitude: 20, verdict: 'ALIGNED', narrativeProjection: '', structuralReality: '' },
    socialMomentum: { score: 75, trend: 'RISING', crowdBias: 30, expertBias: 35 },
    analystAudit: { name: 'Brent Thill', firm: 'Jefferies', pastAccuracy: 74, expertise: ['Software', 'Cloud'], grade: 'A', credibilityScore: 79, focus: 'Software', coverageHistory: ['MSFT', 'CRM', 'ORCL'] },
    timestamp: Date.now() - 10800000,
  },
  {
    ...getDefaultAnalysisFields(),
    articleTitle: 'Meta\'s AI Pivot: Can Zuckerberg Compete with OpenAI?',
    articleUrl: 'https://techcrunch.com/meta-ai-pivot',
    publicationName: 'TechCrunch',
    publicationCredibility: 80,
    publicationAuthorityRank: 'B',
    ticker: 'META',
    companyName: 'Meta Platforms Inc',
    sector: 'Technology',
    currentPrice: 505.95,
    storyCount: 7,
    auditVerdict: 'SPECULATIVE_FRAMING',
    confidenceScore: 72,
    riskRating: 'MODERATE',
    manipulationRisk: 'MEDIUM',
    summary: 'Meta\'s aggressive AI investments face scrutiny as competition intensifies. The pivot from metaverse to AI raises questions about strategic consistency.',
    primaryNarrative: 'AI investment narrative replacing metaverse',
    narrativeType: 'MARKET_SENTIMENT',
    forensicCalculation: { vms: { score: 55, verdict: 'MODERATE', narrative: '', anchor: '' }, unlearning: { verdict: 'DRIFTING', status: '' }, overreaction: { ratio: 1.4, priceVelocity: 0, fundamentalVelocity: 0, verdict: 'MODERATE' }, narrativeEnergy: { verdict: 'ACTIVE', description: '' }, halfLife: { days: 7, description: '' }, premium: { percentage: 3, fairValue: 0, impliedPrice: 0, verdict: '' }, coordination: { score: 55, verdict: 'MODERATE' }, hypeDiscipline: { score: 4, level: '', description: '' } },
    epistemicDrift: { magnitude: 42, verdict: 'DIVERGENT', narrativeProjection: '', structuralReality: '' },
    socialMomentum: { score: 60, trend: 'STABLE', crowdBias: -5, expertBias: 10 },
    timestamp: Date.now() - 14400000,
  },
  {
    ...getDefaultAnalysisFields(),
    articleTitle: 'Amazon AWS Revenue Growth Slows: Market Share Pressure',
    articleUrl: 'https://cnbc.com/amazon-aws',
    publicationName: 'CNBC',
    publicationCredibility: 85,
    publicationAuthorityRank: 'A',
    ticker: 'AMZN',
    companyName: 'Amazon.com Inc',
    sector: 'Technology',
    currentPrice: 185.50,
    storyCount: 9,
    auditVerdict: 'MIXED_INCOMPLETE',
    confidenceScore: 80,
    riskRating: 'MODERATE',
    manipulationRisk: 'LOW',
    summary: 'AWS growth deceleration reflects enterprise spending optimization rather than fundamental weakness. Retail segment recovery provides diversification benefit.',
    primaryNarrative: 'Cloud growth normalization with retail tailwind',
    narrativeType: 'EARNINGS',
    forensicCalculation: { vms: { score: 68, verdict: 'MODERATE', narrative: '', anchor: '' }, unlearning: { verdict: 'STABLE', status: '' }, overreaction: { ratio: 1.2, priceVelocity: 0, fundamentalVelocity: 0, verdict: 'SLIGHT' }, narrativeEnergy: { verdict: 'ACTIVE', description: '' }, halfLife: { days: 9, description: '' }, premium: { percentage: 2, fairValue: 0, impliedPrice: 0, verdict: '' }, coordination: { score: 38, verdict: 'LOW' }, hypeDiscipline: { score: 6, level: '', description: '' } },
    epistemicDrift: { magnitude: 32, verdict: 'ALIGNED', narrativeProjection: '', structuralReality: '' },
    socialMomentum: { score: 68, trend: 'STABLE', crowdBias: 10, expertBias: 15 },
    timestamp: Date.now() - 18000000,
  },
];

const IntelligenceView: React.FC<IntelligenceViewProps> = ({
  onSelect,
  trendingAudits,
  isLoading,
  onRefresh,
  isQuotaExceeded,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'BULLISH' | 'BEARISH' | 'TRAP'>('ALL');
  const [sortBy, setSortBy] = useState<'recent' | 'confidence' | 'risk'>('recent');

  // Use mock data if no trending audits available or if data is incomplete
  // Check that audits have valid ticker, companyName, and articleTitle
  const validAudits = trendingAudits.filter(a => a.ticker && a.companyName && a.articleTitle);
  const displayAudits = validAudits.length >= 3 ? validAudits : MOCK_NARRATIVES;

  // Filter audits
  const filteredAudits = displayAudits.filter(audit => {
    if (filter === 'ALL') return true;
    if (filter === 'BULLISH') return audit.auditVerdict === 'STRUCTURALLY_SUPPORTED';
    if (filter === 'BEARISH') return audit.riskRating === 'HIGH';
    if (filter === 'TRAP') return audit.auditVerdict === 'NARRATIVE_TRAP';
    return true;
  });

  // Sort audits
  const sortedAudits = [...filteredAudits].sort((a, b) => {
    if (sortBy === 'confidence') return (b.confidenceScore || 0) - (a.confidenceScore || 0);
    if (sortBy === 'risk') {
      const riskOrder = { HIGH: 3, MODERATE: 2, LOW: 1 };
      return (riskOrder[b.riskRating] || 0) - (riskOrder[a.riskRating] || 0);
    }
    return 0; // recent - keep original order
  });

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 py-16 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Live Intelligence</span>
              </div>
              <h1 className="text-4xl font-black text-white mb-2">Narrative Radar Dashboard</h1>
              <p className="text-slate-400 font-medium">
                Real-time forensic intelligence on market-moving narratives
              </p>
            </div>
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="px-6 py-3 bg-indigo-600 text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-indigo-500 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-500/25"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Intel
                </>
              )}
            </button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <p className="text-2xl font-black text-white">{sortedAudits.length}</p>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Active Narratives</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <p className="text-2xl font-black text-emerald-400">{sortedAudits.filter(a => a.auditVerdict === 'STRUCTURALLY_SUPPORTED').length}</p>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Validated</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <p className="text-2xl font-black text-red-400">{sortedAudits.filter(a => a.auditVerdict === 'NARRATIVE_TRAP').length}</p>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Traps Detected</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <p className="text-2xl font-black text-amber-400">{sortedAudits.filter(a => a.riskRating === 'HIGH').length}</p>
              <p className="text-xs text-slate-400 uppercase tracking-wider">High Risk</p>
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="bg-white border-b border-slate-200 sticky top-16 z-40">
        <div className="max-w-[1200px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {(['ALL', 'BULLISH', 'BEARISH', 'TRAP'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                    filter === f
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f === 'TRAP' ? 'Narrative Traps' : f}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 font-medium">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'recent' | 'confidence' | 'risk')}
                className="px-3 py-2 bg-slate-100 border-none rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="recent">Most Recent</option>
                <option value="confidence">Confidence Score</option>
                <option value="risk">Risk Level</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 px-6">
        <div className="max-w-[1200px] mx-auto">
          {isQuotaExceeded ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">API Quota Exceeded</h2>
              <p className="text-slate-600 mb-6">Please wait a moment before refreshing</p>
              <button
                onClick={onRefresh}
                className="px-6 py-3 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-slate-800"
              >
                Try Again
              </button>
            </div>
          ) : isLoading ? (
            <div className="text-center py-20">
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 border-4 border-slate-200 rounded-full" />
                <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-slate-600 font-medium">Scanning market narratives...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedAudits.map((audit, index) => (
                <div
                  key={index}
                  onClick={() => onSelect(audit)}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden cursor-pointer hover:shadow-xl hover:border-slate-300 transition-all duration-300 group"
                >
                  {/* Article Header */}
                  <div className="p-6 border-b border-slate-100">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        {/* Ticker Badge */}
                        <div className="w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-xl transition-all">
                          <span className="text-white font-black text-xl">{audit.ticker}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Publication Info */}
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold text-indigo-600">{audit.publicationName}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-xs text-slate-600">{audit.companyName}</span>
                            {audit.articleUrl && (
                              <>
                                <span className="text-slate-300">•</span>
                                <a
                                  href={audit.articleUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-xs text-indigo-500 hover:underline flex items-center gap-1"
                                >
                                  View Source
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              </>
                            )}
                          </div>

                          {/* Article Title */}
                          <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                            {audit.articleTitle || `${audit.ticker} Market Analysis`}
                          </h3>
                        </div>
                      </div>

                      {/* Right Side: Price & Verdict */}
                      <div className="text-right flex-shrink-0">
                        {audit.currentPrice && (
                          <p className="text-2xl font-black text-slate-900">${audit.currentPrice.toFixed(2)}</p>
                        )}
                        <div
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider mt-2"
                          style={{
                            backgroundColor: `${VERDICT_COLORS[audit.auditVerdict]}15`,
                            color: VERDICT_COLORS[audit.auditVerdict],
                          }}
                        >
                          {audit.auditVerdict.replace(/_/g, ' ')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="px-6 py-4 bg-slate-50">
                    <p className="text-sm text-slate-600 leading-relaxed">{audit.summary}</p>
                  </div>

                  {/* Metrics */}
                  <div className="px-6 py-4">
                    <div className="grid grid-cols-6 gap-4">
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-600 uppercase mb-1">VMS</p>
                        <p className="text-xl font-black text-slate-900">
                          {audit.forensicCalculation?.vms?.score || '-'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-600 uppercase mb-1">Drift</p>
                        <p className="text-xl font-black text-slate-900">
                          {audit.epistemicDrift?.magnitude || '-'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-600 uppercase mb-1">Confidence</p>
                        <p className="text-xl font-black text-indigo-600">{audit.confidenceScore}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-600 uppercase mb-1">Risk</p>
                        <p
                          className="text-xl font-black"
                          style={{ color: RISK_COLORS[audit.riskRating] }}
                        >
                          {audit.riskRating}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-600 uppercase mb-1">Half-Life</p>
                        <p className="text-xl font-black text-slate-900">
                          {audit.forensicCalculation?.halfLife?.days || 7}d
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-600 uppercase mb-1">Stories</p>
                        <p className="text-xl font-black text-slate-900">
                          {audit.storyCount || '-'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-slate-600">
                        <span className="font-bold text-slate-700">Narrative: </span>
                        {audit.primaryNarrative}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-2 group-hover:gap-3 transition-all">
                      View Full Audit
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default IntelligenceView;
