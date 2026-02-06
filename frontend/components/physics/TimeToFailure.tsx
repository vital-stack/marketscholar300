'use client';

import React, { useEffect, useState, useRef } from 'react';
import type { MSIResult } from '../../lib/physics/msi-calculator';
import { TermTooltip } from './Tooltip';

// =============================================================================
// Types
// =============================================================================

interface TimeToFailureProps {
  /** Hours until narrative exhaustion */
  hoursToExhaustion: number;
  /** Half-life in days */
  halfLifeDays: number;
  /** Energy remaining as pct */
  energyPct: number;
  /** MSI result for context */
  msi: MSIResult;
  /** Decay constant */
  lambda: number;
}

// =============================================================================
// Animated Counter Hook
// =============================================================================

function useCountUp(target: number, duration: number = 800): number {
  const [val, setVal] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const from = val;
    const diff = target - from;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(from + diff * eased);
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [target, duration]);

  return val;
}

// =============================================================================
// Live Countdown (ticks every second)
// =============================================================================

function useLiveCountdown(hoursToExhaustion: number): { days: number; hours: number; minutes: number; seconds: number; isExhausted: boolean } {
  const [remaining, setRemaining] = useState(hoursToExhaustion * 3600);
  const startRef = useRef(Date.now());
  const initialRef = useRef(hoursToExhaustion * 3600);

  useEffect(() => {
    startRef.current = Date.now();
    initialRef.current = hoursToExhaustion * 3600;
    setRemaining(hoursToExhaustion * 3600);
  }, [hoursToExhaustion]);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startRef.current) / 1000;
      const r = Math.max(0, initialRef.current - elapsed);
      setRemaining(r);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const isExhausted = remaining <= 0;
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = Math.floor(remaining % 60);

  return { days, hours, minutes, seconds, isExhausted };
}

// =============================================================================
// Energy Depletion Bar
// =============================================================================

const EnergyBar: React.FC<{ pct: number; color: string }> = ({ pct, color }) => {
  const animated = useCountUp(pct, 1200);

  return (
    <div className="relative">
      <div className="h-2.5 bg-[#F1F5F9] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out relative"
          style={{
            width: `${animated}%`,
            background: `linear-gradient(90deg, ${color}, ${color}90)`,
            boxShadow: `0 0 8px ${color}30`,
          }}
        >
          {/* Shimmer effect */}
          <div
            className="absolute inset-0 opacity-40"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
              animation: 'shimmer 2s ease-in-out infinite',
              backgroundSize: '200% 100%',
            }}
          />
        </div>
      </div>
      {/* Markers */}
      <div className="relative h-3 mt-0.5">
        <div className="absolute left-[50%] top-0 h-2 w-px bg-ink-200" />
        <span className="absolute left-[50%] top-2 -translate-x-1/2 text-[7px] font-mono text-ink-300">
          t½
        </span>
        <div className="absolute left-[10%] top-0 h-2 w-px bg-risk/30" />
        <span className="absolute left-[10%] top-2 -translate-x-1/2 text-[7px] font-mono text-risk/50">
          10%
        </span>
      </div>
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

