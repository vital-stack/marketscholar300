'use client';

import React, { useState, useEffect } from 'react';
import { StockAnalysis, VERDICT_COLORS } from '@/types';

interface HistoryViewProps {
  onSelect: (analysis: StockAnalysis) => void;
  onClear: () => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ onSelect, onClear }) => {
  const [history, setHistory] = useState<StockAnalysis[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('market_scholar_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
  }, []);

  const handleClear = () => {
    localStorage.removeItem('market_scholar_history');
    setHistory([]);
    onClear();
  };

  const handleDelete = (index: number) => {
    const newHistory = [...history];
    newHistory.splice(index, 1);
    setHistory(newHistory);
    localStorage.setItem('market_scholar_history', JSON.stringify(newHistory));
  };

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="max-w-[1000px] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Audit History</h1>
            <p className="text-slate-500 mt-1">Your recent forensic audits</p>
          </div>
          {history.length > 0 && (
            <button
              onClick={handleClear}
              className="px-4 py-2 text-red-600 hover:bg-red-50 text-xs font-bold uppercase tracking-widest rounded-lg transition-all"
            >
              Clear All
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-slate-500 font-medium">No audit history yet</p>
            <p className="text-sm text-slate-400 mt-1">Your completed audits will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((audit, index) => (
              <div
                key={index}
                className="bg-white rounded-xl border border-slate-200 p-6 flex items-center justify-between card-hover"
              >
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => onSelect(audit)}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xl font-black text-slate-900">{audit.ticker}</span>
                    <span
                      className="px-2 py-0.5 text-[10px] font-bold uppercase rounded"
                      style={{
                        backgroundColor: `${VERDICT_COLORS[audit.auditVerdict]}15`,
                        color: VERDICT_COLORS[audit.auditVerdict],
                      }}
                    >
                      {audit.auditVerdict.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-1">{audit.companyName}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(audit.timestamp).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-center px-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Confidence</p>
                    <p className="text-xl font-black text-slate-900">{audit.confidenceScore}%</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(index);
                    }}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default HistoryView;
