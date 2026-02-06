'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import CardExportButton from './CardExportButton';

// Dynamic import for ApexCharts (no SSR)
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface DayActivity {
  date: string;
  volumeAnomaly: number; // -100 to +100 (% deviation from avg)
  priceAnomaly: number; // -100 to +100 (% deviation from avg)
  optionsActivity: number; // 0-100 (unusual options flow)
  shortInterest: number; // 0-100 (abnormal short activity)
  darkPoolVolume: number; // 0-100 (dark pool percentage)
  insiderActivity: boolean;
}

interface PrePublicationRadarProps {
  ticker: string;
  publicationDate: string;
  activityData: DayActivity[];
  overallRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  frontRunningScore: number; // 0-100
  manipulationIndicators: string[];
}

const RISK_COLORS = {
  LOW: { bg: '#10b981', light: '#d1fae5' },
  MODERATE: { bg: '#f59e0b', light: '#fef3c7' },
  HIGH: { bg: '#ef4444', light: '#fee2e2' },
  CRITICAL: { bg: '#7c3aed', light: '#ede9fe' },
};

const PrePublicationRadar: React.FC<PrePublicationRadarProps> = ({
  ticker,
  publicationDate,
  activityData,
  overallRisk,
  frontRunningScore,
  manipulationIndicators,
}) => {
  const [mounted, setMounted] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayActivity | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Generate heatmap data (30-day lookback)
  // Rows: Activity types, Columns: Days
  const categories = ['Volume', 'Price', 'Options', 'Short Int.', 'Dark Pool'];

  const getIntensityColor = (value: number): string => {
    const absValue = Math.abs(value);
    if (absValue < 20) return '#f1f5f9'; // Neutral
    if (absValue < 40) return value > 0 ? '#bbf7d0' : '#fecaca'; // Slight
    if (absValue < 60) return value > 0 ? '#86efac' : '#fca5a5'; // Moderate
    if (absValue < 80) return value > 0 ? '#4ade80' : '#f87171'; // High
    return value > 0 ? '#22c55e' : '#ef4444'; // Extreme
  };

  // Prepare heatmap series for ApexCharts
  const heatmapSeries = categories.map((category, catIndex) => ({
    name: category,
    data: activityData.map((day, dayIndex) => {
      let value = 0;
      switch (catIndex) {
        case 0: value = day.volumeAnomaly; break;
        case 1: value = day.priceAnomaly; break;
        case 2: value = day.optionsActivity; break;
        case 3: value = day.shortInterest; break;
        case 4: value = day.darkPoolVolume; break;
      }
      return {
        x: `D-${activityData.length - dayIndex}`,
        y: value,
      };
    }),
  }));

  const heatmapOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'heatmap',
      height: 200,
      toolbar: { show: false },
      fontFamily: 'inherit',
      events: {
        dataPointSelection: (_event, _chartContext, config) => {
          const dayIndex = config.dataPointIndex;
          if (activityData[dayIndex]) {
            setSelectedDay(activityData[dayIndex]);
          }
        },
      },
    },
    plotOptions: {
      heatmap: {
        shadeIntensity: 0.5,
        colorScale: {
          ranges: [
            { from: -100, to: -60, color: '#ef4444', name: 'Extreme Bearish' },
            { from: -60, to: -30, color: '#f87171', name: 'Bearish' },
            { from: -30, to: -10, color: '#fca5a5', name: 'Slight Bearish' },
            { from: -10, to: 10, color: '#e2e8f0', name: 'Neutral' },
            { from: 10, to: 30, color: '#bbf7d0', name: 'Slight Bullish' },
            { from: 30, to: 60, color: '#4ade80', name: 'Bullish' },
            { from: 60, to: 100, color: '#22c55e', name: 'Extreme Bullish' },
          ],
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    xaxis: {
      labels: {
        style: {
          colors: '#64748b',
          fontSize: '10px',
        },
        rotate: -45,
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: '#64748b',
          fontSize: '10px',
        },
      },
    },
    grid: {
      padding: {
        right: 10,
      },
    },
    tooltip: {
      y: {
        formatter: (value) => `${value > 0 ? '+' : ''}${value.toFixed(0)}%`,
      },
    },
  };

  // Radar chart for multi-dimensional risk
  const radarOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'radar',
      height: 250,
      toolbar: { show: false },
      fontFamily: 'inherit',
    },
    colors: [RISK_COLORS[overallRisk].bg],
    xaxis: {
      categories: ['Volume Spike', 'Price Anomaly', 'Options Flow', 'Short Interest', 'Dark Pool', 'Timing'],
      labels: {
        style: {
          colors: '#64748b',
          fontSize: '10px',
        },
      },
    },
    yaxis: {
      show: false,
      min: 0,
      max: 100,
    },
    plotOptions: {
      radar: {
        size: 80,
        polygons: {
          strokeColors: '#e2e8f0',
          fill: {
            colors: ['#f8fafc', '#f1f5f9'],
          },
        },
      },
    },
    fill: {
      opacity: 0.3,
    },
    stroke: {
      width: 2,
    },
    markers: {
      size: 4,
      colors: [RISK_COLORS[overallRisk].bg],
      strokeColors: '#fff',
      strokeWidth: 2,
    },
    tooltip: {
      y: {
        formatter: (value) => `${value.toFixed(0)}%`,
      },
    },
  };

  // Calculate aggregate radar values
  const avgVolume = activityData.reduce((sum, d) => sum + Math.abs(d.volumeAnomaly), 0) / activityData.length;
  const avgPrice = activityData.reduce((sum, d) => sum + Math.abs(d.priceAnomaly), 0) / activityData.length;
  const avgOptions = activityData.reduce((sum, d) => sum + d.optionsActivity, 0) / activityData.length;
  const avgShort = activityData.reduce((sum, d) => sum + d.shortInterest, 0) / activityData.length;
  const avgDarkPool = activityData.reduce((sum, d) => sum + d.darkPoolVolume, 0) / activityData.length;
  const insiderDays = activityData.filter((d) => d.insiderActivity).length;
  const timingScore = (insiderDays / activityData.length) * 100;

  const radarSeries = [
    {
      name: 'Risk Score',
      data: [avgVolume, avgPrice, avgOptions, avgShort, avgDarkPool, timingScore],
    },
  ];

  // Count suspicious days
  const suspiciousDays = activityData.filter(
    (d) =>
      Math.abs(d.volumeAnomaly) > 50 ||
      Math.abs(d.priceAnomaly) > 30 ||
      d.optionsActivity > 70 ||
      d.insiderActivity
  ).length;

  if (!mounted) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="h-96 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div id="pre-publication-radar" className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Pre-Publication Activity Radar</h3>
            <p className="text-xs text-slate-500">
              Pre-Publication Activity Monitoring |
              <a href="#patent-info" className="text-rose-600 hover:text-rose-700 ml-1 underline">Patent 63/971,470</a>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="px-3 py-1.5 text-xs font-bold uppercase rounded-lg"
            style={{
              backgroundColor: RISK_COLORS[overallRisk].light,
              color: RISK_COLORS[overallRisk].bg,
            }}
          >
            {overallRisk} RISK
          </span>
          <CardExportButton elementId="pre-publication-radar" fileName={`${ticker}_prepub_radar`} />
        </div>
      </div>

      {/* Risk Score Banner */}
      <div
        className="p-4 rounded-xl mb-6"
        style={{ backgroundColor: RISK_COLORS[overallRisk].light }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold" style={{ color: RISK_COLORS[overallRisk].bg }}>
              Front-Running Probability Score
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Publication: {new Date(publicationDate).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-black" style={{ color: RISK_COLORS[overallRisk].bg }}>
              {frontRunningScore}%
            </p>
            <p className="text-[10px] text-slate-500 uppercase">{suspiciousDays} suspicious days</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Activity Heatmap */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">30-Day Activity Heatmap</h4>
          <div className="h-52">
            <Chart options={heatmapOptions} series={heatmapSeries} type="heatmap" height="100%" />
          </div>
          <div className="flex justify-center gap-4 mt-2 text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-red-500 rounded" /> Bearish Anomaly
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-slate-200 rounded" /> Normal
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-green-500 rounded" /> Bullish Anomaly
            </span>
          </div>
        </div>

        {/* Right: Radar Chart */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Multi-Dimensional Risk Radar</h4>
          <div className="h-64">
            <Chart options={radarOptions} series={radarSeries} type="radar" height="100%" />
          </div>
        </div>
      </div>

      {/* Manipulation Indicators */}
      {manipulationIndicators.length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-200">
          <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Detected Manipulation Indicators
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {manipulationIndicators.map((indicator, idx) => (
              <div key={idx} className="flex items-start gap-2 p-3 bg-red-50 rounded-lg">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 flex-shrink-0" />
                <span className="text-sm text-red-800">{indicator}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Day Detail */}
      {selectedDay && (
        <div className="mt-6 pt-6 border-t border-slate-200">
          <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">
            Day Detail: {new Date(selectedDay.date).toLocaleDateString()}
          </h4>
          <div className="grid grid-cols-5 gap-4">
            <div className="p-3 bg-slate-50 rounded-lg text-center">
              <p className={`text-xl font-black ${selectedDay.volumeAnomaly > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {selectedDay.volumeAnomaly > 0 ? '+' : ''}{selectedDay.volumeAnomaly}%
              </p>
              <p className="text-[10px] text-slate-500 uppercase">Volume</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg text-center">
              <p className={`text-xl font-black ${selectedDay.priceAnomaly > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {selectedDay.priceAnomaly > 0 ? '+' : ''}{selectedDay.priceAnomaly}%
              </p>
              <p className="text-[10px] text-slate-500 uppercase">Price</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg text-center">
              <p className="text-xl font-black text-amber-500">{selectedDay.optionsActivity}</p>
              <p className="text-[10px] text-slate-500 uppercase">Options</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg text-center">
              <p className="text-xl font-black text-purple-500">{selectedDay.shortInterest}</p>
              <p className="text-[10px] text-slate-500 uppercase">Short Int.</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg text-center">
              <p className="text-xl font-black text-blue-500">{selectedDay.darkPoolVolume}</p>
              <p className="text-[10px] text-slate-500 uppercase">Dark Pool</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrePublicationRadar;
