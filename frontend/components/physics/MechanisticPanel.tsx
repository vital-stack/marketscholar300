'use client';

import React, { useState } from 'react';
import type { UnifiedPhysicsState, RegimeType } from '../../lib/physics/types';
import type { MSIResult } from '../../lib/physics/msi-calculator';
import { REGIME_CONFIG, PHYSICS_COLORS } from '../../lib/physics/types';

// =============================================================================
// Types
// =============================================================================

interface MechanisticPanelProps {
  state: UnifiedPhysicsState;
  msi: MSIResult;
}

// =============================================================================
// Expandable Section
// =============================================================================

const Section: React.FC<{
  title: string;
  subtitle: string;
  defaultOpen?: boolean;
  accentColor: string;
  children: React.ReactNode;
}> = ({ title, subtitle, defaultOpen = false, accentColor, children }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className="bg-white border border-border rounded-lg overflow-hidden transition-all duration-300"
      style={open ? { borderLeftWidth: '3px', borderLeftColor: accentColor } : undefined}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#FAFBFC] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
          <div className="text-left">
            <p className="text-[10px] font-mono font-bold text-ink-700 uppercase tracking-wider">
              {title}
            </p>
            <p className="text-[8px] font-mono text-ink-400 mt-0.5">{subtitle}</p>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-ink-300 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="px-4 pb-4 pt-1 border-t border-border">
          {children}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Metric Row
// =============================================================================

const MetricRow: React.FC<{
  label: string;
  value: string;
  color?: string;
  mono?: boolean;
  subtext?: string;
}> = ({ label, value, color = '#0F172A', mono = true, subtext }) => (
  <div className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
    <div>
      <span className="text-[9px] font-mono text-ink-400 uppercase">{label}</span>
      {subtext && <span className="text-[8px] font-mono text-ink-300 ml-2">{subtext}</span>}
    </div>
    <span
      className={`text-xs font-bold ${mono ? 'font-mono tabular-nums' : ''}`}
      style={{ color }}
    >
      {value}
    </span>
  </div>
);

// =============================================================================
// Formula Block
// =============================================================================

const FormulaBlock: React.FC<{
  formula: string;
  variables: Array<{ name: string; value: string; color?: string }>;
}> = ({ formula, variables }) => (
  <div className="bg-[#F8FAFC] border border-border rounded-md p-3 mt-3">
    <p className="text-[10px] font-mono text-ink-600 mb-2 font-semibold">{formula}</p>
    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
      {variables.map((v) => (
        <div key={v.name} className="flex items-center gap-2">
          <span className="text-[8px] font-mono text-ink-400">{v.name} =</span>
          <span
            className="text-[9px] font-mono font-bold"
            style={{ color: v.color || '#0F172A' }}
          >
            {v.value}
          </span>
        </div>
      ))}
    </div>
  </div>
);

// =============================================================================
// Regime Timeline (Mini)
// =============================================================================

const RegimeTimeline: React.FC<{ points: { regime: RegimeType }[] }> = ({ points }) => {
  // Compress into segments
  const segments: Array<{ regime: RegimeType; count: number }> = [];
  for (const point of points) {
    const last = segments[segments.length - 1];
    if (last && last.regime === point.regime) {
      last.count++;
    } else {
      segments.push({ regime: point.regime, count: 1 });
    }
  }

  const total = points.length;

  return (
    <div className="mt-3">
      <p className="text-[8px] font-mono text-ink-400 uppercase tracking-wider mb-1.5">
        Regime History ({total} days)
      </p>
      <div className="flex h-3 rounded-full overflow-hidden bg-[#F1F5F9]">
        {segments.map((seg, i) => (
          <div
            key={i}
            className="h-full transition-all duration-500"
            style={{
              width: `${(seg.count / total) * 100}%`,
              backgroundColor: REGIME_CONFIG[seg.regime].color,
              opacity: 0.7 + (i / segments.length) * 0.3,
            }}
            title={`${REGIME_CONFIG[seg.regime].label}: ${seg.count} days`}
          />
        ))}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-3 mt-2">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-sm"
              style={{ backgroundColor: REGIME_CONFIG[seg.regime].color }}
            />
            <span className="text-[7px] font-mono text-ink-400">
              {REGIME_CONFIG[seg.regime].label} ({seg.count}d)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// Main MechanisticPanel
// =============================================================================

const MechanisticPanel: React.FC<MechanisticPanelProps> = ({ state, msi }) => {
  const { metrics, catalyst, decayCurve, anchorMeta } = state;

  return (
    <div className="space-y-3 animate-fadeIn">
      <div className="flex items-center gap-2 mb-1">
        <p className="text-[9px] font-mono text-ink-400 uppercase tracking-widest font-bold">
          Mechanistic Decomposition
        </p>
        <span className="text-[8px] font-mono text-ink-300 bg-[#F1F5F9] px-2 py-0.5 rounded">
          Patent 63/971,478
        </span>
      </div>

      {/* Decay Physics */}
      <Section
        title="Narrative Decay Physics"
        subtitle="NPI exponential decay curve parameters"
        defaultOpen={true}
        accentColor="#8B5CF6"
      >
        <MetricRow
          label="Initial Energy (E\u2080)"
          value={catalyst.e0.toFixed(1)}
          color="#8B5CF6"
        />
        <MetricRow
          label="Decay Constant (\u03BB)"
          value={catalyst.lambda.toFixed(5)}
          color="#8B5CF6"
        />
        <MetricRow
          label="Half-Life (t\u00BD)"
          value={`${decayCurve.halfLife.toFixed(2)} days`}
          color="#6D28D9"
        />
        <MetricRow
          label="Current NPI"
          value={metrics.currentNpi.toFixed(2)}
          color="#8B5CF6"
          subtext={`(${metrics.energyRemainingPct.toFixed(1)}% remaining)`}
        />
        <MetricRow
          label="Exhaustion Threshold"
          value={`${(0.1 * catalyst.e0).toFixed(1)} (10% of E\u2080)`}
          color="#DC2626"
        />

        <FormulaBlock
          formula="NPI(t) = E\u2080 \u00B7 e^(\u2212\u03BB\u00B7t)"
          variables={[
            { name: 'E\u2080', value: catalyst.e0.toFixed(1), color: '#8B5CF6' },
            { name: '\u03BB', value: catalyst.lambda.toFixed(5), color: '#6D28D9' },
            { name: 't\u00BD', value: `${decayCurve.halfLife.toFixed(2)}d`, color: '#7C3AED' },
            { name: 't_exh', value: `${(metrics.timeToExhaustionHrs / 24).toFixed(1)}d`, color: '#DC2626' },
          ]}
        />
      </Section>

      {/* Structural Anchor */}
      <Section
        title="Structural Anchor (VMS)"
        subtitle="Verified fundamental support level"
        defaultOpen={false}
        accentColor="#059669"
      >
        <MetricRow
          label="Anchor Price"
          value={`$${state.points[0]?.anchor.toFixed(2)}`}
          color="#059669"
        />
        <MetricRow
          label="Current Price"
          value={`$${metrics.currentPrice.toFixed(2)}`}
          color={PHYSICS_COLORS.primaryDark}
        />
        <MetricRow
          label="Deviation"
          value={`${(metrics.deviationFromAnchor * 100).toFixed(2)}%`}
          color={Math.abs(metrics.deviationFromAnchor) > 0.1 ? '#DC2626' : '#059669'}
        />
        {anchorMeta.eps && (
          <MetricRow
            label="EPS (TTM)"
            value={`$${anchorMeta.eps.toFixed(2)}`}
          />
        )}
        {anchorMeta.fairValuePE && (
          <MetricRow
            label="Fair Value P/E"
            value={`${anchorMeta.fairValuePE}x`}
          />
        )}
        {anchorMeta.revenueGrowth && (
          <MetricRow
            label="Revenue Growth"
            value={`+${(anchorMeta.revenueGrowth * 100).toFixed(0)}%`}
            color="#059669"
          />
        )}
        <MetricRow
          label="Data Source"
          value={anchorMeta.source}
          mono={false}
          color="#64748B"
        />

        <FormulaBlock
          formula="VMS = 0.65 \u00B7 tableCoordMatch + 0.35 \u00B7 textMatch"
          variables={[
            { name: 'Anchor', value: `$${state.points[0]?.anchor.toFixed(2)}`, color: '#059669' },
            { name: 'Deviation', value: `${(metrics.deviationFromAnchor * 100).toFixed(2)}%` },
          ]}
        />
      </Section>

      {/* Support Failure Analysis */}
      <Section
        title="Support Failure Score"
        subtitle="Price stress vs. narrative depletion"
        defaultOpen={false}
        accentColor="#DC2626"
      >
        <MetricRow
          label="SFS"
          value={metrics.supportFailureScore.toFixed(5)}
          color={metrics.currentSeverity === 'critical' ? '#DC2626' : '#D97706'}
        />
        <MetricRow
          label="Severity"
          value={metrics.currentSeverity.toUpperCase()}
          color={
            metrics.currentSeverity === 'critical' ? '#DC2626'
            : metrics.currentSeverity === 'warning' ? '#EA580C'
            : metrics.currentSeverity === 'watch' ? '#D97706'
            : '#64748B'
          }
        />
        <MetricRow
          label="Deviation Component"
          value={`${(Math.abs(metrics.deviationFromAnchor) * 100).toFixed(2)}%`}
          subtext="abs(price - anchor) / anchor"
        />
        <MetricRow
          label="Energy Drain"
          value={`${((1 - metrics.currentNpiNorm) * 100).toFixed(1)}%`}
          subtext="1 - npiNorm"
          color="#DC2626"
        />

        <FormulaBlock
          formula="SFS = deviation \u00B7 (1 \u2212 energy)"
          variables={[
            { name: 'deviation', value: `${(Math.abs(metrics.deviationFromAnchor) * 100).toFixed(2)}%` },
            { name: 'energy', value: `${(metrics.currentNpiNorm * 100).toFixed(1)}%`, color: '#8B5CF6' },
            { name: 'SFS', value: metrics.supportFailureScore.toFixed(5), color: '#DC2626' },
          ]}
        />
      </Section>

      {/* MSI Decomposition */}
      <Section
        title="MSI Score Decomposition"
        subtitle="Market Support Integrity composite breakdown"
        defaultOpen={false}
        accentColor={msi.gradeColor}
      >
        <MetricRow
          label="MSI Score"
          value={`${msi.score.toFixed(1)} (${msi.grade})`}
          color={msi.gradeColor}
        />
        <MetricRow
          label="Narrative Energy"
          value={`${msi.components.narrativeEnergy.toFixed(1)} (40%)`}
          color="#8B5CF6"
        />
        <MetricRow
          label="Anchor Alignment"
          value={`${msi.components.anchorAlignment.toFixed(1)} (35%)`}
          color="#059669"
        />
        <MetricRow
          label="Stress Resistance"
          value={`${msi.components.stressResistance.toFixed(1)} (25%)`}
          color="#3B82F6"
        />
        <MetricRow
          label="Verdict"
          value={msi.verdict}
          color={msi.gradeColor}
          mono={false}
        />

        <FormulaBlock
          formula="MSI = 0.40\u00B7NE + 0.35\u00B7AA + 0.25\u00B7SR"
          variables={[
            { name: 'NE', value: msi.components.narrativeEnergy.toFixed(1), color: '#8B5CF6' },
            { name: 'AA', value: msi.components.anchorAlignment.toFixed(1), color: '#059669' },
            { name: 'SR', value: msi.components.stressResistance.toFixed(1), color: '#3B82F6' },
            { name: 'MSI', value: msi.score.toFixed(1), color: msi.gradeColor },
          ]}
        />
      </Section>

      {/* Regime History */}
      <Section
        title="Regime Classification"
        subtitle="Physics regime state history"
        defaultOpen={false}
        accentColor={REGIME_CONFIG[metrics.currentRegime].color}
      >
        <MetricRow
          label="Current Regime"
          value={REGIME_CONFIG[metrics.currentRegime].label}
          color={REGIME_CONFIG[metrics.currentRegime].color}
        />
        <p className="text-[10px] text-ink-500 leading-relaxed mt-2 mb-2">
          {REGIME_CONFIG[metrics.currentRegime].description}
        </p>

        <RegimeTimeline points={state.points} />

        <FormulaBlock
          formula="OR = |priceVelocity| / |fundamentalVelocity|"
          variables={[
            { name: 'Regime', value: REGIME_CONFIG[metrics.currentRegime].label, color: REGIME_CONFIG[metrics.currentRegime].color },
            { name: 'NPI Norm', value: metrics.currentNpiNorm.toFixed(3), color: '#8B5CF6' },
          ]}
        />
      </Section>

      {/* Catalyst Source */}
      <Section
        title="Catalyst Source"
        subtitle="Narrative origin and source density"
        defaultOpen={false}
        accentColor="#2563EB"
      >
        <div className="mb-3">
          <p className="text-[9px] font-mono text-ink-400 uppercase mb-1">Headline</p>
          <p className="text-[11px] text-ink-700 leading-relaxed">
            {catalyst.headline}
          </p>
        </div>
        <MetricRow
          label="Source Density"
          value={`${catalyst.sourceDensity} sources`}
          color="#2563EB"
        />
        <MetricRow
          label="Catalyst Date"
          value={new Date(catalyst.timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        />
        {catalyst.sources && catalyst.sources.length > 0 && (
          <div className="mt-2">
            <p className="text-[8px] font-mono text-ink-400 uppercase mb-1">Sources</p>
            <div className="space-y-1">
              {catalyst.sources.map((s, i) => (
                <p key={i} className="text-[9px] font-mono text-primary-600 truncate">
                  {s}
                </p>
              ))}
            </div>
          </div>
        )}
      </Section>
    </div>
  );
};

export default MechanisticPanel;
