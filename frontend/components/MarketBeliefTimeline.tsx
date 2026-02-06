'use client';

import React, { useState, useEffect } from 'react';
import { NarrativeEvent, MarketBeliefTimeline as TimelineData, CAUSALITY_COLORS, OVERREACTION_COLORS } from '@/types';

interface MarketBeliefTimelineProps {
  ticker: string;
  onLoad?: (data: TimelineData) => void;
}

const MarketBeliefTimeline: React.FC<MarketBeliefTimelineProps> = ({ ticker, onLoad }) => {
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);

  useEffect(() => {
    if (ticker) {
      fetchTimeline();
    }
  }, [ticker]);

  const fetchTimeline = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/timeline?ticker=${ticker}&days=30`);
      if (!response.ok) throw new Error('Failed to fetch timeline');
      const data = await response.json();
      setTimeline(data);
      onLoad?.(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getDotSize = (intensity: number) => {
    // Map 0-100 to 12-40px
    return Math.max(12, Math.min(40, 12 + (intensity / 100) * 28));
  };

  const getDotStyle = (event: NarrativeEvent) => {
    const size = getDotSize(event.narrativeIntensity);
    const color = CAUSALITY_COLORS[event.causalityType] || '#6b7280';
    const isVerified = event.isVerified;

    return {
      width: `${size}px`,
      height: `${size}px`,
      backgroundColor: color,
      border: isVerified ? `3px solid ${color}` : `3px dashed ${color}`,
      opacity: isVerified ? 1 : 0.7,
    };
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8">
        <div className="flex items-center justify-center gap-3">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-600 font-medium">Mapping narrative causality for {ticker}...</span>
        </div>
        <p className="text-center text-slate-400 text-sm mt-2">
          Using MarketScholar Proprietary AI
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-2xl border border-red-200 p-6">
        <p className="text-red-700 font-medium">Failed to load timeline</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <button
          onClick={fetchTimeline}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!timeline) {
    return (
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-8 text-center">
        <p className="text-slate-500">No timeline data available</p>
      </div>
    );
  }

  const sortedEvents = [...(timeline.narrativeEvents || [])].sort(
    (a, b) => b.timestamp - a.timestamp
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Market Belief Timeline</h3>
              <p className="text-xs text-slate-500">Causal Narrative Mapping • {timeline.timeframeStart} to {timeline.timeframeEnd}</p>
            </div>
          </div>

          {timeline.isGrounded && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 rounded-lg">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs font-bold text-emerald-700">GROUNDED</span>
            </div>
          )}
        </div>

        {/* Aggregate Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-slate-50 rounded-xl text-center">
            <p className="text-2xl font-black text-slate-900">{timeline.aggregateMetrics?.totalEvents || 0}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Events</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-center">
            <p className="text-2xl font-black text-emerald-600">{timeline.aggregateMetrics?.factualCatalysts || 0}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Catalysts</p>
          </div>
          <div className="p-3 bg-red-50 rounded-xl text-center">
            <p className="text-2xl font-black text-red-600">{timeline.aggregateMetrics?.narrativeTraps || 0}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Traps</p>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-center">
            <p className="text-2xl font-black text-indigo-600">{timeline.aggregateMetrics?.narrativeHealthScore || 0}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Health Score</p>
          </div>
        </div>

        {/* Dominant Narrative */}
        {timeline.aggregateMetrics?.dominantNarrative && (
          <div className="mt-4 p-4 bg-slate-900 rounded-xl">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Dominant Narrative</p>
            <p className="text-white font-medium">{timeline.aggregateMetrics.dominantNarrative}</p>
          </div>
        )}
      </div>

      {/* Timeline Legend */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap gap-4 justify-center">
          {Object.entries(CAUSALITY_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-slate-600">{type.replace(/_/g, ' ')}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 ml-4 pl-4 border-l border-slate-200">
            <div className="w-4 h-4 rounded-full border-2 border-slate-400" />
            <span className="text-xs text-slate-600">Verified</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-dashed border-slate-400" />
            <span className="text-xs text-slate-600">Unverified</span>
          </div>
        </div>
      </div>

      {/* Interactive Timeline */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="relative">
          {/* Timeline axis */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-200" />

          {/* Events */}
          <div className="space-y-4">
            {sortedEvents.map((event, idx) => (
              <div key={event.id} className="relative">
                {/* Dot */}
                <div
                  className="absolute left-0 cursor-pointer transform -translate-x-1/2 hover:scale-110 transition-all duration-200 rounded-full shadow-lg z-10"
                  style={{
                    ...getDotStyle(event),
                    left: '32px',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                  }}
                  onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                  onMouseEnter={() => setHoveredEvent(event.id)}
                  onMouseLeave={() => setHoveredEvent(null)}
                >
                  {/* Pulse animation for high intensity */}
                  {event.narrativeIntensity > 75 && (
                    <div
                      className="absolute inset-0 rounded-full animate-ping opacity-30"
                      style={{ backgroundColor: CAUSALITY_COLORS[event.causalityType] }}
                    />
                  )}
                </div>

                {/* Event Card */}
                <div
                  className={`ml-16 p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
                    expandedEvent === event.id
                      ? 'bg-slate-50 border-indigo-300 shadow-md'
                      : hoveredEvent === event.id
                      ? 'bg-slate-50 border-slate-300'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                >
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-400">{formatDate(event.date)}</span>
                        <span className="text-xs text-slate-300">•</span>
                        <span className="text-xs text-slate-500">{event.source}</span>
                      </div>
                      <p className="font-bold text-slate-900 leading-snug">{event.headline}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className="px-2 py-1 text-[10px] font-bold uppercase rounded"
                        style={{
                          backgroundColor: `${CAUSALITY_COLORS[event.causalityType]}20`,
                          color: CAUSALITY_COLORS[event.causalityType],
                        }}
                      >
                        {event.causalityType.replace(/_/g, ' ')}
                      </span>
                      {event.priceImpact && (
                        <span
                          className={`text-xs font-bold ${
                            event.priceImpact.priceChangePercent >= 0 ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {event.priceImpact.priceChangePercent >= 0 ? '+' : ''}
                          {event.priceImpact.priceChangePercent.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expanded Audit Panel */}
                  {expandedEvent === event.id && (
                    <div className="mt-4 pt-4 border-t border-slate-200 animate-fadeIn">
                      {/* Forensic Breakdown */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="p-3 bg-amber-50 rounded-lg">
                          <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Narrative Claim</p>
                          <p className="text-sm text-amber-900">{event.forensicBreakdown.narrativeClaim}</p>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Structural Reality</p>
                          <p className="text-sm text-blue-900">{event.forensicBreakdown.structuralReality}</p>
                        </div>
                      </div>

                      {/* Causality Delta Bar */}
                      <div className="mb-4">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-bold text-slate-500">Causality Delta</span>
                          <span
                            className={`font-bold ${
                              event.forensicBreakdown.causalityDelta >= 0 ? 'text-emerald-600' : 'text-red-600'
                            }`}
                          >
                            {event.forensicBreakdown.causalityDelta >= 0 ? '+' : ''}
                            {event.forensicBreakdown.causalityDelta}
                          </span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full transition-all duration-500"
                            style={{
                              width: `${Math.abs(event.forensicBreakdown.causalityDelta) / 2 + 50}%`,
                              backgroundColor:
                                event.forensicBreakdown.causalityDelta >= 0 ? '#10b981' : '#ef4444',
                              marginLeft: event.forensicBreakdown.causalityDelta < 0 ? 'auto' : '50%',
                              marginRight: event.forensicBreakdown.causalityDelta >= 0 ? 'auto' : '50%',
                            }}
                          />
                        </div>
                      </div>

                      {/* Reality vs Noise Bar Chart */}
                      <div className="mb-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">
                          Reality vs Noise (OR: {event.overreactionMetrics.overreactionRatio.toFixed(2)}x)
                        </p>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-slate-500">Reality (Fundamentals)</span>
                              <span className="font-bold text-blue-600">{event.overreactionMetrics.realityScore}</span>
                            </div>
                            <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                style={{ width: `${event.overreactionMetrics.realityScore}%` }}
                              />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-slate-500">Noise (Sentiment)</span>
                              <span className="font-bold text-orange-600">{event.overreactionMetrics.noiseScore}</span>
                            </div>
                            <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-orange-500 rounded-full transition-all duration-500"
                                style={{ width: `${event.overreactionMetrics.noiseScore}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 flex justify-center">
                          <span
                            className="px-2 py-1 text-[10px] font-bold uppercase rounded"
                            style={{
                              backgroundColor: `${OVERREACTION_COLORS[event.overreactionMetrics.verdict]}20`,
                              color: OVERREACTION_COLORS[event.overreactionMetrics.verdict],
                            }}
                          >
                            {event.overreactionMetrics.verdict}
                          </span>
                        </div>
                      </div>

                      {/* Filing Reference */}
                      {event.forensicBreakdown.filingReference && (
                        <div className="p-3 bg-slate-100 rounded-lg mb-4">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Filing Citation</p>
                          <p className="text-sm text-slate-700 font-mono">
                            {event.forensicBreakdown.filingReference}
                          </p>
                        </div>
                      )}

                      {/* Evidence Citations */}
                      {event.forensicBreakdown.evidenceCitations?.length > 0 && (
                        <div className="mb-4">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Evidence Citations</p>
                          <ul className="space-y-1">
                            {event.forensicBreakdown.evidenceCitations.map((citation, cidx) => (
                              <li key={cidx} className="flex items-start gap-2 text-xs text-slate-600">
                                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5 flex-shrink-0" />
                                {citation}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Grounding Citations */}
                      {event.groundingCitations && event.groundingCitations.length > 0 && (
                        <div className="pt-3 border-t border-slate-200">
                          <p className="text-[10px] font-bold text-emerald-600 uppercase mb-2">
                            Google Search Grounding
                          </p>
                          <div className="space-y-1">
                            {event.groundingCitations.map((url, uidx) => (
                              <a
                                key={uidx}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-xs text-indigo-600 hover:underline truncate"
                              >
                                {url}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Metrics Row */}
                      <div className="flex gap-4 pt-3 mt-3 border-t border-slate-200">
                        <div className="text-center">
                          <p className="text-lg font-black text-slate-900">{event.narrativeIntensity}</p>
                          <p className="text-[10px] text-slate-400 uppercase">Intensity</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-black text-slate-900">{event.veracityConfidence}</p>
                          <p className="text-[10px] text-slate-400 uppercase">Veracity</p>
                        </div>
                        {event.priceImpact && (
                          <div className="text-center">
                            <p className="text-lg font-black text-slate-900">
                              ${event.priceImpact.priceAtEvent.toFixed(2)}
                            </p>
                            <p className="text-[10px] text-slate-400 uppercase">Price</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Structural Anchors */}
      {timeline.structuralAnchors && timeline.structuralAnchors.length > 0 && (
        <div className="bg-slate-900 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Structural Anchors (SEC Filings)</h3>
          </div>

          <div className="space-y-4">
            {timeline.structuralAnchors.map((anchor) => (
              <div key={anchor.id} className="p-4 bg-slate-800 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase rounded">
                      {anchor.filingType}
                    </span>
                    <span className="text-white font-bold">{anchor.fiscalPeriod}</span>
                  </div>
                  <span className="text-slate-400 text-xs">{anchor.filingDate}</span>
                </div>

                {anchor.metrics.keyHighlights && anchor.metrics.keyHighlights.length > 0 && (
                  <ul className="space-y-1">
                    {anchor.metrics.keyHighlights.map((highlight, hidx) => (
                      <li key={hidx} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5 flex-shrink-0" />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-700">
                  {anchor.metrics.revenue && (
                    <div className="text-center">
                      <p className="text-lg font-black text-white">
                        ${(anchor.metrics.revenue / 1000000).toFixed(0)}M
                      </p>
                      <p className="text-[10px] text-slate-500 uppercase">Revenue</p>
                    </div>
                  )}
                  {anchor.metrics.revenueGrowth && (
                    <div className="text-center">
                      <p className="text-lg font-black text-emerald-400">+{anchor.metrics.revenueGrowth}%</p>
                      <p className="text-[10px] text-slate-500 uppercase">Growth</p>
                    </div>
                  )}
                  {anchor.metrics.eps && (
                    <div className="text-center">
                      <p className="text-lg font-black text-white">${anchor.metrics.eps}</p>
                      <p className="text-[10px] text-slate-500 uppercase">EPS</p>
                    </div>
                  )}
                  {anchor.metrics.guidance && (
                    <div className="text-center col-span-4 mt-2">
                      <p className="text-[10px] text-slate-500 uppercase mb-1">Guidance</p>
                      <p className="text-sm text-slate-300">{anchor.metrics.guidance}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketBeliefTimeline;
