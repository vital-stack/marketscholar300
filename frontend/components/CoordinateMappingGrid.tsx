'use client';

import React, { useState, useRef, useEffect } from 'react';
import CardExportButton from './CardExportButton';

interface ClaimMapping {
  id: string;
  claimText: string;
  claimSource: string;
  filingReference: string; // e.g., "10-Q FY24 Q3, p.42"
  filingMetric: string;
  filingValue: string;
  matchScore: number; // VMS: (0.65 × TableCoordMatch) + (0.35 × TextMatch)
  tableCoordMatch: number; // 0-100
  textMatch: number; // 0-100
  verdict: 'VERIFIED' | 'PARTIAL' | 'UNVERIFIED' | 'CONTRADICTED';
}

interface CoordinateMappingGridProps {
  ticker: string;
  claims: ClaimMapping[];
}

const VERDICT_STYLES = {
  VERIFIED: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-500', color: '#10b981' },
  PARTIAL: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-500', color: '#f59e0b' },
  UNVERIFIED: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-400', color: '#64748b' },
  CONTRADICTED: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-500', color: '#ef4444' },
};

const CoordinateMappingGrid: React.FC<CoordinateMappingGridProps> = ({ ticker, claims }) => {
  const [selectedClaim, setSelectedClaim] = useState<string | null>(null);
  const [hoveredClaim, setHoveredClaim] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<{ claim: string; x1: number; y1: number; x2: number; y2: number }[]>([]);

  // Calculate connecting lines
  useEffect(() => {
    if (!containerRef.current) return;

    const newLines: typeof lines = [];
    claims.forEach((claim) => {
      const claimEl = document.getElementById(`claim-${claim.id}`);
      const filingEl = document.getElementById(`filing-${claim.id}`);

      if (claimEl && filingEl) {
        const containerRect = containerRef.current!.getBoundingClientRect();
        const claimRect = claimEl.getBoundingClientRect();
        const filingRect = filingEl.getBoundingClientRect();

        newLines.push({
          claim: claim.id,
          x1: claimRect.right - containerRect.left,
          y1: claimRect.top + claimRect.height / 2 - containerRect.top,
          x2: filingRect.left - containerRect.left,
          y2: filingRect.top + filingRect.height / 2 - containerRect.top,
        });
      }
    });
    setLines(newLines);
  }, [claims, selectedClaim, hoveredClaim]);

  // Calculate aggregate metrics
  const avgVMS = claims.length > 0 ? claims.reduce((sum, c) => sum + c.matchScore, 0) / claims.length : 0;
  const verifiedCount = claims.filter((c) => c.verdict === 'VERIFIED').length;
  const contradictedCount = claims.filter((c) => c.verdict === 'CONTRADICTED').length;

  return (
    <div id="coordinate-mapping-grid" className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Coordinate Mapping Evidence Grid</h3>
            <p className="text-xs text-slate-500">
              Analyst Credibility Assessment |
              <a href="#vms-info" className="text-purple-600 hover:text-purple-700 ml-1 underline">Patent 63/971,470</a>
            </p>
          </div>
        </div>
        <CardExportButton elementId="coordinate-mapping-grid" fileName={`${ticker}_evidence_grid`} />
      </div>

      {/* Metrics Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="p-3 bg-slate-50 rounded-xl text-center">
          <p className="text-2xl font-black text-indigo-600">{avgVMS.toFixed(0)}</p>
          <p className="text-[10px] text-slate-500 uppercase">Avg VMS</p>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl text-center">
          <p className="text-2xl font-black text-emerald-500">{verifiedCount}</p>
          <p className="text-[10px] text-slate-500 uppercase">Verified</p>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl text-center">
          <p className="text-2xl font-black text-red-500">{contradictedCount}</p>
          <p className="text-[10px] text-slate-500 uppercase">Contradicted</p>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl text-center">
          <p className="text-2xl font-black text-slate-900">{claims.length}</p>
          <p className="text-[10px] text-slate-500 uppercase">Total Claims</p>
        </div>
      </div>

      {/* Split View Container */}
      <div ref={containerRef} className="relative">
        {/* SVG for connecting lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          {lines.map((line) => {
            const isActive = selectedClaim === line.claim || hoveredClaim === line.claim;
            const claim = claims.find((c) => c.id === line.claim);
            const color = claim ? VERDICT_STYLES[claim.verdict].color : '#94a3b8';

            return (
              <g key={line.claim}>
                {/* Curved path connecting claim to filing */}
                <path
                  d={`M ${line.x1} ${line.y1} C ${line.x1 + 50} ${line.y1}, ${line.x2 - 50} ${line.y2}, ${line.x2} ${line.y2}`}
                  fill="none"
                  stroke={isActive ? color : '#e2e8f0'}
                  strokeWidth={isActive ? 2 : 1}
                  strokeDasharray={isActive ? 'none' : '4'}
                  opacity={isActive ? 1 : 0.5}
                />
                {/* Arrow head */}
                {isActive && (
                  <circle cx={line.x2} cy={line.y2} r={4} fill={color} />
                )}
              </g>
            );
          })}
        </svg>

        <div className="grid grid-cols-2 gap-8">
          {/* Left Column: Narrative Claims */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-500 rounded-full" />
              Narrative Claims
            </h4>
            <div className="space-y-3">
              {claims.map((claim) => (
                <div
                  key={claim.id}
                  id={`claim-${claim.id}`}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedClaim === claim.id || hoveredClaim === claim.id
                      ? `${VERDICT_STYLES[claim.verdict].border} ${VERDICT_STYLES[claim.verdict].bg}`
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                  }`}
                  onClick={() => setSelectedClaim(selectedClaim === claim.id ? null : claim.id)}
                  onMouseEnter={() => setHoveredClaim(claim.id)}
                  onMouseLeave={() => setHoveredClaim(null)}
                >
                  <p className="text-sm text-slate-700 font-medium mb-2">"{claim.claimText}"</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">{claim.claimSource}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-indigo-600">VMS: {claim.matchScore}</span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${VERDICT_STYLES[claim.verdict].bg} ${VERDICT_STYLES[claim.verdict].text}`}>
                        {claim.verdict}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: SEC Filing References */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full" />
              SEC Filing Evidence
            </h4>
            <div className="space-y-3">
              {claims.map((claim) => (
                <div
                  key={claim.id}
                  id={`filing-${claim.id}`}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    selectedClaim === claim.id || hoveredClaim === claim.id
                      ? `${VERDICT_STYLES[claim.verdict].border} bg-white`
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase">
                      {claim.filingReference}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">{claim.filingMetric}</span>
                    <span className="text-lg font-black text-slate-900">{claim.filingValue}</span>
                  </div>
                  {(selectedClaim === claim.id || hoveredClaim === claim.id) && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-500">Table Match: </span>
                          <span className="font-bold text-slate-900">{claim.tableCoordMatch}%</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Text Match: </span>
                          <span className="font-bold text-slate-900">{claim.textMatch}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Selected Claim Detail */}
      {selectedClaim && (
        <div className="mt-6 pt-6 border-t border-slate-200">
          {(() => {
            const claim = claims.find((c) => c.id === selectedClaim);
            if (!claim) return null;

            return (
              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Verification Analysis</h4>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-sm text-slate-700 mb-3">
                      <strong>Claim:</strong> "{claim.claimText}"
                    </p>
                    <p className="text-sm text-slate-700">
                      <strong>Evidence:</strong> {claim.filingReference} shows {claim.filingMetric} = {claim.filingValue}
                    </p>
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Match Breakdown</h4>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-600">Table Coord (65%)</span>
                        <span className="font-bold">{claim.tableCoordMatch}%</span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${claim.tableCoordMatch}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-600">Text Match (35%)</span>
                        <span className="font-bold">{claim.textMatch}%</span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${claim.textMatch}%` }}
                        />
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-200">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-700 font-medium">Final VMS</span>
                        <span className="font-black text-indigo-600">{claim.matchScore}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default CoordinateMappingGrid;
