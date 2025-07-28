export interface BlockPort {
  id: string;
  name: string;
  type: 'input' | 'output';
  dataType: 'any' | 'number' | 'array' | 'object' | 'boolean';
}

export interface BlockDefinition {
  id: string;
  category: string;
  name: string;
  description: string;
  icon?: string;
  color: string;
  inputs: BlockPort[];
  outputs: BlockPort[];
  parameters?: any;
}

export type { BlockPort as BlockPortType, BlockDefinition as BlockDefinitionType };

export const blockCategories = {
  dataSource: {
    name: 'Data Sources',
    color: '#4A90E2',
    icon: ''
  },
  portfolio: {
    name: 'Portfolio Construction',
    color: '#7B68EE',
    icon: ''
  },
  risk: {
    name: 'Risk Analysis',
    color: '#FF6B6B',
    icon: ''
  },
  ml: {
    name: 'Machine Learning',
    color: '#4ECDC4',
    icon: ''
  },
  execution: {
    name: 'Execution',
    color: '#FFD93D',
    icon: ''
  },
  analysis: {
    name: 'Analysis & Reporting',
    color: '#95E1D3',
    icon: ''
  },
  integration: {
    name: 'Integration',
    color: '#F38181',
    icon: ''
  },
  corporate: {
    name: 'Corporate Finance',
    color: '#AA96DA',
    icon: ''
  },
  quantum: {
    name: 'Quantum Computing',
    color: '#2D3436',
    icon: ''
  }
};

