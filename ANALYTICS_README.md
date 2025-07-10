# KANOSYM Analytics System

## Overview

The KANOSYM Analytics System provides comprehensive performance metrics, statistical analysis, and resource utilization data for all sensitivity test blocks (quantum, classical, and hybrid). This system helps finance professionals understand the performance characteristics, statistical reliability, and computational efficiency of their portfolio sensitivity analyses.

## Features

### 🎯 Backend Analytics Features

#### 1. Quantum Sensitivity Analytics
- **Performance Metrics**: Total execution time, throughput, steps processed
- **Quantum Efficiency**: Circuits per second, shots per second, circuit depth analysis
- **Resource Utilization**: Total qubits used, quantum operations, memory efficiency
- **Statistical Measures**: Confidence intervals, coefficient of variation, skewness, kurtosis
- **Quantum-Specific**: Enhancement factors, measurement probabilities, quantum advantage metrics

#### 2. Classical Sensitivity Analytics
- **Performance Metrics**: Execution time, throughput, Monte Carlo efficiency
- **Computational Efficiency**: Simulations per second, iterations per second, memory usage
- **Resource Utilization**: Total simulations, convergence rates, computational efficiency
- **Statistical Measures**: Standard error, confidence intervals, statistical significance
- **Monte Carlo Specific**: Convergence analysis, standard error calculations

#### 3. Hybrid Sensitivity Analytics
- **Performance Metrics**: Combined execution times, hybrid throughput
- **Hybrid Efficiency**: Quantum/classical time ratios, overhead analysis
- **Resource Utilization**: Combined operations, quantum-classical synergy
- **Hybrid-Specific**: Efficiency gains vs pure methods, optimal hybrid ratios
- **Statistical Measures**: Comprehensive statistical analysis

### 📊 Frontend Analytics Panel

#### Comprehensive Analytics Display
- **Performance Metrics**: Execution times, throughput, efficiency measures
- **Quantum/Classical Efficiency**: Mode-specific metrics and comparisons
- **Sensitivity Analysis**: Sharpe range, volatility, sensitivity curves
- **Statistical Measures**: Confidence intervals, skewness, kurtosis
- **Resource Utilization**: Memory usage, computational resources
- **Hybrid-Specific Metrics**: Synergy analysis, efficiency comparisons

#### User Experience
- **Modal Interface**: Clean, organized analytics panel
- **Color-Coded Sections**: Different colors for different metric types
- **Responsive Design**: Adapts to different screen sizes
- **Easy Access**: Analytics button in results view
- **Professional Formatting**: Time, bytes, and number formatting

## Key Analytics for Finance Professionals

### ⚡ Performance Metrics
- Total execution time and throughput
- Time per step and processing efficiency
- Resource utilization and memory usage

### 🔬 Statistical Significance
- 95% confidence intervals
- Coefficient of variation
- Skewness and kurtosis analysis
- Monte Carlo standard errors

### 🚀 Quantum Advantage Metrics
- Quantum enhancement factors
- Circuit efficiency and depth analysis
- Quantum-classical synergy measurements
- Resource utilization comparisons

### 📈 Sensitivity Analysis
- Sharpe ratio ranges and volatility
- Maximum sensitivity points
- Sensitivity curve steepness
- Statistical distribution analysis

## Architecture

### Backend Components

#### `analytics.py`
The core analytics module containing:
- `AnalyticsCollector`: Main class for collecting and computing analytics
- `PerformanceMetrics`: Performance-related data structures
- `QuantumMetrics`: Quantum-specific metrics
- `ClassicalMetrics`: Classical-specific metrics
- `HybridMetrics`: Hybrid-specific metrics
- `StatisticalMetrics`: Statistical analysis data structures

#### Integration Points
- **Quantum Sensitivity**: `backend/model_blocks/quantum/quantum_sensitivity.py`
- **Classical Sensitivity**: `backend/model_blocks/classical/classical_sensitivity.py`
- **Hybrid Sensitivity**: `backend/model_blocks/hybrid/hybrid_sensitivity.py`

### Frontend Components

#### `AnalyticsPanel.tsx`
The main analytics display component featuring:
- Modal interface with comprehensive metrics display
- Color-coded sections for different metric types
- Professional formatting for all numerical values
- Responsive grid layout
- Key insights summary

#### Integration Points
- **ResultsChart.tsx**: Analytics button integration
- **App.tsx**: Modal state management

## Usage

### Running Analytics

1. **Start the Backend Server**:
   ```bash
   cd backend
   python api.py
   ```

2. **Start the Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Run a Sensitivity Test**:
   - Open the application
   - Configure a portfolio sensitivity test
   - Select quantum, classical, or hybrid mode
   - Click "Run Model"

