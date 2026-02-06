'use client';

import React, { useState, useEffect } from 'react';
import { StockAnalysis } from '@/types';

interface RecentFeedProps {
  onSelectAnalysis: (analysis: StockAnalysis) => void;
  trendingAudits: StockAnalysis[];
  isLoading: boolean;
  isQuotaExceeded?: boolean;
  onRetry?: () => void;
}

const VERDICT_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  NARRATIVE_TRAP: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-600' },
  STRUCTURALLY_SUPPORTED: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-600' },
  MIXED_INCOMPLETE: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-600' },
  SPECULATIVE_FRAMING: { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-600' },
  FACTUALLY_MISLEADING: { bg: 'bg-red-50', border: 'border-red-400', text: 'text-red-700' },
};

// Mock intelligence data for display
const MOCK_INTELLIGENCE: Partial<StockAnalysis>[] = [
  {
    ticker: 'NVDA',
    companyName: 'NVIDIA Corporation',
    articleTitle: 'NVIDIA Data Center Revenue Surges 400% on AI Demand',
    auditVerdict: 'STRUCTURALLY_SUPPORTED',
    confidenceScore: 92,
    summary: 'Record data center revenue validates AI infrastructure thesis. Hyperscaler capex acceleration supports multi-year growth trajectory.',
    socialMomentum: { score: 85, trend: 'RISING', crowdBias: 45, expertBias: 60 },
    riskRating: 'LOW',
  },
  {
    ticker: 'TSLA',
    companyName: 'Tesla Inc',
    articleTitle: 'Tesla Price Cuts Signal Demand Weakness or Strategic Move?',
    auditVerdict: 'NARRATIVE_TRAP',
    confidenceScore: 78,
    summary: 'Aggressive price cuts suggest demand challenges rather than strategic positioning. Margin compression risks elevated.',
    socialMomentum: { score: 65, trend: 'DECAYING', crowdBias: -25, expertBias: -15 },
    riskRating: 'HIGH',
  },
  {
    ticker: 'AAPL',
    companyName: 'Apple Inc',
    articleTitle: 'Apple Services Revenue Hits Record High in Q4',
    auditVerdict: 'MIXED_INCOMPLETE',
    confidenceScore: 85,
    summary: 'Services growth offsetting hardware slowdown. Narrative shift requires validation through upcoming product cycles.',
    socialMomentum: { score: 70, trend: 'STABLE', crowdBias: 15, expertBias: 20 },
    riskRating: 'MODERATE',
  },
];

// Mock stock data for live feed
const MOCK_LIVE_STOCKS = [
  { ticker: 'NVDA', name: 'NVIDIA', price: 878.35, change: 2.45, changePercent: 0.28, color: 'emerald' },
  { ticker: 'TSLA', name: 'Tesla', price: 175.21, change: -3.82, changePercent: -2.13, color: 'red' },
  { ticker: 'AAPL', name: 'Apple', price: 182.52, change: 1.23, changePercent: 0.68, color: 'emerald' },
  { ticker: 'MSFT', name: 'Microsoft', price: 425.22, change: 4.15, changePercent: 0.99, color: 'emerald' },
  { ticker: 'META', name: 'Meta', price: 505.95, change: -2.10, changePercent: -0.41, color: 'red' },
  { ticker: 'GOOGL', name: 'Alphabet', price: 155.37, change: 0.89, changePercent: 0.58, color: 'emerald' },
];

