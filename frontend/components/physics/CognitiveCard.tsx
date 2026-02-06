'use client';

import React, { useRef, useCallback } from 'react';
import type {
  UnifiedPhysicsState,
  UnifiedPhysicsPoint,
  RegimeType,
  SeverityLevel,
} from '../../lib/physics/types';
import { REGIME_CONFIG, SEVERITY_CONFIG, PHYSICS_COLORS } from '../../lib/physics/types';

// =============================================================================
// Light Enterprise Theme Constants
// =============================================================================

const LIGHT_THEME = {
  bgBase: '#F8FAFC',
  bgCard: '#FFFFFF',
  bgInner: '#F8FAFC',
  ink900: '#0F172A',
  ink700: '#334155',
  slate500: '#64748B',
  slate400: '#94A3B8',
  border: '#E2E8F0',
  npi600: '#7C3AED',
  npi500: '#8B5CF6',
  npiGlow: 'rgba(139, 92, 246, 0.3)',
  anchor: '#059669',
  verified: '#059669',
  priceStroke: '#1E40AF',
  red500: '#EF4444',
  red600: '#DC2626',
  red700: '#B91C1C',
  watermarkBlueFrom: '#1E40AF',
  watermarkBlueTo: '#3B82F6',
} as const;

// =============================================================================
// Types
// =============================================================================

/** Three distinct Info-Meme card templates */
export type MemeTemplate = 'bullshitCaller' | 'momentumLock' | 'exhaustionTimer';

interface CognitiveCardProps {
  state: UnifiedPhysicsState;
  point?: UnifiedPhysicsPoint;
  template: MemeTemplate;
  primaryClaim?: string;
  structuralCoordinate?: string;
  vmsScore?: number;
  vmsVerdict?: 'VERIFIED' | 'PARTIAL' | 'CONTRADICTED' | 'UNSUBSTANTIATED';
  onExport?: () => void;
}

// =============================================================================
// Mini NPI Curve (SVG inline chart for cards)
// =============================================================================

const MiniNPICurve: React.FC<{
  points: UnifiedPhysicsPoint[];
  width: number;
  height: number;
  color: string;
  showExhaustion?: boolean;
}> = ({ points, width, height, color, showExhaustion = true }) => {
  if (points.length < 2) return null;

  const maxNpi = Math.max(...points.map((p) => p.npi));
  const minTs = points[0].ts;
  const maxTs = points[points.length - 1].ts;
  const tsRange = maxTs - minTs || 1;

  const toX = (ts: number) => ((ts - minTs) / tsRange) * width;
  const toY = (npi: number) => height - (npi / (maxNpi || 1)) * height * 0.85 - 8;

  // Build SVG path
  const pathPoints = points.map((p) => `${toX(p.ts).toFixed(1)},${toY(p.npi).toFixed(1)}`);
  const linePath = `M ${pathPoints.join(' L ')}`;

  // Fill area path
  const fillPath = `${linePath} L ${width},${height} L 0,${height} Z`;

  // Find exhaustion point (NPI < 10% of E0)
  const exhaustionIdx = showExhaustion
    ? points.findIndex((p) => p.npiNorm < 0.1)
    : -1;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`miniGrad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
        <filter id="miniGlow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Fill area */}
      <path d={fillPath} fill={`url(#miniGrad-${color.replace('#', '')})`} />

      {/* Curve line */}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2"
        filter="url(#miniGlow)"
      />

      {/* Exhaustion marker */}
      {exhaustionIdx > 0 && (
        <>
          <line
            x1={toX(points[exhaustionIdx].ts)}
            y1={0}
            x2={toX(points[exhaustionIdx].ts)}
            y2={height}
            stroke={LIGHT_THEME.red500}
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity={0.7}
          />
          {/* Red zone after exhaustion */}
          <rect
            x={toX(points[exhaustionIdx].ts)}
            y={0}
            width={width - toX(points[exhaustionIdx].ts)}
            height={height}
            fill="rgba(239, 68, 68, 0.06)"
          />
        </>
      )}

      {/* Catalyst dot */}
      <circle cx={toX(points[0].ts)} cy={toY(points[0].npi)} r="3" fill={color}>
        <animate
          attributeName="r"
          values="3;5;3"
          dur="2s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="1;0.6;1"
          dur="2s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
};

// =============================================================================
// Mini Price Line
// =============================================================================

const MiniPriceLine: React.FC<{
  points: UnifiedPhysicsPoint[];
  width: number;
  height: number;
  anchorPrice: number;
}> = ({ points, width, height, anchorPrice }) => {
  if (points.length < 2) return null;

  const prices = points.map((p) => p.price);
  const minPrice = Math.min(...prices, anchorPrice) * 0.98;
  const maxPrice = Math.max(...prices, anchorPrice) * 1.02;
  const priceRange = maxPrice - minPrice || 1;
  const minTs = points[0].ts;
  const maxTs = points[points.length - 1].ts;
  const tsRange = maxTs - minTs || 1;

  const toX = (ts: number) => ((ts - minTs) / tsRange) * width;
  const toY = (p: number) => height - ((p - minPrice) / priceRange) * height * 0.85 - 5;

  const pathPoints = points.map((p) => `${toX(p.ts).toFixed(1)},${toY(p.price).toFixed(1)}`);
  const linePath = `M ${pathPoints.join(' L ')}`;

  const anchorY = toY(anchorPrice);

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Price line */}
      <path d={linePath} fill="none" stroke={LIGHT_THEME.priceStroke} strokeWidth="1.5" opacity={0.85} />

      {/* Anchor line */}
      <line
        x1={0}
        y1={anchorY}
        x2={width}
        y2={anchorY}
        stroke={LIGHT_THEME.anchor}
        strokeWidth="1"
        strokeDasharray="4 3"
        opacity={0.7}
      />

      {/* Anchor label */}
      <text
        x={width - 2}
        y={anchorY - 4}
        fill={LIGHT_THEME.anchor}
        fontSize="7"
        fontFamily="JetBrains Mono"
        textAnchor="end"
      >
        VMS ${anchorPrice.toFixed(0)}
      </text>
    </svg>
  );
};

