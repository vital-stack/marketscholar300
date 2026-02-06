'use client';

import React, { useState, useRef } from 'react';
import { ResearchMode, AuditStance } from '@/types';

interface FileUploaderProps {
  onContentReady: (content: string, images?: string[], mode?: ResearchMode, stance?: AuditStance) => void;
  isProcessing: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onContentReady, isProcessing }) => {
  const [mode, setMode] = useState<ResearchMode>('headline');
  const [stance, setStance] = useState<AuditStance>('neutral');
  const [inputText, setInputText] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (!inputText.trim()) return;
    onContentReady(inputText, undefined, mode, stance);
  };

  const handleFileUpload = async (file: File) => {
    const text = await file.text();
    onContentReady(text, undefined, 'upload', stance);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const modes: { value: ResearchMode; label: string; desc: string }[] = [
    { value: 'headline', label: 'Headline', desc: 'Analyze a news headline or ticker' },
    { value: 'upload', label: 'Upload', desc: 'Upload a research document' },
    { value: 'thesis', label: 'Thesis', desc: 'Audit an investment thesis' },
  ];

  const stances: { value: AuditStance; label: string }[] = [
    { value: 'bullish', label: 'Bullish' },
    { value: 'neutral', label: 'Neutral' },
    { value: 'bearish', label: 'Bearish' },
  ];

  return (
    <div className="w-full max-w-3xl">
      {/* Mode Selector */}
      <div className="flex justify-center gap-2 mb-6">
        {modes.map((m) => (
          <button
            key={m.value}
            onClick={() => setMode(m.value)}
            className={`px-5 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${
              mode === m.value
                ? 'bg-white text-slate-900 shadow-lg'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Input Area - Larger and more prominent */}
      <div
        className={`relative bg-slate-900/80 backdrop-blur-xl rounded-2xl border-2 transition-all shadow-2xl shadow-indigo-500/10 ${
          dragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-600 hover:border-slate-500'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            mode === 'headline'
              ? 'Enter a stock ticker, headline, or news URL to audit...'
              : mode === 'thesis'
              ? 'Paste your investment thesis here for forensic audit...'
              : 'Paste document text or drag & drop a file...'
          }
          className="w-full h-28 md:h-32 p-5 md:p-6 bg-transparent text-white text-base md:text-lg placeholder-slate-500 resize-none focus:outline-none"
          disabled={isProcessing}
        />

        {/* Bottom bar with stance + button */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 pt-0">
          {/* Stance Selector */}
          <div className="flex gap-1">
            {stances.map((s) => (
              <button
                key={s.value}
                onClick={() => setStance(s.value)}
                className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${
                  stance === s.value
                    ? s.value === 'bullish'
                      ? 'bg-emerald-500 text-white'
                      : s.value === 'bearish'
                      ? 'bg-red-500 text-white'
                      : 'bg-slate-600 text-white'
                    : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Submit Button - Larger and more prominent */}
          <button
            onClick={handleSubmit}
            disabled={isProcessing || !inputText.trim()}
            className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold uppercase tracking-widest rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Auditing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Audit
              </>
            )}
          </button>
        </div>
      </div>

      {/* File Upload */}
      {mode === 'upload' && (
        <div className="mt-4 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.pdf,.doc,.docx"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-slate-400 text-xs font-medium hover:text-white transition-colors"
          >
            or click to upload a file
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
