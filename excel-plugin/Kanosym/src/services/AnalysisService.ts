/**
 * AnalysisService - Connects ExcelDataService with backend analysis APIs
 * Handles the complete flow from Excel data to backend analysis to Excel results
 */

import ExcelDataService, { TestResult, TestParameters, Portfolio } from './ExcelDataService';

export interface AnalysisRequest {
  portfolio: Portfolio;
  testType: 'classical' | 'hybrid' | 'quantum';
  parameters: TestParameters['parameters'];
}

export interface AnalysisResponse {
  success: boolean;
  data?: any;
  error?: string;
  executionTime: number;
}

export class AnalysisService {
  private static instance: AnalysisService;
  private excelService: ExcelDataService;
  private backendBaseUrl: string = 'https://localhost:5001';

  public static getInstance(): AnalysisService {
    if (!AnalysisService.instance) {
      AnalysisService.instance = new AnalysisService();
    }
    return AnalysisService.instance;
  }

  constructor() {
    this.excelService = ExcelDataService.getInstance();
  }

  /**
   * Run complete analysis flow: read from Excel → analyze → save to Excel
   */
  async runAnalysis(testType: 'classical' | 'hybrid' | 'quantum', parameters: TestParameters['parameters']): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Step 1: Get current project and portfolio from Excel
      const project = await this.excelService.getCurrentProject();
      const portfolio = project.portfolio;
      
      // Step 2: Validate portfolio
      const validation = this.excelService.validatePortfolio(portfolio);
      if (!validation.isValid) {
        throw new Error(`Portfolio validation failed: ${validation.errors.join(', ')}`);
      }
      
      // Step 3: Send analysis request to backend
      const analysisRequest: AnalysisRequest = {
        portfolio,
        testType,
        parameters
      };
      
      const analysisResponse = await this.callBackendAnalysis(analysisRequest);
      
      if (!analysisResponse.success) {
        throw new Error(analysisResponse.error || 'Analysis failed');
      }
      
      // Step 4: Create test result object
      const testResult: TestResult = {
        id: this.excelService.generateTestId(),
        timestamp: new Date(),
        testType,
        parameters,
        results: analysisResponse.data,
        metadata: {
          worksheetName: project.worksheetName,
          portfolioSnapshot: portfolio,
          executionTime: Date.now() - startTime
        }
      };
      
      // Step 5: Save results back to Excel
      await this.excelService.saveTestResults(testResult);
      
      return testResult;
      
    } catch (error) {
      throw new Error(`Analysis failed: ${error.message}`);
    }
  }

  /**
   * Call the backend analysis API
   */
  private async callBackendAnalysis(request: AnalysisRequest): Promise<AnalysisResponse> {
    const startTime = Date.now();
    
    try {
      let endpoint: string;
      let payload: any;
      
      // Determine the correct endpoint and payload based on test type
      switch (request.testType) {
        case 'classical':
          endpoint = '/api/analysis/classical';
          payload = {
            symbols: request.portfolio.symbols,
            weights: request.portfolio.weights,
            shock_size: request.parameters.shockSize || 0.05,
            confidence_level: request.parameters.confidenceLevel || 0.95,
            time_horizon: request.parameters.timeHorizon || 252,
          };
          break;
          
        case 'hybrid':
          endpoint = '/api/analysis/hybrid';
          payload = {
            symbols: request.portfolio.symbols,
            weights: request.portfolio.weights,
            shock_size: request.parameters.shockSize || 0.05,
            confidence_level: request.parameters.confidenceLevel || 0.95,
            time_horizon: request.parameters.timeHorizon || 252,
            correlation_threshold: request.parameters.correlationThreshold || 0.7,
          };
          break;
          
        case 'quantum':
          endpoint = '/api/analysis/quantum';
          payload = {
            symbols: request.portfolio.symbols,
            weights: request.portfolio.weights,
            shock_size: request.parameters.shockSize || 0.05,
            confidence_level: request.parameters.confidenceLevel || 0.95,
            time_horizon: request.parameters.timeHorizon || 252,
            quantum_depth: request.parameters.quantumDepth || 3,
          };
          break;
          
        default:
          throw new Error(`Unknown test type: ${request.testType}`);
      }
      
      const response = await fetch(`${this.backendBaseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data: data,
        executionTime: Date.now() - startTime
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Test backend connectivity
   */
  async testBackendConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.backendBaseUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      return response.ok;
    } catch (error) {
      console.error('Backend connection test failed:', error);
      return false;
    }
  }

  /**
   * Get current portfolio from Excel for preview
   */
  async getCurrentPortfolioPreview(): Promise<{ portfolio: Portfolio; validation: { isValid: boolean; errors: string[] } }> {
    try {
      const project = await this.excelService.getCurrentProject();
      const portfolio = project.portfolio;
      const validation = this.excelService.validatePortfolio(portfolio);
      
      return { portfolio, validation };
    } catch (error) {
      throw new Error(`Failed to load portfolio: ${error.message}`);
    }
  }

  /**
   * Create a new project with sample data
   */
  async createSampleProject(projectName: string): Promise<void> {
    try {
      await this.excelService.createNewProject(projectName);
    } catch (error) {
      throw new Error(`Failed to create sample project: ${error.message}`);
    }
  }

  /**
   * Get all available projects
   */
  async getAllProjects(): Promise<Array<{ name: string; lastModified: Date; symbolCount: number; hasResults: boolean }>> {
    try {
      const projects = await this.excelService.getAllProjects();
      
      return projects.map(project => ({
        name: project.name,
        lastModified: project.lastModified,
        symbolCount: project.portfolio.symbols.length,
        hasResults: project.testHistory.length > 0
      }));
    } catch (error) {
      throw new Error(`Failed to load projects: ${error.message}`);
    }
  }

  /**
   * Switch to a specific project
   */
  async switchToProject(projectName: string): Promise<void> {
    try {
      await this.excelService.switchToProject(projectName);
    } catch (error) {
      throw new Error(`Failed to switch to project: ${error.message}`);
    }
  }

  /**
   * Utility method for Excel debugging - write debug info to a cell
   */
  async writeDebugInfo(message: string, location: string = 'Z1'): Promise<void> {
    return new Promise((resolve, reject) => {
      Excel.run(async (context) => {
        try {
          const worksheet = context.workbook.worksheets.getActiveWorksheet();
          const range = worksheet.getRange(location);
          range.values = [[`DEBUG: ${new Date().toISOString()} - ${message}`]];
          range.format.font.color = 'red';
          range.format.font.size = 8;
          
          await context.sync();
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }
}

export default AnalysisService;