// =============================================================================
// Template 1: "Bullshit Caller" Card
// Exposes fake pumps with UNSUBSTANTIATED stamp
// =============================================================================

const BullshitCallerCard: React.FC<{
  state: UnifiedPhysicsState;
  primaryClaim: string;
  vmsScore: number;
  vmsVerdict: string;
  structuralCoordinate: string;
}> = ({ state, primaryClaim, vmsScore, vmsVerdict, structuralCoordinate }) => {
  const deviation = state.metrics.deviationFromAnchor * 100;

  return (
    <div
      className="w-[1080px] h-[1080px] p-12 flex flex-col"
      style={{ backgroundColor: LIGHT_THEME.bgBase, transform: 'scale(0.35)', transformOrigin: 'top left' }}
    >
      {/* Watermark */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded-sm"
            style={{ background: `linear-gradient(135deg, ${LIGHT_THEME.watermarkBlueFrom}, ${LIGHT_THEME.watermarkBlueTo})` }}
          />
          <span
            className="text-[14px] font-mono font-bold uppercase tracking-widest"
            style={{ color: LIGHT_THEME.slate500 }}
          >
            MarketScholar Forensic Report
          </span>
        </div>
        <span className="text-[12px] font-mono" style={{ color: LIGHT_THEME.slate400 }}>
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      {/* Ticker + Price */}
      <div className="flex items-center gap-4 mb-8">
        <span className="text-[42px] font-black font-mono" style={{ color: LIGHT_THEME.ink900 }}>
          {state.ticker}
        </span>
        <span className="text-[28px] font-mono" style={{ color: LIGHT_THEME.red600 }}>
          ${state.metrics.currentPrice.toFixed(2)}
        </span>
      </div>

      {/* THE CLAIM (The Thesis) */}
      <div
        className="relative rounded-sm p-8 mb-8"
        style={{
          backgroundColor: LIGHT_THEME.bgCard,
          border: `1px solid ${LIGHT_THEME.border}`,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
        }}
      >
        <p
          className="text-[9px] font-mono uppercase tracking-widest mb-3"
          style={{ color: LIGHT_THEME.slate500 }}
        >
          Primary Claim Under Audit
        </p>
        <p
          className="text-[22px] font-semibold leading-snug pr-40"
          style={{ color: LIGHT_THEME.ink900 }}
        >
          &ldquo;{primaryClaim}&rdquo;
        </p>

        {/* The RED STAMP - more dramatic with red border + red shadow */}
        <div className="absolute top-6 right-6 -rotate-12">
          <div
            className="rounded-sm px-6 py-3"
            style={{
              border: `4px solid ${LIGHT_THEME.red600}`,
              boxShadow: `0 4px 16px rgba(220, 38, 38, 0.25), 0 0 0 1px rgba(220, 38, 38, 0.1)`,
            }}
          >
            <span
              className="text-[24px] font-black font-mono uppercase tracking-wider"
              style={{ color: LIGHT_THEME.red600 }}
            >
              {vmsVerdict}
            </span>
          </div>
        </div>
      </div>

      {/* THE VISUAL PROOF: Price vs Anchor gap */}
      <div
        className="flex-1 rounded-sm p-6 mb-8 relative"
        style={{
          backgroundColor: LIGHT_THEME.bgCard,
          border: `1px solid ${LIGHT_THEME.border}`,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
        }}
      >
        <p
          className="text-[9px] font-mono uppercase tracking-widest mb-4"
          style={{ color: LIGHT_THEME.slate500 }}
        >
          Price vs Structural Anchor (VMS Floor)
        </p>

        <div className="flex gap-6 h-[calc(100%-24px)]">
          {/* Mini price chart */}
          <div className="flex-1 relative">
            <MiniPriceLine
              points={state.points}
              width={440}
              height={280}
              anchorPrice={state.points[0]?.anchor || 0}
            />
          </div>

          {/* NPI Decay */}
          <div className="flex-1 relative">
            <MiniNPICurve
              points={state.points}
              width={440}
              height={280}
              color="#ef4444"
            />
          </div>
        </div>

        {/* Gap annotation */}
        <div
          className="absolute bottom-4 right-4 rounded-sm px-4 py-2"
          style={{
            backgroundColor: LIGHT_THEME.bgCard,
            border: `1px solid rgba(239, 68, 68, 0.3)`,
            boxShadow: '0 1px 4px rgba(239, 68, 68, 0.08)',
          }}
        >
          <span className="text-[11px] font-mono" style={{ color: LIGHT_THEME.red600 }}>
            GAP: {deviation > 0 ? '+' : ''}{deviation.toFixed(1)}% above VMS Floor
          </span>
        </div>
      </div>

      {/* THE VERDICT */}
      <div
        className="rounded-sm p-6 flex items-center justify-between"
        style={{
          backgroundColor: 'rgba(239, 68, 68, 0.04)',
          border: `1px solid rgba(239, 68, 68, 0.15)`,
        }}
      >
        <div>
          <p
            className="text-[9px] font-mono uppercase tracking-widest mb-1"
            style={{ color: LIGHT_THEME.slate500 }}
          >
            Verified Match Score
          </p>
          <p className="text-[32px] font-black font-mono" style={{ color: LIGHT_THEME.red600 }}>
            VMS: {vmsScore.toFixed(0)}%
          </p>
        </div>
        <div className="text-right">
          <p
            className="text-[9px] font-mono uppercase tracking-widest mb-1"
            style={{ color: LIGHT_THEME.slate500 }}
          >
            Structural Coordinate
          </p>
          <p className="text-[14px] font-mono" style={{ color: LIGHT_THEME.slate500 }}>
            {structuralCoordinate}
          </p>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Template 2: "Momentum Lock" Card
// Proves a move is structurally real
// =============================================================================

const MomentumLockCard: React.FC<{
  state: UnifiedPhysicsState;
  primaryClaim: string;
  vmsScore: number;
  structuralCoordinate: string;
}> = ({ state, primaryClaim, vmsScore, structuralCoordinate }) => {
  const npiPct = state.metrics.currentNpiNorm * 100;

  return (
    <div
      className="w-[1080px] h-[1080px] p-12 flex flex-col"
      style={{ backgroundColor: LIGHT_THEME.bgBase, transform: 'scale(0.35)', transformOrigin: 'top left' }}
    >
      {/* Watermark */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded-sm"
            style={{ background: `linear-gradient(135deg, ${LIGHT_THEME.watermarkBlueFrom}, ${LIGHT_THEME.watermarkBlueTo})` }}
          />
          <span
            className="text-[14px] font-mono font-bold uppercase tracking-widest"
            style={{ color: LIGHT_THEME.slate500 }}
          >
            MarketScholar Forensic Report
          </span>
        </div>
        <span className="text-[12px] font-mono" style={{ color: LIGHT_THEME.slate400 }}>
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      {/* Ticker */}
      <div className="flex items-center gap-4 mb-8">
        <span className="text-[42px] font-black font-mono" style={{ color: LIGHT_THEME.ink900 }}>
          {state.ticker}
        </span>
        <span className="text-[28px] font-mono" style={{ color: LIGHT_THEME.verified }}>
          ${state.metrics.currentPrice.toFixed(2)}
        </span>
      </div>

      {/* THE CLAIM */}
      <div
        className="relative rounded-sm p-8 mb-8"
        style={{
          backgroundColor: LIGHT_THEME.bgCard,
          border: `1px solid rgba(5, 150, 105, 0.2)`,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
        }}
      >
        <p
          className="text-[9px] font-mono uppercase tracking-widest mb-3"
          style={{ color: LIGHT_THEME.slate500 }}
        >
          Verified Thesis
        </p>
        <p
          className="text-[22px] font-semibold leading-snug pr-56"
          style={{ color: LIGHT_THEME.ink900 }}
        >
          &ldquo;{primaryClaim}&rdquo;
        </p>

        {/* STRUCTURALLY ANCHORED badge - purple glow on white */}
        <div className="absolute top-6 right-6">
          <div
            className="rounded-sm px-5 py-3"
            style={{
              border: `2px solid ${LIGHT_THEME.npi500}`,
              boxShadow: `0 0 20px ${LIGHT_THEME.npiGlow}, 0 0 40px rgba(139, 92, 246, 0.15)`,
              backgroundColor: 'rgba(139, 92, 246, 0.05)',
            }}
          >
            <span
              className="text-[18px] font-black font-mono uppercase tracking-wider"
              style={{ color: LIGHT_THEME.npi600 }}
            >
              Structurally Anchored
            </span>
          </div>
        </div>
      </div>

      {/* THE VISUAL PROOF: NPI still high */}
      <div
        className="flex-1 rounded-sm p-6 mb-8"
        style={{
          backgroundColor: LIGHT_THEME.bgCard,
          border: `1px solid ${LIGHT_THEME.border}`,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
        }}
      >
        <p
          className="text-[9px] font-mono uppercase tracking-widest mb-4"
          style={{ color: LIGHT_THEME.slate500 }}
        >
          Narrative Energy Curve - Active Support
        </p>

        <div className="relative h-[calc(100%-24px)]">
          <MiniNPICurve
            points={state.points}
            width={920}
            height={300}
            color={LIGHT_THEME.npi500}
            showExhaustion={false}
          />

          {/* NPI badge */}
          <div
            className="absolute top-4 right-4 rounded-sm px-4 py-2"
            style={{
              backgroundColor: 'rgba(139, 92, 246, 0.08)',
              border: `1px solid rgba(139, 92, 246, 0.2)`,
            }}
          >
            <span
              className="text-[9px] font-mono block mb-0.5"
              style={{ color: LIGHT_THEME.slate500 }}
            >
              NPI
            </span>
            <span
              className="text-[28px] font-black font-mono"
              style={{ color: LIGHT_THEME.npi600 }}
            >
              {npiPct.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* THE VERDICT: VMS 100% */}
      <div
        className="rounded-sm p-6 flex items-center justify-between"
        style={{
          backgroundColor: 'rgba(5, 150, 105, 0.04)',
          border: `1px solid rgba(5, 150, 105, 0.15)`,
        }}
      >
        <div>
          <p
            className="text-[9px] font-mono uppercase tracking-widest mb-1"
            style={{ color: LIGHT_THEME.slate500 }}
          >
            Verified Match Score
          </p>
          <p className="text-[32px] font-black font-mono" style={{ color: LIGHT_THEME.verified }}>
            VMS: {vmsScore.toFixed(0)}%
          </p>
        </div>
        <div className="text-right">
          <p
            className="text-[9px] font-mono uppercase tracking-widest mb-1"
            style={{ color: LIGHT_THEME.slate500 }}
          >
            Filing Anchor
          </p>
          <p className="text-[14px] font-mono" style={{ color: LIGHT_THEME.slate500 }}>
            {structuralCoordinate}
          </p>
          <p className="text-[10px] font-mono mt-1" style={{ color: LIGHT_THEME.verified }}>
            [VERIFIED]
          </p>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Template 3: "Exhaustion Timer" Card
// Predicts the top with countdown clock
// =============================================================================

const ExhaustionTimerCard: React.FC<{
  state: UnifiedPhysicsState;
  primaryClaim: string;
}> = ({ state, primaryClaim }) => {
  const exhaustionHrs = state.metrics.timeToExhaustionHrs;
  const days = Math.floor(exhaustionHrs / 24);
  const hours = Math.floor(exhaustionHrs % 24);
  const minutes = Math.floor((exhaustionHrs % 1) * 60);
  const isExhausted = exhaustionHrs <= 0;

  return (
    <div
      className="w-[1080px] h-[1080px] p-12 flex flex-col"
      style={{ backgroundColor: LIGHT_THEME.bgBase, transform: 'scale(0.35)', transformOrigin: 'top left' }}
    >
      {/* Watermark */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded-sm"
            style={{ background: `linear-gradient(135deg, ${LIGHT_THEME.watermarkBlueFrom}, ${LIGHT_THEME.watermarkBlueTo})` }}
          />
          <span
            className="text-[14px] font-mono font-bold uppercase tracking-widest"
            style={{ color: LIGHT_THEME.slate500 }}
          >
            MarketScholar Forensic Report
          </span>
        </div>
        <span className="text-[12px] font-mono" style={{ color: LIGHT_THEME.slate400 }}>
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      {/* Ticker */}
      <div className="flex items-center gap-4 mb-6">
        <span className="text-[42px] font-black font-mono" style={{ color: LIGHT_THEME.ink900 }}>
          {state.ticker}
        </span>
        <span className="text-[28px] font-mono" style={{ color: LIGHT_THEME.slate500 }}>
          ${state.metrics.currentPrice.toFixed(2)}
        </span>
      </div>

      {/* THE CLAIM */}
      <div
        className="rounded-sm p-6 mb-6"
        style={{
          backgroundColor: LIGHT_THEME.bgCard,
          border: `1px solid ${LIGHT_THEME.border}`,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
        }}
      >
        <p
          className="text-[9px] font-mono uppercase tracking-widest mb-2"
          style={{ color: LIGHT_THEME.slate500 }}
        >
          Narrative Under Decay
        </p>
        <p
          className="text-[18px] font-semibold leading-snug"
          style={{ color: LIGHT_THEME.ink900 }}
        >
          &ldquo;{primaryClaim}&rdquo;
        </p>
      </div>

      {/* THE COUNTDOWN CLOCK */}
      <div
        className="rounded-sm p-8 mb-6"
        style={{
          backgroundColor: LIGHT_THEME.bgCard,
          border: `1px solid rgba(239, 68, 68, 0.2)`,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
        }}
      >
        <p
          className="text-[9px] font-mono uppercase tracking-widest mb-4 text-center"
          style={{ color: LIGHT_THEME.red600 }}
        >
          {isExhausted ? 'Narrative Has Expired' : 'Narrative Death In'}
        </p>

        <div className="flex items-center justify-center gap-4">
          {/* Days */}
          <div className="text-center">
            <div
              className="rounded-sm px-6 py-4 min-w-[100px]"
              style={{
                backgroundColor: LIGHT_THEME.bgCard,
                border: `2px solid ${isExhausted ? LIGHT_THEME.red600 : LIGHT_THEME.red500}`,
                boxShadow: isExhausted
                  ? '0 2px 8px rgba(220, 38, 38, 0.15)'
                  : '0 1px 4px rgba(239, 68, 68, 0.1)',
              }}
            >
              <span
                className="text-[56px] font-black font-mono"
                style={{ color: isExhausted ? LIGHT_THEME.red600 : LIGHT_THEME.red500 }}
              >
                {isExhausted ? '00' : String(days).padStart(2, '0')}
              </span>
            </div>
            <span
              className="text-[10px] font-mono mt-2 block uppercase"
              style={{ color: LIGHT_THEME.slate500 }}
            >
              Days
            </span>
          </div>

          <span className="text-[40px] font-mono -mt-6" style={{ color: 'rgba(239, 68, 68, 0.4)' }}>:</span>

          {/* Hours */}
          <div className="text-center">
            <div
              className="rounded-sm px-6 py-4 min-w-[100px]"
              style={{
                backgroundColor: LIGHT_THEME.bgCard,
                border: `2px solid ${isExhausted ? LIGHT_THEME.red600 : LIGHT_THEME.red500}`,
                boxShadow: isExhausted
                  ? '0 2px 8px rgba(220, 38, 38, 0.15)'
                  : '0 1px 4px rgba(239, 68, 68, 0.1)',
              }}
            >
              <span
                className="text-[56px] font-black font-mono"
                style={{ color: isExhausted ? LIGHT_THEME.red600 : LIGHT_THEME.red500 }}
              >
                {isExhausted ? '00' : String(hours).padStart(2, '0')}
              </span>
            </div>
            <span
              className="text-[10px] font-mono mt-2 block uppercase"
              style={{ color: LIGHT_THEME.slate500 }}
            >
              Hours
            </span>
          </div>

          <span className="text-[40px] font-mono -mt-6" style={{ color: 'rgba(239, 68, 68, 0.4)' }}>:</span>

          {/* Minutes */}
          <div className="text-center">
            <div
              className="rounded-sm px-6 py-4 min-w-[100px]"
              style={{
                backgroundColor: LIGHT_THEME.bgCard,
                border: `2px solid ${isExhausted ? LIGHT_THEME.red600 : LIGHT_THEME.red500}`,
                boxShadow: isExhausted
                  ? '0 2px 8px rgba(220, 38, 38, 0.15)'
                  : '0 1px 4px rgba(239, 68, 68, 0.1)',
              }}
            >
              <span
                className="text-[56px] font-black font-mono"
                style={{ color: isExhausted ? LIGHT_THEME.red600 : LIGHT_THEME.red500 }}
              >
                {isExhausted ? '00' : String(minutes).padStart(2, '0')}
              </span>
            </div>
            <span
              className="text-[10px] font-mono mt-2 block uppercase"
              style={{ color: LIGHT_THEME.slate500 }}
            >
              Mins
            </span>
          </div>
        </div>
      </div>

      {/* THE VISUAL: Price flatline + NPI decay */}
      <div
        className="flex-1 rounded-sm p-6 mb-6 relative"
        style={{
          backgroundColor: LIGHT_THEME.bgCard,
          border: `1px solid ${LIGHT_THEME.border}`,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
        }}
      >
        <div className="flex gap-4 h-full">
          <div className="flex-1">
            <p className="text-[8px] font-mono uppercase tracking-widest mb-2" style={{ color: LIGHT_THEME.slate500 }}>
              Price
            </p>
            <MiniPriceLine
              points={state.points}
              width={430}
              height={200}
              anchorPrice={state.points[0]?.anchor || 0}
            />
          </div>
          <div className="w-px" style={{ backgroundColor: LIGHT_THEME.border }} />
          <div className="flex-1">
            <p className="text-[8px] font-mono uppercase tracking-widest mb-2" style={{ color: LIGHT_THEME.slate500 }}>
              Narrative Energy
            </p>
            <MiniNPICurve
              points={state.points}
              width={430}
              height={200}
              color="#ef4444"
            />
          </div>
        </div>
      </div>

      {/* Bottom metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div
          className="rounded-sm p-4 text-center"
          style={{
            backgroundColor: LIGHT_THEME.bgCard,
            border: `1px solid ${LIGHT_THEME.border}`,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
          }}
        >
          <p className="text-[8px] font-mono uppercase tracking-widest mb-1" style={{ color: LIGHT_THEME.slate500 }}>
            NPI
          </p>
          <p className="text-[24px] font-black font-mono" style={{ color: LIGHT_THEME.npi600 }}>
            {(state.metrics.currentNpiNorm * 100).toFixed(0)}%
          </p>
        </div>
        <div
          className="rounded-sm p-4 text-center"
          style={{
            backgroundColor: LIGHT_THEME.bgCard,
            border: `1px solid ${LIGHT_THEME.border}`,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
          }}
        >
          <p className="text-[8px] font-mono uppercase tracking-widest mb-1" style={{ color: LIGHT_THEME.slate500 }}>
            Half-Life
          </p>
          <p className="text-[24px] font-black font-mono" style={{ color: LIGHT_THEME.ink700 }}>
            {state.metrics.halfLifeDays.toFixed(1)}d
          </p>
        </div>
        <div
          className="rounded-sm p-4 text-center"
          style={{
            backgroundColor: LIGHT_THEME.bgCard,
            border: `1px solid ${LIGHT_THEME.border}`,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
          }}
        >
          <p className="text-[8px] font-mono uppercase tracking-widest mb-1" style={{ color: LIGHT_THEME.slate500 }}>
            SFS
          </p>
          <p className="text-[24px] font-black font-mono" style={{ color: LIGHT_THEME.red600 }}>
            {state.metrics.supportFailureScore.toFixed(3)}
          </p>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Main CognitiveCard - Dispatches to template
// =============================================================================

const CognitiveCard: React.FC<CognitiveCardProps> = ({
  state,
  point,
  template,
  primaryClaim = `${state.ticker} narrative momentum continues`,
  structuralCoordinate = 'Revenue cell 4B in 10-Q FY25 Q3',
  vmsScore = 45,
  vmsVerdict = 'UNSUBSTANTIATED',
  onExport,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleExport = useCallback(async () => {
    if (!cardRef.current) return;
    onExport?.();

    // Dynamic import html2canvas for export
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#FFFFFF',
        scale: 2,
        width: 1080,
        height: 1080,
      });

      const link = document.createElement('a');
      link.download = `${state.ticker}_${template}_${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
    }
  }, [state.ticker, template, onExport]);

  return (
    <div>
      {/* Card Preview (scaled down for display) */}
      <div
        ref={cardRef}
        className="overflow-hidden rounded-sm"
        style={{
          width: '378px',
          height: '378px',
          border: `1px solid ${LIGHT_THEME.border}`,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
        }}
      >
        {template === 'bullshitCaller' && (
          <BullshitCallerCard
            state={state}
            primaryClaim={primaryClaim}
            vmsScore={vmsScore}
            vmsVerdict={vmsVerdict}
            structuralCoordinate={structuralCoordinate}
          />
        )}

        {template === 'momentumLock' && (
          <MomentumLockCard
            state={state}
            primaryClaim={primaryClaim}
            vmsScore={vmsScore}
            structuralCoordinate={structuralCoordinate}
          />
        )}

        {template === 'exhaustionTimer' && (
          <ExhaustionTimerCard state={state} primaryClaim={primaryClaim} />
        )}
      </div>

      {/* Export Button */}
      <button
        onClick={handleExport}
        className="mt-3 w-full py-3 rounded-lg text-[10px] font-bold uppercase tracking-wider font-mono transition-all duration-300 flex items-center justify-center gap-2 hover:shadow-npi-glow"
        style={{
          background: 'linear-gradient(135deg, #7C3AED, #3B82F6)',
          color: '#FFFFFF',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Export Card (1080x1080)
      </button>
    </div>
  );
};

export default CognitiveCard;
