'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import CardExportButton from './CardExportButton';

// Dynamic import for ApexCharts (no SSR)
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface NarrativeDecayChartProps {
  ticker: string;
  initialEnergy: number; // E₀ (0-100)
  decayRate: number; // λ (lambda)
  halfLifeDays: number; // t½
  currentDay: number; // Current position on decay curve
  narrativeStatus: 'ACTIVE' | 'EXHAUSTED' | 'FAILED' | 'VALIDATED';
}

const STATUS_COLORS = {
  ACTIVE: '#10b981',
  EXHAUSTED: '#f59e0b',
  FAILED: '#ef4444',
  VALIDATED: '#3b82f6',
};

const NarrativeDecayChart: React.FC<NarrativeDecayChartProps> = ({
  ticker,
  initialEnergy = 100,
  decayRate = 0.1,
  halfLifeDays = 7,
  currentDay = 3,
  narrativeStatus = 'ACTIVE',
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Generate decay curve data: E(t) = E₀ · e^(-λt)
  const maxDays = Math.max(halfLifeDays * 4, 30);
  const decayCurve = Array.from({ length: maxDays + 1 }, (_, t) => ({
    x: t,
    y: initialEnergy * Math.exp(-decayRate * t),
  }));

  // Calculate current energy
  const currentEnergy = initialEnergy * Math.exp(-decayRate * currentDay);

  // Calculate half-life energy (should be E₀/2)
  const halfLifeEnergy = initialEnergy / 2;

  // NPI threshold levels
  const exhaustionThreshold = initialEnergy * 0.1; // 10% of initial

  const chartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'area',
      height: 280,
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: false,
      },
      fontFamily: 'inherit',
    },
    colors: [STATUS_COLORS[narrativeStatus]],
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: 'smooth',
      width: 3,
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.5,
        opacityTo: 0.1,
        stops: [0, 100],
      },
    },
    xaxis: {
      type: 'numeric',
      title: {
        text: 'Days Since Narrative Peak',
        style: {
          color: '#64748b',
          fontSize: '11px',
          fontWeight: 500,
        },
      },
      labels: {
        style: {
          colors: '#64748b',
          fontSize: '11px',
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
      min: 0,
      max: initialEnergy + 10,
      title: {
        text: 'Narrative Energy (NPI)',
        style: {
          color: '#64748b',
          fontSize: '11px',
          fontWeight: 500,
        },
      },
      labels: {
        style: {
          colors: '#64748b',
          fontSize: '11px',
        },
        formatter: (value) => value.toFixed(0),
      },
    },
    grid: {
      borderColor: '#e2e8f0',
      strokeDashArray: 4,
    },
    annotations: {
      // Half-life marker (vertical line)
      xaxis: [
        {
          x: halfLifeDays,
          strokeDashArray: 4,
          borderColor: '#6366f1',
          label: {
            text: `t½ = ${halfLifeDays}d`,
            borderColor: '#6366f1',
            style: {
              color: '#fff',
              background: '#6366f1',
              fontSize: '10px',
              fontWeight: 'bold',
            },
            position: 'top',
          },
        },
      ],
      // Half-life energy line (horizontal)
      yaxis: [
        {
          y: halfLifeEnergy,
          strokeDashArray: 4,
          borderColor: '#94a3b8',
          label: {
            text: 'E₀/2',
            borderColor: 'transparent',
            style: {
              color: '#64748b',
              background: 'transparent',
              fontSize: '10px',
            },
          },
        },
        {
          y: exhaustionThreshold,
          strokeDashArray: 2,
          borderColor: '#ef4444',
          label: {
            text: 'EXHAUSTION',
            borderColor: 'transparent',
            style: {
              color: '#ef4444',
              background: 'transparent',
              fontSize: '10px',
            },
          },
        },
      ],
      // Current position marker
      points: [
        {
          x: currentDay,
          y: currentEnergy,
          marker: {
            size: 8,
            fillColor: STATUS_COLORS[narrativeStatus],
            strokeColor: '#fff',
            strokeWidth: 3,
          },
          label: {
            text: `NOW: ${currentEnergy.toFixed(0)}`,
            borderColor: STATUS_COLORS[narrativeStatus],
            style: {
              color: '#fff',
              background: STATUS_COLORS[narrativeStatus],
              fontSize: '11px',
              fontWeight: 'bold',
            },
            offsetY: -15,
          },
        },
      ],
    },
    tooltip: {
      theme: 'light',
      x: {
        formatter: (value) => `Day ${value}`,
      },
      y: {
        formatter: (value) => `NPI: ${value.toFixed(1)}`,
      },
    },
  };

  const series = [
    {
      name: 'Narrative Energy',
      data: decayCurve,
    },
  ];

  // Calculate metrics
  const energyRemaining = (currentEnergy / initialEnergy) * 100;
  const daysToExhaustion = -Math.log(0.1) / decayRate; // When NPI reaches 10%
  const daysRemaining = Math.max(0, daysToExhaustion - currentDay);

  if (!mounted) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="h-72 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div id="narrative-decay-chart" className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Narrative Decay Half-Life</h3>
            <p className="text-xs text-slate-500">E(t) = E₀ · e^(-λt) | Patent 63/971,478</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="px-2 py-1 text-[10px] font-bold uppercase rounded"
            style={{
              backgroundColor: `${STATUS_COLORS[narrativeStatus]}20`,
              color: STATUS_COLORS[narrativeStatus],
            }}
          >
            {narrativeStatus}
          </span>
          <CardExportButton elementId="narrative-decay-chart" fileName={`${ticker}_decay_chart`} />
        </div>
      </div>

      {/* Formula Box */}
      <div className="bg-slate-50 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="font-mono text-sm text-slate-700">
            <span className="text-slate-400">NPI(t) = </span>
            <span className="font-bold">{initialEnergy}</span>
            <span className="text-slate-400"> × e^(</span>
            <span className="font-bold text-red-500">-{decayRate.toFixed(3)}</span>
            <span className="text-slate-400"> × t)</span>
          </div>
          <div className="text-sm">
            <span className="text-slate-500">λ = </span>
            <span className="font-bold text-indigo-600">{decayRate.toFixed(3)}</span>
            <span className="text-slate-500"> | t½ = ln(2)/λ = </span>
            <span className="font-bold text-indigo-600">{halfLifeDays}</span>
            <span className="text-slate-500"> days</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-72">
        <Chart options={chartOptions} series={series} type="area" height="100%" />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100">
        <div className="text-center">
          <p className="text-2xl font-black text-slate-900">{currentEnergy.toFixed(0)}</p>
          <p className="text-[10px] text-slate-500 uppercase">Current NPI</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-black text-indigo-500">{energyRemaining.toFixed(0)}%</p>
          <p className="text-[10px] text-slate-500 uppercase">Energy Left</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-black text-amber-500">{halfLifeDays}d</p>
          <p className="text-[10px] text-slate-500 uppercase">Half-Life</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-black text-red-500">{daysRemaining.toFixed(0)}d</p>
          <p className="text-[10px] text-slate-500 uppercase">To Exhaustion</p>
        </div>
      </div>
    </div>
  );
};

export default NarrativeDecayChart;
