'use client';

import React, { useEffect, useState } from 'react';
import type { MSIResult } from '../../lib/physics/msi-calculator';
import type { RegimeType, SeverityLevel } from '../../lib/physics/types';
import { REGIME_CONFIG, SEVERITY_CONFIG } from '../../lib/physics/types';
import { TermTooltip } from './Tooltip';

// =============================================================================
// Types
// =============================================================================

interface VerdictHeaderProps {
  msi: MSIResult;
  ticker: string;
  companyName: string;
  price: number;
  trend: 'improving' | 'stable' | 'deteriorating';
}

// =============================================================================
// Animated Score Hook
// =============================================================================

function useCountUp(target: number, duration: number = 1200): number {
  const [val, setVal] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const from = val;
    const diff = target - from;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      // Cubic ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(from + diff * eased);
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [target, duration]);

  return val;
}

// =============================================================================
// Score Ring - Dominant Visual Element
// =============================================================================

const ScoreRing: React.FC<{
  score: number;
  grade: string;
  gradeColor: string;
}> = ({ score, grade, gradeColor }) => {
  const animated = useCountUp(score);
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animated / 100) * circumference;

  return (
    <div className="relative w-40 h-40 flex-shrink-0">
      {/* Ambient glow */}
      <div
        className="absolute inset-0 rounded-full opacity-20 blur-xl"
        style={{ backgroundColor: gradeColor }}
      />

      <svg viewBox="0 0 140 140" className="w-40 h-40 -rotate-90">
        <defs>
          <linearGradient id="msiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradeColor} stopOpacity={0.9} />
            <stop offset="100%" stopColor={gradeColor} stopOpacity={0.5} />
          </linearGradient>
          <filter id="msiGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Background track */}
        <circle
          cx="70" cy="70" r={radius}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth="5"
        />
        {/* Score arc */}
        <circle
          cx="70" cy="70" r={radius}
          fill="none"
          stroke="url(#msiGrad)"
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          filter="url(#msiGlow)"
          className="transition-all duration-[1500ms] ease-out"
        />
        {/* Outer ring */}
        <circle
          cx="70" cy="70" r="66"
          fill="none"
          stroke="#F1F5F9"
          strokeWidth="0.5"
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-4xl font-black font-mono tabular-nums leading-none"
          style={{ color: gradeColor }}
        >
          {animated.toFixed(0)}
        </span>
        <span
          className="text-lg font-black font-mono mt-0.5"
          style={{ color: gradeColor }}
        >
          {grade}
        </span>
        <span className="text-[7px] font-mono text-ink-400 uppercase tracking-[0.2em] mt-1 flex items-center gap-0.5">
          MSI Score<TermTooltip id="msi" />
        </span>
      </div>
    </div>
  );
};

// =============================================================================
// Trend Indicator
// =============================================================================

const TrendBadge: React.FC<{ trend: 'improving' | 'stable' | 'deteriorating' }> = ({ trend }) => {
  const config = {
    improving: { color: '#059669', bg: '#D1FAE5', border: '#6EE7B7', label: 'IMPROVING', arrow: '\u2191' },
    stable: { color: '#D97706', bg: '#FEF3C7', border: '#FCD34D', label: 'STABLE', arrow: '\u2192' },
    deteriorating: { color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5', label: 'DETERIORATING', arrow: '\u2193' },
  }[trend];

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold"
      style={{ color: config.color, backgroundColor: config.bg, border: `1px solid ${config.border}` }}
    >
      <span className="text-xs">{config.arrow}</span>
      {config.label}
    </span>
  );
};

// =============================================================================
// Component Bars
// =============================================================================

