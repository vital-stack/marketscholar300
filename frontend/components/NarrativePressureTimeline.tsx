'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import CardExportButton from './CardExportButton';

// Dynamic import for ApexCharts (no SSR)
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface PriceDataPoint {
  date: string;
  price: number;
  volume?: number;
}

interface NarrativeEvent {
  date: string;
  headline: string;
  intensity: number; // 0-100
  type: 'FACTUAL_CATALYST' | 'NARRATIVE_TRAP' | 'MARKET_NOISE' | 'EARNINGS';
  priceImpact?: number;
}

interface NarrativePressureTimelineProps {
  ticker: string;
  priceData: PriceDataPoint[];
  narrativeEvents: NarrativeEvent[];
  earningsDates?: string[];
}

const NARRATIVE_COLORS = {
  FACTUAL_CATALYST: '#10b981',
  NARRATIVE_TRAP: '#ef4444',
  MARKET_NOISE: '#6b7280',
  EARNINGS: '#3b82f6',
};

const NarrativePressureTimeline: React.FC<NarrativePressureTimelineProps> = ({
  ticker,
  priceData,
  narrativeEvents,
  earningsDates = [],
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prepare price series data
  const priceSeries = priceData.map((d) => ({
    x: new Date(d.date).getTime(),
    y: d.price,
  }));

  // Prepare annotations for narrative events
  const pointAnnotations = narrativeEvents.map((event) => ({
    x: new Date(event.date).getTime(),
    y: priceData.find((p) => p.date === event.date)?.price || priceSeries[0]?.y || 0,
    marker: {
      size: 6 + (event.intensity / 100) * 8, // 6-14px based on intensity
      fillColor: NARRATIVE_COLORS[event.type],
      strokeColor: '#fff',
      strokeWidth: 2,
      shape: 'circle',
    },
    label: {
      text: event.type === 'EARNINGS' ? '📊' : '',
      borderColor: 'transparent',
      style: {
        background: 'transparent',
      },
    },
  }));

  // Earnings date vertical lines
  const xAxisAnnotations = earningsDates.map((date) => ({
    x: new Date(date).getTime(),
    strokeDashArray: 4,
    borderColor: '#3b82f6',
    label: {
      text: 'EARNINGS',
      borderColor: '#3b82f6',
      style: {
        color: '#fff',
        background: '#3b82f6',
        fontSize: '10px',
        fontWeight: 'bold',
      },
    },
  }));

  const chartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'area',
      height: 320,
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: false,
      },
      fontFamily: 'inherit',
    },
    colors: ['#6366f1'],
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: 'smooth',
      width: 2,
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.1,
        stops: [0, 100],
      },
    },
    xaxis: {
      type: 'datetime',
      labels: {
        style: {
          colors: '#64748b',
          fontSize: '11px',
        },
        datetimeFormatter: {
          month: 'MMM',
          day: 'dd',
        },
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: '#64748b',
          fontSize: '11px',
        },
        formatter: (value) => `$${value.toFixed(0)}`,
      },
    },
    grid: {
      borderColor: '#e2e8f0',
      strokeDashArray: 4,
      xaxis: {
        lines: {
          show: true,
        },
      },
    },
    annotations: {
      points: pointAnnotations,
      xaxis: xAxisAnnotations,
    },
    tooltip: {
      theme: 'light',
      x: {
        format: 'MMM dd, yyyy',
      },
      y: {
        formatter: (value) => `$${value.toFixed(2)}`,
      },
    },
  };

  const series = [
    {
      name: ticker,
      data: priceSeries,
    },
  ];

  // Calculate narrative pressure metrics
  const totalPressure = narrativeEvents.reduce((sum, e) => sum + e.intensity, 0);
  const avgPressure = narrativeEvents.length > 0 ? totalPressure / narrativeEvents.length : 0;
  const factualCount = narrativeEvents.filter((e) => e.type === 'FACTUAL_CATALYST').length;
  const trapCount = narrativeEvents.filter((e) => e.type === 'NARRATIVE_TRAP').length;

  if (!mounted) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="h-80 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div id="narrative-pressure-chart" className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Narrative Pressure Timeline</h3>
            <p className="text-xs text-slate-500">Price action with narrative event overlays</p>
          </div>
        </div>
        <CardExportButton elementId="narrative-pressure-chart" fileName={`${ticker}_pressure_timeline`} />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-xs text-slate-600">Factual Catalyst</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-xs text-slate-600">Narrative Trap</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-slate-500" />
          <span className="text-xs text-slate-600">Market Noise</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-xs text-slate-600">Earnings Anchor</span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        <Chart options={chartOptions} series={series} type="area" height="100%" />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100">
        <div className="text-center">
          <p className="text-2xl font-black text-slate-900">{narrativeEvents.length}</p>
          <p className="text-[10px] text-slate-500 uppercase">Total Events</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-black text-emerald-500">{factualCount}</p>
          <p className="text-[10px] text-slate-500 uppercase">Factual</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-black text-red-500">{trapCount}</p>
          <p className="text-[10px] text-slate-500 uppercase">Traps</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-black text-indigo-500">{avgPressure.toFixed(0)}</p>
          <p className="text-[10px] text-slate-500 uppercase">Avg Intensity</p>
        </div>
      </div>
    </div>
  );
};

export default NarrativePressureTimeline;
