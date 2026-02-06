'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { SentimentDataPoint } from '@/types';

interface SentimentChartProps {
  data: SentimentDataPoint[];
}

const SentimentChart: React.FC<SentimentChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400">
        No sentiment data available
      </div>
    );
  }

  const formattedData = data.map((point) => ({
    ...point,
    date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="sentimentGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
            domain={[-100, 100]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              border: 'none',
              borderRadius: '8px',
              padding: '12px',
            }}
            labelStyle={{ color: '#94a3b8', fontSize: '10px', marginBottom: '4px' }}
            itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
            formatter={(value: number) => [`${value}`, 'Sentiment']}
          />
          <Area
            type="monotone"
            dataKey="avgSentiment"
            stroke="#4f46e5"
            strokeWidth={2}
            fill="url(#sentimentGradient)"
          />
          {/* Volume bars */}
          <Line
            type="monotone"
            dataKey="volume"
            stroke="#94a3b8"
            strokeWidth={1}
            strokeDasharray="3 3"
            dot={false}
            yAxisId="right"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SentimentChart;
