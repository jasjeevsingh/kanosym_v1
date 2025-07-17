import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer, Area } from 'recharts';
import AnalyticsPanel from './AnalyticsPanel';

interface Result {
  perturbed_value: number;
  portfolio_volatility_daily?: number;
  portfolio_volatility_annualized?: number;
  delta_vs_baseline?: number;
}

interface ResultsChartProps {
  data: {
    perturbation: string;
    asset: string;
    range_tested: number[];
    baseline_portfolio_volatility_daily?: number;
    baseline_portfolio_volatility_annualized?: number;
    results: Result[];
    analytics?: any;
    testType?: 'classical' | 'hybrid' | 'quantum';
    note?: string;
  };
}

const metricOptions = [
  { value: 'portfolio_volatility_daily', label: 'Portfolio Volatility (Daily)' },
  { value: 'portfolio_volatility_annualized', label: 'Portfolio Volatility (Annualized)' },
];

const CustomTooltip = ({ active, payload, label, selectedMetric }: any) => {
  if (active && payload && payload.length) {
    const value = payload[0].payload[selectedMetric];
    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 shadow-lg text-xs text-zinc-100">
        <div className="mb-1 font-semibold text-blue-400">{label.toFixed(3)}</div>
        <div className="flex items-center gap-2">
          <span className="text-green-400 font-bold">{metricOptions.find(opt => opt.value === selectedMetric)?.label}:</span>
          <span>{value !== undefined ? value.toFixed(4) : 'N/A'}</span>
        </div>
      </div>
    );
  }
  return null;
};

const getTestTypeLabel = (testType?: string) => {
  if (!testType) return 'Sensitivity Test Results';
  switch (testType) {
    case 'classical':
      return 'Classical Sensitivity Test Results';
    case 'hybrid':
      return 'Hybrid Sensitivity Test Results';
    case 'quantum':
      return 'Quantum Sensitivity Test Results';
    default:
      return 'Sensitivity Test Results';
  }
};

const ResultsChart: React.FC<ResultsChartProps> = ({ data }) => {
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<'portfolio_volatility_daily' | 'portfolio_volatility_annualized'>('portfolio_volatility_annualized');

  if (!data) return null;

  // Y-axis label
  const yLabel = metricOptions.find(opt => opt.value === selectedMetric)?.label || '';
  // Baseline value
  const baseline = selectedMetric === 'portfolio_volatility_daily'
    ? data.baseline_portfolio_volatility_daily
    : data.baseline_portfolio_volatility_annualized;
  // Sensitivity test type for title
  const testType = data.testType || data.analytics?.test_type;
  const title = getTestTypeLabel(testType);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      {/* Title */}
      <div className="w-full flex flex-col items-center justify-center mt-4 mb-1">
        <div className="text-3xl md:text-4xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight leading-tight text-center" style={{letterSpacing: '-0.01em'}}>
          {title}
        </div>
      </div>
      {/* Subtitle */}
      <div className="w-full flex flex-col items-center justify-center mb-3">
        <div className="text-base text-zinc-400 font-medium text-center">
          Perturbing <span className="font-bold text-blue-500">{data.perturbation}</span> for <span className="font-bold text-green-500">{data.asset}</span>
        </div>
        {data.note && (
          <div className="text-sm text-zinc-500 mt-2 text-center">
            {data.note}
          </div>
        )}
      </div>
      {/* Metric Selector & Analytics Button Row */}
      <div className="w-full max-w-3xl flex flex-row items-center justify-between gap-3 mb-3 px-1">
        <select
          className="bg-zinc-800 text-white border border-zinc-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
          value={selectedMetric}
          onChange={e => setSelectedMetric(e.target.value as 'portfolio_volatility_daily' | 'portfolio_volatility_annualized')}
          style={{ minWidth: 220 }}
        >
          {metricOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {data.analytics && (
          <button
            onClick={() => setShowAnalytics(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 shadow-md"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Analytics</span>
          </button>
        )}
      </div>
      {/* Chart with legend inside (top-right) */}
      <div className="w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-6 border border-zinc-200 dark:border-zinc-800">
        <ResponsiveContainer width="100%" height={380}>
          <LineChart data={data.results} margin={{ top: 24, right: 32, left: 16, bottom: 32 }}>
            {/* Grid */}
            <CartesianGrid strokeDasharray="4 4" stroke="#374151" vertical={false} />
            {/* X Axis */}
            <XAxis
              dataKey="perturbed_value"
              label={{ value: data.perturbation, position: 'insideBottom', offset: -18, style: { fill: '#64748b', fontWeight: 600, fontSize: 14 } }}
              tick={{ fill: '#64748b', fontSize: 13 }}
              tickFormatter={v => v.toFixed(2)}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
              padding={{ left: 10, right: 10 }}
            />
            {/* Y Axis */}
            <YAxis
              label={{ value: yLabel, angle: -90, position: 'insideLeft', style: { fill: '#64748b', fontWeight: 600, fontSize: 14 } }}
              tick={{ fill: '#64748b', fontSize: 13 }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
              domain={[0, 'auto']}
              padding={{ top: 10, bottom: 10 }}
            />
            {/* Tooltip */}
            <Tooltip content={props => <CustomTooltip {...props} selectedMetric={selectedMetric} />} cursor={{ stroke: '#60a5fa', strokeWidth: 1, opacity: 0.15 }} />
            {/* Baseline Reference Line */}
            {baseline !== undefined && (
              <ReferenceLine
                y={baseline}
                label={{ value: 'Baseline', position: 'left', fill: '#60a5fa', fontWeight: 700, fontSize: 13, dx: 8 }}
                stroke="#60a5fa"
                strokeDasharray="6 4"
                ifOverflow="extendDomain"
              />
            )}
            {/* Area fill under the line */}
            <Area
              type="monotone"
              dataKey={selectedMetric}
              stroke={"none"}
              fill="url(#colorMetric)"
              fillOpacity={0.18}
              isAnimationActive={true}
              legendType="none"
            />
            {/* Main Line */}
            <Line
              type="monotone"
              dataKey={selectedMetric}
              stroke="#06b6d4"
              strokeWidth={3}
              dot={{ r: 5, fill: '#fff', stroke: '#06b6d4', strokeWidth: 2, filter: 'drop-shadow(0 1px 4px #06b6d488)' }}
              activeDot={{ r: 7, fill: '#06b6d4', stroke: '#fff', strokeWidth: 2, filter: 'drop-shadow(0 2px 8px #06b6d4cc)' }}
              name={yLabel}
              isAnimationActive={true}
            />
            {/* Gradient for area fill */}
            <defs>
              <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            {/* Legend inside chart, top-right */}
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ top: 8, right: 24, fontSize: 15, color: '#06b6d4', fontWeight: 600 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {/* Analytics Panel */}
      <AnalyticsPanel
        isOpen={showAnalytics}
        onClose={() => setShowAnalytics(false)}
        analytics={data.analytics}
      />
    </div>
  );
};

export default ResultsChart;