4. **View Analytics**:
   - After the test completes, click the "Analytics" button in the results view
   - Review comprehensive metrics in the modal panel

### Testing Analytics

Run the analytics test script:
```bash
cd backend
python test_analytics.py
```

This will test all three modes (quantum, classical, hybrid) and verify that analytics are being collected correctly.

## Analytics Data Structure

### Performance Metrics
```json
{
  "performance_metrics": {
    "total_execution_time": 0.123,
    "throughput": 40.7,
    "steps_processed": 5,
    "memory_usage_mb": 45.2,
    "cpu_usage_percent": 12.5
  }
}
```

### Statistical Metrics
```json
{
  "statistical_metrics": {
    "confidence_interval_95": [1.1258, 1.3742],
    "coefficient_of_variation": 0.0892,
    "skewness": 0.2341,
    "kurtosis": -0.5678,
    "standard_error": 0.0456,
    "statistical_significance": 0.9876
  }
}
```

### Quantum Metrics
```json
{
  "quantum_metrics": {
    "circuits_per_second": 62.5,
    "shots_per_second": 64000,
    "circuit_depth": 8,
    "total_qubits": 4,
    "quantum_operations": 160,
    "enhancement_factor": 1.0234,
    "quantum_advantage_ratio": 0.0234
  }
}
```

### Classical Metrics
```json
{
  "classical_metrics": {
    "simulations_per_second": 4122,
    "iterations_per_second": 1038600,
    "convergence_rate": 0.95,
    "monte_carlo_efficiency": 0.8234,
    "standard_error": 0.0234,
    "statistical_significance": 0.9876
  }
}
```

### Hybrid Metrics
```json
{
  "hybrid_metrics": {
    "quantum_classical_ratio": 0.6667,
    "hybrid_overhead": 0.1,
    "synergy_factor": 1.15,
    "efficiency_gain_vs_classical": 0.25,
    "efficiency_gain_vs_quantum": 0.35,
    "optimal_hybrid_ratio": 0.45
  }
}
```

## Dependencies

### Backend Dependencies
- `scipy>=1.10.0`: Statistical analysis functions
- `psutil>=5.9.0`: System resource monitoring
- `numpy>=1.24.0`: Numerical computations
- `qiskit==0.44.3`: Quantum computing framework

### Frontend Dependencies
- `react`: UI framework
- `recharts`: Chart visualization
- `tailwindcss`: Styling

## Benefits for Finance Professionals

The analytics system provides finance professionals with comprehensive insights into:

1. **Performance Characteristics**: Understanding execution times and throughput for different methods
2. **Statistical Reliability**: Confidence in results through statistical significance measures
3. **Resource Efficiency**: Monitoring computational costs and memory usage
4. **Quantum Advantage**: Quantifying quantum enhancements when applicable
5. **Method Comparisons**: Informed decision-making through method comparisons

## Future Enhancements

### Planned Features
- **Real-time Analytics**: Live monitoring during test execution
- **Historical Analytics**: Comparison across multiple test runs
- **Export Functionality**: PDF/CSV export of analytics reports
- **Custom Metrics**: User-defined performance indicators
- **Benchmarking**: Comparison against industry standards

### Advanced Analytics
- **Machine Learning Integration**: Predictive performance modeling
- **Cost Analysis**: Computational cost vs. accuracy trade-offs
- **Scalability Metrics**: Performance scaling with problem size
- **Error Analysis**: Detailed error propagation and uncertainty quantification

## Troubleshooting

### Common Issues

1. **Analytics Not Appearing**:
   - Ensure backend server is running
   - Check that sensitivity test completed successfully
   - Verify analytics data is present in the response

2. **Performance Issues**:
   - Monitor system resources during test execution
   - Consider reducing test parameters for faster execution
   - Check for memory leaks in long-running tests

3. **Statistical Anomalies**:
   - Verify input data quality
   - Check for numerical precision issues
   - Ensure sufficient sample sizes for statistical significance

### Debug Mode

Enable debug logging by setting environment variables:
```bash
export KANOSYM_DEBUG=1
export KANOSYM_ANALYTICS_VERBOSE=1
```

## Contributing

To contribute to the analytics system:

1. **Backend**: Add new metrics to the appropriate data structures in `analytics.py`
2. **Frontend**: Extend the `AnalyticsPanel.tsx` component for new visualizations
3. **Integration**: Update sensitivity test modules to collect new metrics
4. **Testing**: Add test cases to `test_analytics.py`

## License

This analytics system is part of the KANOSYM project and follows the same licensing terms. 