'use client';

import React, { useState } from 'react';

interface CardExportButtonProps {
  elementId: string;
  fileName: string;
  title?: string;
  dark?: boolean;
}

const CardExportButton: React.FC<CardExportButtonProps> = ({ elementId, fileName, title = 'MarketScholar', dark = false }) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const element = document.getElementById(elementId);

      if (element) {
        // Clone and style for export
        const clone = element.cloneNode(true) as HTMLElement;
        clone.style.padding = '24px';
        clone.style.position = 'absolute';
        clone.style.left = '-9999px';
        clone.style.width = '800px';
        document.body.appendChild(clone);

        const canvas = await html2canvas(clone, {
          scale: 2,
          useCORS: true,
          backgroundColor: dark ? '#0f172a' : '#ffffff',
          logging: false,
        });

        document.body.removeChild(clone);

        const link = document.createElement('a');
        link.download = `${fileName}_${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
    setIsExporting(false);
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
        dark
          ? 'hover:bg-white/10 text-slate-400 hover:text-white'
          : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
      }`}
      title="Download as PNG"
    >
      {isExporting ? (
        <div className={`w-4 h-4 border-2 rounded-full animate-spin ${
          dark ? 'border-white border-t-transparent' : 'border-slate-400 border-t-transparent'
        }`} />
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      )}
    </button>
  );
};

export default CardExportButton;