const TimeToFailure: React.FC<TimeToFailureProps> = ({
  hoursToExhaustion,
  halfLifeDays,
  energyPct,
  msi,
  lambda,
}) => {
  const countdown = useLiveCountdown(hoursToExhaustion);

  // Urgency coloring based on time remaining
  const urgencyColor = countdown.isExhausted
    ? '#DC2626'
    : countdown.days < 3
      ? '#DC2626'
      : countdown.days < 7
        ? '#EA580C'
        : countdown.days < 14
          ? '#D97706'
          : '#64748B';

  const urgencyBg = countdown.isExhausted
    ? '#FEF2F2'
    : countdown.days < 3
      ? '#FEF2F2'
      : countdown.days < 7
        ? '#FFF7ED'
        : countdown.days < 14
          ? '#FFFBEB'
          : '#F8FAFC';

  const urgencyBorder = countdown.isExhausted
    ? '#FECACA'
    : countdown.days < 3
      ? '#FECACA'
      : countdown.days < 7
        ? '#FED7AA'
        : countdown.days < 14
          ? '#FDE68A'
          : '#E2E8F0';

  // Contextual phrase
  const phrase = countdown.isExhausted
    ? 'Narrative support has been exhausted'
    : countdown.days < 3
      ? 'Critical: narrative exhaustion imminent'
      : countdown.days < 7
        ? 'Narrative energy depleting rapidly'
        : countdown.days < 14
          ? 'Narrative decay progressing'
          : 'Narrative energy decaying normally';

  return (
    <div
      className="bg-white border rounded-xl shadow-card overflow-hidden animate-fadeIn"
      style={{
        borderColor: urgencyBorder,
        borderTop: `3px solid ${urgencyColor}`,
      }}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${countdown.isExhausted || countdown.days < 7 ? 'animate-pulse' : ''}`}
              style={{ backgroundColor: urgencyColor }}
            />
            <span className="text-[9px] font-mono text-ink-400 uppercase tracking-widest font-bold">
              Time to Narrative Exhaustion<TermTooltip id="exhaustion" />
            </span>
          </div>
          <span
            className="text-[8px] font-mono font-bold px-2 py-0.5 rounded-full"
            style={{
              color: urgencyColor,
              backgroundColor: urgencyBg,
              border: `1px solid ${urgencyBorder}`,
            }}
          >
            {countdown.isExhausted ? 'EXHAUSTED' : `\u03BB = ${lambda.toFixed(4)}`}
          </span>
        </div>

        {/* Countdown Display */}
        <div className="flex items-center gap-3 mb-4">
          {[
            { val: countdown.days, label: 'DAYS' },
            { val: countdown.hours, label: 'HRS' },
            { val: countdown.minutes, label: 'MIN' },
            { val: countdown.seconds, label: 'SEC' },
          ].map((unit, i) => (
            <React.Fragment key={unit.label}>
              {i > 0 && (
                <span
                  className="text-xl font-bold font-mono"
                  style={{ color: urgencyBorder }}
                >
                  :
                </span>
              )}
              <div className="text-center">
                <div
                  className="rounded-lg px-3 py-2 min-w-[52px]"
                  style={{
                    backgroundColor: urgencyBg,
                    border: `1.5px solid ${urgencyBorder}`,
                  }}
                >
                  <span
                    className={`text-2xl font-black font-mono tabular-nums ${countdown.isExhausted ? 'animate-pulse' : ''}`}
                    style={{ color: urgencyColor }}
                  >
                    {String(unit.val).padStart(2, '0')}
                  </span>
                </div>
                <span className="text-[7px] font-mono text-ink-300 uppercase mt-1 block tracking-wider">
                  {unit.label}
                </span>
              </div>
            </React.Fragment>
          ))}

          {/* Vertical separator */}
          <div className="h-12 w-px bg-border mx-2" />

          {/* Trading days interpretation */}
          <div className="pl-2">
            <p
              className="text-xl font-black font-mono tabular-nums"
              style={{ color: urgencyColor }}
            >
              {countdown.isExhausted ? 0 : Math.ceil(hoursToExhaustion / 6.5)}
            </p>
            <p className="text-[8px] font-mono text-ink-400 uppercase tracking-wider">
              Trading Days<TermTooltip id="tradingDays" />
            </p>
            <p className="text-[8px] font-mono text-ink-300 mt-0.5">
              until support loss
            </p>
          </div>
        </div>

        {/* Energy Depletion Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[8px] font-mono text-ink-400 uppercase tracking-wider">
              Narrative Energy Remaining
            </span>
            <span
              className="text-[10px] font-mono font-bold tabular-nums"
              style={{ color: urgencyColor }}
            >
              {energyPct.toFixed(1)}%
            </span>
          </div>
          <EnergyBar pct={energyPct} color={urgencyColor} />
        </div>

        {/* Bottom stats row */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
          <div>
            <p className="text-[8px] font-mono text-ink-300 uppercase">Half-Life<TermTooltip id="halfLife" /></p>
            <p className="text-sm font-bold font-mono text-ink-700">{halfLifeDays.toFixed(1)}d</p>
          </div>
          <div>
            <p className="text-[8px] font-mono text-ink-300 uppercase">Phase</p>
            <p className="text-sm font-bold font-mono" style={{ color: urgencyColor }}>{phrase.split(':')[0]}</p>
          </div>
          <div>
            <p className="text-[8px] font-mono text-ink-300 uppercase">MSI Impact</p>
            <p className="text-sm font-bold font-mono" style={{ color: msi.gradeColor }}>
              {msi.grade} ({msi.score.toFixed(0)})
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeToFailure;
