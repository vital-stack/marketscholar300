'use client';

import React from 'react';
import type { UnifiedPhysicsPoint, PhysicsEvent } from '../../lib/physics/types';

// =============================================================================
// Types
// =============================================================================

interface EventTrackProps {
  points: UnifiedPhysicsPoint[];
  onEventClick?: (point: UnifiedPhysicsPoint, index: number) => void;
}

const EVENT_TYPE_CONFIG: Record<string, { color: string; label: string }> = {
  earnings: { color: '#2563EB', label: 'EARN' },
  filing: { color: '#4F46E5', label: 'SEC' },
  headline: { color: '#64748B', label: 'NEWS' },
  guidance: { color: '#059669', label: 'GUID' },
  analyst: { color: '#D97706', label: 'ANLY' },
  catalyst: { color: '#7C3AED', label: 'CAT' },
};

// =============================================================================
// Event Track Component
// =============================================================================

const EventTrack: React.FC<EventTrackProps> = ({ points, onEventClick }) => {
  // Filter points that have events
  const eventPoints = points
    .map((p, idx) => ({ point: p, index: idx }))
    .filter(({ point }) => point.events && point.events.length > 0);

  if (eventPoints.length === 0) return null;

  // Unique ID for SVG gradient definitions scoped to this instance
  const gradientId = React.useId();

  return (
    <div
      className="rounded-lg border border-border"
      style={{
        backgroundColor: '#FFFFFF',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-2.5 border-b border-border"
        style={{ backgroundColor: '#F8FAFC' }}
      >
        <p
          className="text-[9px] uppercase tracking-wider font-mono font-bold"
          style={{ color: '#8B95A5' }}
        >
          Event Track
        </p>
      </div>

      {/* Timeline body */}
      <div className="px-4 py-3 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {/* Hidden SVG for gradient definitions */}
          <svg width="0" height="0" style={{ position: 'absolute' }}>
            <defs>
              {eventPoints.map(({ point }, i) => {
                if (i === 0) return null;
                const prevEvents = eventPoints[i - 1].point.events || [];
                const currEvents = point.events || [];
                const prevConfig =
                  EVENT_TYPE_CONFIG[prevEvents[0]?.type || 'headline'];
                const currConfig =
                  EVENT_TYPE_CONFIG[currEvents[0]?.type || 'headline'];
                return (
                  <linearGradient
                    key={`grad-${i}`}
                    id={`${gradientId}-line-${i}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor={prevConfig.color} />
                    <stop offset="100%" stopColor={currConfig.color} />
                  </linearGradient>
                );
              })}
            </defs>
          </svg>

          {/* Timeline spine */}
          {eventPoints.map(({ point, index }, i) => {
            const events = point.events || [];
            const primaryEvent = events[0];
            const config = EVENT_TYPE_CONFIG[primaryEvent?.type || 'headline'];
            const isCatalyst = primaryEvent?.type === 'catalyst';
            const date = new Date(point.ts).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            });

            return (
              <React.Fragment key={point.ts}>
                {/* Connecting gradient line */}
                {i > 0 && (
                  <svg
                    width="24"
                    height="2"
                    className="flex-shrink-0"
                    style={{ marginTop: '-18px' }}
                  >
                    <rect
                      x="0"
                      y="0"
                      width="24"
                      height="2"
                      rx="1"
                      fill={`url(#${gradientId}-line-${i})`}
                    />
                  </svg>
                )}

                {/* Event node */}
                <button
                  onClick={() => onEventClick?.(point, index)}
                  className="flex-shrink-0 group relative"
                >
                  <div className="flex flex-col items-center gap-1">
                    {/* Dot with white ring and drop shadow */}
                    <div className="relative">
                      {/* Catalyst animated pulse ring */}
                      {isCatalyst && (
                        <div
                          className="absolute inset-0 rounded-full animate-ping"
                          style={{
                            backgroundColor: config.color,
                            opacity: 0.25,
                            animationDuration: '2s',
                          }}
                        />
                      )}
                      <div
                        className="w-3.5 h-3.5 rounded-full transition-transform group-hover:scale-125"
                        style={{
                          backgroundColor: config.color,
                          boxShadow: `0 0 0 2.5px #FFFFFF, 0 1px 3px rgba(0,0,0,0.15)`,
                        }}
                      />
                    </div>

                    {/* Type label — bold colored text */}
                    <span
                      className="text-[8px] font-mono font-bold uppercase"
                      style={{ color: config.color }}
                    >
                      {config.label}
                    </span>

                    {/* Date — muted ink */}
                    <span
                      className="text-[8px] font-mono"
                      style={{ color: '#8B95A5' }}
                    >
                      {date}
                    </span>
                  </div>

                  {/* Hover tooltip — white card with shadow */}
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-20 w-56">
                    <div
                      className="rounded-lg border border-border p-2.5"
                      style={{
                        backgroundColor: '#FFFFFF',
                        boxShadow:
                          '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
                      }}
                    >
                      <p
                        className="text-[10px] leading-relaxed font-medium"
                        style={{ color: '#1A202C' }}
                      >
                        {primaryEvent?.title}
                      </p>
                      {primaryEvent?.source && (
                        <p
                          className="text-[9px] mt-1 font-mono"
                          style={{ color: '#8B95A5' }}
                        >
                          {primaryEvent.source}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default EventTrack;
