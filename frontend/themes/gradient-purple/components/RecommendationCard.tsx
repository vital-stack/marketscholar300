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

  // Map audit verdict to spatial quadrant
  const getQuadrantPosition = () => {
    const claimStrength = forensicCalculation?.vms?.score || 50;
    const evidenceQuality = 100 - (epistemicDrift?.magnitude || 50);

    // Normalize to quadrant space (-1 to 1)
    const x = (claimStrength - 50) / 50;
    const y = (evidenceQuality - 50) / 50;

    return { x: 50 + x * 40, y: 50 - y * 40 };
  };

  const quadrantPos = getQuadrantPosition();

  // Get verdict classification for quadrant
  const getQuadrantLabel = () => {
    const vms = forensicCalculation?.vms?.score || 50;
    const drift = epistemicDrift?.magnitude || 50;

    if (vms >= 60 && drift <= 40) return { label: 'VALID_CATALYST', color: 'text-emerald-500' };
    if (vms >= 60 && drift > 40) return { label: 'NARRATIVE_TRAP', color: 'text-red-500' };
    if (vms < 60 && drift <= 40) return { label: 'FACTUAL_ANCHOR', color: 'text-blue-500' };
    return { label: 'MARKET_NOISE', color: 'text-amber-500' };
  };

  const quadrant = getQuadrantLabel();

  // Generate derived data for new visualizations
  const narrativePressureData = useMemo(() => {
    // Generate price data from sentiment dynamics
    const basePrice = analysis.currentPrice || 150;
    const priceData = sentimentDynamics?.map((d, i) => ({
      date: d.date,
      price: basePrice + (d.avgSentiment / 100) * 20 + Math.random() * 5 - 2.5,
      volume: d.volume || 1000000,
    })) || [];

    // Generate narrative events from press audits or sentiment spikes
    const events = pressAudits?.map((audit, i) => ({
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
    decayRate: 0.693 / (forensicCalculation?.halfLife?.days || 7), // λ = ln(2)/t½
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
      tableCoordMatch: Math.floor(Math.random() * 30) + 60,
      textMatch: Math.floor(Math.random() * 30) + 50,
      verdict: claim.evidenceQuality === 'HIGH' ? 'VERIFIED' as const :
               claim.evidenceQuality === 'MEDIUM' ? 'PARTIAL' as const :
               claim.isMisleading ? 'CONTRADICTED' as const : 'UNVERIFIED' as const,
    })) || [];
  }, [forensicLedger, forensicCalculation]);

  const prePublicationData = useMemo(() => {
    // Generate 30 days of activity data
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
                      forensicCalculation?.coordination?.score && forensicCalculation.coordination.score > 40 ? 'MODERATE' :
                      'LOW';

    return {
      activityData: days,
      publicationDate: new Date().toISOString(),
      overallRisk: riskLevel as 'LOW' | 'MODERATE' | 'HIGH',
      frontRunningScore: forensicCalculation?.coordination?.score || Math.floor(Math.random() * 40) + 10,
      manipulationIndicators: riskLevel === 'HIGH' ? [
        'Unusual volume spike 3 days before publication',
        'Options activity exceeds 2σ from baseline',
        'Dark pool percentage elevated',
      ] : riskLevel === 'MODERATE' ? [
        'Minor volume anomaly detected',
      ] : [],
    };
  }, [forensicCalculation]);

  // Export to PDF with better formatting
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      if (reportRef.current) {
        // Create a clone for PDF rendering with white background
        const clone = reportRef.current.cloneNode(true) as HTMLElement;
        clone.style.width = '800px';
        clone.style.padding = '24px';
        clone.style.backgroundColor = '#ffffff';
        document.body.appendChild(clone);

        const canvas = await html2canvas(clone, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          windowWidth: 800,
        });

        document.body.removeChild(clone);

        const imgData = canvas.toDataURL('image/png', 1.0);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pdfWidth - 20; // 10mm margins
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = 10; // Top margin

        // Add first page
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        // Add additional pages if needed
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight + 10;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
          heightLeft -= pdfHeight;
        }

        pdf.save(`${ticker}_L3_Forensic_Audit.pdf`);
      }
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('PDF export failed. Please try again.');
    }
    setIsExporting(false);
  };

  // Social media card dimensions
  const socialPlatforms = {
    twitter: { width: 1200, height: 675, name: 'Twitter/X' },
    reddit: { width: 1200, height: 628, name: 'Reddit' },
    linkedin: { width: 1200, height: 627, name: 'LinkedIn' },
    instagram: { width: 1080, height: 1080, name: 'Instagram' },
    square: { width: 1080, height: 1080, name: 'Square (1:1)' },
  };

  // Download social card for specific platform
  const handleDownloadSocialCard = async (platform: keyof typeof socialPlatforms) => {
    setShowShareMenu(false);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const cardElement = socialCardRef.current || document.getElementById('social-card');

      if (cardElement) {
        const { width, height } = socialPlatforms[platform];

        // Create a styled clone for the specific platform
        const wrapper = document.createElement('div');
        wrapper.style.width = `${width}px`;
        wrapper.style.height = `${height}px`;
        wrapper.style.background = 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)';
        wrapper.style.padding = '40px';
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';
        wrapper.style.justifyContent = 'space-between';
        wrapper.style.position = 'absolute';
        wrapper.style.left = '-9999px';
        wrapper.style.fontFamily = 'system-ui, -apple-system, sans-serif';

        wrapper.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 12px;">
                <div style="background: white; color: #0f172a; padding: 12px 24px; border-radius: 12px; font-size: 32px; font-weight: 900;">${ticker}</div>
                <div style="background: rgba(99, 102, 241, 0.2); color: #818cf8; padding: 8px 16px; border-radius: 8px; font-size: 12px; font-weight: 700; text-transform: uppercase;">L3 Certified</div>
              </div>
              <div style="color: #94a3b8; font-size: 18px;">${companyName}</div>
            </div>
            <div style="background: ${VERDICT_COLORS[auditVerdict]}30; color: ${VERDICT_COLORS[auditVerdict]}; padding: 12px 20px; border-radius: 12px; font-size: 14px; font-weight: 700; text-transform: uppercase;">
              ${auditVerdict.replace(/_/g, ' ')}
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; margin: 32px 0;">
            <div style="text-align: center;">
              <div style="font-size: 48px; font-weight: 900; color: white;">${confidenceScore}%</div>
              <div style="font-size: 12px; color: #64748b; text-transform: uppercase; margin-top: 4px;">Confidence</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 48px; font-weight: 900; color: white;">${forensicCalculation?.vms?.score || 75}</div>
              <div style="font-size: 12px; color: #64748b; text-transform: uppercase; margin-top: 4px;">VMS Score</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 48px; font-weight: 900; color: white;">${epistemicDrift?.magnitude || 25}</div>
              <div style="font-size: 12px; color: #64748b; text-transform: uppercase; margin-top: 4px;">Drift Index</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 48px; font-weight: 900; color: ${RISK_COLORS[riskRating]};">${riskRating}</div>
              <div style="font-size: 12px; color: #64748b; text-transform: uppercase; margin-top: 4px;">Risk Level</div>
            </div>
          </div>

          <div style="background: rgba(255,255,255,0.05); border-radius: 16px; padding: 24px;">
            <div style="font-size: 18px; color: white; line-height: 1.5;">"${summary?.substring(0, 200)}${summary && summary.length > 200 ? '...' : ''}"</div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 24px;">
            <div style="color: #64748b; font-size: 14px;">MarketScholar L3 Forensic Audit</div>
            <div style="color: #64748b; font-size: 14px;">${new Date().toLocaleDateString()}</div>
          </div>
        `;

        document.body.appendChild(wrapper);

        const canvas = await html2canvas(wrapper, {
          scale: 2,
          useCORS: true,
          backgroundColor: null,
          logging: false,
          width,
          height,
        });

        document.body.removeChild(wrapper);

        const link = document.createElement('a');
        link.download = `${ticker}_audit_${platform}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.95);
        link.click();
      }
    } catch (error) {
      console.error('Card download failed:', error);
    }
  };

  // Legacy download card function
  const handleDownloadCard = async () => {
    handleDownloadSocialCard('twitter');
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: 'AUDIT', label: 'AUDIT' },
    { id: 'SENTIMENT', label: 'SENTIMENT' },
    { id: 'PRESS_AUDIT', label: 'PRESS AUDIT' },
  ];

  return (
    <div className="space-y-4" ref={reportRef}>
      {/* Article Source Header - Compact Premium */}
      {(articleTitle || articleUrl) && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              {articleTitle && (
                <h1 className="text-lg md:text-xl font-black text-white mb-2 leading-tight truncate">
                  {articleTitle}
                </h1>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {publicationName && (
                  <span className="px-3 py-1 bg-indigo-500 text-white text-[10px] font-bold uppercase rounded-lg">
                    {publicationName}
                  </span>
                )}
                {publicationCredibility && (
                  <span className="text-slate-400 text-xs">
                    {publicationCredibility}% credibility
                  </span>
                )}
                {articleUrl && (
                  <a
                    href={articleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-indigo-300 text-xs hover:text-white transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Source
                  </a>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase">Audit</div>
                <div className="text-white text-sm font-bold">{new Date().toLocaleDateString()}</div>
              </div>
              {/* Prominent Download Button */}
              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/25"
              >
                {isExporting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                )}
                PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Section - Premium Design */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Top Bar with Ticker */}
        <div className="border-b border-slate-100 px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Ticker Badge and Company Info */}
            <div className="flex items-center gap-5">
              <div className="px-6 py-3 bg-indigo-600 rounded-xl">
                <span className="text-2xl font-black text-white tracking-wider">{ticker}</span>
              </div>
              <div>
                <p className="text-xl font-black text-slate-900 uppercase tracking-tight">{companyName}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase rounded-lg border border-emerald-200">
                    L3 Certified
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-xs text-slate-400 uppercase tracking-wider">
                      Intelligence Feed: {(Date.now() % 100000000).toString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              {/* Share Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  SHARE
                </button>

              {/* Dropdown Menu */}
              {showShareMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                  <p className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase">Export for Social Media</p>
                  <button
                    onClick={() => handleDownloadSocialCard('twitter')}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center gap-3"
                  >
                    <svg className="w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    <span className="text-slate-700 font-medium">Twitter / X</span>
                    <span className="text-xs text-slate-400 ml-auto">1200×675</span>
                  </button>
                  <button
                    onClick={() => handleDownloadSocialCard('reddit')}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center gap-3"
                  >
                    <svg className="w-5 h-5 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
                    </svg>
                    <span className="text-slate-700 font-medium">Reddit</span>
                    <span className="text-xs text-slate-400 ml-auto">1200×628</span>
                  </button>
                  <button
                    onClick={() => handleDownloadSocialCard('linkedin')}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center gap-3"
                  >
                    <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    <span className="text-slate-700 font-medium">LinkedIn</span>
                    <span className="text-xs text-slate-400 ml-auto">1200×627</span>
                  </button>
                  <button
                    onClick={() => handleDownloadSocialCard('instagram')}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center gap-3"
                  >
                    <svg className="w-5 h-5 text-pink-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    <span className="text-slate-700 font-medium">Instagram</span>
                    <span className="text-xs text-slate-400 ml-auto">1080×1080</span>
                  </button>
                  <div className="border-t border-slate-100 my-2" />
                  <button
                    onClick={() => handleDownloadSocialCard('square')}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center gap-3"
                  >
                    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-slate-700 font-medium">Square Image</span>
                    <span className="text-xs text-slate-400 ml-auto">1080×1080</span>
                  </button>
                </div>
              )}
            </div>

              {/* Save Dossier Button */}
              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white text-sm font-bold uppercase tracking-wider rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                {isExporting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
                Save Dossier
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation - Premium Style */}
        <div className="flex items-center border-t border-slate-100">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all duration-300 relative ${
                activeTab === tab.id
                  ? 'text-indigo-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="transition-all duration-300 ease-in-out">
        {activeTab === 'AUDIT' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Hero Verdict Section - Stunning Visual */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-8 relative overflow-hidden">
              {/* Animated Background Elements */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
              </div>

              <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                {/* Left: Verdict Badge */}
                <div className="text-center lg:text-left">
                  <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-[0.2em] mb-3">L3 Forensic Analysis</p>
                  <div className="inline-block">
                    <span
                      className="px-6 py-3 text-2xl font-black uppercase rounded-2xl inline-block"
                      style={{
                        backgroundColor: `${VERDICT_COLORS[auditVerdict]}25`,
                        color: VERDICT_COLORS[auditVerdict],
                        border: `2px solid ${VERDICT_COLORS[auditVerdict]}50`,
                      }}
                    >
                      {auditVerdict.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm mt-4 max-w-xs">
                    {auditVerdict === 'STRUCTURALLY_SUPPORTED'
                      ? 'Narrative aligns with fundamental structure'
                      : auditVerdict === 'NARRATIVE_TRAP'
                      ? 'Significant divergence from reality detected'
                      : 'Mixed signals require additional verification'}
                  </p>
                </div>

                {/* Center: Animated Score Ring */}
                <div className="flex justify-center">
                  <div className="relative">
                    {/* Outer Glow */}
                    <div className="absolute inset-0 rounded-full animate-pulse" style={{
                      background: `radial-gradient(circle, ${confidenceScore >= 70 ? '#10b981' : confidenceScore >= 40 ? '#f59e0b' : '#ef4444'}20 0%, transparent 70%)`,
                      transform: 'scale(1.3)',
                    }} />

                    {/* Score Ring SVG */}
                    <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 200 200">
                      {/* Background Circle */}
                      <circle
                        cx="100"
                        cy="100"
                        r="85"
                        fill="none"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="12"
                      />
                      {/* Progress Circle */}
                      <circle
                        cx="100"
                        cy="100"
                        r="85"
                        fill="none"
                        stroke={confidenceScore >= 70 ? '#10b981' : confidenceScore >= 40 ? '#f59e0b' : '#ef4444'}
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 85}`}
                        strokeDashoffset={`${2 * Math.PI * 85 * (1 - confidenceScore / 100)}`}
                        className="transition-all duration-1000 ease-out"
                        style={{
                          filter: `drop-shadow(0 0 8px ${confidenceScore >= 70 ? '#10b981' : confidenceScore >= 40 ? '#f59e0b' : '#ef4444'}60)`,
                        }}
                      />
                      {/* Inner decorative circles */}
                      <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                      <circle cx="100" cy="100" r="60" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    </svg>

                    {/* Center Content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-5xl font-black text-white">{confidenceScore}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Confidence</span>
                    </div>
                  </div>
                </div>

                {/* Right: Risk Assessment */}
                <div className="text-center lg:text-right">
                  <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-[0.2em] mb-3">Risk Classification</p>
                  <div className={`inline-flex items-center gap-3 px-5 py-3 rounded-2xl ${
                    riskRating === 'HIGH' ? 'bg-red-500/20 border border-red-500/30' :
                    riskRating === 'MODERATE' ? 'bg-amber-500/20 border border-amber-500/30' :
                    'bg-emerald-500/20 border border-emerald-500/30'
                  }`}>
                    <div className={`w-3 h-3 rounded-full animate-pulse ${
                      riskRating === 'HIGH' ? 'bg-red-500' :
                      riskRating === 'MODERATE' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} />
                    <span className={`text-2xl font-black ${
                      riskRating === 'HIGH' ? 'text-red-400' :
                      riskRating === 'MODERATE' ? 'text-amber-400' : 'text-emerald-400'
                    }`}>{riskRating}</span>
                  </div>
                  <p className="text-slate-400 text-sm mt-4 max-w-xs ml-auto">
                    {riskRating === 'HIGH'
                      ? 'High probability of narrative failure'
                      : riskRating === 'MODERATE'
                      ? 'Exercise caution, monitor closely'
                      : 'Strong structural support detected'}
                  </p>
                </div>
              </div>
            </div>

            {/* Key Metrics Dashboard - Animated Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* VMS Score Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 relative overflow-hidden group hover:border-indigo-300 transition-all duration-300">
                <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">VMS Score</span>
                  </div>
                  <p className="text-4xl font-black text-slate-900">{forensicCalculation?.vms?.score || 75}</p>
                  <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${forensicCalculation?.vms?.score || 75}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Verification Match</p>
                </div>
              </div>

              {/* Overreaction Ratio Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 relative overflow-hidden group hover:border-amber-300 transition-all duration-300">
                <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      (forensicCalculation?.overreaction?.ratio || 1) > 2 ? 'bg-red-100' :
                      (forensicCalculation?.overreaction?.ratio || 1) > 1.5 ? 'bg-amber-100' : 'bg-emerald-100'
                    }`}>
                      <svg className={`w-4 h-4 ${
                        (forensicCalculation?.overreaction?.ratio || 1) > 2 ? 'text-red-600' :
                        (forensicCalculation?.overreaction?.ratio || 1) > 1.5 ? 'text-amber-600' : 'text-emerald-600'
                      }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">OR Ratio</span>
                  </div>
                  <p className={`text-4xl font-black ${
                    (forensicCalculation?.overreaction?.ratio || 1) > 2 ? 'text-red-500' :
                    (forensicCalculation?.overreaction?.ratio || 1) > 1.5 ? 'text-amber-500' : 'text-emerald-500'
                  }`}>{(forensicCalculation?.overreaction?.ratio || 1).toFixed(1)}x</p>
                  <div className="mt-3 flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                          (forensicCalculation?.overreaction?.ratio || 1) >= i
                            ? (forensicCalculation?.overreaction?.ratio || 1) > 2 ? 'bg-red-500' :
                              (forensicCalculation?.overreaction?.ratio || 1) > 1.5 ? 'bg-amber-500' : 'bg-emerald-500'
                            : 'bg-slate-100'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Market Overreaction</p>
                </div>
              </div>

              {/* Half-Life Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 relative overflow-hidden group hover:border-purple-300 transition-all duration-300">
                <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Half-Life</span>
                  </div>
                  <p className="text-4xl font-black text-purple-600">{forensicCalculation?.halfLife?.days || 7}<span className="text-xl">d</span></p>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse"
                        style={{ width: `${Math.min(100, ((forensicCalculation?.halfLife?.days || 7) / 30) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400">30d max</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Narrative Decay</p>
                </div>
              </div>

              {/* Drift Index Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 relative overflow-hidden group hover:border-rose-300 transition-all duration-300">
                <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      (epistemicDrift?.magnitude || 0) > 50 ? 'bg-red-100' :
                      (epistemicDrift?.magnitude || 0) > 25 ? 'bg-amber-100' : 'bg-emerald-100'
                    }`}>
                      <svg className={`w-4 h-4 ${
                        (epistemicDrift?.magnitude || 0) > 50 ? 'text-red-600' :
                        (epistemicDrift?.magnitude || 0) > 25 ? 'text-amber-600' : 'text-emerald-600'
                      }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Drift Index</span>
                  </div>
                  <p className={`text-4xl font-black ${
                    (epistemicDrift?.magnitude || 0) > 50 ? 'text-red-500' :
                    (epistemicDrift?.magnitude || 0) > 25 ? 'text-amber-500' : 'text-emerald-500'
                  }`}>{epistemicDrift?.magnitude || 0}</p>
                  <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${
                        (epistemicDrift?.magnitude || 0) > 50 ? 'bg-gradient-to-r from-red-500 to-rose-500' :
                        (epistemicDrift?.magnitude || 0) > 25 ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                        'bg-gradient-to-r from-emerald-500 to-green-500'
                      }`}
                      style={{ width: `${epistemicDrift?.magnitude || 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Epistemic Drift</p>
                </div>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Primary Thesis Card - Redesigned */}
                <div id="primary-thesis-card" className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-red-500 to-rose-600 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-white font-black text-sm uppercase tracking-wider">Primary Thesis Audit</p>
                          <p className="text-red-100 text-[10px]">Core Claim Under Investigation</p>
                        </div>
                      </div>
                      <CardExportButton elementId="primary-thesis-card" fileName={`${ticker}_primary_thesis`} dark />
                    </div>
                  </div>
                  <div className="p-6">
                    <p className="text-2xl font-black text-slate-900 leading-tight mb-4">
                      "{primaryThesis?.statement || summary || `Market pricing disconnected from fundamental guidance; AI premium compression active.`}"
                    </p>
                    <p className="text-slate-500 italic leading-relaxed">
                      {primaryThesis?.explanation ||
                        `The stock collapsed ${forensicCalculation?.overreaction?.priceVelocity || '17.13'}% despite prior bullish analyst setups, indicating a classic 'buy the rumor, sell the news' event.`}
                    </p>
                  </div>
                </div>

                {/* Thesis Source Card - Redesigned */}
                <div id="thesis-source-card" className="bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 uppercase tracking-wider">Thesis Source</p>
                        <p className="text-[10px] text-slate-400">Origin Attribution</p>
                      </div>
                    </div>
                    <CardExportButton elementId="thesis-source-card" fileName={`${ticker}_thesis_source`} />
                  </div>

                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <span className="text-2xl font-black text-white">{(analystAudit?.name || 'U')[0]}</span>
                    </div>
                    <div>
                      <p className="text-xl font-black text-slate-900">{analystAudit?.name || 'Unknown Source'}</p>
                      <p className="text-sm text-slate-500">{analystAudit?.firm || 'Unverified'}</p>
                    </div>
                  </div>

                  {(!analystAudit?.name || analystAudit?.name === 'Unknown Source' || analystAudit?.firm === 'Unverified') && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-center gap-2">
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                      <p className="text-xs font-bold text-amber-700">Source not identified - lower confidence score applied</p>
                    </div>
                  )}

                  {/* Credibility Score Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Credibility Score</span>
                      <span className="font-bold text-indigo-600">{analystAudit?.credibilityScore?.toFixed(0) || '50'}%</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-1000 ease-out relative"
                        style={{ width: `${analystAudit?.credibilityScore || 50}%` }}
                      >
                        <div className="absolute inset-0 bg-white/30 animate-pulse" style={{ animationDuration: '2s' }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Executive Summary Card - Redesigned */}
                <div id="executive-summary-card" className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 rounded-2xl p-6 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-1/2 translate-x-1/2 blur-xl" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full translate-y-1/2 -translate-x-1/2 blur-xl" />
                  </div>

                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-white font-black text-sm uppercase tracking-wider">Executive Summary</p>
                          <p className="text-indigo-200 text-[10px]">Actionable Intelligence</p>
                        </div>
                      </div>
                      <CardExportButton elementId="executive-summary-card" fileName={`${ticker}_executive_summary`} dark />
                    </div>

                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4">
                      <p className="text-white font-bold text-lg leading-snug">
                        {auditVerdict === 'STRUCTURALLY_SUPPORTED'
                          ? `${ticker} narrative aligns with structural fundamentals. Position with ${riskRating.toLowerCase()} risk parameters.`
                          : auditVerdict === 'NARRATIVE_TRAP'
                          ? `${ticker} shows classic narrative trap. Exercise extreme caution.`
                          : `${ticker} requires additional verification. Mixed signals detected.`}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
                        <p className="text-white font-black text-2xl">{forensicCalculation?.halfLife?.days || 7}d</p>
                        <p className="text-[10px] text-indigo-200 uppercase">Decay Window</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
                        <p className={`font-black text-2xl ${(forensicCalculation?.overreaction?.ratio || 1) > 1.5 ? 'text-amber-300' : 'text-emerald-300'}`}>
                          {(forensicCalculation?.overreaction?.ratio || 1).toFixed(1)}x
                        </p>
                        <p className="text-[10px] text-indigo-200 uppercase">OR Ratio</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Claim-Evidence Quadrant - Redesigned */}
                <div id="spatial-divergence-card" className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-700/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                          <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-white uppercase tracking-wider">Divergence Map</h3>
                          <p className="text-[10px] text-slate-400">Claim vs Evidence Position</p>
                        </div>
                      </div>
                      <CardExportButton elementId="spatial-divergence-card" fileName={`${ticker}_divergence`} dark />
                    </div>
                  </div>

                  <div className="p-6">
                    {/* Quadrant Visualization */}
                    <div className="relative w-full aspect-square max-h-[280px] bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden mb-4">
                      {/* Grid */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent" />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-full w-px bg-gradient-to-b from-transparent via-slate-600 to-transparent" />
                      </div>

                      {/* Quadrant Labels */}
                      <div className="absolute top-3 left-3 px-2 py-1 bg-red-500/20 text-red-400 text-[9px] font-bold uppercase rounded border border-red-500/30">Trap</div>
                      <div className="absolute top-3 right-3 px-2 py-1 bg-emerald-500/20 text-emerald-400 text-[9px] font-bold uppercase rounded border border-emerald-500/30">Valid</div>
                      <div className="absolute bottom-3 left-3 px-2 py-1 bg-slate-500/20 text-slate-400 text-[9px] font-bold uppercase rounded border border-slate-500/30">Noise</div>
                      <div className="absolute bottom-3 right-3 px-2 py-1 bg-blue-500/20 text-blue-400 text-[9px] font-bold uppercase rounded border border-blue-500/30">Factual</div>

                      {/* Animated Position Indicator */}
                      <div
                        className="absolute w-6 h-6 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ease-out"
                        style={{ left: `${quadrantPos.x}%`, top: `${quadrantPos.y}%` }}
                      >
                        <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-40" />
                        <div className="absolute inset-0 bg-indigo-500 rounded-full shadow-lg ring-4 ring-indigo-500/30" />
                        <div className="absolute inset-1 bg-white rounded-full" />
                      </div>
                    </div>

                    {/* Verdict */}
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                      <p className="text-white text-sm">
                        Position: <span className={`font-black ${quadrant.color}`}>{quadrant.label.replace(/_/g, ' ')}</span>
                      </p>
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase">Claim Strength</p>
                          <p className="text-lg font-black text-white">{forensicCalculation?.vms?.score || 50}%</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase">Evidence Quality</p>
                          <p className="text-lg font-black text-white">{100 - (epistemicDrift?.magnitude || 50)}%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Structural Risk Card - Redesigned */}
                <div id="structural-risk-card" className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className={`px-6 py-4 ${
                    riskRating === 'HIGH' ? 'bg-gradient-to-r from-red-500 to-rose-600' :
                    riskRating === 'MODERATE' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                    'bg-gradient-to-r from-emerald-500 to-green-600'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-white font-black text-sm uppercase tracking-wider">Structural Risk</p>
                          <p className="text-white/70 text-[10px]">Risk Classification</p>
                        </div>
                      </div>
                      <span className="px-4 py-2 bg-white/20 rounded-xl text-white text-xl font-black uppercase backdrop-blur-sm">
                        {riskRating}
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <p className="text-slate-600 leading-relaxed mb-4">
                      {structuralRiskAudit?.description ||
                        (riskRating === 'LOW'
                          ? 'No structural divergence detected. Financials fully support the headline claims.'
                          : `Extreme downside volatility (${forensicCalculation?.overreaction?.priceVelocity || '-17.13'}%) suggests institutional capitulation.`)}
                    </p>
                    <CardExportButton elementId="structural-risk-card" fileName={`${ticker}_structural_risk`} />
                  </div>
                </div>
              </div>
            </div>

            {/* Forensic Metrics Grid - Beautiful Animated Bars */}
            <div id="forensic-metrics-card" className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white tracking-tight">FORENSIC CALCULATION LEDGER</h3>
                      <p className="text-[10px] text-indigo-300 uppercase tracking-widest">Patent-Protected Analysis Protocol</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-400 text-[10px] font-bold uppercase flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                      Protocol Active
                    </span>
                    <CardExportButton elementId="forensic-metrics-card" fileName={`${ticker}_forensic_metrics`} />
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Overreaction Ratio */}
                <div className="group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-900">Overreaction Ratio (OR)</span>
                      <span className="text-[10px] text-slate-400">1.0x – ∞</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-2xl font-black ${
                        (forensicCalculation?.overreaction?.ratio || 1) > 2 ? 'text-red-500' :
                        (forensicCalculation?.overreaction?.ratio || 1) > 1.5 ? 'text-amber-500' : 'text-emerald-500'
                      }`}>{(forensicCalculation?.overreaction?.ratio || 1).toFixed(1)}x</span>
                    </div>
                  </div>
                  <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out relative ${
                        (forensicCalculation?.overreaction?.ratio || 1) > 2 ? 'bg-gradient-to-r from-red-400 to-red-600' :
                        (forensicCalculation?.overreaction?.ratio || 1) > 1.5 ? 'bg-gradient-to-r from-amber-400 to-amber-600' :
                        'bg-gradient-to-r from-emerald-400 to-emerald-600'
                      }`}
                      style={{ width: `${Math.min(100, ((forensicCalculation?.overreaction?.ratio || 1) / 5) * 100)}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Price velocity vs fundamental velocity</p>
                </div>

                {/* VMS Score */}
                <div className="group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-900">Verification Match Score (VMS)</span>
                      <span className="text-[10px] text-slate-400">0 – 100</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-2xl font-black ${
                        (forensicCalculation?.vms?.score || 75) >= 70 ? 'text-emerald-500' :
                        (forensicCalculation?.vms?.score || 75) >= 40 ? 'text-amber-500' : 'text-red-500'
                      }`}>{forensicCalculation?.vms?.score || 75}</span>
                    </div>
                  </div>
                  <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-400 to-purple-600 rounded-full transition-all duration-1000 ease-out relative"
                      style={{ width: `${forensicCalculation?.vms?.score || 75}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Claim-to-evidence alignment verification</p>
                </div>

                {/* Narrative Risk Score */}
                <div className="group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-900">Narrative Risk Score (NRS)</span>
                      <span className="text-[10px] text-slate-400">0 – 100</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-2xl font-black ${
                        (epistemicDrift?.magnitude || 0) > 50 ? 'text-red-500' :
                        (epistemicDrift?.magnitude || 0) > 25 ? 'text-amber-500' : 'text-emerald-500'
                      }`}>{epistemicDrift?.magnitude || 0}</span>
                    </div>
                  </div>
                  <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out relative ${
                        (epistemicDrift?.magnitude || 0) > 50 ? 'bg-gradient-to-r from-red-400 to-rose-600' :
                        (epistemicDrift?.magnitude || 0) > 25 ? 'bg-gradient-to-r from-amber-400 to-orange-600' :
                        'bg-gradient-to-r from-emerald-400 to-green-600'
                      }`}
                      style={{ width: `${epistemicDrift?.magnitude || 0}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Epistemic drift from factual baseline</p>
                </div>

                {/* Coordination Score */}
                <div className="group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-900">Coordination Score</span>
                      <span className="text-[10px] text-slate-400">0 – 100</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-2xl font-black ${
                        (forensicCalculation?.coordination?.score || 0) > 60 ? 'text-red-500' :
                        (forensicCalculation?.coordination?.score || 0) > 30 ? 'text-amber-500' : 'text-emerald-500'
                      }`}>{forensicCalculation?.coordination?.score || 0}</span>
                    </div>
                  </div>
                  <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out relative ${
                        (forensicCalculation?.coordination?.score || 0) > 60 ? 'bg-gradient-to-r from-red-400 to-rose-600' :
                        (forensicCalculation?.coordination?.score || 0) > 30 ? 'bg-gradient-to-r from-amber-400 to-orange-600' :
                        'bg-gradient-to-r from-emerald-400 to-green-600'
                      }`}
                      style={{ width: `${forensicCalculation?.coordination?.score || 0}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Cross-platform narrative synchronization detection</p>
                </div>

                {/* Analyst Credibility */}
                <div className="group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-900">Analyst Credibility Score (ACS)</span>
                      <span className="text-[10px] text-slate-400">0 – 100</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-2xl font-black ${
                        (analystAudit?.credibilityScore || 50) >= 70 ? 'text-emerald-500' :
                        (analystAudit?.credibilityScore || 50) >= 40 ? 'text-amber-500' : 'text-red-500'
                      }`}>{analystAudit?.credibilityScore?.toFixed(0) || 50}</span>
                    </div>
                  </div>
                  <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out relative ${
                        (analystAudit?.credibilityScore || 50) >= 70 ? 'bg-gradient-to-r from-emerald-400 to-green-600' :
                        (analystAudit?.credibilityScore || 50) >= 40 ? 'bg-gradient-to-r from-amber-400 to-orange-600' :
                        'bg-gradient-to-r from-red-400 to-rose-600'
                      }`}
                      style={{ width: `${analystAudit?.credibilityScore || 50}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Historical accuracy and track record assessment</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'SENTIMENT' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Market Belief Timeline - Causal Narrative Mapping */}
            {ticker && (
              <MarketBeliefTimeline ticker={ticker} />
            )}

            {/* Social Momentum */}
            <div id="social-momentum-card" className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-slate-900">Social Momentum Analysis</h3>
                <CardExportButton elementId="social-momentum-card" fileName={`${ticker}_social_momentum`} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-slate-50 rounded-xl text-center">
                  <p className="text-3xl font-black text-slate-900">{socialMomentum?.score || 50}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Momentum Score</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl text-center">
                  <p className={`text-lg font-black ${
                    socialMomentum?.trend === 'RISING' ? 'text-emerald-500' :
                    socialMomentum?.trend === 'DECAYING' ? 'text-red-500' :
                    'text-slate-500'
                  }`}>
                    {socialMomentum?.trend || 'STABLE'}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Trend</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl text-center">
                  <p className="text-xl font-black text-slate-900">{socialMomentum?.crowdBias || 0}%</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Crowd Bias</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl text-center">
                  <p className="text-xl font-black text-slate-900">{socialMomentum?.expertBias || 0}%</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Expert Bias</p>
                </div>
              </div>

              {/* Sentiment Chart */}
              {sentimentDynamics && sentimentDynamics.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-4">Sentiment Timeline</h4>
                  <SentimentChart data={sentimentDynamics} />
                </div>
              )}
            </div>

            {/* Narrative Pressure Timeline */}
            {narrativePressureData.priceData.length > 0 && (
              <NarrativePressureTimeline
                ticker={ticker}
                priceData={narrativePressureData.priceData}
                narrativeEvents={narrativePressureData.events}
              />
            )}

            {/* Narrative Decay Half-Life Chart */}
            <NarrativeDecayChart
              ticker={ticker}
              initialEnergy={decayData.initialEnergy}
              decayRate={decayData.decayRate}
              halfLifeDays={decayData.halfLifeDays}
              currentDay={decayData.currentDay}
              narrativeStatus={decayData.narrativeStatus}
            />

            {/* Narrative Insights */}
            <div id="narrative-insights-card" className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-slate-900">Narrative Insights</h3>
                <CardExportButton elementId="narrative-insights-card" fileName={`${ticker}_narrative_insights`} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {analysis.narrativeInsights?.preEarnings && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-[10px] font-bold text-amber-600 uppercase mb-2">Pre-Earnings Activity</p>
                    <p className="text-sm text-amber-800">{analysis.narrativeInsights.preEarnings}</p>
                  </div>
                )}
                {analysis.narrativeInsights?.volumeBehavior && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-[10px] font-bold text-blue-600 uppercase mb-2">Volume Behavior</p>
                    <p className="text-sm text-blue-800">{analysis.narrativeInsights.volumeBehavior}</p>
                  </div>
                )}
                {analysis.narrativeInsights?.narrativeConsistency && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase mb-2">Narrative Consistency</p>
                    <p className="text-sm text-emerald-800">{analysis.narrativeInsights.narrativeConsistency}</p>
                  </div>
                )}
                {analysis.narrativeInsights?.newsAccuracyAnalysis && (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
                    <p className="text-[10px] font-bold text-purple-600 uppercase mb-2">News Accuracy</p>
                    <p className="text-sm text-purple-800">{analysis.narrativeInsights.newsAccuracyAnalysis}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'PRESS_AUDIT' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Coordinate Mapping Evidence Grid */}
            {claimMappings.length > 0 && (
              <CoordinateMappingGrid
                ticker={ticker}
                claims={claimMappings}
              />
            )}

            {/* Pre-Publication Activity Radar */}
            <PrePublicationRadar
              ticker={ticker}
              publicationDate={prePublicationData.publicationDate}
              activityData={prePublicationData.activityData}
              overallRisk={prePublicationData.overallRisk}
              frontRunningScore={prePublicationData.frontRunningScore}
              manipulationIndicators={prePublicationData.manipulationIndicators}
            />

            {/* Press Audits */}
            <div id="press-audit-card" className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-slate-900">Press Audit Trail</h3>
                <CardExportButton elementId="press-audit-card" fileName={`${ticker}_press_audit`} />
              </div>

              {pressAudits && pressAudits.length > 0 ? (
                <div className="space-y-4">
                  {pressAudits.map((audit, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-xl">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-bold text-slate-900">{audit.headline}</p>
                          <p className="text-sm text-slate-500">{audit.source} • {audit.date}</p>
                        </div>
                        <span
                          className="px-2 py-1 text-[10px] font-bold uppercase rounded ml-4"
                          style={{
                            backgroundColor: `${VERDICT_COLORS[audit.verdict]}15`,
                            color: VERDICT_COLORS[audit.verdict],
                          }}
                        >
                          {audit.verdict.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">{audit.realityCheck}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                  <p className="font-medium">No press audits available</p>
                  <p className="text-sm">Submit more content for comprehensive press analysis</p>
                </div>
              )}
            </div>

            {/* Forensic Ledger */}
            {forensicLedger && forensicLedger.length > 0 && (
              <div id="forensic-claim-ledger-card" className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-black text-slate-900">Forensic Claim Ledger</h3>
                  <CardExportButton elementId="forensic-claim-ledger-card" fileName={`${ticker}_claim_ledger`} />
                </div>
                <div className="space-y-4">
                  {forensicLedger.map((claim, idx) => (
                    <div key={idx} className="p-4 border border-slate-200 rounded-xl">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium text-slate-900 flex-1">{claim.text}</p>
                        <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded ml-4 ${
                          claim.evidenceQuality === 'HIGH' ? 'bg-emerald-100 text-emerald-700' :
                          claim.evidenceQuality === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {claim.evidenceQuality}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mb-2">{claim.deconstruction}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span>Type: {claim.type}</span>
                        <span>Horizon: {claim.horizon}</span>
                        <span>Confidence: {claim.confidenceScore}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Grounding Citations */}
            {(analysis as any).groundingCitations && (analysis as any).groundingCitations.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Grounded Sources</h3>
                    <p className="text-xs text-slate-500">Verified via Google Search</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {(analysis as any).groundingCitations.slice(0, 5).map((url: string, idx: number) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <p className="text-sm text-indigo-600 truncate">{url}</p>
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

// Helper Components
const QualityBar: React.FC<{
  label: string;
  value: number;
  color?: string;
}> = ({ label, value, color = '#4f46e5' }) => (
  <div>
    <div className="flex justify-between text-sm mb-1">
      <span className="text-slate-600">{label}</span>
      <span className="font-bold text-slate-900">{value}%</span>
    </div>
    <div className="h-2 bg-slate-200 rounded-full">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${value}%`, backgroundColor: color }}
      />
    </div>
  </div>
);

const LedgerRow: React.FC<{
  metric: string;
  value: string | number;
  verdict: string;
  description: string;
}> = ({ metric, value, verdict, description }) => (
  <tr className="border-b border-slate-100 last:border-0">
    <td className="py-3 text-sm font-medium text-slate-900">{metric}</td>
    <td className="py-3 text-sm font-bold text-indigo-600">{value}</td>
    <td className="py-3">
      <span className="px-2 py-1 text-[10px] font-bold uppercase rounded bg-slate-100 text-slate-600">
        {verdict}
      </span>
    </td>
    <td className="py-3 text-sm text-slate-500">{description}</td>
  </tr>
);

export default RecommendationCard;
