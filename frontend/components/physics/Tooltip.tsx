'use client';

import React, { useState, useRef, useEffect } from 'react';

// =============================================================================
// InfoTooltip - Hover/click tooltip for explaining technical terms
// Small "?" icon that reveals a clear explanation
// =============================================================================

interface InfoTooltipProps {
  /** The term being explained */
  term: string;
  /** Plain-English explanation */
  description: string;
  /** Optional formula */
  formula?: string;
  /** Optional patent reference */
  patent?: string;
  /** Size variant */
  size?: 'sm' | 'md';
}

const InfoTooltip: React.FC<InfoTooltipProps> = ({
  term,
  description,
  formula,
  patent,
  size = 'sm',
}) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom'>('top');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      // If too close to top, show below
      if (rect.top < 200) {
        setPosition('bottom');
      } else {
        setPosition('top');
      }
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const sizeClasses = size === 'sm'
    ? 'w-3.5 h-3.5 text-[8px]'
    : 'w-4 h-4 text-[9px]';

  return (
    <span className="relative inline-flex items-center ml-1">
      <button
        ref={triggerRef}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen(!open)}
        className={`${sizeClasses} rounded-full border border-primary-200 text-primary-400 hover:bg-primary-50 hover:text-primary-600 hover:border-primary-300 transition-all duration-200 flex items-center justify-center font-mono font-bold cursor-help`}
        aria-label={`Learn about ${term}`}
      >
        ?
      </button>

      {open && (
        <div
          ref={tooltipRef}
          className={`absolute z-50 left-1/2 -translate-x-1/2 ${
            position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          } animate-scaleIn`}
        >
          <div
            className="w-64 bg-white rounded-lg shadow-float border border-border p-3.5"
            style={{
              boxShadow: '0 12px 32px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06)',
            }}
          >
            {/* Arrow */}
            <div
              className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-border rotate-45 ${
                position === 'top'
                  ? '-bottom-1 border-b border-r'
                  : '-top-1 border-t border-l'
              }`}
            />

            {/* Term */}
            <p className="text-[10px] font-mono font-bold text-primary-600 uppercase tracking-wider mb-1.5">
              {term}
            </p>

            {/* Description */}
            <p className="text-[11px] text-ink-600 leading-relaxed">
              {description}
            </p>

            {/* Formula */}
            {formula && (
              <div className="mt-2 pt-2 border-t border-border">
                <p className="text-[9px] font-mono text-npi-600 bg-npi-50 rounded px-2 py-1">
                  {formula}
                </p>
              </div>
            )}

            {/* Patent reference */}
            {patent && (
              <p className="text-[8px] font-mono text-ink-300 mt-1.5">
                Patent {patent}
              </p>
            )}
          </div>
        </div>
      )}
    </span>
  );
};

// =============================================================================
// Pre-defined term definitions for MarketScholar
// =============================================================================

export const TERM_DEFINITIONS: Record<string, {
  term: string;
  description: string;
  formula?: string;
  patent?: string;
}> = {
  msi: {
    term: 'MSI (Market Support Integrity)',
    description: 'A composite score measuring how well the current stock price is supported by narrative energy, fundamental anchoring, and structural stress resistance. Higher = stronger support.',
    formula: 'MSI = 40% NarrativeEnergy + 35% AnchorAlignment + 25% StressResistance',
  },
  npi: {
    term: 'NPI (Narrative Propagation Index)',
    description: 'Measures the remaining energy in a market narrative over time. Like radioactive decay, narratives lose momentum exponentially. When NPI hits 10% of initial energy, the narrative is considered exhausted.',
    formula: 'NPI(t) = E\u2080 \u00B7 e^(\u2212\u03BB\u00B7t)',
    patent: '63/971,478',
  },
  sfs: {
    term: 'SFS (Support Failure Score)',
    description: 'Measures the risk of a price snap-back by combining how far the price has drifted from its structural anchor with how depleted the narrative energy is. Higher SFS = higher risk of reversion.',
    formula: 'SFS = deviation \u00D7 (1 \u2212 energy)',
    patent: '63/971,478',
  },
  vms: {
    term: 'VMS (Verified Match Score)',
    description: 'Cross-references analyst claims against actual SEC filings (10-K, 10-Q). A score of 100 means every claim maps to a real data point. Below 40 = unsubstantiated.',
    formula: 'VMS = 0.65 \u00D7 tableCoordMatch + 0.35 \u00D7 textMatch',
    patent: '63/971,470',
  },
  regime: {
    term: 'Physics Regime',
    description: 'The current behavioral state of the stock, classified by its narrative energy and price dynamics: Momentum (strong thrust), Inertia (coasting), Gravity (decelerating), Reversion (snapping back), or New Catalyst (fresh energy injected).',
    patent: '63/971,478',
  },
  halfLife: {
    term: 'Half-Life (t\u00BD)',
    description: 'The number of days it takes for a narrative to lose half its energy. Shorter half-life = faster decay = less sustainable price support. Derived from the decay constant \u03BB.',
    formula: 't\u00BD = ln(2) / \u03BB',
    patent: '63/971,478',
  },
  lambda: {
    term: 'Lambda (\u03BB)',
    description: 'The decay constant that controls how fast a narrative loses energy. Higher \u03BB = faster decay. Estimated from the rate of sentiment decline and source density changes over time.',
    patent: '63/971,478',
  },
  anchor: {
    term: 'Structural Anchor',
    description: 'The fundamental fair-value price derived from actual financial data (EPS, P/E ratios, revenue growth). The anchor is the "gravity center" that price tends to revert toward when narrative energy depletes.',
    patent: '63/971,470',
  },
  deviation: {
    term: 'Price Deviation',
    description: 'How far the current price has moved from the structural anchor (fair value), expressed as a percentage. Positive = overextended above anchor. Negative = below anchor.',
  },
  exhaustion: {
    term: 'Narrative Exhaustion',
    description: 'When NPI falls below 10% of its initial energy (E\u2080), the narrative is considered "exhausted" and can no longer support the current price above the structural anchor. This is the critical failure point.',
    formula: 't_exhaustion = ln(10) / \u03BB',
    patent: '63/971,478',
  },
  galaxyScore: {
    term: 'Galaxy Score',
    description: 'LunarCrush\'s proprietary score (0-100) that combines social media metrics, market metrics, and on-chain data to measure the overall health and social momentum of an asset.',
  },
  severity: {
    term: 'Severity Level',
    description: 'An alert level based on the Support Failure Score. None = safe, Watch = early warning, Warning = elevated risk, Critical = imminent support failure likely.',
  },
  narrativeEnergy: {
    term: 'Narrative Energy',
    description: 'The MSI component measuring remaining NPI as a percentage of initial energy. 100 = full narrative fuel. 0 = completely exhausted. This is the primary driver of whether a price can sustain above its anchor.',
  },
  anchorAlignment: {
    term: 'Anchor Alignment',
    description: 'The MSI component measuring how close the current price is to its structural anchor (fair value). 100 = perfectly aligned. Drops toward 0 as price deviates more than 20% from anchor.',
  },
  stressResistance: {
    term: 'Stress Resistance',
    description: 'The MSI component measuring the inverse of support failure risk. 100 = no structural stress. Drops toward 0 as the SFS (Support Failure Score) increases.',
  },
  or: {
    term: 'OR (Overreaction Ratio)',
    description: 'Measures whether price movement is proportional to fundamental changes. OR > 2 suggests market overreaction to narrative. OR < 0.5 suggests under-reaction.',
    formula: 'OR = |priceVelocity| / |fundamentalVelocity|',
    patent: '63/971,478',
  },
  socialNpi: {
    term: 'Social NPI',
    description: 'A narrative pressure metric derived from LunarCrush social data. Combines Galaxy Score, sentiment, social volume, and contributor diversity into a single social momentum reading (0-100).',
  },
  tradingDays: {
    term: 'Trading Days',
    description: 'Calendar hours converted to market trading days (6.5 hours per trading day). This is how many market sessions remain until narrative exhaustion.',
  },
};

// =============================================================================
// Quick-use tooltip with pre-defined term
// =============================================================================

export const TermTooltip: React.FC<{ id: keyof typeof TERM_DEFINITIONS; size?: 'sm' | 'md' }> = ({
  id,
  size = 'sm',
}) => {
  const def = TERM_DEFINITIONS[id];
  if (!def) return null;

  return (
    <InfoTooltip
      term={def.term}
      description={def.description}
      formula={def.formula}
      patent={def.patent}
      size={size}
    />
  );
};

export default InfoTooltip;
