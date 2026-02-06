'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import type {
  UnifiedPhysicsState,
  UnifiedPhysicsPoint,
} from '../../lib/physics/types';
import {
  REGIME_CONFIG,
  PHYSICS_COLORS,
} from '../../lib/physics/types';
import { computeMSI, computeMSITrend } from '../../lib/physics/msi-calculator';
import type { MSIResult } from '../../lib/physics/msi-calculator';
import type { LunarCrushPhysicsData } from '../../lib/lunarcrush';
import type { MemeTemplate } from '../../components/physics/CognitiveCard';

// Dynamic imports (no SSR for chart-heavy components)
const UnifiedPhysicsChart = dynamic(
  () => import('../../components/physics/UnifiedPhysicsChart'),
  { ssr: false }
);
const NarrativeAuditDrawer = dynamic(
  () => import('../../components/physics/NarrativeAuditDrawer'),
  { ssr: false }
);
const EventTrack = dynamic(
  () => import('../../components/physics/EventTrack'),
  { ssr: false }
);
const SocialIntelPanel = dynamic(
  () => import('../../components/physics/SocialIntelPanel'),
  { ssr: false }
);
const CognitiveCard = dynamic(
  () => import('../../components/physics/CognitiveCard'),
  { ssr: false }
);
const VerdictHeader = dynamic(
  () => import('../../components/physics/VerdictHeader'),
  { ssr: false }
);
const TimeToFailure = dynamic(
  () => import('../../components/physics/TimeToFailure'),
  { ssr: false }
);
const MechanisticPanel = dynamic(
  () => import('../../components/physics/MechanisticPanel'),
  { ssr: false }
);

import {
  RegimeBadge,
  SeverityIndicator,
} from '../../components/physics/RegimeBadge';
import { TermTooltip } from '../../components/physics/Tooltip';

// =============================================================================
// Constants
// =============================================================================

const TOP_TICKERS = [
  'NVDA', 'TSLA', 'AAPL', 'MSFT', 'GOOGL', 'META', 'AMZN',
  'AMD', 'RDDT', 'COIN', 'NFLX', 'AVGO', 'CRM', 'UBER',
];

// =============================================================================
// SpaceX-Style Logo Mark
// =============================================================================

const LogoMark: React.FC<{ size?: number }> = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="logoGrad" x1="0" y1="0" x2="40" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#1E40AF" />
        <stop offset="100%" stopColor="#3B82F6" />
      </linearGradient>
    </defs>
    {/* Angular "M" - SpaceX-style sharp letterform */}
    <path
      d="M6 30V12l7 10 7-10v18"
      fill="url(#logoGrad)"
    />
    {/* SpaceX-style sweeping trajectory arc */}
    <path
      d="M4 28 C 12 26, 24 14, 38 8"
      stroke="#3B82F6"
      strokeWidth="1.8"
      strokeLinecap="round"
      fill="none"
      opacity="0.7"
    />
    {/* Thin contrail behind the arc */}
    <path
      d="M4 29 C 14 28, 26 18, 38 10"
      stroke="#93C5FD"
      strokeWidth="0.6"
      strokeLinecap="round"
      fill="none"
      opacity="0.35"
    />
  </svg>
);

// =============================================================================
// Loading Screen - Orbital Animation
// =============================================================================

const LoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-base flex items-center justify-center">
    <div className="text-center animate-fadeIn">
      <div className="relative w-32 h-32 mx-auto mb-8">
        {/* Orbital rings */}
        <div
          className="absolute inset-0 rounded-full animate-ping-slow"
          style={{ border: '1.5px solid rgba(59, 130, 246, 0.12)' }}
        />
        <div
          className="absolute inset-3 rounded-full animate-spin-slow"
          style={{ border: '1.5px solid rgba(59, 130, 246, 0.2)' }}
        />
        <div
          className="absolute inset-6 rounded-full animate-reverse-spin"
          style={{ border: '1.5px solid rgba(139, 92, 246, 0.3)' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <LogoMark size={40} />
        </div>
      </div>

      <div className="font-mono text-sm text-ink-600 mb-1.5 tracking-widest uppercase font-bold">
        MarketScholar
      </div>
      <div className="text-[10px] text-ink-600 font-mono tracking-wider">
        Initializing Narrative Physics Engine
      </div>

      <div className="mt-6 w-52 mx-auto h-1 bg-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            background: 'linear-gradient(90deg, #3B82F6, #8B5CF6, #3B82F6)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s ease-in-out infinite',
          }}
        />
      </div>
    </div>
  </div>
);

