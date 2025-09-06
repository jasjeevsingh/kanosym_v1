/**
 * ExcelDataService - Core service for sheet-based project management
 * Each Excel worksheet represents a Kanosym project with its own data and results
 */

export interface Portfolio {
  symbols: string[];
  weights: number[];
  metadata?: {
    name?: string;
    description?: string;
    created?: Date;
  };
}

export interface TestParameters {
  testType: 'classical' | 'hybrid' | 'quantum';
  parameters: {
    shockSize?: number;
    confidenceLevel?: number;
    timeHorizon?: number;
    correlationThreshold?: number;
    quantumDepth?: number;
    [key: string]: any;
  };
}

export interface TestResult {
  id: string;
  timestamp: Date;
  testType: 'classical' | 'hybrid' | 'quantum';
  parameters: TestParameters['parameters'];
  results: {
    sensitivity: number[];
    correlations?: number[][];
    risks?: number[];
    recommendations?: string[];
    [key: string]: any;
  };
  metadata: {
    worksheetName: string;
    portfolioSnapshot: Portfolio;
    executionTime: number;
  };
}

export interface SheetProject {
  name: string;
  worksheetName: string;
  portfolio: Portfolio;
  testHistory: TestResult[];
  lastModified: Date;
  metadata: {
    created: Date;
    description?: string;
    tags?: string[];
  };
}

export class ExcelDataService {
  private static instance: ExcelDataService;
  
  public static getInstance(): ExcelDataService {
    if (!ExcelDataService.instance) {
      ExcelDataService.instance = new ExcelDataService();
    }
    return ExcelDataService.instance;
  }

  /**
   * Get the current worksheet as a project
   */
  async getCurrentProject(): Promise<SheetProject> {
    return new Promise((resolve, reject) => {
      Excel.run(async (context) => {
        try {
          const worksheet = context.workbook.worksheets.getActiveWorksheet();
          worksheet.load("name");
          
          await context.sync();
          
          const worksheetName = worksheet.name;
          const portfolio = await this.readPortfolioFromWorksheet(context, worksheet);
          const testHistory = await this.readTestHistoryFromWorksheet(context, worksheet);
          
          const project: SheetProject = {
            name: worksheetName,
            worksheetName: worksheetName,
            portfolio: portfolio,
            testHistory: testHistory,
            lastModified: new Date(),
            metadata: {
              created: new Date(), // TODO: Read from worksheet metadata
              description: `Project: ${worksheetName}`,
            }
          };
          
          resolve(project);
        } catch (error) {
          reject(new Error(`Failed to load current project: ${error.message}`));
        }
      });
    });
  }

  /**
   * Read portfolio data from the current worksheet
   * Expected format: Symbols in column A, Weights in column B (starting from row 2)
   */
  async readPortfolioFromWorksheet(context: Excel.RequestContext, worksheet: Excel.Worksheet): Promise<Portfolio> {
    // Load portfolio metadata from named range or default location
    const metadataRange = worksheet.getRange("A1:B1");
    metadataRange.load("values");
    
    // Load portfolio data - symbols and weights
    const dataRange = worksheet.getUsedRange();
    dataRange.load("values, rowCount, columnCount");
    
    await context.sync();
    
    const values = dataRange.values;
    const symbols: string[] = [];
    const weights: number[] = [];
    
    // Skip header row (row 0) and start from row 1
    for (let i = 1; i < values.length; i++) {
      const symbol = values[i][0];
      const weight = values[i][1];
      
      if (symbol && typeof symbol === 'string' && symbol.trim() !== '') {
        symbols.push(symbol.toString().trim().toUpperCase());
        weights.push(typeof weight === 'number' ? weight : parseFloat(weight?.toString() || '0'));
      }
    }
    
    // Validate portfolio
    if (symbols.length === 0) {
      throw new Error('No portfolio symbols found. Please add symbols in column A and weights in column B.');
    }
    
    // Normalize weights if they don't sum to 1
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    if (Math.abs(totalWeight - 1) > 0.01) {
      const normalizedWeights = weights.map(weight => weight / totalWeight);
      weights.splice(0, weights.length, ...normalizedWeights);
    }
    
    return {
      symbols,
      weights,
      metadata: {
        name: worksheet.name,
        description: `Portfolio from ${worksheet.name}`,
        created: new Date()
      }
    };
  }

  /**
   * Read test history from worksheet (stored in a specific range)
   */
  async readTestHistoryFromWorksheet(_context: Excel.RequestContext, worksheet: Excel.Worksheet): Promise<TestResult[]> {
    try {
      // Try to read from a named range for test history
      const historyRange = worksheet.getRange("TestHistory");
      historyRange.load("values");
      await _context.sync();
      
      // Parse test history from range
      // TODO: Implement test history parsing from Excel range
      return [];
    } catch (error) {
      // If TestHistory range doesn't exist, return empty array
      return [];
    }
  }

