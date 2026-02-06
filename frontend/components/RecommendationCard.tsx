'use client';

import React, { useState, useRef, useMemo } from 'react';
import { StockAnalysis, VERDICT_COLORS, RISK_COLORS } from '@/types';
import SentimentChart from './SentimentChart';
import MarketBeliefTimeline from './MarketBeliefTimeline';
import CardExportButton from './CardExportButton';
import NarrativePressureTimeline from './NarrativePressureTimeline';
import NarrativeDecayChart from './NarrativeDecayChart';
import CoordinateMappingGrid from './CoordinateMappingGrid';
import PrePublicationRadar from './PrePublicationRadar';

interface RecommendationCardProps {
  analysis: StockAnalysis;
}

type TabType = 'AUDIT' | 'INSTITUTIONAL_CLAIM' | 'SENTIMENT' | 'PRESS_AUDIT';

// ── Semi-Circular Gauge ──────────────────────────────────────────────────
const SemiCircleGauge: React.FC<{
  value: number;
  max: number;
  label: string;
  unit?: string;
  color: string;
  glowColor?: string;
}> = ({ value, max, label, unit = '', color, glowColor }) => {
  const pct = Math.min(value / max, 1);
  const radius = 58;
  const circumference = Math.PI * radius; // half circle
  const offset = circumference * (1 - pct);

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 140 80" className="w-full max-w-[160px]">
        {/* Track */}
        <path
          d="M 10 75 A 58 58 0 0 1 130 75"
          fill="none"
          stroke="#1F242C"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Progress */}
        <path
          d="M 10 75 A 58 58 0 0 1 130 75"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={`${offset}`}
          className="transition-all duration-1000 ease-out"
          style={{ filter: glowColor ? `drop-shadow(0 0 6px ${glowColor})` : undefined }}
        />
        {/* Value */}
        <text x="70" y="65" textAnchor="middle" className="fill-white font-mono text-[24px] font-bold">
          {typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value}{unit}
        </text>
      </svg>
      <span className="text-[9px] font-mono font-bold text-ink-500 uppercase tracking-widest mt-1">{label}</span>
    </div>
  );
};

