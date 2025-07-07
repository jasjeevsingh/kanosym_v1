// App.tsx
import React from 'react';
import PortfolioInput from './components/PortfolioInput';
import PerturbControls from './components/PerturbControls';
import ResultsChart from './components/ResultsChart';
import NoiraPanel from './components/NoiraPanel';

export default function App() {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">KANOSYM Sensitivity Testing MVP</h1>
      <PortfolioInput />
      <PerturbControls />
      <ResultsChart />
      <NoiraPanel />
    </div>
  );
}
