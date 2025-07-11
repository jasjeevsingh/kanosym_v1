import React, { useState, useEffect } from 'react';

interface Project {
  name: string;
  project_id: string;
  created: string;
  last_modified: string;
  description: string;
}

interface TestRun {
  test_run_id: string;
  project_id: string;
  timestamp: string;
  block_type: 'classical' | 'hybrid' | 'quantum';
  parameters: any;
}

interface FileManagerPanelProps {
  onOpenProject: (projectName: string) => void;
  onCloseProject: (projectId: string) => void;
  onOpenTestRun: (testRunId: string) => void;
  onCloseTestRun: (testRunId: string) => void;
  openProjects: { id: string; name: string }[];
  currentProjectId: string;
}

export default function FileManagerPanel({
  onOpenProject,
  onCloseProject,
  onOpenTestRun,
  onCloseTestRun: _onCloseTestRun,
  openProjects,
  currentProjectId: _currentProjectId
}: FileManagerPanelProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'projects' | 'test-runs'>('projects');
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  // Load projects and test runs on mount
  useEffect(() => {
    loadProjects();
    loadTestRuns();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:5001/api/projects');
      const data = await response.json();
      if (data.success) {
        setProjects(data.projects);
      } else {
        setError('Failed to load projects');
      }
    } catch (err) {
      setError('Error loading projects');
      console.error('Error loading projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTestRuns = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:5001/api/test-runs');
      const data = await response.json();
      if (data.success) {
        setTestRuns(data.test_runs);
      } else {
        setError('Failed to load test runs');
      }
    } catch (err) {
      setError('Error loading test runs');
      console.error('Error loading test runs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:5001/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName.trim() })
      });
      const data = await response.json();
      if (data.success) {
        setProjects(prev => [...prev, data.project]);
        setShowNewProjectModal(false);
        setNewProjectName('');
      } else {
        setError(data.error || 'Failed to create project');
      }
    } catch (err) {
      setError('Error creating project');
      console.error('Error creating project:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectName: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:5001/api/projects/${encodeURIComponent(projectName)}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        setProjects(prev => prev.filter(p => p.name !== projectName));
      } else {
        setError(data.error || 'Failed to delete project');
      }
    } catch (err) {
      setError('Error deleting project');
      console.error('Error deleting project:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTestRun = async (testRunId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:5001/api/test-runs/${testRunId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        setTestRuns(prev => prev.filter(t => t.test_run_id !== testRunId));
      } else {
        setError(data.error || 'Failed to delete test run');
      }
    } catch (err) {
      setError('Error deleting test run');
      console.error('Error deleting test run:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString() + ' ' + 
           new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getBlockTypeColor = (blockType: string) => {
    switch (blockType) {
      case 'classical': return 'bg-zinc-600';
      case 'hybrid': return 'bg-purple-600';
      case 'quantum': return 'bg-blue-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div className="h-full bg-zinc-900 text-zinc-100 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">File Manager</h2>
          <button
            onClick={() => setShowNewProjectModal(true)}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded"
            title="Create New Project"
          >
            +
          </button>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-700">
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'projects' 
                ? 'text-blue-400 border-b-2 border-blue-400' 
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Projects ({projects.length})
          </button>
          <button
            onClick={() => setActiveTab('test-runs')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'test-runs' 
                ? 'text-blue-400 border-b-2 border-blue-400' 
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Test Runs ({testRuns.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400 mx-auto"></div>
            <p className="text-zinc-400 mt-2">Loading...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="space-y-2">
            {projects.map(project => {
              const isOpen = openProjects.some(p => p.id === project.project_id);
              return (
                <div key={project.project_id} className="bg-zinc-800 rounded p-3 border border-zinc-700">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-zinc-100 truncate">{project.name}</h3>
                    <div className="flex items-center space-x-2">
                      {isOpen && (
                        <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                          Open
                        </span>
                      )}
                      <button
                        onClick={() => onOpenProject(project.name)}
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
                        disabled={isOpen}
                      >
                        {isOpen ? 'Opened' : 'Open'}
                      </button>
                      {isOpen && (
                        <button
                          onClick={() => onCloseProject(project.project_id)}
                          className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded"
                        >
                          Close
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-zinc-400 space-y-1">
                    <div>Created: {formatDate(project.created)}</div>
                    <div>Modified: {formatDate(project.last_modified)}</div>
                    <div className="truncate">{project.description}</div>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={() => handleDeleteProject(project.name)}
                      className="text-xs text-red-400 hover:text-red-300"
                      title="Delete Project"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
            {projects.length === 0 && !loading && (
              <div className="text-center py-8 text-zinc-400">
                <p>No projects found</p>
                <p className="text-sm mt-2">Create a new project to get started</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'test-runs' && (
          <div className="space-y-2">
            {testRuns.map(testRun => (
              <div key={testRun.test_run_id} className="bg-zinc-800 rounded p-3 border border-zinc-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs px-2 py-1 rounded text-white ${getBlockTypeColor(testRun.block_type)}`}>
                      {testRun.block_type}
                    </span>
                    <span className="text-xs text-zinc-400">{testRun.test_run_id}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onOpenTestRun(testRun.test_run_id)}
                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => handleDeleteTestRun(testRun.test_run_id)}
                      className="text-xs text-red-400 hover:text-red-300"
                      title="Delete Test Run"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className="text-xs text-zinc-400 space-y-1">
                  <div>Created: {formatDate(testRun.timestamp)}</div>
                  <div>Project: {testRun.project_id}</div>
                  {testRun.parameters && (
                    <div className="truncate">
                      {testRun.parameters.param} of {testRun.parameters.asset}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {testRuns.length === 0 && !loading && (
              <div className="text-center py-8 text-zinc-400">
                <p>No test runs found</p>
                <p className="text-sm mt-2">Run tests to see results here</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-zinc-800 rounded-lg shadow-lg p-6 min-w-[320px] border border-zinc-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-zinc-100">Create New Project</h3>
              <button
                onClick={() => setShowNewProjectModal(false)}
                className="text-zinc-400 hover:text-zinc-200 text-xl font-bold"
              >
                ×
              </button>
            </div>
            <form onSubmit={e => { e.preventDefault(); handleCreateProject(); }}>
              <input
                className="w-full border border-zinc-600 rounded px-3 py-2 outline-none focus:border-blue-500 bg-zinc-700 text-zinc-100"
                placeholder="Project Name"
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  className="px-4 py-2 rounded bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                  onClick={() => setShowNewProjectModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-green-600 text-white font-bold hover:bg-green-700"
                  disabled={!newProjectName.trim() || loading}
                >
                  {loading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 