const ComponentBar: React.FC<{
  label: string;
  value: number;
  weight: string;
  color: string;
  tooltipId?: string;
}> = ({ label, value, weight, color, tooltipId }) => {
  const animated = useCountUp(value, 1000);

  return (
    <div className="flex items-center gap-3">
      <div className="w-28 flex-shrink-0">
        <p className="text-[9px] font-mono text-ink-400 uppercase tracking-wider">
          {label}{tooltipId && <TermTooltip id={tooltipId} />}
        </p>
        <p className="text-[7px] font-mono text-ink-300">{weight}</p>
      </div>
      <div className="flex-1 h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${animated}%`,
            backgroundColor: color,
            boxShadow: `0 0 6px ${color}30`,
          }}
        />
      </div>
      <span className="text-[10px] font-mono font-bold text-ink-700 w-8 text-right tabular-nums">
        {animated.toFixed(0)}
      </span>
    </div>
  );
};

// =============================================================================
// Main VerdictHeader Component
// =============================================================================

const VerdictHeader: React.FC<VerdictHeaderProps> = ({
  msi,
  ticker,
  companyName,
  price,
  trend,
}) => {
  const regimeConfig = REGIME_CONFIG[msi.regime];
  const severityConfig = SEVERITY_CONFIG[msi.severity];

  return (
    <div
      className="bg-white border border-border rounded-xl shadow-card overflow-hidden animate-fadeIn"
      style={{ borderTop: `3px solid ${msi.gradeColor}` }}
    >
      <div className="p-6">
        <div className="flex items-start gap-8">
          {/* Score Ring - LEFT: Dominant Element */}
          <ScoreRing
            score={msi.score}
            grade={msi.grade}
            gradeColor={msi.gradeColor}
          />

          {/* Verdict Content - CENTER */}
          <div className="flex-1 min-w-0 pt-1">
            {/* Ticker + Price */}
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-black font-mono text-ink-900 tracking-wider">
                {ticker}
              </h1>
              <span className="text-lg font-mono text-ink-500 font-semibold tabular-nums">
                ${price.toFixed(2)}
              </span>
              <TrendBadge trend={trend} />
            </div>

            {/* Company name */}
            <p className="text-xs text-ink-400 font-mono mb-3">{companyName}</p>

            {/* Verdict */}
            <div className="flex items-center gap-2 mb-3">
              <span
                className="text-sm font-black font-mono uppercase tracking-wider"
                style={{ color: msi.gradeColor }}
              >
                {msi.verdict}
              </span>
            </div>

            {/* Description */}
            <p className="text-[11px] text-ink-500 leading-relaxed max-w-lg">
              {msi.description}
            </p>

            {/* Regime + Severity badges */}
            <div className="flex items-center gap-2 mt-4">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-mono font-bold"
                style={{
                  color: regimeConfig.color,
                  backgroundColor: regimeConfig.bgColor,
                  border: `1.5px solid ${regimeConfig.borderColor}`,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: regimeConfig.color }}
                />
                {regimeConfig.label}
              </span>

              {msi.severity !== 'none' && (
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-mono font-bold"
                  style={{
                    color: severityConfig.color,
                    backgroundColor: severityConfig.bgColor,
                    border: `1.5px solid ${severityConfig.borderColor}`,
                  }}
                >
                  {severityConfig.label}
                </span>
              )}
            </div>
          </div>

          {/* Component Breakdown - RIGHT */}
          <div className="w-72 flex-shrink-0 pt-2">
            <p className="text-[8px] font-mono text-ink-400 uppercase tracking-widest mb-3 font-bold">
              Score Decomposition
            </p>
            <div className="space-y-3">
              <ComponentBar
                label="Narrative Energy"
                value={msi.components.narrativeEnergy}
                weight="40% weight"
                color="#8B5CF6"
                tooltipId="narrativeEnergy"
              />
              <ComponentBar
                label="Anchor Alignment"
                value={msi.components.anchorAlignment}
                weight="35% weight"
                color="#059669"
                tooltipId="anchorAlignment"
              />
              <ComponentBar
                label="Stress Resistance"
                value={msi.components.stressResistance}
                weight="25% weight"
                color="#3B82F6"
                tooltipId="stressResistance"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerdictHeader;