  /**
   * Save test results to the current worksheet
   */
  async saveTestResults(testResult: TestResult): Promise<void> {
    return new Promise((resolve, reject) => {
      Excel.run(async (context) => {
        try {
          const worksheet = context.workbook.worksheets.getActiveWorksheet();
          
          // Find or create the results section
          await this.writeTestResultsToWorksheet(context, worksheet, testResult);
          
          await context.sync();
          resolve();
        } catch (error) {
          reject(new Error(`Failed to save test results: ${error.message}`));
        }
      });
    });
  }

  /**
   * Write test results to a specific section of the worksheet
   */
  private async writeTestResultsToWorksheet(
    _context: Excel.RequestContext, 
    worksheet: Excel.Worksheet, 
    testResult: TestResult
  ): Promise<void> {
    // Create results section starting at column D
    const resultsStartColumn = 'D';
    const startRow = 2;
    
    // Write result headers
    const headerRange = worksheet.getRange(`${resultsStartColumn}${startRow}`);
    headerRange.values = [['Test Results']];
    headerRange.format.font.bold = true;
    headerRange.format.font.size = 14;
    
    // Write test metadata
    let currentRow = startRow + 2;
    const metadataData = [
      ['Test Type:', testResult.testType],
      ['Timestamp:', testResult.timestamp.toISOString()],
      ['Test ID:', testResult.id],
      ['Execution Time:', `${testResult.metadata.executionTime}ms`],
      ['', ''], // Empty row
      ['Parameters:', ''],
    ];
    
    // Add parameters
    Object.entries(testResult.parameters).forEach(([key, value]) => {
      metadataData.push([`  ${key}:`, value?.toString() || '']);
    });
    
    metadataData.push(['', '']); // Empty row
    metadataData.push(['Results:', '']);
    
    // Add results
    if (testResult.results.sensitivity) {
      metadataData.push(['Sensitivity Values:', '']);
      testResult.results.sensitivity.forEach((value, index) => {
        const symbol = testResult.metadata.portfolioSnapshot.symbols[index] || `Asset ${index + 1}`;
        metadataData.push([`  ${symbol}:`, value.toString()]);
      });
    }
    
    // Write all metadata and results
    const dataRange = worksheet.getRange(`${resultsStartColumn}${currentRow}:${this.getColumnLetter(resultsStartColumn, 1)}${currentRow + metadataData.length - 1}`);
    dataRange.values = metadataData;
    
    // Format the results section
    const resultsRange = worksheet.getRange(`${resultsStartColumn}${startRow}:${this.getColumnLetter(resultsStartColumn, 1)}${currentRow + metadataData.length - 1}`);
    resultsRange.format.borders.getItem(Excel.BorderIndex.edgeTop).style = Excel.BorderLineStyle.continuous;
    resultsRange.format.borders.getItem(Excel.BorderIndex.edgeBottom).style = Excel.BorderLineStyle.continuous;
    resultsRange.format.borders.getItem(Excel.BorderIndex.edgeLeft).style = Excel.BorderLineStyle.continuous;
    resultsRange.format.borders.getItem(Excel.BorderIndex.edgeRight).style = Excel.BorderLineStyle.continuous;
  }

  /**
   * Create a new project (worksheet) with template structure
   */
  async createNewProject(projectName: string): Promise<SheetProject> {
    return new Promise((resolve, reject) => {
      Excel.run(async (context) => {
        try {
          // Create new worksheet
          const worksheet = context.workbook.worksheets.add(projectName);
          
          // Set up template structure
          await this.setupProjectTemplate(context, worksheet);
          
          // Activate the new worksheet
          worksheet.activate();
          
          await context.sync();
          
          // Return the new project
          const project = await this.getCurrentProject();
          resolve(project);
        } catch (error) {
          reject(new Error(`Failed to create new project: ${error.message}`));
        }
      });
    });
  }

