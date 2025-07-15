import { useEffect, useCallback } from 'react';

// TypeScript interface defines the shape of our options
interface UseProjectDeletionOptions {
  projectId: string;
  projectName: string;
  onDeleted: () => void;
  checkInterval?: number;
}

/**
 * Custom hook that detects when a specific project has been deleted from the filesystem
 * and calls a callback when it happens.
 * 
 * @param options.projectId - The ID of the project to monitor
 * @param options.projectName - The name of the project (for logging)
 * @param options.onDeleted - Callback function to run when project is deleted
 * @param options.checkInterval - How often to check (default: 2 seconds)
 */
export function useProjectDeletion({
  projectId,
  projectName,
  onDeleted,
  checkInterval = 2000,
}: UseProjectDeletionOptions) {
  
  // useCallback ensures the function reference stays the same between renders
  const checkIfProjectExists = useCallback(async () => {
    try {
      // Try to fetch the specific project
      const response = await fetch(`http://localhost:5001/api/projects/${encodeURIComponent(projectName)}`);
      
      if (!response.ok || response.status === 404) {
        // Project not found - it's been deleted!
        console.log(`Project "${projectName}" has been deleted from filesystem`);
        onDeleted();
        return false;
      }
      
      return true;
    } catch (error) {
      // Network error - we'll assume project still exists
      console.error('Error checking project existence:', error);
      return true;
    }
  }, [projectName, onDeleted]);

  useEffect(() => {
    // Don't set up monitoring if no project ID
    if (!projectId) return;

    let intervalId: NodeJS.Timeout;
    let isActive = true;

    const startMonitoring = async () => {
      // Check immediately
      const exists = await checkIfProjectExists();
      
      // If already deleted, don't set up interval
      if (!exists || !isActive) return;

      // Set up interval to keep checking
      intervalId = setInterval(async () => {
        if (!isActive) return;
        
        const stillExists = await checkIfProjectExists();
        if (!stillExists) {
          // Stop checking once deleted
          clearInterval(intervalId);
        }
      }, checkInterval);
    };

    startMonitoring();

    // Cleanup function runs when component unmounts or dependencies change
    return () => {
      isActive = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [projectId, checkIfProjectExists, checkInterval]);
}