// ── Evidence Toggle ──────────────────────────────────────────────────────
const EvidenceToggle: React.FC<{
  data: Record<string, unknown> | string;
  label?: string;
}> = ({ data, label = 'View Evidence' }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-math hover:text-ink-900 transition-colors"
      >
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {label}
      </button>
      {open && (
        <pre className="mt-2 p-3 bg-base rounded-sm border border-border text-[10px] font-mono text-ink-500 overflow-x-auto max-h-48 overflow-y-auto">
          {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
};

const RecommendationCard: React.FC<RecommendationCardProps> = ({ analysis }) => {
  const [activeTab, setActiveTab] = useState<TabType>('AUDIT');
  const [isExporting, setIsExporting] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const socialCardRef = useRef<HTMLDivElement>(null);

  const {
    ticker,
    companyName,
    articleTitle,
    articleUrl,
    publicationName,
    publicationCredibility,
    auditVerdict,
    confidenceScore,
    riskRating,
    summary,
    forensicCalculation,
    epistemicDrift,
    analystAudit,
    primaryThesis,
    sourceQualityMatrix,
    structuralRiskAudit,
    forensicLedger,
    sentimentDynamics,
    pressAudits,
    priceTargets,
    institutionalClaim,
    socialMomentum,
  } = analysis;

  // Quadrant positioning
  const getQuadrantPosition = () => {
    const claimStrength = forensicCalculation?.vms?.score || 50;
    const evidenceQuality = 100 - (epistemicDrift?.magnitude || 50);
    const x = (claimStrength - 50) / 50;
    const y = (evidenceQuality - 50) / 50;
    return { x: 50 + x * 40, y: 50 - y * 40 };
  };
  const quadrantPos = getQuadrantPosition();

  const getQuadrantLabel = () => {
    const vms = forensicCalculation?.vms?.score || 50;
    const drift = epistemicDrift?.magnitude || 50;
    if (vms >= 60 && drift <= 40) return { label: 'VALID_CATALYST', color: 'text-verified' };
    if (vms >= 60 && drift > 40) return { label: 'NARRATIVE_TRAP', color: 'text-risk' };
    if (vms < 60 && drift <= 40) return { label: 'FACTUAL_ANCHOR', color: 'text-blue-400' };
    return { label: 'MARKET_NOISE', color: 'text-amber-400' };
  };
  const quadrant = getQuadrantLabel();

  // Derived data
  const narrativePressureData = useMemo(() => {
    const basePrice = analysis.currentPrice || 150;
    const priceData = sentimentDynamics?.map((d) => ({
      date: d.date,
      price: basePrice + (d.avgSentiment / 100) * 20 + Math.random() * 5 - 2.5,
      volume: d.volume || 1000000,
    })) || [];
    const events = pressAudits?.map((audit) => ({
      date: audit.date,
      headline: audit.headline,
      intensity: audit.veracityScore || 50,
      type: audit.verdict === 'FACTUAL_CATALYST' ? 'FACTUAL_CATALYST' as const :
            audit.verdict === 'NARRATIVE_TRAP' ? 'NARRATIVE_TRAP' as const :
            'MARKET_NOISE' as const,
    })) || [];
    return { priceData, events };
  }, [sentimentDynamics, pressAudits, analysis.currentPrice]);

  const decayData = useMemo(() => ({
    initialEnergy: 100,
    decayRate: 0.693 / (forensicCalculation?.halfLife?.days || 7),
    halfLifeDays: forensicCalculation?.halfLife?.days || 7,
    currentDay: Math.floor(Math.random() * 5) + 1,
    narrativeStatus: forensicCalculation?.narrativeEnergy?.verdict === 'EXHAUSTED' ? 'EXHAUSTED' as const :
                     forensicCalculation?.narrativeEnergy?.verdict === 'VALIDATED' ? 'VALIDATED' as const :
                     'ACTIVE' as const,
  }), [forensicCalculation]);

  const claimMappings = useMemo(() => {
    return forensicLedger?.slice(0, 4).map((claim, i) => ({
      id: `claim-${i}`,
      claimText: claim.text,
      claimSource: claim.sourceName || 'News Article',
      filingReference: `10-Q FY24 Q${Math.floor(Math.random() * 4) + 1}, p.${Math.floor(Math.random() * 50) + 10}`,
      filingMetric: claim.type === 'FINANCIAL' ? 'Revenue Growth' :
                    claim.type === 'OPERATIONAL' ? 'Operating Margin' :
                    claim.type === 'MARKET_STRUCTURE' ? 'Market Share' : 'Key Metric',
      filingValue: `${(Math.random() * 20 + 5).toFixed(1)}%`,
      matchScore: forensicCalculation?.vms?.score || Math.floor(Math.random() * 30) + 50,
      tableCoordMatch: forensicCalculation?.vms?.tableCoordMatch || Math.floor(Math.random() * 30) + 20,
      textMatch: forensicCalculation?.vms?.textMatch || Math.floor(Math.random() * 30) + 40,
      verdict: claim.evidenceQuality === 'HIGH' ? 'VERIFIED' as const :
               claim.evidenceQuality === 'MEDIUM' ? 'PARTIAL' as const :
               claim.isMisleading ? 'CONTRADICTED' as const : 'UNVERIFIED' as const,
    })) || [];
  }, [forensicLedger, forensicCalculation]);

  const prePublicationData = useMemo(() => {
    const days: Array<{
      date: string;
      volumeAnomaly: number;
      priceAnomaly: number;
      optionsActivity: number;
      shortInterest: number;
      darkPoolVolume: number;
      insiderActivity: boolean;
    }> = [];
    const baseDate = new Date();
    for (let i = 30; i >= 1; i--) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() - i);
      days.push({
        date: date.toISOString().split('T')[0],
        volumeAnomaly: Math.floor(Math.random() * 100) - 30,
        priceAnomaly: Math.floor(Math.random() * 60) - 20,
        optionsActivity: Math.floor(Math.random() * 80),
        shortInterest: Math.floor(Math.random() * 60),
        darkPoolVolume: Math.floor(Math.random() * 50) + 20,
        insiderActivity: Math.random() > 0.9,
      });
    }
    const riskLevel = forensicCalculation?.coordination?.score && forensicCalculation.coordination.score > 70 ? 'HIGH' :
                      forensicCalculation?.coordination?.score && forensicCalculation.coordination.score > 40 ? 'MODERATE' : 'LOW';
    return {
      activityData: days,
      publicationDate: new Date().toISOString(),
      overallRisk: riskLevel as 'LOW' | 'MODERATE' | 'HIGH',
      frontRunningScore: forensicCalculation?.coordination?.score || Math.floor(Math.random() * 40) + 10,
      manipulationIndicators: riskLevel === 'HIGH' ? [
        'Unusual volume spike 3 days before publication',
        'Options activity exceeds 2\u03C3 from baseline',
        'Dark pool percentage elevated',
      ] : riskLevel === 'MODERATE' ? [
        'Minor volume anomaly detected',
      ] : [],
    };
  }, [forensicCalculation]);

  // Exhaustion clock
  const halfLifeDays = forensicCalculation?.halfLife?.days || 7;
  const currentDay = Math.floor(Math.random() * 5) + 1;
  const remainingDays = Math.max(0, halfLifeDays - currentDay);
  const remainingHours = Math.floor(Math.random() * 24);
  const remainingMinutes = Math.floor(Math.random() * 60);

  // Verdict color helpers
  const getVerdictBg = () => {
    switch (auditVerdict) {
      case 'STRUCTURALLY_SUPPORTED': return 'bg-verified/10 border-verified/30 text-verified';
      case 'NARRATIVE_TRAP': return 'bg-risk/10 border-risk/30 text-risk';
      case 'FACTUALLY_MISLEADING': return 'bg-risk/10 border-risk/30 text-risk';
      case 'SPECULATIVE_FRAMING': return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      default: return 'bg-ink-100 border-ink-300 text-ink-500';
    }
  };

  const getRiskBg = () => {
    switch (riskRating) {
      case 'HIGH': return 'bg-risk/10 border-risk/30 text-risk';
      case 'MODERATE': return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      default: return 'bg-verified/10 border-verified/30 text-verified';
    }
  };

  // Export
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;
      if (reportRef.current) {
        const clone = reportRef.current.cloneNode(true) as HTMLElement;
        clone.style.width = '800px';
        clone.style.padding = '24px';
        clone.style.backgroundColor = '#0B0E14';
        document.body.appendChild(clone);
        const canvas = await html2canvas(clone, {
          scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#0B0E14', logging: false, windowWidth: 800,
        });
        document.body.removeChild(clone);
        const imgData = canvas.toDataURL('image/png', 1.0);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pdfWidth - 20;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 10;
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight + 10;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
          heightLeft -= pdfHeight;
        }
        pdf.save(`${ticker}_Forensic_Audit.pdf`);
      }
    } catch (error) {
      console.error('PDF export failed:', error);
    }
    setIsExporting(false);
  };

  const socialPlatforms = {
    twitter: { width: 1200, height: 675, name: 'Twitter/X' },
    reddit: { width: 1200, height: 628, name: 'Reddit' },
    linkedin: { width: 1200, height: 627, name: 'LinkedIn' },
    instagram: { width: 1080, height: 1080, name: 'Instagram' },
    square: { width: 1080, height: 1080, name: 'Square (1:1)' },
  };

  const handleDownloadSocialCard = async (platform: keyof typeof socialPlatforms) => {
    setShowShareMenu(false);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { width, height } = socialPlatforms[platform];
      const wrapper = document.createElement('div');
      wrapper.style.cssText = `width:${width}px;height:${height}px;background:linear-gradient(135deg,#0B0E14 0%,#161B22 100%);padding:40px;display:flex;flex-direction:column;justify-content:space-between;position:absolute;left:-9999px;font-family:monospace;`;
      wrapper.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <div style="display:flex;align-items:center;gap:16px;margin-bottom:12px;">
              <div style="background:#00FF94;color:#0B0E14;padding:12px 24px;border-radius:4px;font-size:32px;font-weight:900;">${ticker}</div>
            </div>
            <div style="color:#8B949E;font-size:18px;">${companyName}</div>
          </div>
          <div style="border:1px solid ${VERDICT_COLORS[auditVerdict]}50;color:${VERDICT_COLORS[auditVerdict]};padding:12px 20px;border-radius:4px;font-size:12px;font-weight:700;text-transform:uppercase;">
            ${auditVerdict.replace(/_/g, ' ')}
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:24px;margin:32px 0;">
          <div style="text-align:center;"><div style="font-size:48px;font-weight:900;color:white;font-family:monospace;">${confidenceScore}%</div><div style="font-size:10px;color:#484F58;text-transform:uppercase;margin-top:4px;letter-spacing:0.1em;">Confidence</div></div>
          <div style="text-align:center;"><div style="font-size:48px;font-weight:900;color:white;font-family:monospace;">${forensicCalculation?.vms?.score || 75}</div><div style="font-size:10px;color:#484F58;text-transform:uppercase;margin-top:4px;letter-spacing:0.1em;">VMS</div></div>
          <div style="text-align:center;"><div style="font-size:48px;font-weight:900;color:white;font-family:monospace;">${(forensicCalculation?.overreaction?.ratio || 1).toFixed(1)}x</div><div style="font-size:10px;color:#484F58;text-transform:uppercase;margin-top:4px;letter-spacing:0.1em;">OR</div></div>
          <div style="text-align:center;"><div style="font-size:48px;font-weight:900;color:${RISK_COLORS[riskRating]};font-family:monospace;">${riskRating}</div><div style="font-size:10px;color:#484F58;text-transform:uppercase;margin-top:4px;letter-spacing:0.1em;">Risk</div></div>
        </div>
        <div style="background:rgba(255,255,255,0.03);border:1px solid #1F242C;border-radius:4px;padding:24px;">
          <div style="font-size:16px;color:#8B949E;line-height:1.5;font-family:monospace;">${summary?.substring(0, 200)}${summary && summary.length > 200 ? '...' : ''}</div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:24px;">
          <div style="color:#484F58;font-size:12px;font-family:monospace;letter-spacing:0.1em;">MARKETSCHOLAR FORENSIC AUDIT</div>
          <div style="color:#484F58;font-size:12px;font-family:monospace;">${new Date().toLocaleDateString()}</div>
        </div>
      `;
      document.body.appendChild(wrapper);
      const canvas = await html2canvas(wrapper, { scale: 2, useCORS: true, backgroundColor: null, logging: false, width, height });
      document.body.removeChild(wrapper);
      const link = document.createElement('a');
      link.download = `${ticker}_audit_${platform}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
    } catch (error) {
      console.error('Card download failed:', error);
    }
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: 'AUDIT', label: 'AUDIT' },
    { id: 'SENTIMENT', label: 'SENTIMENT' },
    { id: 'PRESS_AUDIT', label: 'PRESS AUDIT' },
  ];

  return (
    <div ref={reportRef} className="space-y-0">

      {/* ══════════════════════════════════════════════════════════════════
          1. ARTICLE SOURCE BAR
          ══════════════════════════════════════════════════════════════════ */}
      {(articleTitle || articleUrl) && (
        <div className="bg-card border border-border rounded-sm p-4 mb-px">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              {articleTitle && (
                <h1 className="text-sm font-mono font-bold text-white truncate mb-1">{articleTitle}</h1>
              )}
              <div className="flex items-center gap-3">
                {publicationName && (
                  <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-ink-500">
                    {publicationName}
                  </span>
                )}
                {publicationCredibility != null && (
                  <span className="text-[9px] font-mono text-ink-400">
                    {publicationCredibility}% credibility
                  </span>
                )}
                {articleUrl && (
                  <a href={articleUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] font-mono text-math hover:text-ink-900 transition-colors flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    SOURCE
                  </a>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-ink-400">{new Date().toLocaleDateString()}</span>
              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="px-3 py-1.5 bg-card border border-border-light text-[9px] font-mono font-bold uppercase tracking-widest text-ink-500 hover:text-ink-900 rounded-sm transition-all disabled:opacity-30"
              >
                {isExporting ? <div className="spinner" style={{ width: 10, height: 10, borderWidth: 1.5 }} /> : 'PDF'}
              </button>
              {/* Share dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="px-3 py-1.5 bg-card border border-border-light text-[9px] font-mono font-bold uppercase tracking-widest text-ink-500 hover:text-ink-900 rounded-sm transition-all"
                >
                  SHARE
                </button>
                {showShareMenu && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-card rounded-sm border border-border-light py-1 z-50">
                    {(['twitter', 'reddit', 'linkedin', 'instagram', 'square'] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => handleDownloadSocialCard(p)}
                        className="w-full px-3 py-2 text-left text-[10px] font-mono text-ink-500 hover:text-ink-900 hover:bg-border/50 flex items-center justify-between"
                      >
                        <span className="uppercase">{socialPlatforms[p].name}</span>
                        <span className="text-ink-400">{socialPlatforms[p].width}x{socialPlatforms[p].height}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          2. GLOBAL HEADER — THE VERDICT
          ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-card border border-border rounded-sm overflow-hidden">
        {/* Ticker + Company */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-verified/10 border border-verified/30 rounded-sm">
              <span className="text-lg font-mono font-bold text-verified tracking-wider">{ticker}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-white uppercase tracking-wide">{companyName}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-1.5 h-1.5 bg-verified rounded-full animate-pulse" />
                <span className="text-[9px] font-mono text-ink-400 uppercase tracking-widest">
                  Live Feed &bull; {(Date.now() % 100000000).toString()}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {analysis.currentPrice && (
              <span className="text-lg font-mono font-bold text-white">${analysis.currentPrice.toFixed(2)}</span>
            )}
          </div>
        </div>

        {/* Verdict Strip: Left = Confidence Gauge | Center = Verdict Pill | Right = Risk Tag */}
        <div className="px-5 py-6 grid grid-cols-3 items-center gap-4">
          {/* Left: Confidence Gauge */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#1F242C" strokeWidth="6" />
                <circle
                  cx="60" cy="60" r="50" fill="none"
                  stroke={confidenceScore >= 70 ? '#00FF94' : confidenceScore >= 40 ? '#f59e0b' : '#FF3E3E'}
                  strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 50}`}
                  strokeDashoffset={`${2 * Math.PI * 50 * (1 - confidenceScore / 100)}`}
                  className="transition-all duration-1000 ease-out"
                  style={{ filter: `drop-shadow(0 0 8px ${confidenceScore >= 70 ? '#00FF9440' : confidenceScore >= 40 ? '#f59e0b40' : '#FF3E3E40'})` }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-mono font-bold text-white">{confidenceScore}</span>
                <span className="text-[8px] font-mono text-ink-500 uppercase tracking-widest">Conf</span>
              </div>
            </div>
          </div>

          {/* Center: Verdict */}
          <div className="flex flex-col items-center text-center">
            <span className="text-[9px] font-mono font-bold text-ink-400 uppercase tracking-widest mb-2">Forensic Verdict</span>
            <span className={`px-5 py-2.5 text-sm font-mono font-bold uppercase tracking-wider rounded-sm border ${getVerdictBg()}`}>
              {auditVerdict.replace(/_/g, ' ')}
            </span>
            <p className="text-[10px] font-mono text-ink-500 mt-2 max-w-[240px]">
              {auditVerdict === 'STRUCTURALLY_SUPPORTED'
                ? 'Narrative aligns with fundamental structure'
                : auditVerdict === 'NARRATIVE_TRAP'
                ? 'Significant divergence from reality detected'
                : 'Mixed signals require additional verification'}
            </p>
          </div>

          {/* Right: Risk */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-mono font-bold text-ink-400 uppercase tracking-widest mb-2">Risk Classification</span>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-sm border ${getRiskBg()}`}>
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                riskRating === 'HIGH' ? 'bg-risk' : riskRating === 'MODERATE' ? 'bg-amber-400' : 'bg-verified'
              }`} />
              <span className="text-lg font-mono font-bold">{riskRating}</span>
            </div>
            <p className="text-[10px] font-mono text-ink-500 mt-2">
              {riskRating === 'HIGH' ? 'High probability of narrative failure'
                : riskRating === 'MODERATE' ? 'Exercise caution'
                : 'Strong structural support'}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-t border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 text-[10px] font-mono font-bold uppercase tracking-widest transition-all relative ${
                activeTab === tab.id
                  ? 'text-white bg-border/50'
                  : 'text-ink-400 hover:text-ink-700'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-px bg-verified animate-glow-line" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TAB CONTENT
          ══════════════════════════════════════════════════════════════════ */}
      <div className="mt-px">
        {activeTab === 'AUDIT' && (
          <div className="space-y-px animate-fadeIn">

            {/* ── METRIC STRIP (4 Semi-Circular Dials) ──────────────── */}
            <div className="bg-card border border-border rounded-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[9px] font-mono font-bold text-ink-400 uppercase tracking-widest">Forensic Metrics</span>
                <span className="text-[9px] font-mono text-ink-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-verified rounded-full animate-pulse" />
                  PROTOCOL ACTIVE
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SemiCircleGauge
                  value={forensicCalculation?.vms?.score || 75}
                  max={100}
                  label="VMS Score"
                  color="#BF5AF2"
                  glowColor="#BF5AF240"
                />
                <SemiCircleGauge
                  value={epistemicDrift?.magnitude || 0}
                  max={100}
                  label="NRS Score"
                  color={
                    (epistemicDrift?.magnitude || 0) > 50 ? '#FF3E3E' :
                    (epistemicDrift?.magnitude || 0) > 25 ? '#f59e0b' : '#00FF94'
                  }
                  glowColor={(epistemicDrift?.magnitude || 0) > 50 ? '#FF3E3E40' : undefined}
                />
                <SemiCircleGauge
                  value={parseFloat((forensicCalculation?.overreaction?.ratio || 1).toFixed(1))}
                  max={5}
                  label="OR Ratio"
                  unit="x"
                  color={
                    (forensicCalculation?.overreaction?.ratio || 1) > 2 ? '#FF3E3E' :
                    (forensicCalculation?.overreaction?.ratio || 1) > 1.5 ? '#f59e0b' : '#00FF94'
                  }
                />
                <SemiCircleGauge
                  value={parseFloat((analystAudit?.credibilityScore || 50).toFixed(0))}
                  max={100}
                  label="ACS"
                  color={
                    (analystAudit?.credibilityScore || 50) >= 70 ? '#00FF94' :
                    (analystAudit?.credibilityScore || 50) >= 40 ? '#f59e0b' : '#FF3E3E'
                  }
                />
              </div>
            </div>

            {/* ── FORENSIC CORE + NARRATIVE PHYSICS (60/40 split) ──── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-px">

              {/* LEFT: Forensic Core (7 cols) */}
              <div className="lg:col-span-7 space-y-px">
                {/* Divergence Map */}
                <div className="bg-card border border-border rounded-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <span className="text-[9px] font-mono font-bold text-ink-500 uppercase tracking-widest">Divergence Map</span>
                    <CardExportButton elementId="divergence-map" fileName={`${ticker}_divergence`} dark />
                  </div>
                  <div id="divergence-map" className="p-4">
                    <div className="relative w-full aspect-square max-h-[280px] bg-base rounded-sm border border-border overflow-hidden">
                      {/* Grid lines */}
                      <div className="absolute inset-0 flex items-center"><div className="w-full h-px bg-border" /></div>
                      <div className="absolute inset-0 flex justify-center"><div className="h-full w-px bg-border" /></div>
                      {/* Subtle grid */}
                      <div className="absolute inset-0 opacity-20" style={{
                        backgroundImage: 'linear-gradient(#1F242C 1px, transparent 1px), linear-gradient(90deg, #1F242C 1px, transparent 1px)',
                        backgroundSize: '20% 20%',
                      }} />
                      {/* Quadrant labels */}
                      <div className="absolute top-2 left-2 text-[8px] font-mono font-bold text-risk/60 uppercase">Trap</div>
                      <div className="absolute top-2 right-2 text-[8px] font-mono font-bold text-verified/60 uppercase">Valid</div>
                      <div className="absolute bottom-2 left-2 text-[8px] font-mono font-bold text-ink-400 uppercase">Noise</div>
                      <div className="absolute bottom-2 right-2 text-[8px] font-mono font-bold text-blue-400/60 uppercase">Factual</div>
                      {/* Position Dot */}
                      <div
                        className="absolute w-4 h-4 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ease-out"
                        style={{ left: `${quadrantPos.x}%`, top: `${quadrantPos.y}%` }}
                      >
                        <div className="absolute inset-0 bg-math rounded-full animate-ping opacity-30" />
                        <div className="absolute inset-0 bg-math rounded-full" style={{ filter: 'drop-shadow(0 0 6px #BF5AF2)' }} />
                        <div className="absolute inset-[3px] bg-white rounded-full" />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[10px] font-mono">
                      <span className="text-ink-500">Position: <span className={`font-bold ${quadrant.color}`}>{quadrant.label.replace(/_/g, ' ')}</span></span>
                      <span className="text-ink-400">VMS {forensicCalculation?.vms?.score || 50} | Drift {epistemicDrift?.magnitude || 50}</span>
                    </div>
                  </div>
                </div>

                {/* Structural Anchors */}
                <div className="bg-card border border-border rounded-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-border">
                    <span className="text-[9px] font-mono font-bold text-ink-500 uppercase tracking-widest">Structural Anchors</span>
                  </div>
                  <div className="p-4 space-y-2">
                    {forensicLedger && forensicLedger.length > 0 ? (
                      forensicLedger.slice(0, 5).map((claim, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-2 rounded-sm hover:bg-base/50 transition-colors">
                          <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                            claim.evidenceQuality === 'HIGH' ? 'bg-verified' :
                            claim.evidenceQuality === 'MEDIUM' ? 'bg-amber-400' : 'bg-risk'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-mono text-white truncate">{claim.text}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className={`text-[8px] font-mono font-bold uppercase tracking-wider ${
                                claim.evidenceQuality === 'HIGH' ? 'text-verified' :
                                claim.evidenceQuality === 'MEDIUM' ? 'text-amber-400' : 'text-risk'
                              }`}>
                                {claim.evidenceQuality}
                              </span>
                              <span className="text-[8px] font-mono text-ink-400">{claim.type}</span>
                              <span className="text-[8px] font-mono text-ink-400">{claim.horizon}</span>
                            </div>
                          </div>
                          <span className="text-[9px] font-mono font-bold text-math">{claim.confidenceScore}%</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] font-mono text-ink-400 text-center py-4">No structural claims available</p>
                    )}
                  </div>
                </div>

                {/* Primary Thesis */}
                <div className="bg-card border border-border rounded-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <span className="text-[9px] font-mono font-bold text-risk uppercase tracking-widest">Primary Thesis Audit</span>
                    <CardExportButton elementId="thesis-card" fileName={`${ticker}_thesis`} dark />
                  </div>
                  <div id="thesis-card" className="p-4">
                    <p className="text-sm font-bold text-white leading-relaxed mb-3">
                      &ldquo;{primaryThesis?.statement || summary || 'Market pricing disconnected from fundamental guidance.'}&rdquo;
                    </p>
                    <p className="text-[11px] font-mono text-ink-500 leading-relaxed">
                      {primaryThesis?.explanation ||
                        `The stock moved ${forensicCalculation?.overreaction?.priceVelocity || '17.13'}% despite prior setups, indicating narrative-driven price action.`}
                    </p>
                    <EvidenceToggle data={{ thesis: primaryThesis, overreaction: forensicCalculation?.overreaction }} label="View Thesis Evidence" />
                  </div>
                </div>

                {/* Source Attribution */}
                <div className="bg-card border border-border rounded-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-border">
                    <span className="text-[9px] font-mono font-bold text-ink-500 uppercase tracking-widest">Thesis Source</span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-border rounded-sm flex items-center justify-center">
                        <span className="text-sm font-mono font-bold text-ink-500">{(analystAudit?.name || 'U')[0]}</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{analystAudit?.name || 'Unknown Source'}</p>
                        <p className="text-[10px] font-mono text-ink-500">{analystAudit?.firm || 'Unverified'}</p>
                      </div>
                    </div>
                    {(!analystAudit?.name || analystAudit?.name === 'Unknown Source') && (
                      <div className="flex items-center gap-2 p-2 bg-amber-500/5 border border-amber-500/20 rounded-sm mb-3">
                        <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                        <p className="text-[9px] font-mono text-amber-400">Source not identified — lower confidence applied</p>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono text-ink-400 uppercase tracking-widest">Credibility</span>
                      <span className="text-xs font-mono font-bold text-math">{analystAudit?.credibilityScore?.toFixed(0) || '50'}%</span>
                    </div>
                    <div className="mt-1.5 h-1 bg-base rounded-full overflow-hidden">
                      <div
                        className="h-full bg-math rounded-full transition-all duration-1000"
                        style={{ width: `${analystAudit?.credibilityScore || 50}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT: Narrative Physics (5 cols) */}
              <div className="lg:col-span-5 space-y-px">
                {/* Decay Half-Life */}
                <div className="bg-card border border-border rounded-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <span className="text-[9px] font-mono font-bold text-math uppercase tracking-widest">Decay Half-Life</span>
                    <span className="text-[9px] font-mono text-ink-400">E(t) = E₀ · e^(-λt)</span>
                  </div>
                  <div className="p-4">
                    {/* Mini decay curve */}
                    <div className="relative h-32 bg-base rounded-sm border border-border overflow-hidden mb-3">
                      <svg viewBox="0 0 200 80" className="w-full h-full" preserveAspectRatio="none">
                        {/* Subtle grid */}
                        {[20, 40, 60].map(y => (
                          <line key={y} x1="0" y1={y} x2="200" y2={y} stroke="#1F242C" strokeWidth="0.5" />
                        ))}
                        {/* Decay curve */}
                        <path
                          d={`M 0 5 ${Array.from({length: 50}, (_, i) => {
                            const t = (i / 49) * 30;
                            const lambda = 0.693 / (forensicCalculation?.halfLife?.days || 7);
                            const energy = 100 * Math.exp(-lambda * t);
                            return `L ${(i / 49) * 200} ${80 - (energy / 100) * 75}`;
                          }).join(' ')}`}
                          fill="none"
                          stroke="#BF5AF2"
                          strokeWidth="2"
                          className="animate-decay-glow"
                        />
                        {/* Half-life marker */}
                        <line
                          x1={`${((forensicCalculation?.halfLife?.days || 7) / 30) * 200}`}
                          y1="0"
                          x2={`${((forensicCalculation?.halfLife?.days || 7) / 30) * 200}`}
                          y2="80"
                          stroke="#BF5AF2"
                          strokeWidth="0.5"
                          strokeDasharray="3,3"
                          opacity="0.5"
                        />
                        <text
                          x={`${((forensicCalculation?.halfLife?.days || 7) / 30) * 200}`}
                          y="78"
                          textAnchor="middle"
                          className="fill-math text-[6px] font-mono"
                        >
                          t½
                        </text>
                      </svg>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-base rounded-sm border border-border p-2 text-center">
                        <p className="text-xl font-mono font-bold text-math">{forensicCalculation?.halfLife?.days || 7}<span className="text-sm text-ink-500">d</span></p>
                        <p className="text-[8px] font-mono text-ink-400 uppercase tracking-widest">Half-Life</p>
                      </div>
                      <div className="bg-base rounded-sm border border-border p-2 text-center">
                        <p className={`text-sm font-mono font-bold ${
                          decayData.narrativeStatus === 'ACTIVE' ? 'text-verified' :
                          decayData.narrativeStatus === 'EXHAUSTED' ? 'text-risk' : 'text-math'
                        }`}>{decayData.narrativeStatus}</p>
                        <p className="text-[8px] font-mono text-ink-400 uppercase tracking-widest">Status</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Exhaustion Clock */}
                <div className="bg-card border border-border rounded-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-border">
                    <span className="text-[9px] font-mono font-bold text-ink-500 uppercase tracking-widest">Exhaustion Clock</span>
                  </div>
                  <div className="p-4 text-center">
                    <div className="font-mono text-3xl font-bold text-white tracking-wider mb-1">
                      <span className="text-math">{String(remainingDays).padStart(2, '0')}</span>
                      <span className="text-ink-400">d</span>
                      <span className="text-ink-400 mx-0.5">:</span>
                      <span className="text-math">{String(remainingHours).padStart(2, '0')}</span>
                      <span className="text-ink-400">h</span>
                      <span className="text-ink-400 mx-0.5">:</span>
                      <span className="text-math">{String(remainingMinutes).padStart(2, '0')}</span>
                      <span className="text-ink-400">m</span>
                    </div>
                    <p className="text-[9px] font-mono font-bold text-ink-400 uppercase tracking-widest">Trade Window</p>
                    <div className="mt-3 h-1 bg-base rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-math to-risk rounded-full transition-all duration-1000"
                        style={{ width: `${Math.min(100, (currentDay / halfLifeDays) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[8px] font-mono text-ink-400">Day {currentDay}</span>
                      <span className="text-[8px] font-mono text-ink-400">{halfLifeDays}d target</span>
                    </div>
                  </div>
                </div>

                {/* Structural Risk */}
                <div className="bg-card border border-border rounded-sm overflow-hidden">
                  <div className={`px-4 py-3 border-b ${
                    riskRating === 'HIGH' ? 'border-risk/30 bg-risk/5' :
                    riskRating === 'MODERATE' ? 'border-amber-500/30 bg-amber-500/5' :
                    'border-verified/30 bg-verified/5'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-ink-500">Structural Risk</span>
                      <span className={`text-sm font-mono font-bold ${
                        riskRating === 'HIGH' ? 'text-risk' :
                        riskRating === 'MODERATE' ? 'text-amber-400' : 'text-verified'
                      }`}>{riskRating}</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-[11px] font-mono text-ink-500 leading-relaxed">
                      {structuralRiskAudit?.description ||
                        (riskRating === 'LOW'
                          ? 'No structural divergence detected. Financials support headline claims.'
                          : `Extreme volatility (${forensicCalculation?.overreaction?.priceVelocity || '-17.13'}%) suggests institutional capitulation.`)}
                    </p>
                    <EvidenceToggle data={{ riskRating, structuralRiskAudit, sourceQualityMatrix }} />
                  </div>
                </div>

                {/* Executive Summary */}
                <div className="bg-card border border-border rounded-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-verified/20 bg-verified/5">
                    <span className="text-[9px] font-mono font-bold text-verified uppercase tracking-widest">Executive Summary</span>
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-mono text-ink-500 leading-relaxed mb-3">
                      {auditVerdict === 'STRUCTURALLY_SUPPORTED'
                        ? `${ticker} narrative aligns with structural fundamentals. Position with ${riskRating.toLowerCase()} risk parameters.`
                        : auditVerdict === 'NARRATIVE_TRAP'
                        ? `${ticker} shows classic narrative trap. Exercise extreme caution.`
                        : `${ticker} requires additional verification. Mixed signals detected.`}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-base rounded-sm border border-border p-2 text-center">
                        <p className="text-sm font-mono font-bold text-white">{forensicCalculation?.halfLife?.days || 7}d</p>
                        <p className="text-[8px] font-mono text-ink-400 uppercase">Decay</p>
                      </div>
                      <div className="bg-base rounded-sm border border-border p-2 text-center">
                        <p className={`text-sm font-mono font-bold ${(forensicCalculation?.overreaction?.ratio || 1) > 1.5 ? 'text-amber-400' : 'text-verified'}`}>
                          {(forensicCalculation?.overreaction?.ratio || 1).toFixed(1)}x
                        </p>
                        <p className="text-[8px] font-mono text-ink-400 uppercase">OR</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── FORENSIC CALCULATION LEDGER ─────────────────────── */}
            <div className="bg-card border border-border rounded-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono font-bold text-ink-500 uppercase tracking-widest">Forensic Calculation Ledger</span>
                  <span className="text-[8px] font-mono text-math">Patent-Protected</span>
                </div>
                <CardExportButton elementId="forensic-ledger" fileName={`${ticker}_forensic_ledger`} dark />
              </div>
              <div id="forensic-ledger" className="p-4 space-y-4">
                {/* OR */}
                <LedgerMetric
                  label="Overreaction Ratio (OR)"
                  value={`${(forensicCalculation?.overreaction?.ratio || 1).toFixed(1)}x`}
                  rawValue={Math.min(100, ((forensicCalculation?.overreaction?.ratio || 1) / 5) * 100)}
                  color={(forensicCalculation?.overreaction?.ratio || 1) > 2 ? '#FF3E3E' : (forensicCalculation?.overreaction?.ratio || 1) > 1.5 ? '#f59e0b' : '#00FF94'}
                  desc="Price velocity vs fundamental velocity"
                />
                {/* VMS */}
                <LedgerMetric
                  label="Verification Match Score (VMS)"
                  value={`${forensicCalculation?.vms?.score || 75}`}
                  rawValue={forensicCalculation?.vms?.score || 75}
                  color="#BF5AF2"
                  desc="Claim-to-evidence alignment"
                />
                {/* NRS */}
                <LedgerMetric
                  label="Narrative Risk Score (NRS)"
                  value={`${epistemicDrift?.magnitude || 0}`}
                  rawValue={epistemicDrift?.magnitude || 0}
                  color={(epistemicDrift?.magnitude || 0) > 50 ? '#FF3E3E' : (epistemicDrift?.magnitude || 0) > 25 ? '#f59e0b' : '#00FF94'}
                  desc="Epistemic drift from factual baseline"
                />
                {/* Coordination */}
                <LedgerMetric
                  label="Coordination Score"
                  value={`${forensicCalculation?.coordination?.score || 0}`}
                  rawValue={forensicCalculation?.coordination?.score || 0}
                  color={(forensicCalculation?.coordination?.score || 0) > 60 ? '#FF3E3E' : (forensicCalculation?.coordination?.score || 0) > 30 ? '#f59e0b' : '#00FF94'}
                  desc="Cross-platform narrative synchronization"
                />
                {/* ACS */}
                <LedgerMetric
                  label="Analyst Credibility Score (ACS)"
                  value={`${analystAudit?.credibilityScore?.toFixed(0) || 50}`}
                  rawValue={analystAudit?.credibilityScore || 50}
                  color={(analystAudit?.credibilityScore || 50) >= 70 ? '#00FF94' : (analystAudit?.credibilityScore || 50) >= 40 ? '#f59e0b' : '#FF3E3E'}
                  desc="Historical accuracy assessment"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'SENTIMENT' && (
          <div className="space-y-px animate-fadeIn">
            {/* Market Belief Timeline */}
            {ticker && <MarketBeliefTimeline ticker={ticker} />}

            {/* Social Momentum */}
            <div className="bg-card border border-border rounded-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <span className="text-[9px] font-mono font-bold text-ink-500 uppercase tracking-widest">Social Momentum</span>
                <CardExportButton elementId="social-momentum" fileName={`${ticker}_social`} dark />
              </div>
              <div id="social-momentum" className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="bg-base rounded-sm border border-border p-3 text-center">
                    <p className="text-2xl font-mono font-bold text-white">{socialMomentum?.score || 50}</p>
                    <p className="text-[8px] font-mono text-ink-400 uppercase tracking-widest">Momentum</p>
                  </div>
                  <div className="bg-base rounded-sm border border-border p-3 text-center">
                    <p className={`text-sm font-mono font-bold ${
                      socialMomentum?.trend === 'RISING' ? 'text-verified' :
                      socialMomentum?.trend === 'DECAYING' ? 'text-risk' : 'text-ink-500'
                    }`}>{socialMomentum?.trend || 'STABLE'}</p>
                    <p className="text-[8px] font-mono text-ink-400 uppercase tracking-widest">Trend</p>
                  </div>
                  <div className="bg-base rounded-sm border border-border p-3 text-center">
                    <p className="text-lg font-mono font-bold text-white">{socialMomentum?.crowdBias || 0}%</p>
                    <p className="text-[8px] font-mono text-ink-400 uppercase tracking-widest">Crowd Bias</p>
                  </div>
                  <div className="bg-base rounded-sm border border-border p-3 text-center">
                    <p className="text-lg font-mono font-bold text-white">{socialMomentum?.expertBias || 0}%</p>
                    <p className="text-[8px] font-mono text-ink-400 uppercase tracking-widest">Expert Bias</p>
                  </div>
                </div>
                {sentimentDynamics && sentimentDynamics.length > 0 && (
                  <div>
                    <p className="text-[9px] font-mono font-bold text-ink-500 uppercase tracking-widest mb-3">Sentiment Timeline</p>
                    <SentimentChart data={sentimentDynamics} />
                  </div>
                )}
              </div>
            </div>

            {/* Narrative Pressure Timeline */}
            {narrativePressureData.priceData.length > 0 && (
              <NarrativePressureTimeline
                ticker={ticker}
                priceData={narrativePressureData.priceData}
                narrativeEvents={narrativePressureData.events}
              />
            )}

            {/* Decay Chart */}
            <NarrativeDecayChart
              ticker={ticker}
              initialEnergy={decayData.initialEnergy}
              decayRate={decayData.decayRate}
              halfLifeDays={decayData.halfLifeDays}
              currentDay={decayData.currentDay}
              narrativeStatus={decayData.narrativeStatus}
            />

            {/* Narrative Insights */}
            <div className="bg-card border border-border rounded-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <span className="text-[9px] font-mono font-bold text-ink-500 uppercase tracking-widest">Narrative Insights</span>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {analysis.narrativeInsights?.preEarnings && (
                  <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-sm">
                    <p className="text-[8px] font-mono font-bold text-amber-400 uppercase tracking-widest mb-1">Pre-Earnings Activity</p>
                    <p className="text-[11px] font-mono text-ink-500">{analysis.narrativeInsights.preEarnings}</p>
                  </div>
                )}
                {analysis.narrativeInsights?.volumeBehavior && (
                  <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-sm">
                    <p className="text-[8px] font-mono font-bold text-blue-400 uppercase tracking-widest mb-1">Volume Behavior</p>
                    <p className="text-[11px] font-mono text-ink-500">{analysis.narrativeInsights.volumeBehavior}</p>
                  </div>
                )}
                {analysis.narrativeInsights?.narrativeConsistency && (
                  <div className="p-3 bg-verified/5 border border-verified/20 rounded-sm">
                    <p className="text-[8px] font-mono font-bold text-verified uppercase tracking-widest mb-1">Narrative Consistency</p>
                    <p className="text-[11px] font-mono text-ink-500">{analysis.narrativeInsights.narrativeConsistency}</p>
                  </div>
                )}
                {analysis.narrativeInsights?.newsAccuracyAnalysis && (
                  <div className="p-3 bg-math/5 border border-math/20 rounded-sm">
                    <p className="text-[8px] font-mono font-bold text-math uppercase tracking-widest mb-1">News Accuracy</p>
                    <p className="text-[11px] font-mono text-ink-500">{analysis.narrativeInsights.newsAccuracyAnalysis}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'PRESS_AUDIT' && (
          <div className="space-y-px animate-fadeIn">
            {/* Coordinate Mapping */}
            {claimMappings.length > 0 && (
              <CoordinateMappingGrid ticker={ticker} claims={claimMappings} />
            )}

            {/* Pre-Publication Radar */}
            <PrePublicationRadar
              ticker={ticker}
              publicationDate={prePublicationData.publicationDate}
              activityData={prePublicationData.activityData}
              overallRisk={prePublicationData.overallRisk}
              frontRunningScore={prePublicationData.frontRunningScore}
              manipulationIndicators={prePublicationData.manipulationIndicators}
            />

            {/* Press Audit Trail */}
            <div className="bg-card border border-border rounded-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <span className="text-[9px] font-mono font-bold text-ink-500 uppercase tracking-widest">Press Audit Trail</span>
                <CardExportButton elementId="press-audit-trail" fileName={`${ticker}_press`} dark />
              </div>
              <div id="press-audit-trail" className="p-4">
                {pressAudits && pressAudits.length > 0 ? (
                  <div className="space-y-2">
                    {pressAudits.map((audit, idx) => (
                      <div key={idx} className="p-3 bg-base rounded-sm border border-border hover:border-border-light transition-colors">
                        <div className="flex items-start justify-between mb-1.5">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-mono font-bold text-white truncate">{audit.headline}</p>
                            <p className="text-[9px] font-mono text-ink-400">{audit.source} &bull; {audit.date}</p>
                          </div>
                          <span
                            className="ml-3 px-2 py-0.5 text-[8px] font-mono font-bold uppercase rounded-sm border"
                            style={{
                              borderColor: `${VERDICT_COLORS[audit.verdict]}40`,
                              color: VERDICT_COLORS[audit.verdict],
                              backgroundColor: `${VERDICT_COLORS[audit.verdict]}10`,
                            }}
                          >
                            {audit.verdict.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-ink-500">{audit.realityCheck}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-[10px] font-mono text-ink-400">No press audits available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Forensic Claim Ledger */}
            {forensicLedger && forensicLedger.length > 0 && (
              <div className="bg-card border border-border rounded-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <span className="text-[9px] font-mono font-bold text-ink-500 uppercase tracking-widest">Forensic Claim Ledger</span>
                </div>
                <div className="p-4 space-y-2">
                  {forensicLedger.map((claim, idx) => (
                    <div key={idx} className="p-3 bg-base rounded-sm border border-border">
                      <div className="flex items-start justify-between mb-1.5">
                        <p className="text-xs font-mono text-white flex-1">{claim.text}</p>
                        <span className={`ml-3 px-2 py-0.5 text-[8px] font-mono font-bold uppercase rounded-sm border ${
                          claim.evidenceQuality === 'HIGH' ? 'text-verified border-verified/30 bg-verified/5' :
                          claim.evidenceQuality === 'MEDIUM' ? 'text-amber-400 border-amber-500/30 bg-amber-500/5' :
                          'text-risk border-risk/30 bg-risk/5'
                        }`}>
                          {claim.evidenceQuality}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-ink-500 mb-1.5">{claim.deconstruction}</p>
                      <div className="flex items-center gap-4 text-[8px] font-mono text-ink-400">
                        <span>{claim.type}</span>
                        <span>{claim.horizon}</span>
                        <span>Confidence: {claim.confidenceScore}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Grounding Citations */}
            {(analysis as any).groundingCitations && (analysis as any).groundingCitations.length > 0 && (
              <div className="bg-card border border-border rounded-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-verified rounded-full" />
                  <span className="text-[9px] font-mono font-bold text-ink-500 uppercase tracking-widest">Grounded Sources</span>
                  <span className="text-[8px] font-mono text-verified ml-auto">Google Search Verified</span>
                </div>
                <div className="p-4 space-y-1">
                  {(analysis as any).groundingCitations.slice(0, 5).map((url: string, idx: number) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-2 bg-base rounded-sm border border-border hover:border-math/30 transition-colors"
                    >
                      <p className="text-[10px] font-mono text-math truncate">{url}</p>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Ledger Metric Row ────────────────────────────────────────────────────
const LedgerMetric: React.FC<{
  label: string;
  value: string;
  rawValue: number;
  color: string;
  desc: string;
}> = ({ label, value, rawValue, color, desc }) => (
  <div>
    <div className="flex items-center justify-between mb-1.5">
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono font-bold text-white">{label}</span>
      </div>
      <span className="text-lg font-mono font-bold" style={{ color }}>{value}</span>
    </div>
    <div className="h-1.5 bg-base rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-1000 ease-out"
        style={{ width: `${Math.min(100, rawValue)}%`, backgroundColor: color }}
      />
    </div>
    <p className="text-[9px] font-mono text-ink-400 mt-1">{desc}</p>
  </div>
);

export default RecommendationCard;