  /**
   * Set up the template structure for a new project worksheet
   */
  private async setupProjectTemplate(_context: Excel.RequestContext, worksheet: Excel.Worksheet): Promise<void> {
    // Set up headers
    const headers = [
      ['Symbol', 'Weight', '', 'Test Results'],
      ['AAPL', 0.3, '', ''],
      ['MSFT', 0.25, '', ''],
      ['GOOGL', 0.25, '', ''],
      ['TSLA', 0.2, '', ''],
    ];
    
    const headerRange = worksheet.getRange('A1:D5');
    headerRange.values = headers;
    
    // Format headers
    const titleRange = worksheet.getRange('A1:B1');
    titleRange.format.font.bold = true;
    titleRange.format.font.size = 12;
    
    const resultsHeaderRange = worksheet.getRange('D1');
    resultsHeaderRange.format.font.bold = true;
    resultsHeaderRange.format.font.size = 12;
    
    // Set column widths
    worksheet.getRange('A:A').format.columnWidth = 80;
    worksheet.getRange('B:B').format.columnWidth = 80;
    worksheet.getRange('C:C').format.columnWidth = 20;
    worksheet.getRange('D:D').format.columnWidth = 150;
    
    // Add some basic formatting
    const portfolioRange = worksheet.getRange('A1:B5');
    portfolioRange.format.borders.getItem(Excel.BorderIndex.edgeTop).style = Excel.BorderLineStyle.continuous;
    portfolioRange.format.borders.getItem(Excel.BorderIndex.edgeBottom).style = Excel.BorderLineStyle.continuous;
    portfolioRange.format.borders.getItem(Excel.BorderIndex.edgeLeft).style = Excel.BorderLineStyle.continuous;
    portfolioRange.format.borders.getItem(Excel.BorderIndex.edgeRight).style = Excel.BorderLineStyle.continuous;
    portfolioRange.format.borders.getItem(Excel.BorderIndex.insideHorizontal).style = Excel.BorderLineStyle.continuous;
    portfolioRange.format.borders.getItem(Excel.BorderIndex.insideVertical).style = Excel.BorderLineStyle.continuous;
  }

  /**
   * Get all projects (worksheets) in the current workbook
   */
  async getAllProjects(): Promise<SheetProject[]> {
    return new Promise((resolve, reject) => {
      Excel.run(async (context) => {
        try {
          const worksheets = context.workbook.worksheets;
          worksheets.load("items/name");
          await context.sync();
          
          const projects: SheetProject[] = [];
          
          for (const worksheet of worksheets.items) {
            try {
              // Temporarily switch to each worksheet to read its data
              const portfolio = await this.readPortfolioFromWorksheet(context, worksheet);
              const testHistory = await this.readTestHistoryFromWorksheet(context, worksheet);
              
              projects.push({
                name: worksheet.name,
                worksheetName: worksheet.name,
                portfolio,
                testHistory,
                lastModified: new Date(),
                metadata: {
                  created: new Date(),
                  description: `Project: ${worksheet.name}`,
                }
              });
            } catch (error) {
              // Skip worksheets that don't have valid portfolio data
              console.warn(`Skipping worksheet ${worksheet.name}: ${error.message}`);
            }
          }
          
          resolve(projects);
        } catch (error) {
          reject(new Error(`Failed to load all projects: ${error.message}`));
        }
      });
    });
  }

  /**
   * Switch to a specific project (worksheet)
   */
  async switchToProject(projectName: string): Promise<SheetProject> {
    return new Promise((resolve, reject) => {
      Excel.run(async (context) => {
        try {
          const worksheet = context.workbook.worksheets.getItem(projectName);
          worksheet.activate();
          await context.sync();
          
          const project = await this.getCurrentProject();
          resolve(project);
        } catch (error) {
          reject(new Error(`Failed to switch to project ${projectName}: ${error.message}`));
        }
      });
    });
  }

  /**
   * Utility function to get column letter for Excel ranges
   */
  private getColumnLetter(startColumn: string, offset: number): string {
    const startCharCode = startColumn.charCodeAt(0);
    return String.fromCharCode(startCharCode + offset);
  }

  /**
   * Generate a unique test ID
   */
  generateTestId(): string {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate portfolio data
   */
  validatePortfolio(portfolio: Portfolio): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!portfolio.symbols || portfolio.symbols.length === 0) {
      errors.push('Portfolio must contain at least one symbol');
    }
    
    if (!portfolio.weights || portfolio.weights.length === 0) {
      errors.push('Portfolio must contain weights for all symbols');
    }
    
    if (portfolio.symbols.length !== portfolio.weights.length) {
      errors.push('Number of symbols must match number of weights');
    }
    
    const totalWeight = portfolio.weights.reduce((sum, weight) => sum + weight, 0);
    if (Math.abs(totalWeight - 1) > 0.01) {
      errors.push(`Portfolio weights must sum to 1.0 (current sum: ${totalWeight.toFixed(3)})`);
    }
    
    portfolio.weights.forEach((weight, index) => {
      if (weight < 0) {
        errors.push(`Weight for ${portfolio.symbols[index]} cannot be negative`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default ExcelDataService;
