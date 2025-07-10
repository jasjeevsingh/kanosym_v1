import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from 'recharts';
import AnalyticsPanel from './AnalyticsPanel';

interface Result {
  perturbed_value: number;
  sharpe: number;
  delta_vs_baseline?: number;
}

interface ResultsChartProps {
  data: {
    perturbation: string;
    asset: string;
    range_tested: number[];
    baseline_sharpe: number;
    results: Result[];
    analytics?: any;
  };
}

const ResultsChart: React.FC<ResultsChartProps> = ({ data }) => {
  const [showAnalytics, setShowAnalytics] = useState(false);

  if (!data) return null;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <div className="flex items-center justify-between w-full mb-4">
        <div className="text-lg font-bold">Sensitivity Test Results</div>
        {data.analytics && (
          <button
            onClick={() => setShowAnalytics(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Analytics</span>
          </button>
        )}
      </div>
      <div className="mb-2 text-sm text-zinc-400">
        Perturbing <span className="font-bold">{data.perturbation}</span> for <span className="font-bold">{data.asset}</span>
      </div>
      <ResponsiveContainer width="100%" height={360}>
        <LineChart data={data.results} margin={{ top: 16, right: 32, left: 8, bottom: 16 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="perturbed_value" label={{ value: data.perturbation, position: 'insideBottom', offset: -8 }} />
          <YAxis label={{ value: 'Sharpe Ratio', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          <ReferenceLine y={data.baseline_sharpe} label="Baseline" stroke="#8884d8" strokeDasharray="3 3" />
          <Line type="monotone" dataKey="sharpe" stroke="#00b894" strokeWidth={2} dot={{ r: 3 }} name="Sharpe Ratio" />
        </LineChart>
      </ResponsiveContainer>
      
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
