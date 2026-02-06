'use client';

import React from 'react';
import type {
  UnifiedPhysicsPoint,
  UnifiedPhysicsState,
  RegimeType,
} from '../../lib/physics/types';
import { REGIME_CONFIG, SEVERITY_CONFIG, PHYSICS_COLORS } from '../../lib/physics/types';

// =============================================================================
// Types
// =============================================================================

interface NarrativeAuditDrawerProps {
  point: UnifiedPhysicsPoint | null;
  pointIndex: number;
  state: UnifiedPhysicsState;
  isOpen: boolean;
  onClose: () => void;
}

// =============================================================================
// Sub-components
// =============================================================================

const DeltaIndicator: React.FC<{ value: number; label: string }> = ({ value, label }) => {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const color = isPositive ? '#059669' : isNegative ? '#DC2626' : '#64748B';
  const bgColor = isPositive
    ? 'rgba(5, 150, 105, 0.06)'
    : isNegative
    ? 'rgba(220, 38, 38, 0.06)'
    : 'transparent';

  return (
    <div
      className="flex items-center justify-between py-2 px-1 rounded-sm transition-colors"
      style={{ backgroundColor: bgColor }}
    >
      <span className="text-[10px] text-ink-500 uppercase tracking-wider font-mono">
        {label}
      </span>
      <span className="text-xs font-mono font-semibold" style={{ color }}>
        {isPositive ? '+' : ''}
        {value.toFixed(2)}
      </span>
    </div>
  );
};

const RegimeTransitionCard: React.FC<{
  from?: RegimeType;
  to: RegimeType;
  reason: string;
}> = ({ from, to, reason }) => {
  const toConfig = REGIME_CONFIG[to];
  const fromConfig = from ? REGIME_CONFIG[from] : null;

  return (
    <div
      className="bg-white rounded-md border border-border overflow-hidden"
      style={{ borderLeftWidth: '3px', borderLeftColor: toConfig.borderColor }}
    >
      <div className="p-3">
        <p className="text-[9px] text-ink-400 uppercase tracking-wider mb-2.5 font-mono font-medium">
          Regime State
        </p>
        <div className="flex items-center gap-2">
          {fromConfig && (
            <>
              <span
                className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md border"
                style={{
                  backgroundColor: fromConfig.bgColor,
                  color: fromConfig.color,
                  borderColor: fromConfig.borderColor,
                }}
              >
                {fromConfig.label}
              </span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="text-ink-300"
              >
                <path
                  d="M3 8h10M10 5l3 3-3 3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </>
          )}
          <span
            className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md border"
            style={{
              backgroundColor: toConfig.bgColor,
              color: toConfig.color,
              borderColor: toConfig.borderColor,
            }}
          >
            {toConfig.label}
          </span>
        </div>
        <p className="text-[10px] text-ink-500 mt-2.5 leading-relaxed">{reason}</p>
      </div>
    </div>
  );
};

// =============================================================================
// Main Drawer Component
// =============================================================================

