import { useEffect, useRef, useCallback } from 'react';

interface ProjectPollingOptions {
  projectName: string | null;
  enabled: boolean;
  onProjectChanged: () => void;
  pollingInterval?: number;
}

export function useProjectPolling({
  projectName,
  enabled,
  onProjectChanged,
  pollingInterval = 1000, // Default 1 second
}: ProjectPollingOptions) {
  const lastModifiedRef = useRef<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkForChanges = useCallback(async () => {
    if (!projectName || !enabled) return;

    try {
      const response = await fetch(
        `http://localhost:5001/api/projects/${encodeURIComponent(projectName)}/last-modified`
      );
      
      if (!response.ok) return;
      
      const data = await response.json();
      if (data.success && data.last_modified) {
        // First time checking
        if (lastModifiedRef.current === null) {
          lastModifiedRef.current = data.last_modified;
          return;
        }
        
        // Check if project has been modified
        if (data.last_modified !== lastModifiedRef.current) {
          console.log(`Project "${projectName}" has been modified`);
          lastModifiedRef.current = data.last_modified;
          onProjectChanged();
        }
      }
    } catch (error) {
      console.error('Error checking project changes:', error);
    }
  }, [projectName, enabled, onProjectChanged]);

  useEffect(() => {
    if (!enabled || !projectName) {
      // Clear interval if disabled or no project
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial check
    checkForChanges();

    // Set up polling interval
    intervalRef.current = setInterval(checkForChanges, pollingInterval);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, projectName, pollingInterval, checkForChanges]);

  // Reset last modified when project changes
  useEffect(() => {
    lastModifiedRef.current = null;
  }, [projectName]);
}

// Hook for polling all projects for changes
export function useProjectListPolling({
  enabled,
  onProjectsChanged,
  pollingInterval = 2000, // Default 2 seconds for list polling
}: {
  enabled: boolean;
  onProjectsChanged: () => void;
  pollingInterval?: number;
}) {
  const projectCountRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkForChanges = useCallback(async () => {
    if (!enabled) return;

    try {
      const response = await fetch('http://localhost:5001/api/projects');
      
      if (!response.ok) return;
      
      const data = await response.json();
      if (data.success && data.projects) {
        const currentCount = data.projects.length;
        
        // First time checking
        if (projectCountRef.current === null) {
          projectCountRef.current = currentCount;
          return;
        }
        
        // Check if project count has changed
        if (currentCount !== projectCountRef.current) {
          console.log(`Project count changed: ${projectCountRef.current} -> ${currentCount}`);
          projectCountRef.current = currentCount;
          onProjectsChanged();
        }
      }
    } catch (error) {
      console.error('Error checking project list changes:', error);
    }
  }, [enabled, onProjectsChanged]);

  useEffect(() => {
    if (!enabled) {
      // Clear interval if disabled
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial check
    checkForChanges();

    // Set up polling interval
    intervalRef.current = setInterval(checkForChanges, pollingInterval);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, pollingInterval, checkForChanges]);
}

// Hook for polling test runs for changes
export function useTestRunPolling({
  enabled,
  onTestRunsChanged,
  pollingInterval = 2000, // Default 2 seconds for test run polling
}: {
  enabled: boolean;
  onTestRunsChanged: () => void;
  pollingInterval?: number;
}) {
  const testRunCountRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkForChanges = useCallback(async () => {
    if (!enabled) return;

    try {
      const response = await fetch('http://localhost:5001/api/test-runs');
      
      if (!response.ok) return;
      
      const data = await response.json();
      if (data.success && data.test_runs) {
        const currentCount = data.test_runs.length;
        
        // First time checking
        if (testRunCountRef.current === null) {
          testRunCountRef.current = currentCount;
          return;
        }
        
        // Check if test run count has changed
        if (currentCount !== testRunCountRef.current) {
          console.log(`Test run count changed: ${testRunCountRef.current} -> ${currentCount}`);
          testRunCountRef.current = currentCount;
          onTestRunsChanged();
        }
      }
    } catch (error) {
      console.error('Error checking test run changes:', error);
    }
  }, [enabled, onTestRunsChanged]);

  useEffect(() => {
    if (!enabled) {
      // Clear interval if disabled
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial check
    checkForChanges();

    // Set up polling interval
    intervalRef.current = setInterval(checkForChanges, pollingInterval);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, pollingInterval, checkForChanges]);
}