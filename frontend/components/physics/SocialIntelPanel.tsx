'use client';

import React from 'react';
import type { LunarCrushPhysicsData } from '../../lib/lunarcrush';
import { PHYSICS_COLORS } from '../../lib/physics/types';
import { TermTooltip } from './Tooltip';

// =============================================================================
// Types
// =============================================================================

interface SocialIntelPanelProps {
  data: LunarCrushPhysicsData | null;
  isLoading?: boolean;
}

// =============================================================================
// Gauge Component
// =============================================================================

const MiniGauge: React.FC<{
  value: number;
  max: number;
  label: string;
  color: string;
  suffix?: string;
}> = ({ value, max, label, color, suffix = '' }) => {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="text-center">
      <div className="relative w-14 h-14 mx-auto mb-1.5">
        <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
          <circle
            cx="18" cy="18" r="15.5"
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="3"
          />
          <circle
            cx="18" cy="18" r="15.5"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeDasharray={`${pct} ${100 - pct}`}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            style={{ filter: `drop-shadow(0 1px 2px ${color}40)` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-mono font-bold text-ink-900">
            {value.toFixed(0)}{suffix}
          </span>
        </div>
      </div>
      <p className="text-[8px] font-mono text-ink-400 uppercase tracking-wider">{label}</p>
    </div>
  );
};

// =============================================================================
// Trend Arrow
// =============================================================================

const TrendIndicator: React.FC<{ trend: string }> = ({ trend }) => {
  const config = {
    accelerating: { color: '#059669', label: 'ACCELERATING', arrow: 'rotate-[-45deg]' },
    stable: { color: '#D97706', label: 'STABLE', arrow: 'rotate-0' },
    decaying: { color: '#DC2626', label: 'DECAYING', arrow: 'rotate-[45deg]' },
  }[trend] || { color: '#94A3B8', label: trend.toUpperCase(), arrow: 'rotate-0' };

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] ${config.arrow}`}
        style={{ borderBottomColor: config.color }}
      />
      <span className="text-[9px] font-mono font-bold" style={{ color: config.color }}>
        {config.label}
      </span>
    </div>
  );
};

// =============================================================================
// Social Volume Sparkline
// =============================================================================

const SocialSparkline: React.FC<{
  data: Array<{ time: number; social_volume: number }>;
  width: number;
  height: number;
}> = ({ data, width, height }) => {
  if (data.length < 2) return null;

  const values = data.map((d) => d.social_volume || 0);
  const maxVal = Math.max(...values) || 1;

  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - (v / maxVal) * height * 0.8 - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' L ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id="socialGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.15} />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path
        d={`M ${points} L ${width},${height} L 0,${height} Z`}
        fill="url(#socialGrad)"
      />
      <path d={`M ${points}`} fill="none" stroke="#2563EB" strokeWidth="1.5" />
    </svg>
  );
};

// =============================================================================
// Main Panel
// =============================================================================

const SocialIntelPanel: React.FC<SocialIntelPanelProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <p className="text-[9px] font-mono text-ink-400 uppercase tracking-wider font-bold">
            Social Intelligence
          </p>
          <span className="text-[8px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded ml-auto">
            LUNARCRUSH
          </span>
        </div>
        <div className="h-32 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] text-ink-400 font-mono">Loading social data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-ink-300" />
          <p className="text-[9px] font-mono text-ink-400 uppercase tracking-wider font-bold">
            Social Intelligence
          </p>
          <span className="text-[8px] font-mono text-ink-300 bg-slate-50 px-1.5 py-0.5 rounded ml-auto">
            LUNARCRUSH
          </span>
        </div>
        <p className="text-[10px] text-ink-400 font-mono">
          No social data available. Connect LunarCrush API key to enable social intelligence layer.
        </p>
      </div>
    );
  }

  const formatNumber = (n: number): string => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toFixed(0);
  };

  return (
    <div
      className="bg-white border border-border rounded-lg p-5 shadow-sm animate-fadeIn"
      style={{ borderTop: '2px solid #3B82F6' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse-slow" />
        <p className="text-[9px] font-mono text-ink-400 uppercase tracking-wider font-bold">
          Social Intelligence
        </p>
        <span className="text-[8px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-semibold ml-auto">
          LUNARCRUSH
        </span>
      </div>

      {/* Social NPI */}
      <div className="bg-[#F8FAFC] border border-border rounded-md p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] font-mono text-ink-400 uppercase">Social NPI<TermTooltip id="socialNpi" /></span>
          <TrendIndicator trend={data.socialNpiTrend} />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black font-mono" style={{ color: PHYSICS_COLORS.npi }}>
            {data.socialNpi.toFixed(1)}
          </span>
          <span className="text-[10px] text-ink-300 font-mono">/ 100</span>
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${data.socialNpi}%`,
              background: `linear-gradient(90deg, ${PHYSICS_COLORS.npi}, #A78BFA)`,
              boxShadow: `0 0 8px ${PHYSICS_COLORS.npiGlow}`,
            }}
          />
        </div>
      </div>

      {/* Metric Gauges */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <MiniGauge value={data.galaxyScore} max={100} label="Galaxy" color="#8B5CF6" />
        <MiniGauge value={data.sentiment} max={100} label="Sentiment" color={data.sentiment > 0 ? '#059669' : '#DC2626'} />
        <MiniGauge value={Math.min(100, data.altRank)} max={100} label="Alt Rank" color="#2563EB" />
        <MiniGauge value={Math.min(100, 100 - data.spamScore)} max={100} label="Signal" color="#D97706" suffix="%" />
      </div>

      {/* Social Volume Sparkline */}
      {data.timeSeries.length > 0 && (
        <div className="mb-4">
          <p className="text-[8px] font-mono text-ink-400 uppercase tracking-wider mb-2">
            Social Volume (60d)
          </p>
          <SocialSparkline
            data={data.timeSeries}
            width={280}
            height={48}
          />
        </div>
      )}

      {/* Key Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white border border-border rounded-md px-3 py-2 shadow-sm" style={{ borderLeft: '3px solid #3B82F6' }}>
          <p className="text-[8px] font-mono text-ink-400 uppercase">Volume 24h</p>
          <p className="text-sm font-bold font-mono text-ink-900">
            {formatNumber(data.socialVolume24h)}
          </p>
        </div>
        <div className="bg-white border border-border rounded-md px-3 py-2 shadow-sm" style={{ borderLeft: '3px solid #8B5CF6' }}>
          <p className="text-[8px] font-mono text-ink-400 uppercase">Contributors</p>
          <p className="text-sm font-bold font-mono text-ink-900">
            {formatNumber(data.contributors)}
          </p>
        </div>
        <div className="bg-white border border-border rounded-md px-3 py-2 shadow-sm" style={{ borderLeft: '3px solid #059669' }}>
          <p className="text-[8px] font-mono text-ink-400 uppercase">Interactions</p>
          <p className="text-sm font-bold font-mono text-ink-900">
            {formatNumber(data.interactions24h)}
          </p>
        </div>
        <div className="bg-white border border-border rounded-md px-3 py-2 shadow-sm" style={{ borderLeft: '3px solid #D97706' }}>
          <p className="text-[8px] font-mono text-ink-400 uppercase">Dominance</p>
          <p className="text-sm font-bold font-mono text-ink-900">
            {data.socialDominance.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Top Posts Preview */}
      {data.topPosts.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-[8px] font-mono text-ink-400 uppercase tracking-wider mb-2">
            Top Social Posts
          </p>
          <div className="space-y-2">
            {data.topPosts.slice(0, 3).map((post, idx) => (
              <div
                key={idx}
                className="bg-white border border-border rounded-md px-3 py-2 shadow-sm transition-colors duration-150 hover:bg-[#F8FAFC]"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[8px] font-mono text-blue-600 font-semibold uppercase">
                    {post.source || post.post_type}
                  </span>
                  {post.creator_name && (
                    <span className="text-[8px] font-mono text-ink-400">
                      @{post.creator_name}
                    </span>
                  )}
                  {post.interactions_total && (
                    <span className="text-[8px] font-mono text-ink-300 ml-auto">
                      {formatNumber(post.interactions_total)} interactions
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-ink-500 leading-relaxed line-clamp-2">
                  {post.post_title || post.body || 'No content available'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialIntelPanel;