const NarrativeAuditDrawer: React.FC<NarrativeAuditDrawerProps> = ({
  point,
  pointIndex,
  state,
  isOpen,
  onClose,
}) => {
  if (!point || !isOpen) return null;

  const regimeConfig = REGIME_CONFIG[point.regime];
  const severityConfig = SEVERITY_CONFIG[point.severity];
  const deviation = point.anchor > 0
    ? ((point.price - point.anchor) / point.anchor * 100)
    : 0;

  // Compute deltas from previous point
  const prevPoint = pointIndex > 0 ? state.points[pointIndex - 1] : null;
  const npiDelta = prevPoint ? point.npi - prevPoint.npi : 0;
  const deviationDelta = prevPoint
    ? deviation - (prevPoint.anchor > 0
        ? (prevPoint.price - prevPoint.anchor) / prevPoint.anchor * 100
        : 0)
    : 0;
  const prevRegime = prevPoint?.regime;
  const regimeChanged = prevRegime && prevRegime !== point.regime;

  // Generate regime transition reason
  const getTransitionReason = (): string => {
    if (!regimeChanged) return regimeConfig.description;
    if (point.regime === 'gravity') {
      return `NPI dropped below ${(state.thresholds.gravityNpiThreshold * 100).toFixed(0)}% while price remains ${deviation.toFixed(1)}% above structural anchor. Narrative support has failed.`;
    }
    if (point.regime === 'inertia') {
      return `NPI crossed below half-life threshold. Price continues on residual momentum but narrative fuel is depleted.`;
    }
    if (point.regime === 'reversion') {
      return `Price slope turned negative with NPI below momentum threshold. Mean reversion toward VMS anchor in progress.`;
    }
    if (point.regime === 'newCatalyst') {
      return `New narrative energy detected. Decay curve reset with fresh E0. Monitor for validation or exhaustion.`;
    }
    return regimeConfig.description;
  };

  const date = new Date(point.ts).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      className="fixed inset-y-0 right-0 w-[400px] z-50 overflow-y-auto animate-fadeIn"
      style={{
        backgroundColor: '#FFFFFF',
        borderLeft: '1px solid #E2E8F0',
        boxShadow: '-8px 0 30px rgba(15, 23, 42, 0.08), -2px 0 8px rgba(15, 23, 42, 0.04)',
      }}
    >
      {/* Gradient accent bar */}
      <div
        className="h-[3px] w-full"
        style={{
          background: 'linear-gradient(90deg, #8B5CF6 0%, #3B82F6 50%, #059669 100%)',
        }}
      />

      {/* Header */}
      <div
        className="sticky top-0 z-10 px-5 py-4"
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-ink-900">
              Narrative Audit
            </h3>
            <p className="text-[10px] text-ink-400 mt-0.5 font-mono">{date}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md transition-colors"
            style={{ backgroundColor: 'transparent' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F1F5F9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M1 1l12 12M1 13L13 1"
                stroke="#94A3B8"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="px-5 py-4 space-y-5" style={{ backgroundColor: '#F8FAFC' }}>
        {/* Summary Section */}
        <div
          className="rounded-md p-4"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
          }}
        >
          <p className="text-[9px] text-ink-400 uppercase tracking-wider mb-2 font-mono font-medium">
            Narrative Summary
          </p>
          <p className="text-xs text-ink-500 leading-relaxed">
            {point.regime === 'momentum' &&
              `Narrative energy at ${(point.npiNorm * 100).toFixed(0)}% is actively supporting the ${deviation > 0 ? 'premium' : 'discount'} of ${Math.abs(deviation).toFixed(1)}% relative to structural anchor. Price movement is fundamentally backed by press velocity and source density.`}
            {point.regime === 'inertia' &&
              `Narrative energy has decayed to ${(point.npiNorm * 100).toFixed(0)}%, below the half-life threshold. Price continues ${deviation > 0 ? 'above' : 'near'} anchor by ${Math.abs(deviation).toFixed(1)}% on residual momentum, but structural support is weakening.`}
            {point.regime === 'gravity' &&
              `Narrative support has failed with NPI at ${(point.npiNorm * 100).toFixed(0)}%. Price remains ${Math.abs(deviation).toFixed(1)}% ${deviation > 0 ? 'above' : 'below'} the VMS anchor. High probability of mean reversion. Support Failure Score: ${point.supportFailureScore.toFixed(3)}.`}
            {point.regime === 'reversion' &&
              `Price is actively correcting toward the VMS anchor at $${point.anchor.toFixed(2)}. Narrative energy is depleted at ${(point.npiNorm * 100).toFixed(0)}%. Deviation narrowing from ${Math.abs(deviation).toFixed(1)}%.`}
            {point.regime === 'newCatalyst' &&
              `New narrative catalyst detected. Energy has reset with fresh initial impulse. Monitoring for structural validation against SEC filings and earnings data.`}
          </p>
        </div>

        {/* Key Metrics */}
        <div>
          <p className="text-[9px] text-ink-400 uppercase tracking-wider mb-2 font-mono font-medium">
            Key Metrics
          </p>
          <div
            className="rounded-md overflow-hidden"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
            }}
          >
            <div
              className="flex items-center justify-between px-3 py-2.5"
              style={{ borderBottom: '1px solid #F1F5F9' }}
            >
              <span className="text-[10px] text-ink-500 font-mono">Price</span>
              <span className="text-xs font-mono font-semibold text-ink-900">
                ${point.price.toFixed(2)}
              </span>
            </div>
            <div
              className="flex items-center justify-between px-3 py-2.5"
              style={{ borderBottom: '1px solid #F1F5F9' }}
            >
              <span className="text-[10px] text-ink-500 font-mono">NPI</span>
              <span className="text-xs font-mono font-semibold" style={{ color: PHYSICS_COLORS.npi }}>
                {point.npi.toFixed(1)} ({(point.npiNorm * 100).toFixed(0)}%)
              </span>
            </div>
            <div
              className="flex items-center justify-between px-3 py-2.5"
              style={{ borderBottom: '1px solid #F1F5F9' }}
            >
              <span className="text-[10px] text-ink-500 font-mono">VMS Anchor</span>
              <span className="text-xs font-mono font-semibold" style={{ color: PHYSICS_COLORS.anchor }}>
                ${point.anchor.toFixed(2)}
              </span>
            </div>
            <div
              className="flex items-center justify-between px-3 py-2.5"
              style={{ borderBottom: '1px solid #F1F5F9' }}
            >
              <span className="text-[10px] text-ink-500 font-mono">Deviation</span>
              <span
                className="text-xs font-mono font-semibold"
                style={{ color: Math.abs(deviation) > 8 ? '#D97706' : '#059669' }}
              >
                {deviation > 0 ? '+' : ''}{deviation.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2.5">
              <span className="text-[10px] text-ink-500 font-mono">SFS</span>
              <span
                className="text-xs font-mono font-semibold"
                style={{ color: severityConfig.color }}
              >
                {point.supportFailureScore.toFixed(3)}
                {point.severity !== 'none' && (
                  <span
                    className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-md font-bold"
                    style={{
                      backgroundColor: severityConfig.bgColor,
                      color: severityConfig.color,
                      border: `1px solid ${severityConfig.borderColor}`,
                    }}
                  >
                    {severityConfig.label}
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Regime Transition */}
        <RegimeTransitionCard
          from={regimeChanged ? prevRegime : undefined}
          to={point.regime}
          reason={getTransitionReason()}
        />

        {/* Delta Changes */}
        {prevPoint && (
          <div>
            <p className="text-[9px] text-ink-400 uppercase tracking-wider mb-2 font-mono font-medium">
              Changes Since Previous Slice
            </p>
            <div
              className="rounded-md overflow-hidden"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
              }}
            >
              <div className="px-3 divide-y" style={{ borderColor: '#F1F5F9' }}>
                <DeltaIndicator value={npiDelta} label="NPI Change" />
                <DeltaIndicator value={deviationDelta} label="Deviation Change" />
                <DeltaIndicator
                  value={point.price - prevPoint.price}
                  label="Price Change"
                />
              </div>
            </div>
          </div>
        )}

        {/* Events at this point */}
        {point.events && point.events.length > 0 && (
          <div>
            <p className="text-[9px] text-ink-400 uppercase tracking-wider mb-2 font-mono font-medium">
              Evidence at This Point
            </p>
            <div className="space-y-2">
              {point.events.map((event, idx) => {
                const sentimentColor =
                  event.sentiment !== undefined
                    ? event.sentiment > 0
                      ? '#059669'
                      : event.sentiment < 0
                      ? '#DC2626'
                      : '#64748B'
                    : '#64748B';
                const accentColor =
                  event.sentiment !== undefined
                    ? event.sentiment > 0
                      ? '#D1FAE5'
                      : event.sentiment < 0
                      ? '#FEE2E2'
                      : '#F1F5F9'
                    : '#F1F5F9';
                const accentBorder =
                  event.sentiment !== undefined
                    ? event.sentiment > 0
                      ? '#6EE7B7'
                      : event.sentiment < 0
                      ? '#FCA5A5'
                      : '#E2E8F0'
                    : '#E2E8F0';

                return (
                  <div
                    key={idx}
                    className="rounded-md overflow-hidden"
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderLeftWidth: '3px',
                      borderLeftColor: accentBorder,
                    }}
                  >
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className="text-[9px] font-bold font-mono uppercase px-1.5 py-0.5 rounded-md"
                          style={{
                            backgroundColor: '#F1F5F9',
                            color: '#64748B',
                            border: '1px solid #E2E8F0',
                          }}
                        >
                          {event.type}
                        </span>
                        {event.source && (
                          <span className="text-[9px] text-ink-400 font-mono">
                            {event.source}
                          </span>
                        )}
                        {event.sentiment !== undefined && (
                          <span
                            className="text-[9px] font-mono font-bold ml-auto px-1.5 py-0.5 rounded-md"
                            style={{
                              color: sentimentColor,
                              backgroundColor: accentColor,
                            }}
                          >
                            {event.sentiment > 0 ? '+' : ''}
                            {event.sentiment}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-ink-500 leading-relaxed">
                        {event.title}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Factor Tags */}
        <div>
          <p className="text-[9px] text-ink-400 uppercase tracking-wider mb-2 font-mono font-medium">
            Factor Analysis
          </p>
          <div className="flex flex-wrap gap-1.5">
            {['AI/ML', 'Revenue Growth', 'Institutional Flow', 'Press Velocity', 'Analyst Coverage'].map(
              (factor) => (
                <span
                  key={factor}
                  className="text-[9px] font-mono px-2.5 py-1 rounded-full text-ink-500"
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  {factor}
                </span>
              )
            )}
          </div>
        </div>

        {/* Export as Card CTA */}
        <div
          className="pt-4"
          style={{ borderTop: '1px solid #E2E8F0' }}
        >
          <button
            className="w-full py-2.5 rounded-md text-[10px] font-bold uppercase tracking-wider font-mono transition-all"
            style={{
              background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
              color: '#FFFFFF',
              border: 'none',
              boxShadow: '0 1px 3px rgba(139, 92, 246, 0.3), 0 1px 2px rgba(139, 92, 246, 0.2)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.4), 0 2px 4px rgba(139, 92, 246, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(139, 92, 246, 0.3), 0 1px 2px rgba(139, 92, 246, 0.2)';
            }}
          >
            Export as Cognitive Card
          </button>
        </div>
      </div>
    </div>
  );
};

export default NarrativeAuditDrawer;
