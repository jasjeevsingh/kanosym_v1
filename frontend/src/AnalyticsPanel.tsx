import React from 'react';

interface AnalyticsData {
  mode: string;
  performance_metrics: {
    total_execution_time: number;
    throughput: number;
    steps_processed: number;
    memory_usage_mb: number;
    cpu_usage_percent: number;
  };
  statistical_metrics: {
    confidence_interval_95: [number, number];
    coefficient_of_variation: number;
    skewness: number;
    kurtosis: number;
    standard_error: number;
    median_volatility?: number;
    iqr_volatility?: number;
    sample_size?: number;
  };
  quantum_metrics?: {
    circuits_per_second: number;
    shots_per_second: number;
    circuit_depth: number;
    total_qubits: number;
    quantum_operations: number;
    enhancement_factor: number;
    quantum_advantage_ratio: number;
  };
  classical_metrics?: {
    simulations_per_second: number;
    iterations_per_second: number;
    convergence_rate: number;
    monte_carlo_efficiency: number;
    standard_error: number;
  };
  hybrid_metrics?: {
    quantum_classical_ratio: number;
    hybrid_overhead: number;
    synergy_factor: number;
    efficiency_gain_vs_classical: number;
    efficiency_gain_vs_quantum: number;
    optimal_hybrid_ratio: number;
    mean_quantum_correction: number;
    max_quantum_correction: number;
    fraction_significant_correction: number;
    hybrid_baseline_vs_quantum: number;
    gp_interpolation_mse: number;
    gp_kernel_length_scale: number;
    gp_kernel_variance: number;
    curve_shape_change: number;
  };
  sensitivity_metrics?: {
    max_sensitivity_point: number;
    curve_steepness: number;
    risk_return_ratio: number;
    portfolio_beta: number;
    var_95: number;
    expected_shortfall: number;
    information_ratio: number;
    sortino_ratio: number;
    calmar_ratio: number;
    max_drawdown: number;
    baseline_portfolio_volatility_daily?: number;
    portfolio_volatility_range?: [number, number];
    percentile_95_volatility?: number;
  };
}

interface AnalyticsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  analytics: AnalyticsData | null;
}

