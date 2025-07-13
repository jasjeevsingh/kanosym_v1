import React, { useState, useRef, useEffect } from 'react';
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragOverlay,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import PortfolioInput from './PortfolioInput';
import PerturbControls from './PerturbControls';
import ResultsChart from './ResultsChart';
import NoiraPanel from './NoiraPanel';
import ProjectExplorerPanel from './ProjectExplorerPanel';
import { triggerProjectAutosave, autosaveManager, createProjectState } from './autosave';

// Block color scheme by mode (move to top-level scope)
const blockModeStyles = {
  classical: 'bg-zinc-800 text-white border-zinc-600',
  hybrid: 'bg-purple-700 text-white border-purple-400',
  quantum: 'bg-blue-700 text-white border-blue-400',
};

function FileExplorer({ files, selected, onSelect, onChooseFolder, currentPath, onKsmDoubleClick, projects, onBack, onShowNewProject, onProjectFolderContextMenu }: { files: FileNode[]; selected: string | null; onSelect: (id: string) => void; onChooseFolder: () => void; currentPath: string | null; onKsmDoubleClick: (projectId: string) => void; projects: { id: string; name: string }[]; onBack: () => void; onShowNewProject: () => void; onProjectFolderContextMenu?: (project: { id: string; name: string }, e: React.MouseEvent) => void }) {
  return (
    <div className="h-full w-full bg-zinc-900 text-zinc-200 flex flex-col overflow-y-auto border-r border-zinc-800" style={{ fontFamily: 'Menlo, Monaco, Courier New, monospace', fontSize: 13 }}>
      <div className="flex items-center justify-between px-4 pt-4">
        <span className="font-bold text-xs tracking-widest text-zinc-400" style={{ letterSpacing: 1 }}>EXPLORER</span>
        <button
          className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded ml-2"
          onClick={onChooseFolder}
        >
          Choose Folder
        </button>
      </div>
      {currentPath && (
        <div className="flex items-center px-4 mt-2 mb-1">
          <button
            className="mr-2 text-zinc-400 hover:text-blue-500 text-lg font-bold"
            title="Back"
            onClick={onBack}
          >
            ←
          </button>
          <span className="text-xs text-zinc-400 break-all">{currentPath}</span>
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-2 pb-2 flex flex-col">
        {/* Folder contents (if any) */}
        {files.length > 0 && currentPath && (
          <FileTree nodes={files} selected={selected} onSelect={onSelect} onKsmDoubleClick={onKsmDoubleClick} projects={projects} onProjectFolderContextMenu={onProjectFolderContextMenu} />
        )}
        {/* Projects heading and plus button */}
        <div className="flex items-center mt-2 mb-1">
          <span className="text-xs font-bold text-zinc-400 tracking-widest">PROJECTS</span>
          <button
            className="ml-auto text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded flex items-center"
            title="New Project"
            onClick={onShowNewProject}
          >
            <span className="text-lg font-bold">+</span>
          </button>
        </div>
        {/* Projects list (when not in a folder, or always show) */}
        {!currentPath && (
          <FileTree nodes={files} selected={selected} onSelect={onSelect} onKsmDoubleClick={onKsmDoubleClick} projects={projects} onProjectFolderContextMenu={onProjectFolderContextMenu} />
        )}
      </div>
    </div>
  );
}

// File/folder node type
interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

function FileTree({ nodes, selected, onSelect, onKsmDoubleClick, projects, level = 0, onProjectFolderContextMenu }: { nodes: FileNode[]; selected: string | null; onSelect: (id: string) => void; onKsmDoubleClick: (projectId: string) => void; projects: { id: string; name: string }[]; level?: number; onProjectFolderContextMenu?: (project: { id: string; name: string }, e: React.MouseEvent) => void }) {
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});

  function toggleFolder(id: string) {
    setOpenFolders(prev => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <ul className="pl-0">
      {nodes.map(node => {
        // Is this a project folder?
        const project = projects.find(p => node.name === p.name && node.type === 'folder');
        return (
          <li key={node.id} className="mb-0.5">
            {node.type === 'folder' ? (
              <div
                className={`flex items-center cursor-pointer select-none rounded px-1 py-0.5 hover:bg-zinc-800 ${level === 0 ? 'font-semibold' : ''}`}
                style={{ paddingLeft: `${level * 16 + 4}px`, minHeight: 22 }}
                onClick={() => toggleFolder(node.id)}
                onContextMenu={project ? (e => { e.preventDefault(); onProjectFolderContextMenu && onProjectFolderContextMenu(project, e); }) : undefined}
              >
                <span className="mr-1 text-xs" style={{ width: 14, display: 'inline-block', textAlign: 'center' }}>{openFolders[node.id] ? '▼' : '▶'}</span>
                <span className="mr-1" style={{ width: 16, display: 'inline-block', textAlign: 'center' }}>
                  {openFolders[node.id] ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 13V3.5A1.5 1.5 0 0 1 3.5 2h3.379a1.5 1.5 0 0 1 1.06.44l.621.62A1.5 1.5 0 0 0 9.62 3.5H13.5A1.5 1.5 0 0 1 15 5v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1Z" fill="#FFD700" stroke="#B8860B"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 13V3.5A1.5 1.5 0 0 1 3.5 2h3.379a1.5 1.5 0 0 1 1.06.44l.621.62A1.5 1.5 0 0 0 9.62 3.5H13.5A1.5 1.5 0 0 1 15 5v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1Z" fill="#F4E2B6" stroke="#B8860B"/></svg>
                  )}
                </span>
                <span className="flex-1 overflow-hidden whitespace-nowrap text-ellipsis">{node.name}</span>
              </div>
            ) : (
              <div
                className={`flex items-center pl-7 cursor-pointer rounded px-1 py-0.5 ${selected === node.id ? 'bg-blue-600 text-white' : 'hover:bg-zinc-800'} transition`}
                style={{ paddingLeft: `${level * 16 + 28}px`, minHeight: 22 }}
                onClick={() => onSelect(node.id)}
                onDoubleClick={() => {
                  if (node.name.endsWith('.ksm')) {
                    const projectName = node.name.replace(/\.ksm$/, '');
                    const project = projects.find((p: { id: string; name: string }) => p.name === projectName);
                    if (project) onKsmDoubleClick(project.id);
                  }
                }}
              >
                <span className="mr-1" style={{ width: 16, display: 'inline-block', textAlign: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="12" height="12" rx="2" fill="#B0BEC5" stroke="#607D8B"/></svg>
                </span>
                <span className="flex-1 overflow-hidden whitespace-nowrap text-ellipsis">{node.name}</span>
              </div>
            )}
            {node.type === 'folder' && openFolders[node.id] && node.children && (
              <FileTree nodes={node.children} selected={selected} onSelect={onSelect} onKsmDoubleClick={onKsmDoubleClick} projects={projects} level={level + 1} onProjectFolderContextMenu={onProjectFolderContextMenu} />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function ProjectsSidebar({ projects, openProject, currentProjectId }: { projects: { id: string; name: string }[]; openProject: (id: string) => void; currentProjectId: string }) {
  return (
    <div className="mb-4">
      <div className="text-xs font-bold text-zinc-400 px-2 mb-1 tracking-widest">PROJECTS</div>
      <ul>
        {projects.map(p => (
          <li key={p.id}>
            <button
              className={`w-full text-left px-3 py-1 rounded text-sm ${currentProjectId === p.id ? 'bg-blue-600 text-white' : 'hover:bg-zinc-800 text-zinc-200'}`}
              onClick={() => openProject(p.id)}
            >
              {p.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProjectTabs({ openProjects, currentProjectId, setCurrentProjectId, closeProject }: { openProjects: { id: string; name: string }[]; currentProjectId: string; setCurrentProjectId: (id: string) => void; closeProject: (id: string) => void }) {
  return (
    <div className="flex items-end border-b border-zinc-800 bg-zinc-900 px-2" style={{ minHeight: 36 }}>
      {openProjects.map(p => (
        <div key={p.id} className={`flex items-center mr-2 ${currentProjectId === p.id ? 'border-b-2 border-blue-500' : ''}`}> 
          <button
            className={`px-3 py-1 rounded-t text-sm font-medium ${currentProjectId === p.id ? 'bg-zinc-800 text-blue-500' : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'}`}
            onClick={() => setCurrentProjectId(p.id)}
          >
            {p.name}
          </button>
          <button
            className="ml-1 text-xs text-zinc-400 hover:text-red-500"
            onClick={() => closeProject(p.id)}
            title="Close project"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

function ResizableSidebar({ children, min = 160, max = 400, initial = 224 }: { children: React.ReactNode; min?: number; max?: number; initial?: number }) {
  const [width, setWidth] = useState(initial);
  const dragging = useRef(false);

  function onMouseDown(e: React.MouseEvent) {
    dragging.current = true;
    document.body.style.cursor = 'col-resize';
  }
  function onMouseMove(e: MouseEvent) {
    if (dragging.current) {
      setWidth(w => Math.max(min, Math.min(max, e.clientX)));
    }
  }
  function onMouseUp() {
    dragging.current = false;
    document.body.style.cursor = '';
  }
  React.useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);
  return (
    <div style={{ width, minWidth: min, maxWidth: max }} className="relative h-full flex-shrink-0">
      {children}
      <div
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize z-10 bg-zinc-800 hover:bg-blue-500 transition"
        onMouseDown={onMouseDown}
        style={{ userSelect: 'none' }}
      />
    </div>
  );
}

function SensitivityTestBlock({ isDragging = false, onContextMenu, mode = 'classical' }: { isDragging?: boolean; onContextMenu?: (e: React.MouseEvent) => void; mode?: 'classical' | 'hybrid' | 'quantum' }) {
  return (
    <div
      style={{
        resize: 'none',
        width: 'fit-content',
        minWidth: '190px',
        maxWidth: '190px',
        padding: '6px 12px',
        fontSize: '14px',
        whiteSpace: 'nowrap',
      }}
      className={`rounded shadow mr-2 cursor-pointer transition select-none border-2 ${blockModeStyles[mode]} ${isDragging ? 'opacity-50' : ''}`}
      onContextMenu={onContextMenu}
    >
      Portfolio Sensitivity Test
    </div>
  );
}

function DraggableBlock({ id, onContextMenu, mode = 'classical' }: { id: string; onContextMenu?: (e: React.MouseEvent) => void; mode?: 'classical' | 'hybrid' | 'quantum' }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}>
      <SensitivityTestBlock isDragging={isDragging} onContextMenu={onContextMenu} mode={mode} />
    </div>
  );
}

function MainPage({ hasBlock, blockPosition, onEditRequest, showRunButton, onRunModel, isSelected, onSelect, onDeselect, blockMode, currentProjectId, isBlockTypePlaced, projectBlockPositions, projectBlockModes, openProjects, projectBlocks, projectBlockParams, blockMoveCount, resultsTabs, currentResultsTab, setProjectBlockPositions, setBlockMoveCount, triggerProjectAutosave }: {
  hasBlock: boolean;
  blockPosition: { x: number; y: number } | null;
  onEditRequest: (e: React.MouseEvent, blockType?: 'classical' | 'hybrid' | 'quantum') => void;
  showRunButton?: boolean;
  onRunModel?: () => void;
  isSelected: boolean;
  onSelect: () => void;
  onDeselect: () => void;
  blockMode: 'classical' | 'hybrid' | 'quantum';
  currentProjectId: string;
  isBlockTypePlaced: (projectId: string, blockType: 'classical' | 'hybrid' | 'quantum') => boolean;
  projectBlockPositions: { [projectId: string]: { [blockType: string]: { x: number; y: number } } };
  projectBlockModes: { [projectId: string]: 'classical' | 'hybrid' | 'quantum' };
  openProjects: Array<{ id: string; name: string }>;
  projectBlocks: { [projectId: string]: Set<'classical' | 'hybrid' | 'quantum'> };
  projectBlockParams: { [projectId: string]: { [blockType: string]: any } };
  blockMoveCount: { [projectId: string]: number };
  resultsTabs: { [projectId: string]: Array<{ id: string; label: string; data: any }> };
  currentResultsTab: { [projectId: string]: string | null };
  setProjectBlockPositions: React.Dispatch<React.SetStateAction<{ [projectId: string]: { [blockType: string]: { x: number; y: number } } }>>;
  setBlockMoveCount: React.Dispatch<React.SetStateAction<{ [projectId: string]: number }>>;
  triggerProjectAutosave: typeof triggerProjectAutosave;
}) {
  // Add CSS for hiding scrollbars
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .scrollbar-hide::-webkit-scrollbar {
        display: none;
      }
      .scrollbar-hide {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);
  const { setNodeRef, isOver } = useDroppable({ id: 'center-dropzone' });
  const handleContextMenu = (e: React.MouseEvent, blockType: 'classical' | 'hybrid' | 'quantum') => {
    e.preventDefault();
    e.stopPropagation();
    onEditRequest(e, blockType);
  };
  
  // Track which block is selected
  const [selectedBlockType, setSelectedBlockType] = useState<'classical' | 'hybrid' | 'quantum' | null>(null);

  // Get all placed blocks for this project
  const placedBlocks = projectBlockPositions[currentProjectId] || {};
  const hasAnyBlocks = Object.keys(placedBlocks).length > 0;
  // Drag logic for block
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStart = useRef<{ mouseX: number; mouseY: number; blockX: number; blockY: number } | null>(null);
  const [tempDragPosition, setTempDragPosition] = useState<{ [blockType: string]: { x: number; y: number } } | null>(null);
  
  function handleMouseDown(e: React.MouseEvent, blockType: string) {
    console.log('handleMouseDown called for block:', blockType);
    const blockPos = placedBlocks[blockType];
    if (blockPos) {
      // Get the block element to calculate click offset
      const blockElement = e.currentTarget.parentElement;
      const rect = blockElement?.getBoundingClientRect();
      const parentRect = blockElement?.parentElement?.getBoundingClientRect();
      
      if (rect && parentRect) {
        // Calculate where in the block the user clicked
        const clickOffsetX = e.clientX - rect.left;
        const clickOffsetY = e.clientY - rect.top;
        
        console.log('Starting drag from position:', blockPos, 'with click offset:', clickOffsetX, clickOffsetY);
        setDragging(true);
        dragStart.current = { 
          mouseX: e.clientX, 
          mouseY: e.clientY,
          blockX: blockPos.x,
          blockY: blockPos.y
        };
        // Store the offset so we can maintain it during drag
        setDragOffset({ x: clickOffsetX, y: clickOffsetY });
      }
      e.stopPropagation();
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (dragging && dragStart.current && selectedBlockType) {
      // Calculate the total mouse movement from start
      const dx = e.clientX - dragStart.current.mouseX;
      const dy = e.clientY - dragStart.current.mouseY;
      
      // Apply movement to the original block position, accounting for click offset
      const newX = dragStart.current.blockX + dx;
      const newY = dragStart.current.blockY + dy;
      
      // Ensure block stays within reasonable bounds
      const boundedX = Math.max(0, Math.min(1900, newX));
      const boundedY = Math.max(0, Math.min(1900, newY));
      
      // Update temporary position for smooth dragging
      setTempDragPosition({
        [selectedBlockType]: { x: boundedX, y: boundedY }
      });
    }
  }
  function handleMouseUp() {
    console.log('handleMouseUp called, dragging:', dragging);
    if (dragging && selectedBlockType && tempDragPosition) {
      console.log('Ending drag for block:', selectedBlockType);
      setDragging(false);
      
      // Apply the final position from tempDragPosition
      const finalPosition = tempDragPosition[selectedBlockType];
      if (finalPosition) {
        setProjectBlockPositions(prev => ({
          ...prev,
          [currentProjectId]: {
            ...prev[currentProjectId],
            [selectedBlockType]: finalPosition
          }
        }));
      }
      
      // Clear temporary position
      setTempDragPosition(null);
      
      // Trigger autosave with the updated positions
      const currentProject = openProjects.find(p => p.id === currentProjectId);
      if (currentProject) {
        console.log('Triggering autosave after drag');
        const updatedPositions = {
          ...projectBlockPositions,
          [currentProjectId]: {
            ...projectBlockPositions[currentProjectId],
            [selectedBlockType]: finalPosition
          }
        };
        triggerProjectAutosave(
          currentProjectId,
          currentProject.name,
          projectBlocks[currentProjectId] || new Set(),
          updatedPositions,
          projectBlockModes,
          projectBlockParams,
          blockMoveCount,
          resultsTabs,
          currentResultsTab
        );
      }
      
      // Also increment move count
      setBlockMoveCount(prev => ({
        ...prev,
        [currentProjectId]: (prev[currentProjectId] || 0) + 1
      }));
    }
    dragStart.current = null;
    setDragOffset({ x: 0, y: 0 });
    setTempDragPosition(null);
  }
  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, selectedBlockType, currentProjectId, openProjects, projectBlocks, projectBlockPositions, projectBlockModes, projectBlockParams, blockMoveCount, resultsTabs, currentResultsTab, dragOffset]);

  return (
    <div
      id="kanosym-mbe"
      ref={setNodeRef}
      className={`h-full w-full text-zinc-100 flex flex-col min-h-0 min-w-0 border-2 border-dashed transition relative ${isOver ? 'border-blue-400' : 'border-zinc-700'}`}
      style={{
        height: 'calc(100% - 36px)',
        position: 'relative',
        backgroundColor: '#27272a',
        backgroundSize: '20px 20px',
      }}
      onClick={onDeselect}
    >

<div 
id="kanosym-mbe-dropzone" 
className={`flex-1 relative ${hasAnyBlocks ? 'overflow-auto' : 'overflow-hidden'} scrollbar-hide`} 
style={{ 
  scrollbarWidth: 'none', 
  msOverflowStyle: 'none' 
}}
>
<div 
  className="relative"
  style={{
    width: hasAnyBlocks ? '2000px' : '100%',
    height: hasAnyBlocks ? '2000px' : '100%',
    backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
    backgroundSize: '20px 20px',
  }}
>
  {hasAnyBlocks ? (
    Object.entries(placedBlocks).map(([blockType, position]) => {
      // Use temporary position during drag, otherwise use actual position
      const displayPosition = (dragging && tempDragPosition && tempDragPosition[blockType]) ? tempDragPosition[blockType] : position;
      
      return (
        <div
          key={blockType}
          style={{ 
            position: 'absolute', 
            left: displayPosition.x, 
            top: displayPosition.y, 
            cursor: isSelected && selectedBlockType === blockType ? 'grab' : 'pointer', 
            zIndex: 10,
            transition: dragging && selectedBlockType === blockType ? 'none' : 'all 0.1s ease'
          }}
          onClick={e => { 
            e.stopPropagation(); 
            setSelectedBlockType(blockType as 'classical' | 'hybrid' | 'quantum');
            onSelect(); 
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            setSelectedBlockType(blockType as 'classical' | 'hybrid' | 'quantum');
          onSelect();
          handleMouseDown(e, blockType);
        }}
      >
        <div className={`transition border-2 rounded ${isSelected && selectedBlockType === blockType ? 'border-blue-500 shadow-lg' : 'border-transparent'}`}>
          <DraggableBlock 
            id={`main-${blockType}`} 
            onContextMenu={(e) => handleContextMenu(e, blockType as 'classical' | 'hybrid' | 'quantum')} 
            mode={blockType as 'classical' | 'hybrid' | 'quantum'} 
          />
        </div>
      </div>
      );
    })
  ) : (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="text-3xl font-bold mb-4">Model Building Environment</div>
      <div className="text-zinc-400">(Drag the blocks here)</div>
    </div>
  )}
</div>
</div>

      {showRunButton && onRunModel && (
        <RunModelButton onClick={onRunModel} />
      )}
    </div>
  );
}

function BlockBar({ hasBlock, mode, setMode, currentProjectId, isBlockTypePlaced }: { 
  hasBlock: boolean; 
  mode: 'classical' | 'hybrid' | 'quantum'; 
  setMode: (m: 'classical' | 'hybrid' | 'quantum') => void;
  currentProjectId: string;
  isBlockTypePlaced: (projectId: string, blockType: 'classical' | 'hybrid' | 'quantum') => boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'blockbar-dropzone' });
  return (
    <div ref={setNodeRef} className={`w-full h-full bg-zinc-950 border-t border-zinc-800 flex items-center px-4 ${isOver ? 'bg-zinc-900' : ''}`}>      
      <div className="flex gap-2">
        {!isBlockTypePlaced(currentProjectId, mode) && (
          <DraggableBlock id={`blockbar-${mode}`} mode={mode} />
        )}
      </div>
      <div className="flex-1" />
      <div className="flex gap-2 items-center">
        <ModeToggle mode={mode} setMode={setMode} />
      </div>
    </div>
  );
}

function ModeToggle({ mode, setMode }: { mode: 'classical' | 'hybrid' | 'quantum'; setMode: (m: 'classical' | 'hybrid' | 'quantum') => void }) {
  return (
    <div className="flex rounded overflow-hidden border border-zinc-700">
      <button
        className={`px-3 py-1 text-xs font-bold transition ${mode === 'classical' ? 'bg-zinc-700 text-white' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}
        onClick={() => setMode('classical')}
      >
        Classical
      </button>
      <button
        className={`px-3 py-1 text-xs font-bold transition ${mode === 'hybrid' ? 'bg-purple-700 text-white' : 'bg-zinc-900 text-purple-400 hover:bg-purple-800'}`}
        onClick={() => setMode('hybrid')}
      >
        Hybrid
      </button>
      <button
        className={`px-3 py-1 text-xs font-bold transition ${mode === 'quantum' ? 'bg-blue-700 text-white' : 'bg-zinc-900 text-blue-400 hover:bg-blue-800'}`}
        onClick={() => setMode('quantum')}
      >
        Quantum
      </button>
    </div>
  );
}

function ContextMenu({ x, y, onEdit, onDelete, onClose }: { x: number; y: number; onEdit: () => void; onDelete: () => void; onClose: () => void }) {
  // Position the menu, but keep it within the viewport
  const style: React.CSSProperties = {
    position: 'fixed',
    left: x,
    top: y,
    zIndex: 100,
    background: 'white',
    borderRadius: '0.375rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    minWidth: 120,
    padding: '0.5rem 0',
  };
  return (
    <div style={style} onClick={onClose}>
      <button
        className="w-full text-left px-4 py-2 hover:bg-zinc-100 text-zinc-800"
        onClick={e => { e.stopPropagation(); onEdit(); }}
      >
        Edit
      </button>
      <button
        className="w-full text-left px-4 py-2 hover:bg-red-100 text-red-700"
        onClick={e => { e.stopPropagation(); onDelete(); }}
      >
        Delete
      </button>
    </div>
  );
}

function FloatingModal({ onClose, blockMode }: { onClose: () => void; blockMode: 'classical' | 'hybrid' | 'quantum' }) {
  const [asset, setAsset] = useState('');
  const [parameter, setParameter] = useState('volatility');
  const [rangeMin, setRangeMin] = useState('');
  const [rangeMax, setRangeMax] = useState('');
  const [steps, setSteps] = useState('');

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    // For now, just log the values
    console.log({ asset, parameter, rangeMin, rangeMax, steps });
    onClose();
  }

  const blockTypeLabel =
    blockMode === 'classical'
      ? 'Classical Portfolio Sensitivity Test'
      : blockMode === 'hybrid'
      ? 'Hybrid Portfolio Sensitivity Test'
      : 'Quantum Portfolio Sensitivity Test';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-8 min-w-[320px] min-h-[180px] relative">
        <button
          className="absolute top-2 right-2 text-zinc-500 hover:text-zinc-800 text-xl font-bold"
          onClick={onClose}
        >
          ×
        </button>
        <div className="text-lg font-bold mb-4 text-zinc-800">{blockTypeLabel}</div>
        <form className="space-y-4" onSubmit={handleSave}>
          <div>
            <label className="block text-zinc-700 text-sm mb-1">Asset Name</label>
            <input
              className="w-full border border-zinc-300 rounded px-2 py-1"
              value={asset}
              onChange={e => setAsset(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-zinc-700 text-sm mb-1">Parameter</label>
            <select
              className="w-full border border-zinc-300 rounded px-2 py-1"
              value={parameter}
              onChange={e => setParameter(e.target.value)}
            >
              <option value="volatility">Volatility</option>
              <option value="correlation">Correlation</option>
              <option value="weight">Weight</option>
            </select>
          </div>
          <div className="flex space-x-2">
            <div className="flex-1">
              <label className="block text-zinc-700 text-sm mb-1">Range Min</label>
              <input
                type="number"
                step="any"
                className="w-full border border-zinc-300 rounded px-2 py-1"
                value={rangeMin}
                onChange={e => setRangeMin(e.target.value)}
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-zinc-700 text-sm mb-1">Range Max</label>
              <input
                type="number"
                step="any"
                className="w-full border border-zinc-300 rounded px-2 py-1"
                value={rangeMax}
                onChange={e => setRangeMax(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-zinc-700 text-sm mb-1">Steps</label>
            <input
              type="number"
              className="w-full border border-zinc-300 rounded px-2 py-1"
              value={steps}
              onChange={e => setSteps(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ToggleButton({ onClick, icon, position }: { onClick: () => void; icon: React.ReactNode; position: 'left' | 'right' }) {
  return (
    <button
      className={`absolute top-4 z-20 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border border-zinc-700 rounded w-6 h-6 flex items-center justify-center shadow ${position === 'left' ? 'left-0' : 'right-0'}`}
      style={{ transform: position === 'left' ? 'translateX(-50%)' : 'translateX(50%)' }}
      onClick={onClick}
    >
      {icon}
    </button>
  );
}

function ResizablePane({ children, min = 160, max = 400, initial = 224, onResize, show, onToggle, position, toggleIcon }: { children: React.ReactNode; min?: number; max?: number; initial?: number; onResize?: (w: number) => void; show: boolean; onToggle: () => void; position: 'left' | 'right'; toggleIcon: React.ReactNode }) {
  const [width, setWidth] = useState(initial);
  const dragging = useRef(false);

  function onMouseDown(e: React.MouseEvent) {
    dragging.current = true;
    document.body.style.cursor = 'col-resize';
  }
  function onMouseMove(e: MouseEvent) {
    if (dragging.current) {
      setWidth(w => {
        const newW = Math.max(min, Math.min(max, position === 'left' ? e.clientX : window.innerWidth - e.clientX));
        if (onResize) onResize(newW);
        return newW;
      });
    }
  }
  function onMouseUp() {
    dragging.current = false;
    document.body.style.cursor = '';
  }
  React.useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);
  if (!show) {
    return (
      <div className="relative h-full flex-shrink-0" style={{ width: 0, minWidth: 0, maxWidth: 0 }}>
        <ToggleButton onClick={onToggle} icon={toggleIcon} position={position} />
      </div>
    );
  }
  return (
    <div style={{ width, minWidth: min, maxWidth: max }} className="relative h-full flex-shrink-0">
      {children}
      <div
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize z-10 bg-zinc-800 hover:bg-blue-500 transition"
        onMouseDown={onMouseDown}
        style={{ userSelect: 'none' }}
      />
      <ToggleButton onClick={onToggle} icon={toggleIcon} position={position} />
    </div>
  );
}

function LayoutToggles({ showExplorer, setShowExplorer, showNoira, setShowNoira, showBlockBar, setShowBlockBar, showFileManager, setShowFileManager }: { showExplorer: boolean; setShowExplorer: (v: boolean) => void; showNoira: boolean; setShowNoira: (v: boolean) => void; showBlockBar: boolean; setShowBlockBar: (v: boolean) => void; showFileManager: boolean; setShowFileManager: (v: boolean) => void; }) {
  return (
    <div className="absolute top-2 right-4 z-30 flex gap-2">
      <button
        className={`w-7 h-7 flex items-center justify-center rounded hover:bg-zinc-800 ${showFileManager ? 'bg-zinc-700' : ''}`}
        title="Toggle File Manager"
        onClick={() => setShowFileManager(!showFileManager)}
      >
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="4" height="12" rx="1" fill="#B0BEC5"/><rect x="7" y="2" width="7" height="12" rx="1" fill="#B0BEC5"/></svg>
      </button>
      {/*
      <button
        className={`w-7 h-7 flex items-center justify-center rounded hover:bg-zinc-800 ${showExplorer ? 'bg-zinc-700' : ''}`}
        title="Toggle File Explorer"
        onClick={() => setShowExplorer(!showExplorer)}
      >
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="4" height="12" rx="1" fill="#B0BEC5"/><rect x="7" y="2" width="7" height="12" rx="1" fill="#B0BEC5"/></svg>
      </button>
      */}
      <button
        className={`w-7 h-7 flex items-center justify-center rounded hover:bg-zinc-800 ${showNoira ? 'bg-zinc-700' : ''}`}
        title="Toggle Noira Panel"
        onClick={() => setShowNoira(!showNoira)}
      >
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="7" height="12" rx="1" fill="#B0BEC5"/><rect x="11" y="2" width="3" height="12" rx="1" fill="#B0BEC5"/></svg>
      </button>
      <button
        className={`w-7 h-7 flex items-center justify-center rounded hover:bg-zinc-800 ${showBlockBar ? 'bg-zinc-700' : ''}`}
        title="Toggle Block Bar"
        onClick={() => setShowBlockBar(!showBlockBar)}
      >
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="10" rx="1" fill="#B0BEC5"/><rect x="2" y="13" width="12" height="2" rx="1" fill="#B0BEC5"/></svg>
      </button>
    </div>
  );
}

function SubtleResizableBorder({ onResize, direction, children, show = true, min = 200, max = 480, initial = 224 }: { onResize?: (w: number) => void; direction: 'left' | 'right' | 'bottom'; children: React.ReactNode; show?: boolean; min?: number; max?: number; initial?: number }) {
  const [size, setSize] = useState(initial);
  const dragging = useRef(false);

  function onMouseDown(e: React.MouseEvent) {
    dragging.current = true;
    document.body.style.cursor = direction === 'bottom' ? 'row-resize' : 'col-resize';
  }
  function onMouseMove(e: MouseEvent) {
    if (dragging.current) {
      let newSize = size;
      if (direction === 'left') newSize = Math.max(min, Math.min(max, e.clientX));
      if (direction === 'right') newSize = Math.max(min, Math.min(max, window.innerWidth - e.clientX));
      if (direction === 'bottom') newSize = Math.max(min, Math.min(max, window.innerHeight - e.clientY));
      setSize(newSize);
      if (onResize) onResize(newSize);
    }
  }
  function onMouseUp() {
    dragging.current = false;
    document.body.style.cursor = '';
  }
  React.useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [size]);
  if (!show) return null;
  let style: React.CSSProperties = {};
  if (direction === 'left' || direction === 'right') style.width = size;
  if (direction === 'bottom') style.height = size;
  return (
    <div style={style} className={`relative h-full ${direction === 'bottom' ? 'w-full' : ''} flex-shrink-0`}>
      {children}
      <div
        className={`absolute ${direction === 'left' ? 'top-0 right-0 w-1 h-full' : direction === 'right' ? 'top-0 left-0 w-1 h-full' : 'left-0 top-0 w-full h-1'} z-10 bg-zinc-800 hover:bg-blue-500 transition`}
        style={{ cursor: direction === 'bottom' ? 'row-resize' : 'col-resize', userSelect: 'none' }}
        onMouseDown={onMouseDown}
      />
    </div>
  );
}

function RunModelButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      className="absolute bottom-6 right-8 z-40 bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded shadow-lg transition"
      style={{ position: 'absolute', bottom: 14, right: 12 }}
      onClick={onClick}
    >
      Run
    </button>
  );
}

function App() {
  // blockLocation: 'blockbar' | 'main' | 'dragging'
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; blockType?: 'classical' | 'hybrid' | 'quantum' } | null>(null);
  const [editingBlockType, setEditingBlockType] = useState<'classical' | 'hybrid' | 'quantum' | null>(null);
  const [showExplorer, setShowExplorer] = useState(false); // Disable old FileExplorer, use FileManagerPanel instead
  const [showNoira, setShowNoira] = useState(true);
  const [showBlockBar, setShowBlockBar] = useState(true);
  const [selectedBlockProject, setSelectedBlockProject] = useState<string | null>(null);
  const [blockMoveCount, setBlockMoveCount] = useState<{ [projectId: string]: number }>({});

  // Effect to recenter unmoved blocks when window resizes
  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout;
    
    function handleResize() {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const dropzoneElem = document.getElementById('kanosym-mbe-dropzone');
        if (!dropzoneElem) return;
        
        const dropzoneRect = dropzoneElem.getBoundingClientRect();
        const blockWidth = 203;
        const blockHeight = 50;
        
        setProjectBlockPositions(prev => {
          const newPositions = { ...prev };
          Object.keys(newPositions).forEach(projectId => {
            const position = newPositions[projectId];
            const moveCount = blockMoveCount[projectId] || 0;
            
            // Only recenter blocks that haven't been moved by the user (moveCount === 0)
            if (position && moveCount === 0) {
              console.log('Recentering block for project:', projectId, 'moveCount:', moveCount);
              // Fix: position should be an object with block types, not a single position
              const blockTypes = Object.keys(position);
              if (blockTypes.length > 0) {
                const blockType = blockTypes[0];
                newPositions[projectId] = {
                  ...position,
                  [blockType]: {
                    x: dropzoneRect.width / 2 - blockWidth / 2,
                    y: dropzoneRect.height / 2 - blockHeight / 2
                  }
                };
              }
            } else if (position) {
              console.log('Not recentering block for project:', projectId, 'moveCount:', moveCount);
            }
          });
          return newPositions;
        });
      }, 100); // Debounce resize events
    }

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [blockMoveCount]);

  // Effect to cancel autosaves on unmount
  useEffect(() => {
    return () => {
      autosaveManager.cancelAllAutosaves();
    };
  }, []);

  // Effect to load projects from backend on mount
  useEffect(() => {
    async function loadProjects() {
      try {
        const response = await fetch('http://localhost:5001/api/projects');
        const data = await response.json();
        if (data.success) {
          const projectsList = data.projects.map((project: any) => ({
            id: project.metadata.project_id,
            name: project.metadata.name
          }));
          setProjects(projectsList);
          
          // If no projects are open and we have projects, don't auto-open the first one
          // Let the user choose which project to open
        }
      } catch (error) {
        console.error('Error loading projects:', error);
      }
    }
    
    loadProjects();
  }, []);

  // Add mode state to App
  const [mode, setMode] = useState<'classical' | 'hybrid' | 'quantum'>('classical');
  // Store block mode per project
  const [projectBlockModes, setProjectBlockModes] = useState<{ [projectId: string]: 'classical' | 'hybrid' | 'quantum' }>({});

  // Add state for new project modal
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  // Add state for project delete dialog
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null);

  // Add resultsTabs state per project
  const [resultsTabs, setResultsTabs] = useState<{ [projectId: string]: Array<{ id: string; label: string; data: any }> }>({});
  const [currentResultsTab, setCurrentResultsTab] = useState<{ [projectId: string]: string | null }>({});

  // Add isRunningModel and projectBlockParams state (mock for now)
  const [isRunningModel, setIsRunningModel] = useState(false);
  const [projectBlockParams, setProjectBlockParams] = useState<{ [projectId: string]: { [blockType: string]: any } }>({});

  // File Manager state
  const [showFileManager, setShowFileManager] = useState(true);

  // Real projects state loaded from backend
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fsFiles, setFsFiles] = useState<FileNode[]>([]);
  const [fsPath, setFsPath] = useState<string | null>(null);

  // Project tab state
  const [openProjects, setOpenProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string>('');
  // Per-project block state - change from single block to multiple block types
  const [projectBlocks, setProjectBlocks] = useState<{ [projectId: string]: Set<'classical' | 'hybrid' | 'quantum'> }>({});
  const [projectBlockPositions, setProjectBlockPositions] = useState<{ [projectId: string]: { [blockType: string]: { x: number; y: number } } }>({});
  
  // Legacy function for backward compatibility - check if any block is placed
  function hasAnyBlock(projectId: string): boolean {
    return (projectBlocks[projectId]?.size || 0) > 0;
  }
  
  // Helper function to check if a specific block type is placed
  function isBlockTypePlaced(projectId: string, blockType: 'classical' | 'hybrid' | 'quantum'): boolean {
    return projectBlocks[projectId]?.has(blockType) || false;
  }
  
  // Helper function to add a block type to a project
  function addBlockTypeToProject(projectId: string, blockType: 'classical' | 'hybrid' | 'quantum') {
    setProjectBlocks(prev => ({
      ...prev,
      [projectId]: new Set([...(prev[projectId] || []), blockType])
    }));
  }
  
  // Helper function to remove a block type from a project
  function removeBlockTypeFromProject(projectId: string, blockType: 'classical' | 'hybrid' | 'quantum') {
    setProjectBlocks(prev => {
      const currentBlocks = new Set(prev[projectId] || []);
      currentBlocks.delete(blockType);
      return {
        ...prev,
        [projectId]: currentBlocks
      };
    });
  }
  
  // Replace openProject logic with onKsmDoubleClick
  function onKsmDoubleClick(projectId: string) {
    const project = projects.find(p => p.id === projectId);
    if (project && !openProjects.find(p => p.id === projectId)) {
      setOpenProjects([...openProjects, project]);
    }
    setCurrentProjectId(projectId);
    setProjectBlocks(prev => ({ ...prev, [projectId]: prev[projectId] || new Set() }));
  }

  // File Manager handlers
  async function handleOpenProject(projectName: string) {
    try {
      const response = await fetch(`http://localhost:5001/api/projects/${encodeURIComponent(projectName)}`);
      const data = await response.json();
      if (data.success) {
        const project = data.project;
        const projectId = project.metadata.project_id;
        
        // Add to open projects if not already open
        if (!openProjects.find(p => p.id === projectId)) {
          setOpenProjects(prev => [...prev, { id: projectId, name: projectName }]);
        }
        setCurrentProjectId(projectId);
        
        // Initialize project state if not exists
        setProjectBlocks(prev => ({ ...prev, [projectId]: prev[projectId] || new Set() }));
        
        // Load project configuration
        if (project.configuration) {
          // Load placed blocks
          const placedBlocks = new Set<'classical' | 'hybrid' | 'quantum'>();
          
          // Load block positions
          const blockPositions: { [projectId: string]: { [blockType: string]: { x: number; y: number } } } = {};
          Object.entries(project.configuration.blocks).forEach(([blockType, blockConfig]: [string, any]) => {
            if (blockConfig.placed && blockConfig.position) {
              if (!blockPositions[projectId]) blockPositions[projectId] = {};
              blockPositions[projectId][blockType] = blockConfig.position;
              // Add to placed blocks set
              placedBlocks.add(blockType as 'classical' | 'hybrid' | 'quantum');
            }
          });
          setProjectBlockPositions(prev => ({ ...prev, ...blockPositions }));
          
          // Update the projectBlocks state with placed blocks
          setProjectBlocks(prev => ({ ...prev, [projectId]: placedBlocks }));
          
          // Load block modes
          const blockModes: { [projectId: string]: 'classical' | 'hybrid' | 'quantum' } = {};
          if (project.configuration.ui_state?.current_block_mode) {
            blockModes[projectId] = project.configuration.ui_state.current_block_mode;
          }
          setProjectBlockModes(prev => ({ ...prev, ...blockModes }));
          
          // Load block parameters - new structure with per-block-type parameters
          const blockParams: { [blockType: string]: any } = {};
          Object.entries(project.configuration.blocks).forEach(([blockType, blockConfig]: [string, any]) => {
            if (blockConfig.parameters) {
              blockParams[blockType] = blockConfig.parameters;
            }
          });
          
          // Set the parameters in the new structure
          setProjectBlockParams(prev => ({ 
            ...prev, 
            [projectId]: blockParams 
          }));
        }
      }
    } catch (error) {
      console.error('Error opening project:', error);
    }
  }

  async function handleOpenTestRun(testRunId: string) {
    try {
      const response = await fetch(`http://localhost:5001/api/test-runs/${testRunId}`);
      const data = await response.json();
      if (data.success) {
        const testRun = data.test_run;
        
        // Find the associated project
        const projectId = testRun.project_id;
        if (projectId) {
          // Find the project by ID
          const project = projects.find(p => p.id === projectId);
          if (project) {
            // Open the project if not already open
            if (!openProjects.find(p => p.id === projectId)) {
              await handleOpenProject(project.name);
            }
            
            // Set the project as current
            setCurrentProjectId(projectId);
            
            // Create a results tab for this test run
            const tabData = {
              ...testRun.results,
              testType: testRun.block_type,
              test_run_id: testRunId
            };
            
            setResultsTabs(prev => {
              const tabs = prev[projectId] || [];
              const existingTab = tabs.find(tab => tab.id === testRunId);
              if (!existingTab) {
                const newTab = { 
                  id: testRunId, 
                  label: `${testRun.block_type} - ${new Date(testRun.timestamp).toLocaleTimeString()}`, 
                  data: tabData 
                };
                return { ...prev, [projectId]: [...tabs, newTab] };
              }
              return prev;
            });
            
            // Set this tab as active
            setCurrentResultsTab(prev => ({ ...prev, [projectId]: testRunId }));
          } else {
            console.warn(`Project with ID ${projectId} not found in projects list`);
          }
        }
      }
    } catch (error) {
      console.error('Error opening test run:', error);
    }
  }

  function handleCloseTestRun(testRunId: string) {
    // Close the results tab for this test run in the appropriate project
    for (const [projectId, tabs] of Object.entries(resultsTabs)) {
      const tabToClose = tabs.find(tab => tab.id === testRunId);
      if (tabToClose) {
        closeResultsTab(projectId, testRunId);
        break;
      }
    }
  }
  
  function closeProject(id: string) {
    const idx = openProjects.findIndex(p => p.id === id);
    if (idx !== -1) {
      const newOpen = openProjects.filter(p => p.id !== id);
      setOpenProjects(newOpen);
      setProjectBlocks(prev => {
        const newBlocks = { ...prev };
        delete newBlocks[id];
        return newBlocks;
      });
      if (currentProjectId === id && newOpen.length > 0) {
        setCurrentProjectId(newOpen[Math.max(0, idx - 1)].id);
      }
    }
  }

  async function handleChooseFolder() {
    if (window.electronAPI && window.electronAPI.chooseFolder) {
      const folder = await window.electronAPI.chooseFolder();
      if (folder) {
        setFsPath(folder);
        const files = await window.electronAPI.readDir(folder);
        setFsFiles(
          files.map((f: any, idx: number) => ({
            id: folder + '/' + f.name,
            name: f.name,
            type: f.type,
            // No children for now; can add recursive loading later
          }))
        );
      }
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
    setContextMenu(null); // Hide context menu if dragging
  }

  function handleDragEnd(event: DragEndEvent) {
    if (event.over) {
      if (event.over.id === 'center-dropzone') {
        const dropzoneElem = document.getElementById('kanosym-mbe-dropzone');
        const dropzoneRect = dropzoneElem?.getBoundingClientRect();
        let dropX = 200, dropY = 120; // fallback default

        if (
          (activeId === 'blockbar-classical' ||
           activeId === 'blockbar-hybrid' ||
           activeId === 'blockbar-quantum') &&
          dropzoneRect
        ) {
          let pointerX: number | null = null, pointerY: number | null = null;

          if (event.activatorEvent && 'clientX' in event.activatorEvent && 'clientY' in event.activatorEvent) {
            pointerX = Number(event.activatorEvent.clientX);
            pointerY = Number(event.activatorEvent.clientY);
          } else if (window.event && 'clientX' in window.event && 'clientY' in window.event) {
            pointerX = Number(window.event.clientX);
            pointerY = Number(window.event.clientY);
          }

          if (
            pointerX !== null && pointerY !== null &&
            pointerX >= dropzoneRect.left && pointerX <= dropzoneRect.right &&
            pointerY >= dropzoneRect.top && pointerY <= dropzoneRect.bottom
          ) {
            dropX = pointerX - dropzoneRect.left;
            dropY = pointerY - dropzoneRect.top;
          } else {
            dropX = dropzoneRect.width / 2;
            dropY = dropzoneRect.height / 2;
          }
        } else if (
          activeId?.startsWith('main-') &&
          dropzoneRect &&
          projectBlockPositions[currentProjectId]
        ) {
          const blockType = activeId.replace('main-', '') as 'classical' | 'hybrid' | 'quantum';
          const prev = projectBlockPositions[currentProjectId][blockType];

          if (prev) {
            dropX = prev.x + (event.delta?.x ?? 0);
            dropY = prev.y + (event.delta?.y ?? 0);

            setProjectBlockPositions(prev => ({
              ...prev,
              [currentProjectId]: {
                ...(prev[currentProjectId] || {}),
                [blockType]: { x: dropX, y: dropY }
              }
            }));
            return;
          }
        }

        // beginning of current change
        // Clamp to dropzone bounds if rect is available
        if (dropzoneRect) {
          const blockWidth = 190; // match your block width
          const blockHeight = 50;
          dropX = Math.max(0, Math.min(dropX, dropzoneRect.width - blockWidth));
          dropY = Math.max(0, Math.min(dropY, dropzoneRect.height - blockHeight));
        }

        if (
          activeId === 'blockbar-classical' ||
          activeId === 'blockbar-hybrid' ||
          activeId === 'blockbar-quantum'
        ) {
          // Determine block mode
          let blockMode: 'classical' | 'hybrid' | 'quantum';
          if (activeId === 'blockbar-classical') blockMode = 'classical';
          else if (activeId === 'blockbar-hybrid') blockMode = 'hybrid';
          else blockMode = 'quantum';

          // Offset to prevent stacking
          const existingBlocks = projectBlockPositions[currentProjectId] || {};
          const offset = Object.keys(existingBlocks).length * 20;
          const finalDropX = dropX + offset;
          const finalDropY = dropY + offset;

          addBlockTypeToProject(currentProjectId, blockMode);
          setProjectBlockPositions(prev => {
            const newPositions = {
              ...prev,
              [currentProjectId]: {
                ...(prev[currentProjectId] || {}),
                [blockMode]: { x: finalDropX, y: finalDropY }
              }
            };
            
            // Trigger autosave with the UPDATED state
            const currentProject = openProjects.find(p => p.id === currentProjectId);
            if (currentProject) {
              // Create updated projectBlocks Set
              const updatedProjectBlocks = new Set(projectBlocks[currentProjectId] || []);
              updatedProjectBlocks.add(blockMode);
              
              // Create updated projectBlockModes
              const updatedProjectBlockModes = { ...projectBlockModes, [currentProjectId]: blockMode };
              
              triggerProjectAutosave(
                currentProjectId,
                currentProject.name,
                updatedProjectBlocks,
                newPositions,
                updatedProjectBlockModes,
                projectBlockParams,
                blockMoveCount,
                resultsTabs,
                currentResultsTab
              );
            }
            
            return newPositions;
          });
          setProjectBlockModes(prev => ({ ...prev, [currentProjectId]: blockMode }));
        }
        // end of current change
        

      } else if (event.over.id === 'blockbar-dropzone') {
        // Remove the current block type from the project
        const currentBlockMode = projectBlockModes[currentProjectId];
        if (currentBlockMode) {
          removeBlockTypeFromProject(currentProjectId, currentBlockMode);
          setProjectBlockPositions(prev => {
            const newPositions = { ...prev };
            if (newPositions[currentProjectId]) {
              delete newPositions[currentProjectId][currentBlockMode];
              // Remove the project entry if no blocks remain
              if (Object.keys(newPositions[currentProjectId]).length === 0) {
                delete newPositions[currentProjectId];
              }
            }
            
            // Clean up block parameters
            setProjectBlockParams(prev => {
              const newParams = { ...prev };
              if (newParams[currentProjectId]) {
                delete newParams[currentProjectId][currentBlockMode];
                // Remove the project entry if no block params remain
                if (Object.keys(newParams[currentProjectId]).length === 0) {
                  delete newParams[currentProjectId];
                }
              }
              return newParams;
            });
            
            // Trigger autosave with the UPDATED state
            const currentProject = openProjects.find(p => p.id === currentProjectId);
            if (currentProject) {
              // Create updated projectBlocks Set
              const updatedProjectBlocks = new Set(projectBlocks[currentProjectId] || []);
              updatedProjectBlocks.delete(currentBlockMode);
              
              // Create updated projectBlockModes
              const updatedProjectBlockModes = { ...projectBlockModes };
              delete updatedProjectBlockModes[currentProjectId];
              
              // Create updated params
              const updatedParams = { ...projectBlockParams };
              if (updatedParams[currentProjectId]) {
                delete updatedParams[currentProjectId][currentBlockMode];
                if (Object.keys(updatedParams[currentProjectId]).length === 0) {
                  delete updatedParams[currentProjectId];
                }
              }
              
              triggerProjectAutosave(
                currentProjectId,
                currentProject.name,
                updatedProjectBlocks,
                newPositions,
                updatedProjectBlockModes,
                updatedParams,
                blockMoveCount,
                resultsTabs,
                currentResultsTab
              );
            }
            
            return newPositions;
          });
        }
        setProjectBlockModes(prev => {
          const copy = { ...prev };
          delete copy[currentProjectId];
          return copy;
        });
        setSelectedBlockProject(null);
      }
    }
    setActiveId(null);
  }

  function handleEditRequest(e: React.MouseEvent, blockType?: 'classical' | 'hybrid' | 'quantum') {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, blockType });
  }

  function handleEdit() {
    if (contextMenu?.blockType) {
      setEditingBlockType(contextMenu.blockType);
    }
    setShowBlockEditModal(true);
    setContextMenu(null);
  }

  function handleModalClose() {
    setShowModal(false);
  }

  function handleCloseContextMenu() {
    setContextMenu(null);
  }

  // On Run Model, POST to backend and add results tab
  async function handleRunModel() {
    // Get the current block mode for this project
    const blockMode = projectBlockModes[currentProjectId] || 'classical';
    
    // Gather block params from state for the CURRENT block type only
    const blockParams = projectBlockParams[currentProjectId]?.[blockMode];
    if (!blockParams) {
      alert('Please configure the block parameters first');
      return;
    }
    
    // Get current project info for autosave
    const currentProject = openProjects.find(p => p.id === currentProjectId);
    if (!currentProject) {
      alert('No active project found');
      return;
    }
    
    // Determine the appropriate endpoint based on block mode
    let endpoint;
    switch (blockMode) {
      case 'classical':
        endpoint = 'http://localhost:5001/api/classical_sensitivity_test';
        break;
      case 'hybrid':
        endpoint = 'http://localhost:5001/api/hybrid_sensitivity_test';
        break;
      case 'quantum':
        endpoint = 'http://localhost:5001/api/quantum_sensitivity_test';
        break;
      default:
        endpoint = 'http://localhost:5001/api/classical_sensitivity_test';
    }
    
    setIsRunningModel(true);
    
    // Backend will handle all message generation and display // true = show thinking state
    
    try {
      // Add project_id and project_name to the request for autosave
      const requestData = {
        ...blockParams,
        project_id: currentProjectId,
        project_name: currentProject.name
      };
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });
      const data = await res.json();
      
      if (!res.ok) {
        // Handle validation errors
        const errorMessage = data.error || 'Unknown error occurred';
        alert(`Validation Error: ${errorMessage}`);
        setIsRunningModel(false);
        return;
      }
      
      // Add results tab IMMEDIATELY (graph displays right away)
      addResultsTab(currentProjectId, { ...data, testType: blockMode });
      
      // Trigger project autosave after successful test run
      triggerProjectAutosave(
        currentProjectId,
        currentProject.name,
        projectBlocks[currentProjectId] || new Set(),
        projectBlockPositions,
        projectBlockModes,
        projectBlockParams,
        blockMoveCount,
        resultsTabs,
        currentResultsTab
      );
      
      // Backend will handle all Noira messages through display history
      // NoiraPanel will poll for updates automatically
      
      setIsRunningModel(false);
    } catch (err) {
      setIsRunningModel(false);
      alert('Error running model: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }

  // Helper to add a results tab
  function addResultsTab(projectId: string, data: any) {
    setResultsTabs(prev => {
      const tabs = prev[projectId] || [];
      const newId = `results-${Date.now()}`;
      const newTab = { id: newId, label: `Results ${tabs.length + 1}`, data };
      return { ...prev, [projectId]: [...tabs, newTab] };
    });
    setCurrentResultsTab(prev => ({ ...prev, [projectId]: `results-${Date.now()}` }));
  }

  // Helper to close a results tab
  function closeResultsTab(projectId: string, tabId: string) {
    setResultsTabs(prev => {
      const tabs = (prev[projectId] || []).filter(tab => tab.id !== tabId);
      return { ...prev, [projectId]: tabs };
    });
    setCurrentResultsTab(prev => {
      const tabs = resultsTabs[projectId] || [];
      const idx = tabs.findIndex(tab => tab.id === tabId);
      let newTabId = null;
      if (tabs.length > 1) {
        if (idx > 0) newTabId = tabs[idx - 1].id;
        else newTabId = tabs[1].id;
      }
      return { ...prev, [projectId]: newTabId };
    });
  }

  // Render results tab bar and ResultsChart
  function ResultsTabsBar({ projectId }: { projectId: string }) {
    const tabs = resultsTabs[projectId] || [];
    const activeTabId = currentResultsTab[projectId];
    return (
      <div className="flex items-end border-b border-zinc-800 bg-zinc-900 px-2" style={{ minHeight: 36 }}>
        {tabs.map(tab => (
          <div key={tab.id} className={`flex items-center mr-2 ${activeTabId === tab.id ? 'border-b-2 border-green-500' : ''}`}> 
            <button
              className={`px-3 py-1 rounded-t text-sm font-medium ${activeTabId === tab.id ? 'bg-zinc-800 text-green-500' : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'}`}
              onClick={() => setCurrentResultsTab(prev => ({ ...prev, [projectId]: tab.id }))}
            >
              {tab.label}
            </button>
            <button
              className="ml-1 text-xs text-zinc-400 hover:text-red-500"
              onClick={() => closeResultsTab(projectId, tab.id)}
              title="Close results tab"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    );
  }

  function ResultsTabContent({ projectId }: { projectId: string }) {
    const tabs = resultsTabs[projectId] || [];
    const activeTabId = currentResultsTab[projectId];
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab) return null;
    return <ResultsChart data={tab.data} />;
  }

  const isBlockSelected = selectedBlockProject === currentProjectId;
  function handleBlockSelect() {
    setSelectedBlockProject(currentProjectId);
  }
  // handleBlockDrag is no longer used - we handle dragging directly in MainPage
  /*
  function handleBlockDrag(dx: number, dy: number, selectedBlockType?: 'classical' | 'hybrid' | 'quantum') {
    // This function is deprecated - dragging is now handled in MainPage component
  }
  */
  // handleBlockDragEnd is no longer used - we handle drag end in MainPage
  /*
  function handleBlockDragEnd() {
    // This function is deprecated - drag end is now handled in MainPage component
  }
  */

  // Set minimums to ensure main pane never gets too small
  const minExplorer = 200;
  const minNoira = 260;
  const minMain = 400;
  const [noiraWidth, setNoiraWidth] = useState(320);
  // Remove dynamic max logic and noiraWidth state

  // In App, add a handler to deselect the block
  function handleBlockDeselect() {
    setSelectedBlockProject(null);
  }

  // In App, add a handler for block delete
  function handleBlockDelete() {
    // Remove the specific block type that was right-clicked
    const blockTypeToDelete = contextMenu?.blockType;
    if (blockTypeToDelete) {
      removeBlockTypeFromProject(currentProjectId, blockTypeToDelete);
      setProjectBlockPositions(prev => {
        const newPositions = { ...prev };
        if (newPositions[currentProjectId]) {
          delete newPositions[currentProjectId][blockTypeToDelete];
          // Remove the project entry if no blocks remain
          if (Object.keys(newPositions[currentProjectId]).length === 0) {
            delete newPositions[currentProjectId];
          }
        }
        return newPositions;
      });
      
      // Clean up block parameters
      setProjectBlockParams(prev => {
        const newParams = { ...prev };
        if (newParams[currentProjectId]) {
          delete newParams[currentProjectId][blockTypeToDelete];
          // Remove the project entry if no block params remain
          if (Object.keys(newParams[currentProjectId]).length === 0) {
            delete newParams[currentProjectId];
          }
        }
        return newParams;
      });
      
      // Also remove from projectBlockModes if it was the current mode
      if (projectBlockModes[currentProjectId] === blockTypeToDelete) {
        setProjectBlockModes(prev => {
          const copy = { ...prev };
          delete copy[currentProjectId];
          return copy;
        });
      }
      
      // Trigger autosave after deletion
      const currentProject = openProjects.find(p => p.id === currentProjectId);
      if (currentProject) {
        // Get updated state values
        const updatedProjectBlocks = new Set(projectBlocks[currentProjectId] || []);
        updatedProjectBlocks.delete(blockTypeToDelete);
        
        const updatedPositions = { ...projectBlockPositions };
        if (updatedPositions[currentProjectId]) {
          delete updatedPositions[currentProjectId][blockTypeToDelete];
          if (Object.keys(updatedPositions[currentProjectId]).length === 0) {
            delete updatedPositions[currentProjectId];
          }
        }
        
        const updatedParams = { ...projectBlockParams };
        if (updatedParams[currentProjectId]) {
          delete updatedParams[currentProjectId][blockTypeToDelete];
          if (Object.keys(updatedParams[currentProjectId]).length === 0) {
            delete updatedParams[currentProjectId];
          }
        }
        
        const updatedModes = { ...projectBlockModes };
        if (updatedModes[currentProjectId] === blockTypeToDelete) {
          delete updatedModes[currentProjectId];
        }
        
        triggerProjectAutosave(
          currentProjectId,
          currentProject.name,
          updatedProjectBlocks,
          updatedPositions,
          updatedModes,
          updatedParams,
          blockMoveCount,
          resultsTabs,
          currentResultsTab
        );
      }
    }
    setSelectedBlockProject(null);
    setContextMenu(null);
  }

  // Add handler to create a new project
  async function handleCreateProject() {
    if (!newProjectName.trim()) return;
    
    try {
      const response = await fetch('http://localhost:5001/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName.trim() })
      });
      
      const data = await response.json();
      if (data.success) {
        const newProject = {
          id: data.project.metadata.project_id,
          name: newProjectName.trim()
        };
        
        setProjects(prev => [...prev, newProject]);
        setShowNewProjectModal(false);
        setNewProjectName('');
      } else {
        alert('Failed to create project: ' + data.error);
      }
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Error creating project');
    }
  }

  // In App, add handler for project folder context menu
  const [projectFolderMenu, setProjectFolderMenu] = useState<{ x: number; y: number; project: { id: string; name: string } } | null>(null);
  function handleProjectFolderContextMenu(project: { id: string; name: string }, e: React.MouseEvent) {
    setProjectFolderMenu({ x: e.clientX, y: e.clientY, project });
  }
  async function handleDeleteProjectConfirm() {
    if (!projectToDelete) return;
    
    try {
      const response = await fetch(`http://localhost:5001/api/projects/${encodeURIComponent(projectToDelete.name)}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
        // Close tab if open
        setOpenProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
        setProjectBlocks(prev => {
          const copy = { ...prev };
          delete copy[projectToDelete.id];
          return copy;
        });
        setProjectBlockPositions(prev => {
          const copy = { ...prev };
          delete copy[projectToDelete.id];
          return copy;
        });
        setProjectBlockModes(prev => {
          const copy = { ...prev };
          delete copy[projectToDelete.id];
          return copy;
        });
        setProjectToDelete(null);
      } else {
        alert('Failed to delete project: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Error deleting project');
    }
  }

  // Add state for block edit modal
  const [showBlockEditModal, setShowBlockEditModal] = useState(false);

  // Edit Modal for block parameters
  function BlockEditModal({ open, onClose, params, onSave }: { open: boolean; onClose: () => void; params: any; onSave: (params: any) => void }) {
    const [form, setForm] = useState(params || {
      portfolio: {
        assets: ['AAPL', 'GOOG', 'MSFT'],
        weights: [0.4, 0.3, 0.3],
        volatility: [0.2, 0.18, 0.22],
        correlation_matrix: [
          [1, 0.2, 0.1],
          [0.2, 1, 0.15],
          [0.1, 0.15, 1],
        ],
      },
      param: 'volatility',
      asset: 'AAPL',
      range: [0.15, 0.25],
      steps: 6,
    });

    // Helper function to update correlation matrix when assets change
    function updateCorrelationMatrix(newAssets: string[]) {
      const currentMatrix = form.portfolio.correlation_matrix;
      const newSize = newAssets.length;
      
      if (newSize > currentMatrix.length) {
        // Add new rows/columns
        const newMatrix = currentMatrix.map((row: number[]) => [...row, 0.1]);
        for (let i = currentMatrix.length; i < newSize; i++) {
          const newRow = new Array(newSize).fill(0.1);
          newRow[i] = 1; // Diagonal should be 1
          newMatrix.push(newRow);
        }
        return newMatrix;
      } else if (newSize < currentMatrix.length) {
        // Remove rows/columns
        return currentMatrix.slice(0, newSize).map((row: number[]) => row.slice(0, newSize));
      }
      return currentMatrix;
    }

    // Helper function to update arrays when assets change
    function updateArray<T>(array: T[], newSize: number, defaultValue: T): T[] {
      if (newSize > array.length) {
        return [...array, ...Array(newSize - array.length).fill(defaultValue)];
      } else if (newSize < array.length) {
        return array.slice(0, newSize);
      }
      return array;
    }

    function addAsset() {
      if (form.portfolio.assets.length >= 5) return;
      
      const newAssetName = `ASSET${form.portfolio.assets.length + 1}`;
      const newAssets = [...form.portfolio.assets, newAssetName];
      const newWeights = updateArray(form.portfolio.weights, newAssets.length, 0.1);
      const newVolatility = updateArray(form.portfolio.volatility, newAssets.length, 0.2);
      const newCorrelationMatrix = updateCorrelationMatrix(newAssets);
      
      // Normalize weights
      const totalWeight = newWeights.reduce((sum: number, w: number) => sum + w, 0);
      const normalizedWeights = newWeights.map((w: number) => w / totalWeight);
      
      setForm((prev: any) => ({
        ...prev,
        portfolio: {
          ...prev.portfolio,
          assets: newAssets,
          weights: normalizedWeights,
          volatility: newVolatility,
          correlation_matrix: newCorrelationMatrix,
        },
        asset: newAssetName, // Set to the new asset
      }));
    }

    function removeAsset(index: number) {
      if (form.portfolio.assets.length <= 1) return;
      
      const newAssets = form.portfolio.assets.filter((_: string, i: number) => i !== index);
      const newWeights = form.portfolio.weights.filter((_: number, i: number) => i !== index);
      const newVolatility = form.portfolio.volatility.filter((_: number, i: number) => i !== index);
      const newCorrelationMatrix = updateCorrelationMatrix(newAssets);
      
      // Normalize weights
      const totalWeight = newWeights.reduce((sum: number, w: number) => sum + w, 0);
      const normalizedWeights = newWeights.map((w: number) => w / totalWeight);
      
      // Update selected asset if it was removed
      let newSelectedAsset = form.asset;
      if (form.asset === form.portfolio.assets[index]) {
        newSelectedAsset = newAssets[0];
      }
      
      setForm((prev: any) => ({
        ...prev,
        portfolio: {
          ...prev.portfolio,
          assets: newAssets,
          weights: normalizedWeights,
          volatility: newVolatility,
          correlation_matrix: newCorrelationMatrix,
        },
        asset: newSelectedAsset,
      }));
    }

    function handleChangePortfolioField(field: string, value: any) {
      setForm((prev: any) => ({ ...prev, portfolio: { ...prev.portfolio, [field]: value } }));
    }
    
    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
      const { name, value } = e.target;
      setForm((prev: any) => ({ ...prev, [name]: name === 'steps' ? Number(value) : value }));
    }
    
    function handleRangeChange(idx: number, value: string) {
      setForm((prev: any) => {
        const range = [...prev.range];
        range[idx] = Number(value);
        return { ...prev, range };
      });
    }
    
    function handleAssetChange(idx: number, value: string) {
      setForm((prev: any) => {
        const assets = [...prev.portfolio.assets];
        const oldAsset = assets[idx];
        assets[idx] = value;
        
        // If the currently selected asset for analysis is the one being changed, update it
        let newAsset = prev.asset;
        if (prev.asset === oldAsset) {
          newAsset = value;
        }
        
        return { 
          ...prev, 
          portfolio: { ...prev.portfolio, assets },
          asset: newAsset
        };
      });
    }
    
    function handleWeightChange(idx: number, value: string) {
      setForm((prev: any) => {
        const weights = [...prev.portfolio.weights];
        weights[idx] = Number(value);
        return { ...prev, portfolio: { ...prev.portfolio, weights } };
      });
    }
    
    function handleVolatilityChange(idx: number, value: string) {
      setForm((prev: any) => {
        const volatility = [...prev.portfolio.volatility];
        volatility[idx] = Number(value);
        return { ...prev, portfolio: { ...prev.portfolio, volatility } };
      });
    }
    
    function handleCorrelationChange(i: number, j: number, value: string) {
      setForm((prev: any) => {
        const matrix = prev.portfolio.correlation_matrix.map((row: number[], idx: number) => [...row]);
        matrix[i][j] = Number(value);
        matrix[j][i] = Number(value);
        return { ...prev, portfolio: { ...prev.portfolio, correlation_matrix: matrix } };
      });
    }

    const blockTypeLabel =
      projectBlockModes[currentProjectId] === 'classical'
        ? 'Classical Portfolio Sensitivity Test'
        : projectBlockModes[currentProjectId] === 'hybrid'
        ? 'Hybrid Portfolio Sensitivity Test'
        : 'Quantum Portfolio Sensitivity Test';

    return open ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl p-6 min-w-[800px] max-w-[1000px] max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-zinc-100">{blockTypeLabel}</h2>
              <p className="text-sm text-zinc-400 mt-1">Configure portfolio parameters and sensitivity analysis</p>
            </div>
            <button
              className="text-zinc-400 hover:text-zinc-200 transition-colors p-2 rounded-lg hover:bg-zinc-800"
              onClick={onClose}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form className="space-y-6" onSubmit={e => { e.preventDefault(); onSave(form); onClose(); }}>
            {/* Portfolio Configuration Section */}
            <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
              <h3 className="text-lg font-medium text-zinc-100 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Portfolio Configuration
              </h3>
              
              {/* Assets Management */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-zinc-300 text-sm font-medium">Assets ({form.portfolio.assets.length}/5)</label>
                  <button
                    type="button"
                    onClick={addAsset}
                    disabled={form.portfolio.assets.length >= 5}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-zinc-600 disabled:cursor-not-allowed transition-colors flex items-center"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Asset
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {form.portfolio.assets.map((asset: string, idx: number) => (
                    <div key={idx} className="bg-zinc-700 rounded-lg p-3 border border-zinc-600">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-zinc-400 font-medium">Asset {idx + 1}</span>
                        {form.portfolio.assets.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeAsset(idx)}
                            className="text-red-400 hover:text-red-300 transition-colors p-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs text-zinc-400 mb-1">Symbol</label>
                          <input
                            className="w-full bg-zinc-600 border border-zinc-500 rounded px-2 py-1 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={asset}
                            onChange={e => handleAssetChange(idx, e.target.value)}
                            placeholder="AAPL"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs text-zinc-400 mb-1">Weight</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            className="w-full bg-zinc-600 border border-zinc-500 rounded px-2 py-1 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={form.portfolio.weights[idx]}
                            onChange={e => handleWeightChange(idx, e.target.value)}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs text-zinc-400 mb-1">Volatility</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="w-full bg-zinc-600 border border-zinc-500 rounded px-2 py-1 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={form.portfolio.volatility[idx]}
                            onChange={e => handleVolatilityChange(idx, e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Correlation Matrix */}
              <div>
                <label className="block text-zinc-300 text-sm font-medium mb-3">Correlation Matrix</label>
                <div className="bg-zinc-700 rounded-lg p-3 border border-zinc-600 overflow-x-auto">
                  <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${form.portfolio.assets.length + 1}, minmax(60px, 1fr))` }}>
                    {/* Header row */}
                    <div className="text-xs text-zinc-400 font-medium p-1"></div>
                    {form.portfolio.assets.map((asset: string, idx: number) => (
                      <div key={idx} className="text-xs text-zinc-400 font-medium p-1 text-center">{asset}</div>
                    ))}
                    
                    {/* Data rows */}
                    {form.portfolio.correlation_matrix.map((row: number[], i: number) => (
                      <React.Fragment key={i}>
                        <div className="text-xs text-zinc-400 font-medium p-1">{form.portfolio.assets[i]}</div>
                        {row.map((val: number, j: number) => (
                          <input
                            key={j}
                            type="number"
                            step="0.01"
                            min="-1"
                            max="1"
                            className="w-full bg-zinc-600 border border-zinc-500 rounded px-1 py-1 text-zinc-100 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={val}
                            onChange={e => handleCorrelationChange(i, j, e.target.value)}
                            disabled={i === j}
                          />
                        ))}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Sensitivity Analysis Section */}
            <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
              <h3 className="text-lg font-medium text-zinc-100 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Sensitivity Analysis Parameters
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-zinc-300 text-sm font-medium mb-2">Parameter to Perturb</label>
                  <select 
                    name="param" 
                    className="w-full bg-zinc-600 border border-zinc-500 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    value={form.param} 
                    onChange={handleChange}
                  >
                    <option value="volatility">Volatility</option>
                    <option value="weight">Weight</option>
                    <option value="correlation">Correlation</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-zinc-300 text-sm font-medium mb-2">Target Asset</label>
                  <select 
                    name="asset" 
                    className="w-full bg-zinc-600 border border-zinc-500 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    value={form.asset} 
                    onChange={handleChange}
                  >
                    {form.portfolio.assets.map((asset: string, idx: number) => (
                      <option key={idx} value={asset}>{asset}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-zinc-300 text-sm font-medium mb-2">Range Min</label>
                  <input
                    type="number"
                    step="any"
                    className="w-full bg-zinc-600 border border-zinc-500 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.range[0]}
                    onChange={e => handleRangeChange(0, e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-zinc-300 text-sm font-medium mb-2">Range Max</label>
                  <input
                    type="number"
                    step="any"
                    className="w-full bg-zinc-600 border border-zinc-500 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.range[1]}
                    onChange={e => handleRangeChange(1, e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-zinc-300 text-sm font-medium mb-2">Number of Steps</label>
                <input
                  name="steps"
                  type="number"
                  min="2"
                  max="20"
                  className="w-full bg-zinc-600 border border-zinc-500 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.steps}
                  onChange={handleChange}
                  required
                />
                <p className="text-xs text-zinc-400 mt-1">Number of points to test in the range (2-20)</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-700">
              <button
                type="button"
                className="px-6 py-2 bg-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-600 transition-colors font-medium"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Configuration
              </button>
            </div>
          </form>
        </div>
      </div>
    ) : null;
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="h-screen w-screen flex flex-col relative" onClick={handleCloseContextMenu}>
        <LayoutToggles
          showExplorer={showExplorer}
          setShowExplorer={setShowExplorer}
          showNoira={showNoira}
          setShowNoira={setShowNoira}
          showBlockBar={showBlockBar}
          setShowBlockBar={setShowBlockBar}
          showFileManager={showFileManager}
          setShowFileManager={setShowFileManager}
        />
        <div className={`flex ${showBlockBar ? 'flex-1 min-h-0' : 'h-full'} relative`}>
          {/* File Manager */}
          <SubtleResizableBorder direction="left" show={showFileManager} min={200} max={400} initial={280}>
            <ProjectExplorerPanel
              onOpenProject={handleOpenProject}
              onCloseProject={closeProject}
              onOpenTestRun={handleOpenTestRun}
              onCloseTestRun={handleCloseTestRun}
              openProjects={openProjects}
              currentProjectId={currentProjectId}
            />
          </SubtleResizableBorder>
          {/* File Explorer */}
          {/*
          <SubtleResizableBorder direction="left" show={showExplorer} min={minExplorer} max={400} initial={224}>
            <FileExplorer
              files={fsFiles}
              selected={selectedFile}
              onSelect={setSelectedFile}
              onChooseFolder={handleChooseFolder}
              currentPath={fsPath}
              onKsmDoubleClick={onKsmDoubleClick}
              projects={projects}
              onBack={() => { setFsFiles([]); setFsPath(null); }}
              onShowNewProject={() => setShowNewProjectModal(true)}
              onProjectFolderContextMenu={handleProjectFolderContextMenu}
            />
          </SubtleResizableBorder>
          */}
          {/* Main Page */}
          <div className="flex-1 min-w-0 relative" style={{ minWidth: minMain }}>
            <ProjectTabs
              openProjects={openProjects}
              currentProjectId={currentProjectId}
              setCurrentProjectId={setCurrentProjectId}
              closeProject={closeProject}
            />
            {/* Results tabs bar and content */}
            <ResultsTabsBar projectId={currentProjectId} />
            <ResultsTabContent projectId={currentProjectId} />
            {openProjects.length > 0 ? (
                          <MainPage
              hasBlock={hasAnyBlock(currentProjectId)}
              blockPosition={projectBlockPositions[currentProjectId]?.[projectBlockModes[currentProjectId] || mode] || null}
              onEditRequest={handleEditRequest}
              showRunButton={hasAnyBlock(currentProjectId)}
              onRunModel={handleRunModel}
              isSelected={isBlockSelected}
              onSelect={handleBlockSelect}
              onDeselect={handleBlockDeselect}
              blockMode={projectBlockModes[currentProjectId] || mode}
              currentProjectId={currentProjectId}
              isBlockTypePlaced={isBlockTypePlaced}
              projectBlockPositions={projectBlockPositions}
              projectBlockModes={projectBlockModes}
              openProjects={openProjects}
              projectBlocks={projectBlocks}
              projectBlockParams={projectBlockParams}
              blockMoveCount={blockMoveCount}
              resultsTabs={resultsTabs}
              currentResultsTab={currentResultsTab}
              setProjectBlockPositions={setProjectBlockPositions}
              setBlockMoveCount={setBlockMoveCount}
              triggerProjectAutosave={triggerProjectAutosave}
            />
            ) : (
              <div className="h-full w-full bg-zinc-800 text-zinc-100 flex flex-col items-center justify-center border-2 border-dashed border-zinc-700 relative">
                <div className="text-2xl font-bold mb-2">Select a project to get started</div>
                <div className="text-zinc-400">Create or open an existing project from the left panel.</div>
              </div>
            )}
          </div>
          {/* Noira Panel */}
          <SubtleResizableBorder
            direction="right"
            show={showNoira}
            min={minNoira}
            max={480}
            initial={320}
            onResize={setNoiraWidth}
          >
            <div style={{ width: noiraWidth, minWidth: minNoira, maxWidth: 480, height: '100%' }}>
              <NoiraPanel />
            </div>
          </SubtleResizableBorder>
        </div>
        {/* Block Bar at the bottom */}
        <SubtleResizableBorder direction="bottom" show={showBlockBar} min={48} max={160} initial={64}>
          <div className="h-full border-t border-zinc-800">
            <BlockBar 
              hasBlock={hasAnyBlock(currentProjectId)} 
              mode={mode} 
              setMode={setMode} 
              currentProjectId={currentProjectId}
              isBlockTypePlaced={isBlockTypePlaced}
            />
          </div>
        </SubtleResizableBorder>
        <DragOverlay>
          {activeId ? (
            <SensitivityTestBlock 
              isDragging 
              mode={
                activeId === 'blockbar-classical' || activeId === 'main-classical' ? 'classical' :
                activeId === 'blockbar-hybrid' || activeId === 'main-hybrid' ? 'hybrid' :
                activeId === 'blockbar-quantum' || activeId === 'main-quantum' ? 'quantum' :
                'classical'
              }
            />
          ) : null}
        </DragOverlay>
        {contextMenu && (
          <ContextMenu x={contextMenu.x} y={contextMenu.y} onEdit={handleEdit} onDelete={handleBlockDelete} onClose={handleCloseContextMenu} />
        )}
        {showModal && <FloatingModal onClose={handleModalClose} blockMode={projectBlockModes[currentProjectId] || mode} />}
        {showNewProjectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-lg p-8 min-w-[320px] min-h-[120px] relative">
              <button
                className="absolute top-2 right-2 text-zinc-500 hover:text-zinc-800 text-xl font-bold"
                onClick={() => setShowNewProjectModal(false)}
              >
                ×
              </button>
              <div className="text-lg font-bold mb-4 text-zinc-800">Create New Project</div>
              <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleCreateProject(); }}>
                <input
                  className="w-full border border-zinc-300 rounded px-3 py-2 outline-none focus:border-blue-500"
                  placeholder="Project Name"
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="px-4 py-2 rounded bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
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
        {projectFolderMenu && (
          <div
            style={{ position: 'fixed', left: projectFolderMenu.x, top: projectFolderMenu.y, zIndex: 1000 }}
            className="bg-white rounded shadow border border-zinc-200 min-w-[140px]"
            onClick={() => setProjectFolderMenu(null)}
          >
            <button
              className="w-full text-left px-4 py-2 hover:bg-red-100 text-red-700"
              onClick={e => { e.stopPropagation(); setProjectToDelete(projectFolderMenu.project); setProjectFolderMenu(null); }}
            >
              Delete Project
            </button>
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
                  onClick={handleDeleteProjectConfirm}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
        {showBlockEditModal && (
          <BlockEditModal
            open={showBlockEditModal}
            onClose={() => {
              setShowBlockEditModal(false);
              setEditingBlockType(null);
            }}
            params={projectBlockParams[currentProjectId]?.[editingBlockType || projectBlockModes[currentProjectId] || mode]}
            onSave={params => {
              const blockType = editingBlockType || projectBlockModes[currentProjectId] || mode;
              setProjectBlockParams(prev => ({
                ...prev,
                [currentProjectId]: {
                  ...(prev[currentProjectId] || {}),
                  [blockType]: params
                }
              }));
              
              // Trigger autosave after parameter changes with UPDATED parameters
              const currentProject = openProjects.find(p => p.id === currentProjectId);
              if (currentProject) {
                // Create updated projectBlockParams with the new parameters
                const updatedProjectBlockParams = {
                  ...projectBlockParams,
                  [currentProjectId]: {
                    ...(projectBlockParams[currentProjectId] || {}),
                    [blockType]: params
                  }
                };
                
                triggerProjectAutosave(
                  currentProjectId,
                  currentProject.name,
                  projectBlocks[currentProjectId] || new Set(),
                  projectBlockPositions,
                  projectBlockModes,
                  updatedProjectBlockParams, // Use the updated parameters
                  blockMoveCount,
                  resultsTabs,
                  currentResultsTab
                );
              }
              setEditingBlockType(null);
            }}
          />
        )}
        {isRunningModel && (
          <div className="w-full h-1 bg-gradient-to-r from-blue-400 via-green-400 to-teal-400 animate-pulse absolute top-0 left-0 z-50" />
        )}
      </div>
    </DndContext>
  );
}

declare global {
  interface Window {
    electronAPI?: {
      chooseFolder: () => Promise<string | null>;
      readDir: (dirPath: string) => Promise<Array<{ name: string; type: 'file' | 'folder' }>>;
    };
  }
}

export default App;