// =============================================================================
// Ticker Selector - Clean Pill Buttons
// =============================================================================

const TickerSelector: React.FC<{
  selected: string;
  onSelect: (ticker: string) => void;
  customTicker: string;
  onCustomChange: (v: string) => void;
  onCustomSubmit: () => void;
}> = ({ selected, onSelect, customTicker, onCustomChange, onCustomSubmit }) => (
  <div className="flex items-center gap-2 flex-wrap">
    {TOP_TICKERS.map((t) => (
      <button
        key={t}
        onClick={() => onSelect(t)}
        className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase rounded-full transition-all duration-300 ${
          selected === t
            ? 'text-white shadow-blue-glow'
            : 'text-slate-300 bg-white/10 border border-white/10 hover:border-white/30 hover:text-white hover:bg-white/15'
        }`}
        style={selected === t ? {
          background: 'linear-gradient(135deg, #1E40AF, #3B82F6)',
        } : undefined}
      >
        {t}
      </button>
    ))}

    <div className="flex items-center gap-1.5 ml-2">
      <input
        type="text"
        value={customTicker}
        onChange={(e) => onCustomChange(e.target.value.toUpperCase())}
        onKeyDown={(e) => e.key === 'Enter' && onCustomSubmit()}
        placeholder="TICKER"
        maxLength={5}
        className="w-20 px-3 py-1.5 bg-white/10 border border-white/10 rounded-full text-[10px] font-mono text-white placeholder:text-slate-500 focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all"
      />
      <button
        onClick={onCustomSubmit}
        className="px-3 py-1.5 rounded-full text-[10px] font-mono font-bold text-white transition-all duration-300 hover:shadow-blue-glow"
        style={{ background: 'linear-gradient(135deg, #1E40AF, #3B82F6)' }}
      >
        ANALYZE
      </button>
    </div>
  </div>
);

// =============================================================================
// Collapsible Section Wrapper
// =============================================================================

const CollapsibleSection: React.FC<{
  title: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, badge, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="animate-slideUp">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 mb-3 group cursor-pointer"
      >
        <svg
          className={`w-3.5 h-3.5 text-ink-500 transition-transform duration-300 ${open ? 'rotate-90' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <h2 className="text-[11px] font-mono font-bold text-ink-700 uppercase tracking-widest group-hover:text-ink-900 transition-colors">
          {title}
        </h2>
        {badge && (
          <span className="text-[8px] font-mono text-ink-500 bg-ink-100 px-2 py-0.5 rounded">
            {badge}
          </span>
        )}
      </button>
      <div className={`transition-all duration-500 overflow-hidden ${open ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        {children}
      </div>
    </div>
  );
};

// =============================================================================
// Main Physics Dashboard Page - 6-Layer Hierarchy
// =============================================================================

export default function PhysicsDashboard() {
  const [ticker, setTicker] = useState('NVDA');
  const [customTicker, setCustomTicker] = useState('');
  const [state, setState] = useState<UnifiedPhysicsState | null>(null);
  const [lunarCrush, setLunarCrush] = useState<LunarCrushPhysicsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lunarCrushLoading, setLunarCrushLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Chart controls
  const [chartMode, setChartMode] = useState<'candle' | 'line'>('line');
  const [showAnchor, setShowAnchor] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [normalizeNpi, setNormalizeNpi] = useState(true);
  const [sensitivity, setSensitivity] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced');

  // Drawer state
  const [selectedPoint, setSelectedPoint] = useState<UnifiedPhysicsPoint | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Card state
  const [selectedMemeTemplate, setSelectedMemeTemplate] = useState<MemeTemplate>('exhaustionTimer');
  const [showCardPanel, setShowCardPanel] = useState(false);

  // Fetch physics data
  const fetchData = useCallback(async (t: string) => {
    setIsLoading(true);
    setError(null);
    setDrawerOpen(false);

    try {
      const res = await fetch(
        `/api/physics?ticker=${t}&sensitivity=${sensitivity}&days=60&mock=true`
      );
      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const data = await res.json();
      setState(data);

      if (data.lunarCrush) {
        setLunarCrush(data.lunarCrush);
      } else {
        setLunarCrushLoading(true);
        setTimeout(() => {
          setLunarCrush(data.lunarCrush);
          setLunarCrushLoading(false);
        }, 500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load physics data');
    } finally {
      setIsLoading(false);
    }
  }, [sensitivity]);

  useEffect(() => {
    fetchData(ticker);
  }, [ticker, fetchData]);

  // Compute MSI
  const msi: MSIResult | null = useMemo(() => {
    if (!state) return null;
    return computeMSI(state);
  }, [state]);

  const msiTrend = useMemo(() => {
    if (!state) return 'stable' as const;
    return computeMSITrend(state.points);
  }, [state]);

  // Handlers
  const handleTickerSelect = (t: string) => {
    setTicker(t);
    setCustomTicker('');
  };

  const handleCustomSubmit = () => {
    if (customTicker.length >= 1) {
      setTicker(customTicker);
    }
  };

  const handlePointClick = (point: UnifiedPhysicsPoint, index: number) => {
    setSelectedPoint(point);
    setSelectedIndex(index);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedPoint(null);
  };

  if (isLoading) return <LoadingScreen />;

  if (error || !state) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="text-center animate-fadeIn bg-white rounded-xl shadow-card-lg p-8 max-w-sm">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-risk-light flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-ink-900 mb-1">Physics Engine Error</p>
          <p className="text-xs text-ink-600 mb-4">{error || 'No data available'}</p>
          <button
            onClick={() => fetchData(ticker)}
            className="px-5 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:shadow-blue-glow"
            style={{ background: 'linear-gradient(135deg, #1E40AF, #3B82F6)' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!msi) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50/30">
      {/* Subtle ambient gradient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[1400px] h-[600px] opacity-[0.35]"
          style={{
            background: 'radial-gradient(ellipse at center top, rgba(59, 130, 246, 0.07), transparent 70%)',
          }}
        />
        <div className="bg-dots absolute inset-0 opacity-[0.25]" />
      </div>

      {/* ================================================================== */}
      {/* HEADER BAR - SpaceX-inspired minimal                               */}
      {/* ================================================================== */}
      <header className="sticky top-0 z-40 border-b border-white/10" style={{
        background: 'linear-gradient(to right, #0F172A, #172554)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
      }}>
        <div className="max-w-[1600px] mx-auto px-6 py-2.5">
          <div className="flex items-center justify-between">
            {/* Logo - Link to home */}
            <a href="/" className="flex items-center gap-3 hover-scale">
              <LogoMark size={32} />
              <div>
                <h1 className="text-[13px] font-black text-white tracking-[0.25em] uppercase leading-tight">
                  MarketScholar
                </h1>
                <p className="text-[7px] font-mono text-slate-400 uppercase tracking-[0.3em]">
                  Narrative Physics Engine
                </p>
              </div>
            </a>

            {/* Center: Ticker + Quick Status */}
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black font-mono text-white tracking-wider">
                {state.ticker}
              </span>
              <span className="text-sm font-mono text-slate-400 tabular-nums">
                ${state.metrics.currentPrice.toFixed(2)}
              </span>
              <RegimeBadge regime={state.metrics.currentRegime} size="md" />
              {state.metrics.currentSeverity !== 'none' && (
                <SeverityIndicator
                  severity={state.metrics.currentSeverity}
                  sfs={state.metrics.supportFailureScore}
                  compact
                />
              )}
            </div>

            {/* Right: Status */}
            <div className="flex items-center gap-4">
              {msi && (
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-lg font-black font-mono"
                    style={{ color: msi.gradeColor }}
                  >
                    {msi.grade}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400">MSI</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-verified animate-live-pulse" />
                <span className="text-[8px] font-mono text-slate-300">LIVE</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ================================================================== */}
      {/* MAIN CONTENT - 6-Layer Information Hierarchy                       */}
      {/* ================================================================== */}
      <main className="max-w-[1600px] mx-auto px-6 py-6 relative">

        {/* Ticker Selector */}
        <div className="mb-6 animate-fadeIn rounded-xl px-5 py-4" style={{ background: 'linear-gradient(to right, #0F172A, #172554)' }}>
          <TickerSelector
            selected={ticker}
            onSelect={handleTickerSelect}
            customTicker={customTicker}
            onCustomChange={setCustomTicker}
            onCustomSubmit={handleCustomSubmit}
          />
        </div>

        {/* ============================================================== */}
        {/* LAYER 1: VERDICT - MSI Score (Dominant Entry Point)            */}
        {/* ============================================================== */}
        <div className="mb-6 animate-slideUp">
          <VerdictHeader
            msi={msi}
            ticker={state.ticker}
            companyName={state.companyName}
            price={state.metrics.currentPrice}
            trend={msiTrend}
          />
        </div>

        {/* ============================================================== */}
        {/* LAYER 2-3: Regime + Time-to-Failure (Side by Side)             */}
        {/* ============================================================== */}
        <div className="grid grid-cols-12 gap-5 mb-6">
          {/* LAYER 2: Regime State */}
          <div className="col-span-4 animate-slideUp" style={{ animationDelay: '0.1s' }}>
            <div
              className="bg-white border rounded-xl p-5 shadow-card h-full"
              style={{
                borderColor: REGIME_CONFIG[state.metrics.currentRegime].borderColor,
                borderTop: `3px solid ${REGIME_CONFIG[state.metrics.currentRegime].color}`,
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-2 h-2 rounded-full animate-pulse-slow"
                  style={{ backgroundColor: REGIME_CONFIG[state.metrics.currentRegime].color }}
                />
                <span className="text-[9px] font-mono text-ink-600 uppercase tracking-widest font-bold">
                  Current Regime
                </span>
                <TermTooltip id="regime" />
              </div>

              <div className="mb-3">
                <RegimeBadge regime={state.metrics.currentRegime} size="lg" />
              </div>

              <p className="text-[11px] text-ink-700 leading-relaxed mb-4">
                {REGIME_CONFIG[state.metrics.currentRegime].description}
              </p>

              {/* Quick regime stats */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border">
                <div>
                  <p className="text-[8px] font-mono text-ink-600 uppercase">NPI Energy<TermTooltip id="npi" /></p>
                  <p className="text-sm font-bold font-mono" style={{ color: PHYSICS_COLORS.npi }}>
                    {(state.metrics.energyRemainingPct).toFixed(0)}%
                  </p>
                </div>
                <div>
                  <p className="text-[8px] font-mono text-ink-600 uppercase">Deviation<TermTooltip id="deviation" /></p>
                  <p className="text-sm font-bold font-mono" style={{
                    color: Math.abs(state.metrics.deviationFromAnchor) > 0.08 ? '#D97706' : '#059669'
                  }}>
                    {state.metrics.deviationFromAnchor > 0 ? '+' : ''}
                    {(state.metrics.deviationFromAnchor * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-[8px] font-mono text-ink-600 uppercase">SFS<TermTooltip id="sfs" /></p>
                  <p className="text-sm font-bold font-mono text-ink-700">
                    {state.metrics.supportFailureScore.toFixed(4)}
                  </p>
                </div>
                <div>
                  <p className="text-[8px] font-mono text-ink-600 uppercase">Severity<TermTooltip id="severity" /></p>
                  <p className="text-sm font-bold font-mono" style={{
                    color: state.metrics.currentSeverity === 'none' ? '#64748B'
                      : state.metrics.currentSeverity === 'critical' ? '#DC2626'
                      : state.metrics.currentSeverity === 'warning' ? '#EA580C'
                      : '#D97706'
                  }}>
                    {state.metrics.currentSeverity === 'none' ? 'CLEAR' : state.metrics.currentSeverity.toUpperCase()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* LAYER 3: Time-to-Failure */}
          <div className="col-span-8 animate-slideUp" style={{ animationDelay: '0.15s' }}>
            <TimeToFailure
              hoursToExhaustion={state.metrics.timeToExhaustionHrs}
              halfLifeDays={state.metrics.halfLifeDays}
              energyPct={state.metrics.energyRemainingPct}
              msi={msi}
              lambda={state.catalyst.lambda}
            />
          </div>
        </div>

        {/* ============================================================== */}
        {/* LAYER 4: Unified Physics Chart (Visual Confirmation)           */}
        {/* ============================================================== */}
        <div className="mb-6 animate-slideUp" style={{ animationDelay: '0.2s' }}>
          {/* Chart Controls */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full animate-pulse-slow"
                style={{ backgroundColor: PHYSICS_COLORS.npi }}
              />
              <h2 className="text-[10px] font-mono font-bold text-ink-700 uppercase tracking-widest">
                Unified Physics View<TermTooltip id="npi" />
              </h2>
              <span className="text-[8px] font-mono text-ink-500 bg-ink-100 px-2 py-0.5 rounded">
                Price vs NPI
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {(['line', 'candle'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setChartMode(mode)}
                  className={`px-3 py-1 text-[9px] font-mono font-medium rounded-md transition-all duration-200 capitalize ${
                    chartMode === mode
                      ? 'bg-primary-50 text-primary-700 border border-primary-200'
                      : 'bg-white border border-ink-200 text-ink-600 hover:text-ink-800'
                  }`}
                >
                  {mode}
                </button>
              ))}

              <div className="w-px h-4 bg-border mx-1" />

              <ToggleChip label="Anchor" active={showAnchor} onClick={() => setShowAnchor(!showAnchor)} />
              <ToggleChip label="Events" active={showEvents} onClick={() => setShowEvents(!showEvents)} />
              <ToggleChip label="Norm" active={normalizeNpi} onClick={() => setNormalizeNpi(!normalizeNpi)} />

              <div className="w-px h-4 bg-border mx-1" />

              {(['conservative', 'balanced', 'aggressive'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSensitivity(s)}
                  className={`px-2.5 py-1 text-[8px] font-mono font-medium rounded-md capitalize transition-all duration-200 ${
                    sensitivity === s
                      ? 'bg-npi-50 text-npi-700 border border-npi-200'
                      : 'bg-white border border-ink-200 text-ink-600 hover:text-ink-800'
                  }`}
                >
                  {s.slice(0, 4)}
                </button>
              ))}
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white border border-ink-200 rounded-xl overflow-hidden shadow-card hover-lift">
            <div className="px-5 py-2.5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-4 text-[9px] font-mono text-ink-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-0.5 rounded" style={{ backgroundColor: PHYSICS_COLORS.price }} /> Price
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-0.5 rounded" style={{ backgroundColor: PHYSICS_COLORS.npi }} /> NPI
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-0.5 rounded border-b-2 border-dashed" style={{ borderColor: PHYSICS_COLORS.anchor }} /> Anchor
                </span>
              </div>
              <span className="text-[8px] font-mono text-ink-500">
                60-day window | {state.points.length} data points
              </span>
            </div>

            <UnifiedPhysicsChart
              state={state}
              chartMode={chartMode}
              showAnchor={showAnchor}
              showEvents={showEvents}
              normalizeNpi={normalizeNpi}
              onPointClick={handlePointClick}
            />
          </div>

          {/* Event Track (below chart) */}
          <div className="mt-3">
            <EventTrack
              points={state.points}
              onEventClick={handlePointClick}
            />
          </div>
        </div>

        {/* ============================================================== */}
        {/* LAYER 5: Evidence + Decomposition (Collapsible)                */}
        {/* ============================================================== */}
        <div className="grid grid-cols-12 gap-5 mb-6">
          {/* Left: Mechanistic Decomposition */}
          <div className="col-span-8">
            <CollapsibleSection
              title="Mechanistic Decomposition"
              badge="Patent 63/971,478"
              defaultOpen={false}
            >
              <MechanisticPanel state={state} msi={msi} />
            </CollapsibleSection>
          </div>

          {/* Right: Social Intelligence + Evidence */}
          <div className="col-span-4 space-y-5">
            {/* Social Intelligence */}
            <CollapsibleSection
              title="Social Intelligence"
              badge="LunarCrush"
              defaultOpen={false}
            >
              <SocialIntelPanel
                data={lunarCrush}
                isLoading={lunarCrushLoading}
              />
            </CollapsibleSection>

            {/* Structural Anchor */}
            <CollapsibleSection
              title="Structural Anchor"
              badge="VMS"
              defaultOpen={false}
            >
              <div className="bg-white border border-ink-200 rounded-lg p-4 shadow-card">
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-ink-600">VMS Anchor</span>
                    <span className="text-xs font-mono font-bold" style={{ color: PHYSICS_COLORS.anchor }}>
                      ${state.points[0]?.anchor.toFixed(2)}
                    </span>
                  </div>
                  {state.anchorMeta.eps && (
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono text-ink-600">EPS (TTM)</span>
                      <span className="text-xs font-mono font-bold text-ink-900">${state.anchorMeta.eps.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-ink-600">Fair Value P/E</span>
                    <span className="text-xs font-mono font-bold text-ink-900">{state.anchorMeta.fairValuePE}x</span>
                  </div>
                  {state.anchorMeta.revenueGrowth && (
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono text-ink-600">Rev Growth</span>
                      <span className="text-xs font-mono font-bold text-verified">
                        +{(state.anchorMeta.revenueGrowth * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-border">
                    <span className="text-[10px] font-mono text-ink-600">Source</span>
                    <span className="text-[9px] font-mono text-ink-500">{state.anchorMeta.source}</span>
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          </div>
        </div>

        {/* ============================================================== */}
        {/* LAYER 6: Forensic Info-Meme Engine (Shareable Cards)           */}
        {/* ============================================================== */}
        <div className="mb-8 animate-slideUp" style={{ animationDelay: '0.3s' }}>
          {/* Section Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #3B82F6)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-black text-ink-900 uppercase tracking-wide">
                  Create & Share
                </h2>
                <p className="text-[9px] font-mono text-ink-600">
                  Generate forensic report cards for social media
                </p>
              </div>
            </div>
            <span className="text-[8px] font-mono text-npi-600 bg-npi-50 px-2.5 py-1 rounded-full border border-npi-200 font-bold">
              1080 x 1080 PNG
            </span>
          </div>

          {/* Template Selector - Enhanced Cards */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {([
              {
                key: 'bullshitCaller',
                label: 'The Bullshit Caller',
                desc: 'Expose unsubstantiated pump narratives with forensic proof from SEC filings',
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                ),
                color: '#DC2626',
                bgColor: '#FEF2F2',
                borderColor: '#FECACA',
              },
              {
                key: 'momentumLock',
                label: 'The Momentum Lock',
                desc: 'Prove a move is structurally real with verified narrative energy and VMS anchoring',
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ),
                color: '#059669',
                bgColor: '#F0FDF4',
                borderColor: '#BBF7D0',
              },
              {
                key: 'exhaustionTimer',
                label: 'The Exhaustion Timer',
                desc: 'Predict narrative death with a countdown clock showing time to structural failure',
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                ),
                color: '#D97706',
                bgColor: '#FFFBEB',
                borderColor: '#FDE68A',
              },
            ] as const).map(({ key, label, desc, icon, color, bgColor, borderColor }) => (
              <button
                key={key}
                onClick={() => setSelectedMemeTemplate(key)}
                className={`relative py-4 px-4 rounded-xl border-2 transition-all duration-300 text-left hover-lift ${
                  selectedMemeTemplate === key
                    ? 'shadow-card-hover'
                    : 'bg-white border-border hover:border-ink-200'
                }`}
                style={selectedMemeTemplate === key ? {
                  borderColor: color,
                  backgroundColor: bgColor,
                } : undefined}
              >
                {selectedMemeTemplate === key && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: color }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
                <div className="mb-2">{icon}</div>
                <p className={`text-[11px] font-bold uppercase tracking-wide mb-1 ${
                  selectedMemeTemplate === key ? 'text-ink-900' : 'text-ink-600'
                }`}>
                  {label}
                </p>
                <p className="text-[9px] text-ink-600 leading-relaxed line-clamp-2">{desc}</p>
              </button>
            ))}
          </div>

          {/* Card Preview + Export */}
          <div className="bg-white border border-ink-200 rounded-xl p-6 shadow-card">
            <div className="flex items-start gap-6">
              {/* Card Preview */}
              <div className="flex-shrink-0">
                <CognitiveCard
                  state={state}
                  template={selectedMemeTemplate}
                  primaryClaim={`${state.ticker} AI demand is accelerating beyond consensus expectations`}
                  structuralCoordinate="Revenue cell 4B in 10-Q FY25 Q3"
                  vmsScore={selectedMemeTemplate === 'momentumLock' ? 98 : 23}
                  vmsVerdict={selectedMemeTemplate === 'momentumLock' ? 'VERIFIED' : 'UNSUBSTANTIATED'}
                />
              </div>

              {/* Info + Actions */}
              <div className="flex-1 pt-2">
                <p className="text-[9px] font-mono text-ink-600 uppercase tracking-widest mb-2">
                  Card Preview
                </p>
                <h3 className="text-lg font-black text-ink-900 mb-2">
                  {selectedMemeTemplate === 'bullshitCaller' ? 'Expose the Narrative' :
                   selectedMemeTemplate === 'momentumLock' ? 'Lock the Momentum' :
                   'Time the Exhaustion'}
                </h3>
                <p className="text-xs text-ink-600 leading-relaxed mb-5">
                  {selectedMemeTemplate === 'bullshitCaller'
                    ? 'This card exposes when an analyst claim cannot be verified against actual SEC filing data. Share it to show others the gap between narrative and reality.'
                    : selectedMemeTemplate === 'momentumLock'
                    ? 'This card proves that a stock move is backed by real fundamental data and active narrative energy. Share it as evidence of structural support.'
                    : 'This card uses decay physics to predict exactly when a narrative will lose enough energy to stop supporting the current price. Share the countdown.'}
                </p>

                <div className="space-y-2.5 mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-verified" />
                    <span className="text-[10px] text-ink-700">Patent-protected forensic methodology</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-npi-500" />
                    <span className="text-[10px] text-ink-700">Real-time data from {state.ticker} analysis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-primary-500" />
                    <span className="text-[10px] text-ink-700">Optimized for Twitter, Discord, and LinkedIn</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[8px] font-mono text-ink-600 uppercase">
                    Click &ldquo;Export&rdquo; below the card to save
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border pt-4 pb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogoMark size={20} />
            <span className="text-[9px] font-mono text-ink-300 tracking-widest uppercase">
              MarketScholar Narrative Physics Engine
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[8px] font-mono text-ink-300">
              Patent 63/971,470 & 63/971,478
            </span>
            <span className="text-[8px] font-mono text-ink-300">
              Data: Supabase + LunarCrush + yfinance
            </span>
          </div>
        </div>
      </main>

      {/* Narrative Audit Drawer */}
      {state && (
        <NarrativeAuditDrawer
          point={selectedPoint}
          pointIndex={selectedIndex}
          state={state}
          isOpen={drawerOpen}
          onClose={handleDrawerClose}
        />
      )}

      {/* Drawer backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 animate-fadeIn"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.2)', backdropFilter: 'blur(2px)' }}
          onClick={handleDrawerClose}
        />
      )}
    </div>
  );
}

// =============================================================================
// Toggle Chip
// =============================================================================

function ToggleChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 text-[8px] font-mono font-medium rounded-md transition-all duration-200 ${
        active
          ? 'bg-ink-900 text-white border border-ink-800'
          : 'bg-white border border-ink-200 text-ink-600 hover:text-ink-800'
      }`}
    >
      {label}
    </button>
  );
}
