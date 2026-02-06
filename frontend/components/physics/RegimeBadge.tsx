'use client';

import React from 'react';
import type { RegimeType, SeverityLevel } from '../../lib/physics/types';
import { REGIME_CONFIG, SEVERITY_CONFIG, PHYSICS_COLORS } from '../../lib/physics/types';

// =============================================================================
// Regime Badge - Enterprise Light Theme (E*Trade + Salesforce inspired)
// =============================================================================

interface RegimeBadgeProps {
  regime: RegimeType;
  size?: 'sm' | 'md' | 'lg';
}

export const RegimeBadge: React.FC<RegimeBadgeProps> = ({ regime, size = 'md' }) => {
  const config = REGIME_CONFIG[regime];
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[9px]',
    md: 'px-2.5 py-1 text-[10px]',
    lg: 'px-3.5 py-1.5 text-xs',
  };

  return (
    <span
      className={`${sizeClasses[size]} font-bold uppercase tracking-wider rounded-full font-mono inline-flex items-center gap-1.5`}
      style={{
        backgroundColor: config.bgColor,
        color: config.color,
        border: `1px solid ${config.borderColor}`,
        boxShadow: `0 1px 3px rgba(0, 0, 0, 0.06), 0 0 0 1px ${config.borderColor}40`,
      }}
    >
      <span
        className="rounded-full"
        style={{
          width: size === 'sm' ? 5 : size === 'md' ? 6 : 7,
          height: size === 'sm' ? 5 : size === 'md' ? 6 : 7,
          backgroundColor: config.color,
          boxShadow: `0 0 4px ${config.color}60`,
        }}
      />
      {config.label}
    </span>
  );
};

// =============================================================================
// Severity Indicator - Bordered Alert Style with Gradient Background
// =============================================================================

interface SeverityIndicatorProps {
  severity: SeverityLevel;
  sfs?: number;
  compact?: boolean;
}

export const SeverityIndicator: React.FC<SeverityIndicatorProps> = ({
  severity,
  sfs,
  compact = false,
}) => {
  const config = SEVERITY_CONFIG[severity];

  if (severity === 'none') {
    if (compact) return null;
    return (
      <span className="text-[10px] text-ink-500 font-mono uppercase tracking-wide">
        No Active Warnings
      </span>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-md font-mono ${
        compact ? 'px-2 py-0.5' : 'px-3 py-1.5'
      }`}
      style={{
        background: `linear-gradient(135deg, ${config.bgColor}, ${config.bgColor}DD)`,
        border: `1px solid ${config.borderColor}`,
        boxShadow: `0 1px 2px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.6)`,
      }}
    >
      <span
        className={`${
          severity === 'critical' ? 'animate-pulse' : ''
        } rounded-full`}
        style={{
          width: compact ? 6 : 8,
          height: compact ? 6 : 8,
          backgroundColor: config.color,
          boxShadow: severity === 'critical'
            ? `0 0 6px ${config.color}80`
            : `0 0 3px ${config.color}50`,
        }}
      />
      <span
        className={`font-bold uppercase tracking-wider ${
          compact ? 'text-[9px]' : 'text-[10px]'
        }`}
        style={{ color: config.color }}
      >
        {config.label}
      </span>
      {sfs !== undefined && !compact && (
        <span
          className="text-[9px] ml-1.5 font-medium tabular-nums"
          style={{ color: `${config.color}BB` }}
        >
          SFS: {sfs.toFixed(3)}
        </span>
      )}
    </div>
  );
};

// =============================================================================
// Metric Card - White Card with Shadow, Gradient Top-Border, Animated Numbers
// =============================================================================

interface MetricCardProps {
  label: string;
  value: string;
  subtext?: string;
  color?: string;
  mono?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  color = PHYSICS_COLORS.text,
  mono = true,
}) => {
  return (
    <div
      className="bg-white rounded-lg px-3.5 py-3 relative overflow-hidden"
      style={{
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
      }}
    >
      {/* Gradient top-border accent */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: `linear-gradient(90deg, ${color}CC, ${color}40)`,
        }}
      />
      <p className="text-[9px] text-ink-500 uppercase tracking-wider mb-1.5 font-mono font-medium">
        {label}
      </p>
      <p
        className={`text-lg font-bold leading-tight ${mono ? 'font-mono tabular-nums' : ''}`}
        style={{
          color,
          letterSpacing: mono ? '-0.02em' : undefined,
        }}
      >
        {value}
      </p>
      {subtext && (
        <p className="text-[10px] text-ink-400 mt-1 leading-snug">{subtext}</p>
      )}
    </div>
  );
};

// =============================================================================
// Physics Formula Display - Glass-Morphism Card with Gradient Accent
// =============================================================================

interface FormulaDisplayProps {
  e0: number;
  lambda: number;
  halfLife: number;
}

export const FormulaDisplay: React.FC<FormulaDisplayProps> = ({
  e0,
  lambda,
  halfLife,
}) => {
  return (
    <div
      className="rounded-lg px-4 py-3.5 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,252,0.9))',
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 6px rgba(0, 0, 0, 0.02)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Gradient accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: `linear-gradient(90deg, ${PHYSICS_COLORS.npi}, ${PHYSICS_COLORS.anchor})`,
        }}
      />
      <div className="flex items-center justify-between">
        <div className="font-mono text-xs">
          <span className="text-ink-400 font-medium">NPI(t) = </span>
          <span className="text-ink-900 font-bold">{e0.toFixed(0)}</span>
          <span className="text-ink-400"> &middot; e</span>
          <sup className="text-ink-400">(-</sup>
          <span className="font-bold" style={{ color: PHYSICS_COLORS.npi }}>
            {lambda.toFixed(4)}
          </span>
          <sup className="text-ink-400"> &middot; t)</sup>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span>
            <span className="text-ink-400 font-medium">&lambda; = </span>
            <span className="font-semibold" style={{ color: PHYSICS_COLORS.npi }}>
              {lambda.toFixed(4)}
            </span>
          </span>
          <span className="flex items-center gap-0.5">
            <span className="text-ink-400 font-medium">t&frac12; = </span>
            <span className="font-semibold" style={{ color: PHYSICS_COLORS.npi }}>
              {halfLife.toFixed(1)}d
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default RegimeBadge;
