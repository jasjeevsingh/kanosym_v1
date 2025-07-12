/**
 * Autosave utility for KANOSYM application
 * Handles automatic saving of project state and test runs with debouncing
 */

interface AutosaveOptions {
  delay?: number; // Debounce delay in milliseconds
  maxRetries?: number;
  retryDelay?: number;
}

interface ProjectState {
  project_id: string;
  project_name: string;
  blocks: {
    [blockType: string]: {
      placed: boolean;
      position?: { x: number; y: number };
      parameters?: any;
    };
  };
  ui_state: {
    current_block_mode: string;
    selected_block?: string;
    block_move_count: number;
  };
  results: {
    test_runs: string[];
    current_tab?: string;
  };
}

class AutosaveManager {
  private saveTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private options: AutosaveOptions;

  constructor(options: AutosaveOptions = {}) {
    this.options = {
      delay: 2000, // 2 second debounce
      maxRetries: 3,
      retryDelay: 1000,
      ...options
    };
  }

  /**
   * Debounced autosave for project state
   */
  async autosaveProject(projectName: string, projectState: ProjectState): Promise<void> {
    console.log('autosaveProject called for:', projectName);
    const key = `project-${projectName}`;
    
    // Clear existing timeout
    if (this.saveTimeouts.has(key)) {
      console.log('Clearing existing timeout for:', projectName);
      clearTimeout(this.saveTimeouts.get(key)!);
    }

    // Set new timeout
    console.log('Setting new timeout for:', projectName, 'delay:', this.options.delay);
    const timeout = setTimeout(async () => {
      console.log('Timeout fired for:', projectName);
      await this.performProjectSave(projectName, projectState);
      this.saveTimeouts.delete(key);
    }, this.options.delay!);

    this.saveTimeouts.set(key, timeout);
  }

  /**
   * Perform the actual project save with retry logic
   */
  private async performProjectSave(projectName: string, projectState: ProjectState, retryCount = 0): Promise<void> {
    try {
      const response = await fetch(`http://localhost:5001/api/projects/${encodeURIComponent(projectName)}/autosave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_state: projectState })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Unknown error');
      }

      console.log(`✅ Project "${projectName}" auto-saved successfully`);
    } catch (error) {
      console.error(`❌ Failed to auto-save project "${projectName}":`, error);
      
      // Retry logic
      if (retryCount < this.options.maxRetries!) {
        console.log(`🔄 Retrying auto-save for "${projectName}" (attempt ${retryCount + 1}/${this.options.maxRetries})`);
        setTimeout(() => {
          this.performProjectSave(projectName, projectState, retryCount + 1);
        }, this.options.retryDelay!);
      } else {
        console.error(`❌ Max retries exceeded for auto-save of "${projectName}"`);
        // Could emit an event here for UI notification
      }
    }
  }

  /**
   * Cancel pending autosave for a project
   */
  cancelProjectAutosave(projectName: string): void {
    const key = `project-${projectName}`;
    if (this.saveTimeouts.has(key)) {
      clearTimeout(this.saveTimeouts.get(key)!);
      this.saveTimeouts.delete(key);
    }
  }

  /**
   * Cancel all pending autosaves
   */
  cancelAllAutosaves(): void {
    this.saveTimeouts.forEach(timeout => clearTimeout(timeout));
    this.saveTimeouts.clear();
  }

  /**
   * Force immediate save (bypass debouncing)
   */
  async forceSaveProject(projectName: string, projectState: ProjectState): Promise<void> {
    this.cancelProjectAutosave(projectName);
    await this.performProjectSave(projectName, projectState);
  }
}

// Create singleton instance
export const autosaveManager = new AutosaveManager();

/**
 * Helper function to create project state from app state
 */
export function createProjectState(
  projectId: string,
  projectName: string,
  projectBlocks: Set<'classical' | 'hybrid' | 'quantum'>,
  projectBlockPositions: { [projectId: string]: { [blockType: string]: { x: number; y: number } } },
  projectBlockModes: { [projectId: string]: 'classical' | 'hybrid' | 'quantum' },
  projectBlockParams: { [projectId: string]: any },
  blockMoveCount: { [projectId: string]: number },
  resultsTabs: { [projectId: string]: Array<{ id: string; label: string; data: any }> },
  currentResultsTab: { [projectId: string]: string | null }
): ProjectState {
  const blocks: { [blockType: string]: any } = {};
  
  // Initialize all block types
  ['classical', 'hybrid', 'quantum'].forEach(blockType => {
    const isPlaced = projectBlocks.has(blockType as 'classical' | 'hybrid' | 'quantum');
    const position = projectBlockPositions[projectId]?.[blockType];
    
    // Get parameters for this specific block type
    // For now, we'll use the project-level parameters, but this should be enhanced
    // to store parameters per block type in the future
    const parameters = projectBlockParams[projectId];
    
    blocks[blockType] = {
      placed: isPlaced,
      position: isPlaced && position ? position : null,
      parameters: isPlaced ? parameters : null
    };
  });

  // Get test run IDs from results tabs
  const testRuns = resultsTabs[projectId]?.map(tab => tab.id) || [];

  const projectState = {
    project_id: projectId,
    project_name: projectName,
    blocks,
    ui_state: {
      current_block_mode: projectBlockModes[projectId] || 'classical',
      selected_block: undefined, // Could be enhanced to track selected block
      block_move_count: blockMoveCount[projectId] || 0
    },
    results: {
      test_runs: testRuns,
      current_tab: currentResultsTab[projectId] || undefined
    }
  };

  console.log('Created project state with blocks:', Object.keys(blocks).map(blockType => ({
    blockType,
    placed: blocks[blockType].placed,
    hasPosition: !!blocks[blockType].position,
    hasParameters: !!blocks[blockType].parameters
  })));

  return projectState;
}

/**
 * Helper function to trigger autosave with current app state
 */
export function triggerProjectAutosave(
  projectId: string,
  projectName: string,
  projectBlocks: Set<'classical' | 'hybrid' | 'quantum'>,
  projectBlockPositions: { [projectId: string]: { [blockType: string]: { x: number; y: number } } },
  projectBlockModes: { [projectId: string]: 'classical' | 'hybrid' | 'quantum' },
  projectBlockParams: { [projectId: string]: any },
  blockMoveCount: { [projectId: string]: number },
  resultsTabs: { [projectId: string]: Array<{ id: string; label: string; data: any }> },
  currentResultsTab: { [projectId: string]: string | null }
): void {
  console.log('triggerProjectAutosave called for project:', projectName);
  console.log('projectId:', projectId);
  console.log('projectBlocks Set:', Array.from(projectBlocks));
  console.log('projectBlockPositions:', JSON.stringify(projectBlockPositions, null, 2));
  console.log('projectBlockModes:', JSON.stringify(projectBlockModes, null, 2));
  console.log('projectBlockParams being sent:', JSON.stringify(projectBlockParams, null, 2));
  
  const projectState = createProjectState(
    projectId,
    projectName,
    projectBlocks,
    projectBlockPositions,
    projectBlockModes,
    projectBlockParams,
    blockMoveCount,
    resultsTabs,
    currentResultsTab
  );

  console.log('Final projectState being sent:', JSON.stringify(projectState, null, 2));
  autosaveManager.autosaveProject(projectName, projectState);
} 