const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ isOpen, onClose, analytics }) => {
  if (!isOpen || !analytics) return null;

  const formatNumber = (value: number, decimals: number = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  const formatTime = (seconds: number) => {
    if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
    return `${seconds.toFixed(3)}s`;
  };



  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'quantum': return 'text-blue-400';
      case 'classical': return 'text-zinc-400';
      case 'hybrid': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  const getModeBgColor = (mode: string) => {
    switch (mode) {
      case 'quantum': return 'bg-blue-900/20 border-blue-700/30';
      case 'classical': return 'bg-zinc-900/20 border-zinc-700/30';
      case 'hybrid': return 'bg-purple-900/20 border-purple-700/30';
      default: return 'bg-gray-900/20 border-gray-700/30';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-11/12 max-w-6xl h-5/6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-700">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-white">Analytics Dashboard</h2>
            <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${getModeBgColor(analytics.mode)} ${getModeColor(analytics.mode)}`}>
              {analytics.mode}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto max-h-[70vh] p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            
            {/* Performance Metrics */}
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Performance Metrics
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Execution Time:</span>
                  <span className="text-white font-mono">{formatTime(analytics.performance_metrics.total_execution_time)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Throughput:</span>
                  <span className="text-white font-mono">{formatNumber(analytics.performance_metrics.throughput, 1)} steps/s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Steps Processed:</span>
                  <span className="text-white font-mono">{analytics.performance_metrics.steps_processed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Memory Usage:</span>
                  <span className="text-white font-mono">{formatNumber(analytics.performance_metrics.memory_usage_mb, 1)} MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">CPU Usage:</span>
                  <span className="text-white font-mono">{formatNumber(analytics.performance_metrics.cpu_usage_percent, 1)}%</span>
                </div>
              </div>
            </div>

            {/* Statistical Analysis */}
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Statistical Analysis
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-zinc-400">95% CI:</span>
                  <span className="text-white font-mono">
                    ({formatNumber(analytics.statistical_metrics.confidence_interval_95[0], 4)}, {formatNumber(analytics.statistical_metrics.confidence_interval_95[1], 4)})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Coeff. of Variation:</span>
                  <span className="text-white font-mono">{formatNumber(analytics.statistical_metrics.coefficient_of_variation, 4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Skewness:</span>
                  <span className="text-white font-mono">{formatNumber(analytics.statistical_metrics.skewness, 4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Kurtosis:</span>
                  <span className="text-white font-mono">{formatNumber(analytics.statistical_metrics.kurtosis, 4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Standard Error:</span>
                  <span className="text-white font-mono">{formatNumber(analytics.statistical_metrics.standard_error, 4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Median Volatility:</span>
                  <span className="text-white font-mono">{analytics.statistical_metrics?.median_volatility !== undefined ? formatNumber(analytics.statistical_metrics.median_volatility, 4) : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Interquartile Range (IQR):</span>
                  <span className="text-white font-mono">{analytics.statistical_metrics?.iqr_volatility !== undefined ? formatNumber(analytics.statistical_metrics.iqr_volatility, 4) : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Sample Size:</span>
                  <span className="text-white font-mono">{analytics.statistical_metrics?.sample_size ?? 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Mode-Specific Metrics */}
            {analytics.quantum_metrics && (
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Quantum Metrics
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Computation Time:</span>
                    <span className="text-white font-mono">{analytics.performance_metrics?.total_execution_time ? `${analytics.performance_metrics.total_execution_time.toFixed(3)} s` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Circuits/s:</span>
                    <span className="text-white font-mono">{formatNumber(analytics.quantum_metrics.circuits_per_second, 1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Shots/s:</span>
                    <span className="text-white font-mono">{formatNumber(analytics.quantum_metrics.shots_per_second, 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Circuit Depth:</span>
                    <span className="text-white font-mono">{analytics.quantum_metrics.circuit_depth}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Total Qubits:</span>
                    <span className="text-white font-mono">{analytics.quantum_metrics.total_qubits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Quantum Operations:</span>
                    <span className="text-white font-mono">{formatNumber(analytics.quantum_metrics.quantum_operations, 0)}</span>
                  </div>
                </div>
              </div>
            )}

            {analytics.classical_metrics && (
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                  Classical Metrics
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Simulations/s:</span>
                    <span className="text-white font-mono">{formatNumber(analytics.classical_metrics.simulations_per_second, 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Iterations/s:</span>
                    <span className="text-white font-mono">{formatNumber(analytics.classical_metrics.iterations_per_second, 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Convergence Rate:</span>
                    <span className="text-white font-mono">{formatNumber(analytics.classical_metrics.convergence_rate, 4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">MC Efficiency:</span>
                    <span className="text-white font-mono">{formatNumber(analytics.classical_metrics.monte_carlo_efficiency, 4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Standard Error:</span>
                    <span className="text-white font-mono">{formatNumber(analytics.classical_metrics.standard_error, 4)}</span>
                  </div>
                </div>
              </div>
            )}

            {analytics.hybrid_metrics && (
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Hybrid Metrics
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Average Quantum Correction:</span>
                    <span className="text-white font-mono">{formatNumber(analytics.hybrid_metrics.mean_quantum_correction, 6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Max Quantum Correction:</span>
                    <span className="text-white font-mono">{formatNumber(analytics.hybrid_metrics.max_quantum_correction, 6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Scenarios with Significant Quantum Impact:</span>
                    <span className="text-white font-mono">{(analytics.hybrid_metrics.fraction_significant_correction * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Hybrid vs Quantum Baseline Agreement:</span>
                    <span className="text-white font-mono">{formatNumber(analytics.hybrid_metrics.hybrid_baseline_vs_quantum, 6)}</span>
                  </div>
                  <div className="flex justify-between" title="Mean squared error between GP fit and quantum-calibrated points (lower is better)">
                    <span className="text-zinc-400">Quantum Correction Fit Error (MSE):</span>
                    <span className="text-white font-mono">{formatNumber(analytics.hybrid_metrics.gp_interpolation_mse, 6)}</span>
                  </div>
                  <div className="flex justify-between" title="Length scale parameter of the GP kernel (higher = smoother correction)">
                    <span className="text-zinc-400">Quantum Correction Surface Smoothness (Length Scale):</span>
                    <span className="text-white font-mono">{formatNumber(analytics.hybrid_metrics.gp_kernel_length_scale, 4)}</span>
                  </div>
                  <div className="flex justify-between" title="Variance parameter of the GP kernel (higher = more variable correction)">
                    <span className="text-zinc-400">Quantum Correction Surface Smoothness (Variance):</span>
                    <span className="text-white font-mono">{formatNumber(analytics.hybrid_metrics.gp_kernel_variance, 4)}</span>
                  </div>
                  <div className="flex justify-between" title="Change in number of extrema (peaks/valleys) in the sensitivity curve after quantum correction">
                    <span className="text-zinc-400">Change in Sensitivity Curve Shape:</span>
                    <span className="text-white font-mono">{analytics.hybrid_metrics.curve_shape_change}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Sensitivity Metrics - Risk Only */}
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Sensitivity Metrics
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Baseline Portfolio Volatility:</span>
                  <span className="text-white font-mono">{analytics.sensitivity_metrics?.baseline_portfolio_volatility_daily?.toFixed(4) ?? 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Volatility Range:</span>
                  <span className="text-white font-mono">
                    {analytics.sensitivity_metrics?.portfolio_volatility_range ? `${analytics.sensitivity_metrics.portfolio_volatility_range[0].toFixed(4)} - ${analytics.sensitivity_metrics.portfolio_volatility_range[1].toFixed(4)}` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Max Sensitivity Point:</span>
                  <span className="text-white font-mono">{analytics.sensitivity_metrics?.max_sensitivity_point?.toFixed(4) ?? 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Curve Steepness:</span>
                  <span className="text-white font-mono">{analytics.sensitivity_metrics?.curve_steepness?.toFixed(4) ?? 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">95th Percentile Volatility:</span>
                  <span className="text-white font-mono">{analytics.sensitivity_metrics?.percentile_95_volatility !== undefined ? analytics.sensitivity_metrics.percentile_95_volatility.toFixed(4) : 'N/A'}</span>
                </div>
              </div>
            </div>
            {/* Removed note about Sharpe ratios being near zero */}

            {/* Summary Insights */}
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 lg:col-span-2 xl:col-span-3">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Key Insights
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-zinc-700/50 rounded p-3">
                  <div className="text-sm text-zinc-400 mb-1">Performance</div>
                  <div className="text-white font-medium">
                    {analytics.performance_metrics.throughput > 10 ? 'High' : analytics.performance_metrics.throughput > 5 ? 'Medium' : 'Low'} throughput
                  </div>
                </div>
                <div className="bg-zinc-700/50 rounded p-3">
                  <div className="text-sm text-zinc-400 mb-1">Efficiency</div>
                  <div className="text-white font-medium">
                    {analytics.performance_metrics.memory_usage_mb < 100 ? 'Low' : analytics.performance_metrics.memory_usage_mb < 500 ? 'Medium' : 'High'} memory usage
                  </div>
                </div>
                <div className="bg-zinc-700/50 rounded p-3">
                  <div className="text-sm text-zinc-400 mb-1">Statistical Quality</div>
                  <div className="text-white font-medium">
                    {analytics.statistical_metrics.coefficient_of_variation < 0.1 ? 'Excellent' : analytics.statistical_metrics.coefficient_of_variation < 0.2 ? 'Good' : 'Fair'} precision
                  </div>
                </div>
                
                {/* Classical-specific insights */}
                {analytics.mode === 'classical' && analytics.classical_metrics && (
                  <>
                    <div className="bg-zinc-700/50 rounded p-3">
                      <div className="text-sm text-zinc-400 mb-1">Monte Carlo Convergence</div>
                      <div className="text-white font-medium">
                        {analytics.classical_metrics.convergence_rate > 0.95 ? 'Excellent' : analytics.classical_metrics.convergence_rate > 0.9 ? 'Good' : 'Fair'} convergence
                      </div>
                    </div>
                    <div className="bg-zinc-700/50 rounded p-3">
                      <div className="text-sm text-zinc-400 mb-1">Simulation Efficiency</div>
                      <div className="text-white font-medium">
                        {analytics.classical_metrics.monte_carlo_efficiency > 0.8 ? 'High' : analytics.classical_metrics.monte_carlo_efficiency > 0.5 ? 'Medium' : 'Low'} efficiency
                      </div>
                    </div>
                    <div className="bg-zinc-700/50 rounded p-3">
                      <div className="text-sm text-zinc-400 mb-1">Error Estimation</div>
                      <div className="text-white font-medium">
                        {analytics.classical_metrics.standard_error < 0.01 ? 'Excellent' : analytics.classical_metrics.standard_error < 0.05 ? 'Good' : 'Fair'} error bounds
                      </div>
                    </div>
                  </>
                )}

                {/* Quantum-specific insights */}
                {analytics.mode === 'quantum' && analytics.quantum_metrics && (
                  <>
                    <div className="bg-zinc-700/50 rounded p-3">
                      <div className="text-sm text-zinc-400 mb-1">Quantum Advantage</div>
                      <div className="text-white font-medium">
                        {analytics.quantum_metrics.enhancement_factor > 1.1 ? 'Significant' : analytics.quantum_metrics.enhancement_factor > 1.05 ? 'Moderate' : 'Minimal'} enhancement
                      </div>
                    </div>
                    <div className="bg-zinc-700/50 rounded p-3">
                      <div className="text-sm text-zinc-400 mb-1">Circuit Complexity</div>
                      <div className="text-white font-medium">
                        {analytics.quantum_metrics.circuit_depth > 10 ? 'High' : analytics.quantum_metrics.circuit_depth > 5 ? 'Medium' : 'Low'} complexity
                      </div>
                    </div>
                    <div className="bg-zinc-700/50 rounded p-3">
                      <div className="text-sm text-zinc-400 mb-1">Quantum Operations</div>
                      <div className="text-white font-medium">
                        {analytics.quantum_metrics.quantum_operations > 1000 ? 'High' : analytics.quantum_metrics.quantum_operations > 100 ? 'Medium' : 'Low'} operations
                      </div>
                    </div>
                  </>
                )}

                {/* Hybrid-specific insights */}
                {analytics.mode === 'hybrid' && analytics.hybrid_metrics && (
                  <>
                    <div className="bg-zinc-700/50 rounded p-3">
                      <div className="text-sm text-zinc-400 mb-1">Quantum Correction Quality</div>
                      <div className="text-white font-medium">
                        {analytics.hybrid_metrics.gp_interpolation_mse !== undefined ? 
                         (analytics.hybrid_metrics.gp_interpolation_mse < 0.001 ? 'Excellent' : 
                          analytics.hybrid_metrics.gp_interpolation_mse < 0.01 ? 'Good' : 'Fair') : 'N/A'} fit
                      </div>
                    </div>
                    <div className="bg-zinc-700/50 rounded p-3">
                      <div className="text-sm text-zinc-400 mb-1">Quantum Impact</div>
                      <div className="text-white font-medium">
                        {analytics.hybrid_metrics.mean_quantum_correction > 0.01 ? 'High' :
                         analytics.hybrid_metrics.mean_quantum_correction > 0.001 ? 'Moderate' : 'Low'} correction magnitude
                      </div>
                    </div>
                    <div className="bg-zinc-700/50 rounded p-3">
                      <div className="text-sm text-zinc-400 mb-1">Correction Consistency</div>
                      <div className="text-white font-medium">
                        {analytics.hybrid_metrics.fraction_significant_correction > 0.5 ? 'High' :
                         analytics.hybrid_metrics.fraction_significant_correction > 0.2 ? 'Moderate' : 'Low'} consistency
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPanel; 