export const blockDefinitions: BlockDefinition[] = [
  // Data Source Blocks
  {
    id: 'market-data',
    category: 'dataSource',
    name: 'Market Data',
    description: 'Fetch real-time or historical market data',
    color: blockCategories.dataSource.color,
    inputs: [],
    outputs: [
      { id: 'price-data', name: 'Price Data', type: 'output', dataType: 'array' },
      { id: 'volume', name: 'Volume', type: 'output', dataType: 'array' }
    ]
  },
  {
    id: 'economic-indicators',
    category: 'dataSource',
    name: 'Economic Indicators',
    description: 'Fetch macroeconomic data',
    color: blockCategories.dataSource.color,
    inputs: [],
    outputs: [
      { id: 'indicators', name: 'Indicators', type: 'output', dataType: 'object' }
    ]
  },
  {
    id: 'alternative-data',
    category: 'dataSource',
    name: 'Alternative Data',
    description: 'Integrate alternative data sources',
    color: blockCategories.dataSource.color,
    inputs: [],
    outputs: [
      { id: 'alt-data', name: 'Alt Data', type: 'output', dataType: 'object' }
    ]
  },

  // Portfolio Construction Blocks
  {
    id: 'mean-variance',
    category: 'portfolio',
    name: 'Mean-Variance Optimization',
    description: 'Classic Markowitz portfolio optimization',
    color: blockCategories.portfolio.color,
    inputs: [
      { id: 'returns', name: 'Returns', type: 'input', dataType: 'array' },
      { id: 'constraints', name: 'Constraints', type: 'input', dataType: 'object' }
    ],
    outputs: [
      { id: 'weights', name: 'Optimal Weights', type: 'output', dataType: 'array' },
      { id: 'frontier', name: 'Efficient Frontier', type: 'output', dataType: 'array' }
    ]
  },
  {
    id: 'risk-parity',
    category: 'portfolio',
    name: 'Risk Parity',
    description: 'Equal risk contribution portfolio',
    color: blockCategories.portfolio.color,
    inputs: [
      { id: 'returns', name: 'Returns', type: 'input', dataType: 'array' },
      { id: 'volatilities', name: 'Volatilities', type: 'input', dataType: 'array' }
    ],
    outputs: [
      { id: 'weights', name: 'Risk-Balanced Weights', type: 'output', dataType: 'array' }
    ]
  },
  {
    id: 'black-litterman',
    category: 'portfolio',
    name: 'Black-Litterman',
    description: 'Combine market equilibrium with investor views',
    color: blockCategories.portfolio.color,
    inputs: [
      { id: 'market-data', name: 'Market Data', type: 'input', dataType: 'object' },
      { id: 'views', name: 'Investor Views', type: 'input', dataType: 'object' }
    ],
    outputs: [
      { id: 'returns', name: 'Adjusted Returns', type: 'output', dataType: 'array' },
      { id: 'weights', name: 'Optimal Weights', type: 'output', dataType: 'array' }
    ]
  },

  // Risk Analysis Blocks
  {
    id: 'var-cvar',
    category: 'risk',
    name: 'VaR/CVaR Calculator',
    description: 'Calculate Value at Risk metrics',
    color: blockCategories.risk.color,
    inputs: [
      { id: 'portfolio', name: 'Portfolio', type: 'input', dataType: 'object' },
      { id: 'returns', name: 'Returns History', type: 'input', dataType: 'array' }
    ],
    outputs: [
      { id: 'var', name: 'VaR', type: 'output', dataType: 'object' },
      { id: 'cvar', name: 'CVaR', type: 'output', dataType: 'object' }
    ]
  },
  {
    id: 'stress-testing',
    category: 'risk',
    name: 'Stress Testing',
    description: 'Run scenario analysis',
    color: blockCategories.risk.color,
    inputs: [
      { id: 'portfolio', name: 'Portfolio', type: 'input', dataType: 'object' },
      { id: 'scenarios', name: 'Scenarios', type: 'input', dataType: 'array' }
    ],
    outputs: [
      { id: 'results', name: 'Stress Test Results', type: 'output', dataType: 'array' }
    ]
  },

  // Machine Learning Blocks
  {
    id: 'price-prediction',
    category: 'ml',
    name: 'Price Prediction',
    description: 'ML-based price forecasting',
    color: blockCategories.ml.color,
    inputs: [
      { id: 'historical', name: 'Historical Data', type: 'input', dataType: 'array' },
      { id: 'features', name: 'Features', type: 'input', dataType: 'array' }
    ],
    outputs: [
      { id: 'predictions', name: 'Predictions', type: 'output', dataType: 'array' },
      { id: 'confidence', name: 'Confidence', type: 'output', dataType: 'array' }
    ]
  },
  {
    id: 'anomaly-detection',
    category: 'ml',
    name: 'Anomaly Detection',
    description: 'Detect unusual market behavior',
    color: blockCategories.ml.color,
    inputs: [
      { id: 'data-stream', name: 'Data Stream', type: 'input', dataType: 'array' }
    ],
    outputs: [
      { id: 'anomalies', name: 'Anomaly Scores', type: 'output', dataType: 'array' },
      { id: 'alerts', name: 'Alerts', type: 'output', dataType: 'array' }
    ]
  },
  {
    id: 'sentiment-analysis',
    category: 'ml',
    name: 'Sentiment Analysis',
    description: 'Analyze text data for market sentiment',
    color: blockCategories.ml.color,
    inputs: [
      { id: 'text-data', name: 'Text Data', type: 'input', dataType: 'array' }
    ],
    outputs: [
      { id: 'sentiment', name: 'Sentiment Scores', type: 'output', dataType: 'array' },
      { id: 'topics', name: 'Topics', type: 'output', dataType: 'array' }
    ]
  },

  // Execution Blocks
  {
    id: 'order-router',
    category: 'execution',
    name: 'Order Router',
    description: 'Smart order routing and execution',
    color: blockCategories.execution.color,
    inputs: [
      { id: 'signals', name: 'Trade Signals', type: 'input', dataType: 'array' },
      { id: 'targets', name: 'Portfolio Targets', type: 'input', dataType: 'object' }
    ],
    outputs: [
      { id: 'status', name: 'Order Status', type: 'output', dataType: 'object' },
      { id: 'fills', name: 'Fills', type: 'output', dataType: 'array' }
    ]
  },
  {
    id: 'rebalancing',
    category: 'execution',
    name: 'Rebalancing',
    description: 'Portfolio rebalancing logic',
    color: blockCategories.execution.color,
    inputs: [
      { id: 'current', name: 'Current Positions', type: 'input', dataType: 'object' },
      { id: 'target', name: 'Target Weights', type: 'input', dataType: 'array' }
    ],
    outputs: [
      { id: 'trades', name: 'Rebalancing Trades', type: 'output', dataType: 'array' }
    ]
  },

  // Analysis & Reporting Blocks
  {
    id: 'performance-attribution',
    category: 'analysis',
    name: 'Performance Attribution',
    description: 'Decompose portfolio returns',
    color: blockCategories.analysis.color,
    inputs: [
      { id: 'returns', name: 'Portfolio Returns', type: 'input', dataType: 'array' },
      { id: 'benchmark', name: 'Benchmark Data', type: 'input', dataType: 'array' }
    ],
    outputs: [
      { id: 'attribution', name: 'Attribution Analysis', type: 'output', dataType: 'object' }
    ]
  },
  {
    id: 'report-generator',
    category: 'analysis',
    name: 'Report Generator',
    description: 'Create formatted reports',
    color: blockCategories.analysis.color,
    inputs: [
      { id: 'data', name: 'Analysis Results', type: 'input', dataType: 'any' }
    ],
    outputs: [
      { id: 'report', name: 'Report', type: 'output', dataType: 'object' }
    ]
  },

  // Integration Blocks
  {
    id: 'database-connector',
    category: 'integration',
    name: 'Database Connector',
    description: 'Read/write to databases',
    color: blockCategories.integration.color,
    inputs: [
      { id: 'query', name: 'Query/Data', type: 'input', dataType: 'any' }
    ],
    outputs: [
      { id: 'result', name: 'Result', type: 'output', dataType: 'any' }
    ]
  },
  {
    id: 'api-webhook',
    category: 'integration',
    name: 'API Webhook',
    description: 'Send/receive data via webhooks',
    color: blockCategories.integration.color,
    inputs: [
      { id: 'trigger', name: 'Trigger Data', type: 'input', dataType: 'any' }
    ],
    outputs: [
      { id: 'response', name: 'API Response', type: 'output', dataType: 'object' }
    ]
  },
  {
    id: 'notification',
    category: 'integration',
    name: 'Notification',
    description: 'Send alerts and notifications',
    color: blockCategories.integration.color,
    inputs: [
      { id: 'message', name: 'Message Data', type: 'input', dataType: 'object' }
    ],
    outputs: [
      { id: 'confirmation', name: 'Delivery Status', type: 'output', dataType: 'boolean' }
    ]
  },

  // Corporate Finance Blocks
  {
    id: 'erp-connector',
    category: 'corporate',
    name: 'ERP Connector',
    description: 'Direct integration with ERP systems',
    color: blockCategories.corporate.color,
    inputs: [],
    outputs: [
      { id: 'financial-data', name: 'Financial Data', type: 'output', dataType: 'object' }
    ]
  },
  {
    id: 'invoice-processing',
    category: 'corporate',
    name: 'Invoice Processing',
    description: 'Automated invoice capture and processing',
    color: blockCategories.corporate.color,
    inputs: [
      { id: 'documents', name: 'Invoice Documents', type: 'input', dataType: 'array' }
    ],
    outputs: [
      { id: 'extracted', name: 'Extracted Data', type: 'output', dataType: 'object' },
      { id: 'validation', name: 'Validation Status', type: 'output', dataType: 'object' }
    ]
  },
  {
    id: 'cash-flow-forecast',
    category: 'corporate',
    name: 'Cash Flow Forecasting',
    description: 'Predict cash positions and liquidity needs',
    color: blockCategories.corporate.color,
    inputs: [
      { id: 'ar-ap', name: 'AR/AP Data', type: 'input', dataType: 'object' },
      { id: 'historical', name: 'Historical Patterns', type: 'input', dataType: 'array' }
    ],
    outputs: [
      { id: 'projections', name: 'Cash Projections', type: 'output', dataType: 'array' },
      { id: 'alerts', name: 'Liquidity Alerts', type: 'output', dataType: 'array' }
    ]
  },

  // Quantum Computing Blocks
  {
    id: 'quantum-optimization',
    category: 'quantum',
    name: 'Quantum Portfolio Optimization',
    description: 'Use quantum algorithms for portfolio optimization',
    color: blockCategories.quantum.color,
    inputs: [
      { id: 'universe', name: 'Asset Universe', type: 'input', dataType: 'array' },
      { id: 'constraints', name: 'Constraints', type: 'input', dataType: 'object' }
    ],
    outputs: [
      { id: 'weights', name: 'Quantum-Optimized Weights', type: 'output', dataType: 'array' }
    ]
  },
  {
    id: 'quantum-monte-carlo',
    category: 'quantum',
    name: 'Quantum Monte Carlo',
    description: 'Quantum-accelerated Monte Carlo simulations',
    color: blockCategories.quantum.color,
    inputs: [
      { id: 'parameters', name: 'Simulation Parameters', type: 'input', dataType: 'object' }
    ],
    outputs: [
      { id: 'results', name: 'Simulation Results', type: 'output', dataType: 'array' }
    ]
  },
  {
    id: 'quantum-ml',
    category: 'quantum',
    name: 'Quantum Machine Learning',
    description: 'Quantum ML for pattern recognition',
    color: blockCategories.quantum.color,
    inputs: [
      { id: 'training-data', name: 'Training Data', type: 'input', dataType: 'array' }
    ],
    outputs: [
      { id: 'predictions', name: 'Quantum Predictions', type: 'output', dataType: 'array' }
    ]
  }
];

export function getBlockDefinition(id: string): BlockDefinition | undefined {
  return blockDefinitions.find(block => block.id === id);
}

export function getBlocksByCategory(category: string): BlockDefinition[] {
  return blockDefinitions.filter(block => block.category === category);
}