// Simple sparkline component
const Sparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 100 40" className="w-20 h-8">
      <polyline
        points={points}
        fill="none"
        stroke={color === 'emerald' ? '#10b981' : '#ef4444'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// Generate random sparkline data
const generateSparklineData = () => {
  return Array.from({ length: 20 }, () => Math.random() * 20 + 80);
};

const RecentFeed: React.FC<RecentFeedProps> = ({
  onSelectAnalysis,
  trendingAudits,
  isLoading,
  isQuotaExceeded,
  onRetry,
}) => {
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [sparklineData, setSparklineData] = useState<Record<string, number[]>>({});

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLastUpdated(now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }).toUpperCase());
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    // Generate sparkline data for each stock
    const data: Record<string, number[]> = {};
    MOCK_LIVE_STOCKS.forEach(stock => {
      data[stock.ticker] = generateSparklineData();
    });
    setSparklineData(data);

    return () => clearInterval(interval);
  }, []);

  // Get sentiment label and color
  const getSentiment = (audit: StockAnalysis) => {
    const sentiment = audit.socialMomentum?.crowdBias || 0;
    if (sentiment > 20) return { label: 'Bullish', color: 'text-emerald-500' };
    if (sentiment < -20) return { label: 'Bearish', color: 'text-red-500' };
    return { label: 'Neutral', color: 'text-slate-500' };
  };

  if (isLoading) {
    return (
      <div className="py-16">
        <div className="flex items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
          <span className="text-slate-500 font-medium">Loading market intelligence...</span>
        </div>
      </div>
    );
  }

  if (isQuotaExceeded) {
    return (
      <div className="py-16 text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="font-bold text-slate-900 mb-1">API quota exceeded</p>
        <p className="text-slate-500 text-sm mb-4">Please try again in a moment</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-6 py-2 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-slate-800"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-2xl font-black text-slate-900">Market Intelligence Feed</h2>
          </div>
          <p className="text-slate-500 text-sm ml-4">Live institutional forensic audits of today&apos;s movers</p>
        </div>
        <div className="px-4 py-2 bg-white border border-slate-200 rounded-lg">
          <span className="text-xs font-bold text-slate-600 tracking-wide">
            LAST UPDATED: {lastUpdated}
          </span>
        </div>
      </div>


      {/* Intelligence Cards - Always show mock data if real data is missing/incomplete */}
      {(() => {
        // Use mock data if trendingAudits is empty or has incomplete data
        const validAudits = trendingAudits.filter(a => a.ticker && a.companyName && a.articleTitle);
        const displayData = validAudits.length >= 3 ? validAudits.slice(0, 3) : MOCK_INTELLIGENCE;

        return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(displayData as StockAnalysis[]).map((audit, index) => {
            const verdictStyle = VERDICT_STYLES[audit.auditVerdict] || VERDICT_STYLES.MIXED_INCOMPLETE;
            const sentiment = getSentiment(audit);
            const confidence = audit.confidenceScore ? (audit.confidenceScore / 100).toFixed(2) : '0.75';

            return (
              <div
                key={index}
                onClick={() => onSelectAnalysis(audit)}
                className="bg-white rounded-2xl border border-slate-200 p-6 cursor-pointer hover:shadow-lg hover:border-slate-300 transition-all duration-200 group"
              >
                {/* Top Section: Avatar, Ticker, Verdict */}
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    {/* Avatar Circle */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-xl transition-all">
                      <span className="text-white font-bold text-lg">
                        {audit.ticker?.charAt(0) || 'S'}
                      </span>
                    </div>
                    {/* Ticker & Company */}
                    <div>
                      <h3 className="text-xl font-black text-slate-900">{audit.ticker}</h3>
                      <p className="text-xs text-slate-400 uppercase tracking-wide">
                        {audit.companyName || 'Unknown Company'}
                      </p>
                    </div>
                  </div>
                  {/* Verdict Badge */}
                  <div className={`px-3 py-1.5 rounded-lg border ${verdictStyle.bg} ${verdictStyle.border}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${verdictStyle.text}`}>
                      {audit.auditVerdict?.replace(/_/g, ' ') || 'PENDING'}
                    </span>
                  </div>
                </div>

                {/* Article Title */}
                <h4 className="font-bold text-slate-900 mb-3 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
                  {audit.articleTitle || `${audit.ticker} Market Analysis`}
                </h4>

                {/* Summary Quote */}
                <p className="text-sm text-slate-500 italic line-clamp-3 mb-6">
                  &ldquo;{audit.summary || 'Analysis pending...'}&rdquo;
                </p>

                {/* Bottom Metrics */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      Audit Conf.
                    </p>
                    <p className="text-lg font-black text-slate-900">{confidence}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      Sentiment
                    </p>
                    <p className={`text-lg font-black ${sentiment.color}`}>
                      {sentiment.label}
                    </p>
                  </div>
                </div>

                {/* View Report Link */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-2 group-hover:gap-3 transition-all">
                    View Full Report
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        );
      })()}
    </div>
  );
};

export default RecentFeed;
