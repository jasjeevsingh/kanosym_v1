import React, { useState, useEffect, useRef } from 'react';
import FlipMove from 'react-flip-move';

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

interface ProjectExplorerPanelProps {
  onOpenProject: (projectName: string) => void;
  onCloseProject: (projectId: string) => void;
  onOpenTestRun: (testRunId: string) => void;
  onCloseTestRun: (testRunId: string) => void;
  openProjects: { id: string; name: string }[];
  currentProjectId: string;
  refreshTrigger?: number;
}

export default function ProjectExplorerPanel({
  onOpenProject,
  onCloseProject,
  onOpenTestRun,
  onCloseTestRun: _onCloseTestRun,
  openProjects,
  currentProjectId: _currentProjectId,
  refreshTrigger
}: ProjectExplorerPanelProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  // Removed loading animations
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'projects' | 'test-runs'>('projects');
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [editProjectName, setEditProjectName] = useState('');
  

  // Add at the top of the component
  const [expandedFileTreeProjectId, setExpandedFileTreeProjectId] = useState<string | null>(null);
  const [fileTrees, setFileTrees] = useState<{ [projectId: string]: any }>({});
  const [expandedFolders, setExpandedFolders] = useState<{ [key: string]: boolean }>({});
  const [fileContextMenu, setFileContextMenu] = useState<{ x: number; y: number; projectId: string; filePath: string } | null>(null);
  const fileContextMenuRef = useRef<HTMLDivElement | null>(null);

  // Load projects and test runs on mount and when refreshTrigger changes
  useEffect(() => {
    console.log('ProjectExplorerPanel: refreshTrigger changed to', refreshTrigger);
    loadProjects();
    // Add a small delay before loading test runs to ensure they're fully saved
    setTimeout(() => {
      loadTestRuns();
    }, 200);
  }, [refreshTrigger]);

  const loadProjects = async () => {
    console.log('Loading projects...');
    setError(null);
    try {
      const response = await fetch('http://localhost:5001/api/projects');
      const data = await response.json();
      console.log('Loaded projects:', data);
      if (data.success) {
        setProjects(data.projects);
      } else {
        setError('Failed to load projects');
      }
    } catch (err) {
      setError('Error loading projects');
      console.error('Error loading projects:', err);
    }
  };

  const loadTestRuns = async () => {
    console.log('Loading test runs...');
    setError(null);
    try {
      const response = await fetch('http://localhost:5001/api/test-runs');
      const data = await response.json();
      console.log('Test runs API response:', data);
      if (data.success) {
        console.log(`Setting ${data.test_runs.length} test runs`);
        setTestRuns(data.test_runs);
      } else {
        setError('Failed to load test runs');
      }
    } catch (err) {
      setError('Error loading test runs');
      console.error('Error loading test runs:', err);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    
    setError(null);
    try {
      const response = await fetch('http://localhost:5001/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName.trim() })
      });
      const data = await response.json();
      console.log('Create project response:', data);
      if (data.success && data.project && data.project.metadata) {
        // Extract the project data from the nested structure
        const newProject: Project = {
          name: data.project.metadata.name,
          project_id: data.project.metadata.project_id,
          created: data.project.metadata.created,
          last_modified: data.project.metadata.last_modified,
          description: data.project.metadata.description
        };
        console.log('Adding project to list:', newProject);
        setProjects(prev => {
          const updated = [...prev, newProject];
          console.log('Updated projects list:', updated);
          return updated;
        });
        setShowNewProjectModal(false);
        setNewProjectName('');
      } else {
        setError(data.error || 'Failed to create project');
      }
    } catch (err) {
      setError('Error creating project');
      console.error('Error creating project:', err);
    }
  };

  const handleDeleteProject = async (projectName: string) => {
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
    }
  };

  const handleDeleteTestRun = async (testRunId: string) => {
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

  // Sort projects so open projects are at the top, in the order of openProjects
  const openProjectIds = openProjects.map(p => p.id);
  const sortedProjects = [
    ...openProjectIds
      .map(id => projects.find(p => p.project_id === id))
      .filter(Boolean),
    ...projects.filter(p => !openProjectIds.includes(p.project_id))
  ];

  const [uploadStatus, setUploadStatus] = useState<{ [projectId: string]: string | null }>({});
  const fileInputRefs = useRef<{ [projectId: string]: HTMLInputElement | null }>({});

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    projectId: string,
    projectName: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadStatus(prev => ({ ...prev, [projectId]: null }));
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`http://localhost:5001/api/projects/${encodeURIComponent(projectName)}/files`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
    //   if (res.ok && data.success) {
    //     // Show success modal
    //     setUploadedFileName(file.name);
    //     setShowUploadSuccessModal(true);
        
    //     // Refresh the file tree to show the new file
    //     const fileTreeRes = await fetch(`http://localhost:5001/api/projects/${encodeURIComponent(projectName)}/files`);
    //     const fileTreeData = await fileTreeRes.json();
    //     setFileTrees(prev => ({ ...prev, [projectId]: fileTreeData }));
        
    //     // If file tree was already expanded, keep it expanded
    //     if (expandedFileTreeProjectId !== projectId) {
    //       setExpandedFileTreeProjectId(projectId);
    //     }
    //   } else {
    //     setUploadStatus(prev => ({ ...prev, [projectId]: data.error || 'Upload failed' }));
    //   }
    } catch (err) {
      setUploadStatus(prev => ({ ...prev, [projectId]: 'Upload failed' }));
    }
    
    // Reset the file input
    e.target.value = '';
  };

  const handleToggleFileTree = async (projectId: string, projectName: string) => {
    if (expandedFileTreeProjectId === projectId) {
      setExpandedFileTreeProjectId(null);
      return;
    }
    // Always fetch fresh file tree data instead of using cache
    try {
      const res = await fetch(`http://localhost:5001/api/projects/${encodeURIComponent(projectName)}/files`);
      const data = await res.json();
      setFileTrees(prev => ({ ...prev, [projectId]: data }));
    } catch {
      setFileTrees(prev => ({ ...prev, [projectId]: null }));
    }
    setExpandedFileTreeProjectId(projectId);
  };

  const handleToggleFolder = (folderKey: string) => {
    setExpandedFolders(prev => ({ ...prev, [folderKey]: !prev[folderKey] }));
  };

  const handleFileDelete = async (projectId: string, projectName: string, filePath: string) => {
    console.log('Deleting file:', { projectId, projectName, filePath });
    try {
      const res = await fetch(`http://localhost:5001/api/projects/${encodeURIComponent(projectName)}/files`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: filePath })
      });
      if (res.ok) {
        // Refresh file tree
        const res2 = await fetch(`http://localhost:5001/api/projects/${encodeURIComponent(projectName)}/files`);
        const data2 = await res2.json();
        setFileTrees(prev => ({ ...prev, [projectId]: data2 }));
      }
    } catch {}
    setFileContextMenu(null);
  };

  // Recursive file tree renderer
  const renderFileTree = (node: any, parentKey: string, projectId?: string, projectName?: string) => {
    if (!node) return null;
    const isFolder = node.type === 'folder';
    const folderKey = parentKey + '/' + node.name;
    if (isFolder) {
      const expanded = expandedFolders[folderKey] ?? true; // root expanded by default
      return (
        <div key={folderKey} className="mb-1">
          <div
            className="flex items-center cursor-pointer select-none"
            onClick={() => handleToggleFolder(folderKey)}
          >
            <span className="mr-1 text-xs" style={{ width: 14, display: 'inline-block', textAlign: 'center' }}>{expanded ? '▼' : '▶'}</span>
            <span className="mr-1" style={{ width: 16, display: 'inline-block', textAlign: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 13V3.5A1.5 1.5 0 0 1 3.5 2h3.379a1.5 1.5 0 0 1 1.06.44l.621.62A1.5 1.5 0 0 0 9.62 3.5H13.5A1.5 1.5 0 0 1 15 5v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1Z" fill="#FFD700" stroke="#B8860B"/></svg>
            </span>
            <span className="font-semibold text-zinc-200 text-xs">{node.name}</span>
          </div>
          {expanded && node.children && (
            <ul className="pl-6 mt-1">
              {node.children.map((child: any) => (
                <li key={child.name}>
                  {renderFileTree(child, folderKey, projectId, projectName)}
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    } else {
      return (
        <div
          key={parentKey + '/' + node.name}
          className="text-xs text-zinc-300 py-0.5 rounded hover:bg-zinc-700 cursor-pointer transition-colors"
          onContextMenu={e => {
            e.preventDefault();
            if (projectId && projectName) {
              // Compute the relative path inside the project folder
              let relPath = parentKey.replace(/^.*?\//, '') + '/' + node.name;
              // Remove the project name if present at the start
              relPath = relPath.replace(new RegExp(`^${projectName}/?`), '');
              setFileContextMenu({
                x: e.clientX,
                y: e.clientY,
                projectId,
                filePath: relPath
              });
            }
          }}
        >
          {node.name}
        </div>
      );
    }
  };

  useEffect(() => {
    if (!fileContextMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (
        fileContextMenuRef.current &&
        !fileContextMenuRef.current.contains(e.target as Node)
      ) {
        setFileContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, [fileContextMenu]);

  return (
    <div className="h-full bg-zinc-900 text-zinc-100 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Project Explorer</h2>
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
        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="space-y-2">
            <FlipMove className="space-y-2" disableAllAnimations>
              {sortedProjects.filter((project): project is Project => !!project && !!project.project_id).map(project => {
                const isOpen = openProjects.some(p => p.id === project.project_id);
                const showFileTree = expandedFileTreeProjectId === project.project_id;
                const fileTree = fileTrees[project.project_id];
                return (
                  <div key={project.project_id} className={`bg-zinc-800 rounded p-3 border border-zinc-700 mb-2 transition-shadow ${isOpen ? 'border-green-500 shadow-[0_0_8px_2px_rgba(34,197,94,0.6)]' : ''}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-zinc-100 truncate" title={project.name}>{project.name}</h3>
                        <div className="text-xs text-zinc-500 font-mono">{project.project_id}</div>
                      </div>
                      <div className="flex items-center space-x-2 ml-2">
                        {isOpen ? (
                          <>
                            <button
                              onClick={() => { setEditProject(project); setEditProjectName(project.name); }}
                              className="text-xs px-2 py-1 rounded bg-yellow-400 text-zinc-900 font-semibold hover:bg-yellow-300"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => onCloseProject(project.project_id)}
                              className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded"
                            >
                              Close
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => onOpenProject(project.name)}
                            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
                          >
                            Open
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-zinc-400 space-y-1">
                      <div>Created: {formatDate(project.created)}</div>
                      <div>Modified: {formatDate(project.last_modified)}</div>
                    </div>
                    {/* View Project Files button and file tree */}
                    {isOpen && (
                      <div className="mt-2">
                        <button
                          className="text-xs text-blue-400 hover:underline focus:outline-none"
                          onClick={() => handleToggleFileTree(project.project_id, project.name)}
                        >
                          {showFileTree ? 'Hide Project Files' : 'View Project Files'}
                        </button>
                        {showFileTree && fileTree && (
                          <div className="mt-2 pl-2">
                            {renderFileTree(fileTree, project.project_id, project.project_id, project.name)}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      {/* Import File Button bottom left */}
                      {isOpen ? (
                        <div>
                          <button
                            className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
                            onClick={() => fileInputRefs.current[project.project_id]?.click()}
                            title="Import file into project"
                          >
                            Import File
                          </button>
                          <input
                            type="file"
                            ref={el => { fileInputRefs.current[project.project_id] = el; }}
                            style={{ display: 'none' }}
                            onChange={e => handleFileChange(e, project.project_id, project.name)}
                          />
                        </div>
                      ) : <div />}
                      <button
                        onClick={() => setProjectToDelete(project)}
                        className={isOpen
                          ? "text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded"
                          : "text-xs text-red-400 hover:text-red-300"}
                        title="Delete Project"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </FlipMove>
            {projects.length === 0 && (
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
                  <div>Project: {projects.find(p => p.project_id === testRun.project_id)?.name || testRun.project_id}</div>
                  {testRun.parameters && (
                    <div className="truncate">
                      {testRun.parameters.param} of {testRun.parameters.asset}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {testRuns.length === 0 && (
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
                  disabled={!newProjectName.trim()}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-8 min-w-[320px] min-h-[120px] relative">
            <button
              className="absolute top-2 right-2 text-zinc-500 hover:text-zinc-800 text-xl font-bold"
              onClick={() => setEditProject(null)}
            >
              ×
            </button>
            <div className="text-lg font-bold mb-4 text-zinc-800">Rename Project</div>
            <form onSubmit={async e => {
              e.preventDefault();
              if (!editProjectName.trim()) return;
              // Call backend to rename project
              try {
                const response = await fetch(`http://localhost:5001/api/projects/${encodeURIComponent(editProject.name)}/rename`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ new_name: editProjectName.trim() })
                });
                const data = await response.json();
                if (data.success) {
                  setProjects(prev => prev.map(p => p.project_id === editProject.project_id ? { ...p, name: editProjectName.trim() } : p));
                  setEditProject(null);
                } else {
                  alert('Failed to rename project: ' + data.error);
                }
              } catch (error) {
                alert('Error renaming project');
              }
            }}>
              <input
                className="w-full border border-zinc-300 rounded px-3 py-2 outline-none focus:border-blue-500"
                placeholder="Project Name"
                value={editProjectName}
                onChange={e => setEditProjectName(e.target.value)}
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  className="px-4 py-2 rounded bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
                  onClick={() => setEditProject(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-yellow-500 text-white font-bold hover:bg-yellow-400"
                  disabled={!editProjectName.trim()}
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-8 min-w-[320px] min-h-[120px] relative">
            <button
              className="absolute top-2 right-2 text-zinc-500 hover:text-zinc-800 text-xl font-bold"
              onClick={() => setProjectToDelete(null)}
            >
              ×
            </button>
            <div className="text-lg font-bold mb-4 text-zinc-800">Delete Project</div>
            <div className="mb-4 text-zinc-700">Are you sure you want to delete <span className="font-bold">{projectToDelete.name}</span>? This action cannot be undone.</div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
                onClick={() => setProjectToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded bg-red-600 text-white font-bold hover:bg-red-700"
                onClick={async () => {
                  await handleDeleteProject(projectToDelete.name);
                  setProjectToDelete(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Render file context menu */}
      {fileContextMenu && (
        <div
          ref={fileContextMenuRef}
          style={{ position: 'fixed', left: fileContextMenu.x, top: fileContextMenu.y, zIndex: 1000 }}
          className="bg-white rounded shadow border border-zinc-200 min-w-[120px]"
          onClick={() => setFileContextMenu(null)}
        >
          <button
            className="w-full text-left px-4 py-2 hover:bg-red-100 text-red-700"
            onClick={e => {
              e.stopPropagation();
              handleFileDelete(fileContextMenu.projectId, openProjects.find(p => p.id === fileContextMenu.projectId)?.name || '', fileContextMenu.filePath);
            }}
          >
            Delete
          </button>
        </div>
      )}

      {/* Upload Success Modal */}
      {/* {showUploadSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-zinc-800 rounded-lg shadow-lg p-6 min-w-[320px] border border-zinc-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-green-400">Upload Successful!</h3>
              <button
                onClick={() => setShowUploadSuccessModal(false)}
                className="text-zinc-400 hover:text-zinc-200 text-xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="text-zinc-100 mb-4">
              <p className="mb-2">File <span className="font-mono text-blue-400">{uploadedFileName}</span> has been uploaded successfully.</p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowUploadSuccessModal(false)}
                className="px-4 py-2 rounded bg-green-600 text-white font-bold hover:bg-green-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
} 