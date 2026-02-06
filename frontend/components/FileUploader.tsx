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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
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

  const modes: { value: ResearchMode; label: string }[] = [
    { value: 'headline', label: 'Headline' },
    { value: 'upload', label: 'Upload' },
    { value: 'thesis', label: 'Thesis' },
  ];

  const stances: { value: AuditStance; label: string; color: string }[] = [
    { value: 'bullish', label: 'Bull', color: 'text-verified border-verified/30 bg-verified/5' },
    { value: 'neutral', label: 'Neutral', color: 'text-ink-700 border-ink-300 bg-ink-100' },
    { value: 'bearish', label: 'Bear', color: 'text-risk border-risk/30 bg-risk/5' },
  ];

  return (
    <div className="w-full max-w-2xl">
      {/* Mode Selector */}
      <div className="flex gap-1 mb-4">
        {modes.map((m) => (
          <button
            key={m.value}
            onClick={() => setMode(m.value)}
            className={`px-4 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest rounded-sm transition-all border ${
              mode === m.value
                ? 'bg-card text-ink-900 border-border-light'
                : 'bg-transparent text-ink-600 border-transparent hover:text-ink-700'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div
        className={`relative bg-card rounded-sm border transition-all ${
          dragActive
            ? 'border-math bg-math/5'
            : 'border-border hover:border-border-light'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {dragActive && (
          <div className="absolute inset-0 bg-math/10 rounded-sm flex items-center justify-center z-10 pointer-events-none">
            <p className="text-math font-mono font-bold text-xs uppercase tracking-widest">Drop File</p>
          </div>
        )}
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            mode === 'headline'
              ? 'Enter ticker, headline, or URL to audit...'
              : mode === 'thesis'
              ? 'Paste investment thesis for forensic audit...'
              : 'Paste document text or drag & drop...'
          }
          className="w-full h-24 p-4 bg-transparent text-ink-900 text-sm font-mono placeholder:text-ink-500 resize-none focus:outline-none"
          disabled={isProcessing}
        />

        {/* Bottom bar */}
        <div className="flex items-center justify-between gap-3 px-4 pb-3">
          {/* Stance Selector */}
          <div className="flex gap-1">
            {stances.map((s) => (
              <button
                key={s.value}
                onClick={() => setStance(s.value)}
                className={`px-3 py-1 text-[9px] font-mono font-bold uppercase tracking-widest rounded-sm transition-all border ${
                  stance === s.value ? s.color : 'bg-transparent text-ink-600 border-transparent'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={isProcessing || !inputText.trim()}
            className="px-6 py-2 bg-verified/10 border border-verified/30 text-verified text-[10px] font-mono font-bold uppercase tracking-widest rounded-sm hover:bg-verified/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5, borderColor: '#30363D', borderTopColor: '#00FF94' }} />
                Running
              </>
            ) : (
              'Audit'
            )}
          </button>
        </div>
      </div>

      {/* File Upload */}
      {mode === 'upload' && (
        <div className="mt-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.pdf,.doc,.docx"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-4 bg-card border border-dashed border-ink-300 hover:border-ink-500 rounded-sm transition-all group"
          >
            <div className="flex items-center justify-center gap-3">
              <svg className="w-4 h-4 text-ink-600 group-hover:text-ink-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="text-ink-600 group-hover:text-ink-900 font-mono text-[10px] uppercase tracking-widest">
                Upload Document
              </span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
