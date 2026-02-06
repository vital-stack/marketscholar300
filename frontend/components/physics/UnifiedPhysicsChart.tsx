'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Area,
} from 'recharts';
import type {
  UnifiedPhysicsState,
  UnifiedPhysicsPoint,
  RegimeType,
  SeverityLevel,
} from '../../lib/physics/types';
import {
  REGIME_CONFIG,
  SEVERITY_CONFIG,
} from '../../lib/physics/types';

// =============================================================================
// Light Enterprise Theme Colors
// =============================================================================

const PHYSICS_COLORS = {
  price: '#1E40AF',
  npi: '#8B5CF6',
  npiGlow: 'rgba(139, 92, 246, 0.3)',
  anchor: '#059669',
  grid: 'rgba(226, 232, 240, 0.8)',
  card: '#FFFFFF',
  background: '#F8FAFC',
  text: '#0F172A',
  textMuted: '#64748B',
  textLight: '#94A3B8',
  primaryDark: '#1E40AF',
  exhaustionZone: 'rgba(220, 38, 38, 0.06)',
  exhaustionLine: '#DC2626',
  halfLife: '#8B5CF6',
  priceCandle: {
    up: '#059669',
    down: '#DC2626',
    wick: '#94A3B8',
  },
};

// =============================================================================
// Types
// =============================================================================

interface UnifiedPhysicsChartProps {
  state: UnifiedPhysicsState;
  chartMode: 'candle' | 'line';
  showAnchor: boolean;
  showEvents: boolean;
  normalizeNpi: boolean;
  onPointClick?: (point: UnifiedPhysicsPoint, index: number) => void;
}

interface ChartDataPoint {
  ts: number;
  date: string;
  price: number;
  candleHigh?: number;
  candleLow?: number;
  candleOpen?: number;
  candleClose?: number;
  candleBody: [number, number];
  candleWick: [number, number];
  isUp: boolean;
  npi: number;
  npiDisplay: number;
  anchor: number;
  regime: RegimeType;
  severity: SeverityLevel;
  sfs: number;
  volume?: number;
  hasEvent: boolean;
  pointIndex: number;
}

// =============================================================================
// Custom Candlestick Shape
// =============================================================================

const CandlestickBar = (props: any) => {
  const { x, y, width, height, payload } = props;
  if (!payload || !payload.candleOpen) return null;

  const isUp = payload.isUp;
  const color = isUp ? PHYSICS_COLORS.priceCandle.up : PHYSICS_COLORS.priceCandle.down;
  const wickColor = PHYSICS_COLORS.priceCandle.wick;

  const barWidth = Math.max(width * 0.6, 3);
  const barX = x + (width - barWidth) / 2;

  return (
    <g>
      {/* Wick */}
      <line
        x1={x + width / 2}
        y1={y}
        x2={x + width / 2}
        y2={y + height}
        stroke={wickColor}
        strokeWidth={1}
      />
      {/* Body */}
      <rect
        x={barX}
        y={y + (height > 0 ? 0 : height)}
        width={barWidth}
        height={Math.abs(height) || 1}
        fill={isUp ? PHYSICS_COLORS.card : color}
        stroke={color}
        strokeWidth={1.5}
      />
    </g>
  );
};

// =============================================================================
// Custom Tooltip — Premium Light Card
// =============================================================================

