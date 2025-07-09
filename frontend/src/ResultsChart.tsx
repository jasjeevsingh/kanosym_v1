import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from 'recharts';

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
  };
}

const ResultsChart: React.FC<ResultsChartProps> = ({ data }) => {
  if (!data) return null;
  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <div className="text-lg font-bold mb-2">Sensitivity Test Results</div>
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
    </div>
  );
};

export default ResultsChart;