const PhysicsTooltip = ({ active, payload, state }: any) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload as ChartDataPoint;
  if (!data) return null;

  const regimeConfig = REGIME_CONFIG[data.regime];
  const severityConfig = SEVERITY_CONFIG[data.severity];
  const deviation = state?.metrics
    ? ((data.price - data.anchor) / data.anchor * 100).toFixed(1)
    : '0';
  const exhaustionHrs = state?.metrics?.timeToExhaustionHrs;

  return (
    <div
      className="rounded-md p-3 min-w-[280px] font-mono text-xs border border-slate-200"
      style={{
        background: '#FFFFFF',
        boxShadow: '0 4px 24px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.04)',
      }}
    >
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200">
        <span style={{ color: PHYSICS_COLORS.textMuted }}>{data.date}</span>
        <span
          className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
          style={{ backgroundColor: regimeConfig.bgColor, color: regimeConfig.color }}
        >
          {regimeConfig.label}
        </span>
      </div>

      <div className="space-y-1.5">
        {/* Price */}
        <div className="flex justify-between">
          <span style={{ color: PHYSICS_COLORS.textMuted }}>Price</span>
          <span style={{ color: PHYSICS_COLORS.text, fontWeight: 600 }}>
            ${data.price.toFixed(2)}
          </span>
        </div>
        {data.candleOpen && (
          <div className="flex justify-between" style={{ color: PHYSICS_COLORS.textLight }}>
            <span>OHLC</span>
            <span>
              {data.candleOpen.toFixed(2)} / {data.candleHigh?.toFixed(2)} /{' '}
              {data.candleLow?.toFixed(2)} / {data.candleClose?.toFixed(2)}
            </span>
          </div>
        )}

        {/* NPI */}
        <div className="flex justify-between">
          <span style={{ color: PHYSICS_COLORS.textMuted }}>NPI</span>
          <span style={{ color: PHYSICS_COLORS.npi }}>
            {data.npi.toFixed(1)}{' '}
            <span style={{ color: PHYSICS_COLORS.textLight }}>
              ({(data.npiDisplay).toFixed(0)}%)
            </span>
          </span>
        </div>

        {/* Deviation */}
        <div className="flex justify-between">
          <span style={{ color: PHYSICS_COLORS.textMuted }}>Deviation from Anchor</span>
          <span style={{ color: +deviation > 0 ? '#D97706' : '#059669' }}>
            {+deviation > 0 ? '+' : ''}{deviation}%
          </span>
        </div>

        {/* Support Failure Score */}
        <div className="flex justify-between">
          <span style={{ color: PHYSICS_COLORS.textMuted }}>Support Failure Score</span>
          <span style={{ color: severityConfig.color }}>
            {data.sfs.toFixed(3)}
            {data.severity !== 'none' && (
              <span className="ml-1 text-[9px] uppercase">
                [{severityConfig.label}]
              </span>
            )}
          </span>
        </div>

        {/* Time to exhaustion */}
        {exhaustionHrs !== undefined && exhaustionHrs > 0 && (
          <div className="flex justify-between">
            <span style={{ color: PHYSICS_COLORS.textMuted }}>Time to Exhaustion</span>
            <span style={{ color: PHYSICS_COLORS.exhaustionLine }}>
              {exhaustionHrs > 24
                ? `${(exhaustionHrs / 24).toFixed(1)}d`
                : `${exhaustionHrs.toFixed(0)}h`}
            </span>
          </div>
        )}
      </div>

      {/* Events */}
      {data.hasEvent && (
        <div className="mt-2 pt-2 border-t border-slate-200">
          <span className="text-[9px] uppercase" style={{ color: PHYSICS_COLORS.textLight }}>
            Event at this point
          </span>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// Event Dot Renderer
// =============================================================================

const EventDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (!payload?.hasEvent || !cx || !cy) return null;

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={PHYSICS_COLORS.npi}
        stroke="#FFFFFF"
        strokeWidth={1.5}
        style={{ filter: `drop-shadow(0 0 4px ${PHYSICS_COLORS.npiGlow})` }}
      />
    </g>
  );
};

// =============================================================================
// Main Chart Component
// =============================================================================

const UnifiedPhysicsChart: React.FC<UnifiedPhysicsChartProps> = ({
  state,
  chartMode,
  showAnchor,
  showEvents,
  normalizeNpi,
  onPointClick,
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Transform data for Recharts
  const chartData: ChartDataPoint[] = useMemo(() => {
    return state.points.map((point, idx) => {
      const date = new Date(point.ts);
      const dateStr = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });

      const isUp = point.candle ? point.candle.c >= point.candle.o : true;

      return {
        ts: point.ts,
        date: dateStr,
        price: point.price,
        candleHigh: point.candle?.h,
        candleLow: point.candle?.l,
        candleOpen: point.candle?.o,
        candleClose: point.candle?.c,
        candleBody: point.candle
          ? [Math.min(point.candle.o, point.candle.c), Math.max(point.candle.o, point.candle.c)]
          : [point.price, point.price],
        candleWick: point.candle ? [point.candle.l, point.candle.h] : [point.price, point.price],
        isUp,
        npi: point.npi,
        npiDisplay: normalizeNpi ? point.npiNorm * 100 : point.npi,
        anchor: point.anchor,
        regime: point.regime,
        severity: point.severity,
        sfs: point.supportFailureScore,
        volume: point.volume,
        hasEvent: !!(point.events && point.events.length > 0),
        pointIndex: idx,
      };
    });
  }, [state.points, normalizeNpi]);

  // Price domain
  const priceDomain = useMemo(() => {
    const prices = chartData.flatMap((d) => {
      const vals = [d.price, d.anchor];
      if (d.candleHigh) vals.push(d.candleHigh);
      if (d.candleLow) vals.push(d.candleLow);
      return vals;
    });
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.08;
    return [+(min - padding).toFixed(2), +(max + padding).toFixed(2)];
  }, [chartData]);

  // NPI domain
  const npiDomain = useMemo(() => {
    if (normalizeNpi) return [0, 100];
    return [0, Math.ceil(state.catalyst.e0 * 1.1)];
  }, [state.catalyst.e0, normalizeNpi]);

  // Exhaustion zone boundaries
  const exhaustionStartIdx = useMemo(() => {
    const idx = chartData.findIndex((d) => d.ts >= state.decayCurve.exhaustionTs);
    return idx >= 0 ? idx : chartData.length - 1;
  }, [chartData, state.decayCurve.exhaustionTs]);

  // Half-life position
  const halfLifeDate = useMemo(() => {
    const halfLifeMs = state.decayCurve.halfLife * 24 * 60 * 60 * 1000;
    const halfLifeTs = state.decayCurve.catalystTs + halfLifeMs;
    const closestPoint = chartData.reduce((prev, curr) =>
      Math.abs(curr.ts - halfLifeTs) < Math.abs(prev.ts - halfLifeTs) ? curr : prev
    );
    return closestPoint.date;
  }, [chartData, state.decayCurve]);

  // Click handler
  const handleClick = useCallback(
    (data: any) => {
      if (data && data.activePayload && data.activePayload[0]) {
        const payload = data.activePayload[0].payload as ChartDataPoint;
        setActiveIndex(payload.pointIndex);
        onPointClick?.(state.points[payload.pointIndex], payload.pointIndex);
      }
    },
    [state.points, onPointClick]
  );

  // Exhaustion zone dates
  const exhaustionStartDate =
    exhaustionStartIdx < chartData.length ? chartData[exhaustionStartIdx].date : undefined;
  const exhaustionEndDate =
    chartData.length > 0 ? chartData[chartData.length - 1].date : undefined;

  return (
    <div className="w-full" style={{ backgroundColor: PHYSICS_COLORS.background }}>
      <ResponsiveContainer width="100%" height={520}>
        <ComposedChart
          data={chartData}
          margin={{ top: 20, right: 60, left: 20, bottom: 20 }}
          onClick={handleClick}
        >
          {/* Grid — light gray for enterprise readability */}
          <CartesianGrid
            stroke="#F1F5F9"
            strokeDasharray="3 3"
            vertical={false}
          />

          {/* X Axis */}
          <XAxis
            dataKey="date"
            tick={{ fill: PHYSICS_COLORS.textMuted, fontSize: 10, fontFamily: 'JetBrains Mono' }}
            tickLine={false}
            axisLine={{ stroke: PHYSICS_COLORS.grid }}
            interval="preserveStartEnd"
            minTickGap={40}
          />

          {/* Y1: Price Axis (Left) — dark blue for price context */}
          <YAxis
            yAxisId="price"
            orientation="left"
            domain={priceDomain}
            tick={{ fill: PHYSICS_COLORS.primaryDark, fontSize: 10, fontFamily: 'JetBrains Mono' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${v}`}
            width={65}
          />

          {/* Y2: NPI Axis (Right) — purple for NPI context */}
          <YAxis
            yAxisId="npi"
            orientation="right"
            domain={npiDomain}
            tick={{ fill: PHYSICS_COLORS.npi, fontSize: 10, fontFamily: 'JetBrains Mono' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => normalizeNpi ? `${v}%` : v.toFixed(0)}
            width={55}
          />

          {/* Exhaustion Zone (subtle red shaded area) */}
          {exhaustionStartDate && exhaustionEndDate && (
            <ReferenceArea
              yAxisId="price"
              x1={exhaustionStartDate}
              x2={exhaustionEndDate}
              fill={PHYSICS_COLORS.exhaustionZone}
              fillOpacity={1}
              label={{
                value: 'NARRATIVE EXHAUSTION ZONE',
                position: 'insideTopRight',
                fill: PHYSICS_COLORS.exhaustionLine,
                fontSize: 9,
                fontFamily: 'JetBrains Mono',
                fontWeight: 700,
              }}
            />
          )}

          {/* Half-Life Marker */}
          <ReferenceLine
            yAxisId="price"
            x={halfLifeDate}
            stroke={PHYSICS_COLORS.halfLife}
            strokeDasharray="6 4"
            strokeWidth={1.5}
            label={{
              value: `t\u00BD = ${state.decayCurve.halfLife.toFixed(1)}d`,
              position: 'top',
              fill: PHYSICS_COLORS.npi,
              fontSize: 10,
              fontFamily: 'JetBrains Mono',
              fontWeight: 600,
            }}
          />

          {/* VMS Anchor Line — verified green */}
          {showAnchor && (
            <ReferenceLine
              yAxisId="price"
              y={state.points[0]?.anchor}
              stroke={PHYSICS_COLORS.anchor}
              strokeDasharray="8 4"
              strokeWidth={1}
              label={{
                value: `VMS ANCHOR $${state.points[0]?.anchor.toFixed(0)}`,
                position: 'left',
                fill: PHYSICS_COLORS.anchor,
                fontSize: 9,
                fontFamily: 'JetBrains Mono',
                fontWeight: 600,
              }}
            />
          )}

          {/* Exhaustion Threshold Line (on NPI axis) */}
          <ReferenceLine
            yAxisId="npi"
            y={normalizeNpi ? 10 : state.decayCurve.exhaustionNpi}
            stroke={PHYSICS_COLORS.exhaustionLine}
            strokeDasharray="4 4"
            strokeWidth={1}
            strokeOpacity={0.6}
          />

          {/* Price: Line mode — deep blue */}
          {chartMode === 'line' && (
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="price"
              stroke={PHYSICS_COLORS.price}
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 4,
                stroke: PHYSICS_COLORS.price,
                strokeWidth: 2,
                fill: PHYSICS_COLORS.card,
              }}
            />
          )}

          {/* Price: Candle mode — body as Bar */}
          {chartMode === 'candle' && (
            <Bar
              yAxisId="price"
              dataKey="candleBody"
              shape={<CandlestickBar />}
              isAnimationActive={false}
            />
          )}

          {/* NPI Curve — purple decay with soft gradient */}
          <Area
            yAxisId="npi"
            type="monotone"
            dataKey="npiDisplay"
            stroke={PHYSICS_COLORS.npi}
            strokeWidth={2.5}
            fill="url(#npiGradient)"
            fillOpacity={0.3}
            dot={showEvents ? <EventDot /> : false}
            activeDot={{
              r: 5,
              stroke: PHYSICS_COLORS.npi,
              strokeWidth: 2,
              fill: PHYSICS_COLORS.card,
              style: { filter: `drop-shadow(0 0 6px ${PHYSICS_COLORS.npiGlow})` },
            }}
            style={{
              filter: `drop-shadow(0 0 8px ${PHYSICS_COLORS.npiGlow})`,
            }}
          />

          {/* NPI Gradient Definition — purple to transparent on light bg */}
          <defs>
            <linearGradient id="npiGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PHYSICS_COLORS.npi} stopOpacity={0.35} />
              <stop offset="50%" stopColor={PHYSICS_COLORS.npi} stopOpacity={0.12} />
              <stop offset="100%" stopColor={PHYSICS_COLORS.npi} stopOpacity={0.01} />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Tooltip — light gray dashed cursor */}
          <Tooltip
            content={<PhysicsTooltip state={state} />}
            cursor={{
              stroke: 'rgba(148, 163, 184, 0.4)',
              strokeWidth: 1,
              strokeDasharray: '4 4',
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default UnifiedPhysicsChart;
