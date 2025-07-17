// Main application component for Kanosym portfolio sensitivity analysis platform
// This file implements the core UI including:
// - Multi-project tabbed interface with drag-and-drop block placement
// - Portfolio configuration and sensitivity analysis parameters
// - Integration with backend analysis engines (classical, hybrid, quantum)
// - Real-time collaboration features via polling and autosave

import React, { useState, useRef, useEffect } from 'react';
// @dnd-kit provides drag-and-drop functionality for placing analysis blocks
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragOverlay,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
// Component imports for major UI sections
import ResultsChart from './ResultsChart'; // Displays sensitivity analysis results
import NoiraPanel from './NoiraPanel'; // AI assistant chat interface
import ProjectExplorerPanel from './ProjectExplorerPanel'; // File manager sidebar
import { triggerProjectAutosave, autosaveManager } from './autosave'; // Auto-save functionality
import { useProjectDeletion } from './hooks/useProjectDeletion'; // Monitors for project deletion

// Component to monitor a single project for deletion from the file system
// This component uses a custom hook to poll the backend and detect when
// a project has been deleted externally (e.g., via file explorer)
// When deletion is detected, it triggers the onDeleted callback to clean up UI state
function ProjectDeletionMonitor({ projectId, projectName, onDeleted }: { 
  projectId: string; 
  projectName: string; 
  onDeleted: () => void;
}) {
  useProjectDeletion({
    projectId,
    projectName,
    onDeleted,
  });
  
  // This component doesn't render anything - it's purely for side effects
  return null;
}
import { useProjectPolling, useProjectListPolling, useTestRunPolling } from './hooks/useProjectPolling';

// Block color scheme mapping for the three analysis modes
// Classical: Traditional Monte Carlo simulation (gray theme)
// Hybrid: Combines classical and quantum approaches (purple theme)  
// Quantum: Pure quantum computation using Qiskit (blue theme)
const blockModeStyles = {
  classical: 'bg-zinc-800 text-white border-zinc-600',
  hybrid: 'bg-purple-700 text-white border-purple-400',
  quantum: 'bg-blue-700 text-white border-blue-400',
};

// ProjectTabs component renders the tabbed interface for switching between open projects
// Similar to browser tabs, users can:
// - Click tabs to switch between projects
// - Close tabs with the × button
// - See active tab highlighted with blue underline
function ProjectTabs({ openProjects, currentProjectId, setCurrentProjectId, closeProject }: { 
  openProjects: { id: string; name: string }[]; // List of currently open projects
  currentProjectId: string; // ID of the active project
  setCurrentProjectId: (id: string) => void; // Handler to switch active project
  closeProject: (id: string) => void; // Handler to close a project tab
}) {
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

// SensitivityTestBlock is the visual representation of a portfolio analysis block
// These blocks can be dragged from the BlockBar and placed in the main canvas
// Each block represents a different analysis engine (classical, hybrid, or quantum)
// Props:
// - isDragging: Whether block is currently being dragged (shows opacity change)
// - onContextMenu: Handler for right-click menu (edit/delete options)
// - mode: Analysis type determines color scheme (classical=gray, hybrid=purple, quantum=blue)
// - isSelected: Shows glow effect when block is selected for editing/moving
function SensitivityTestBlock({ isDragging = false, onContextMenu, mode = 'classical', isSelected = false }: { 
  isDragging?: boolean; 
  onContextMenu?: (e: React.MouseEvent) => void; 
  mode?: 'classical' | 'hybrid' | 'quantum'; 
  isSelected?: boolean 
}) {
  // Determine glow color based on mode and selection state
  // Each mode has a unique glow color to match its theme
  const getGlowStyle = () => {
    if (!isSelected) return 'none';
    switch (mode) {
      case 'classical':
        return '0 0 0 2px white, 0 0 8px 2px rgba(255, 255, 255, 0.5)';
      case 'hybrid':
        return '0 0 0 2px #a855f7, 0 0 8px 2px rgba(168, 85, 247, 0.5)';
      case 'quantum':
        return '0 0 0 2px #3b82f6, 0 0 8px 2px rgba(59, 130, 246, 0.5)';
      default:
        return '0 0 0 2px #3b82f6, 0 0 8px 2px rgba(59, 130, 246, 0.5)';
    }
  };

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
        boxShadow: getGlowStyle(),
        transition: 'box-shadow 0.15s ease',
      }}
      className={`rounded shadow mr-2 cursor-pointer transition select-none border-2 ${blockModeStyles[mode]} ${isDragging ? 'opacity-50' : ''}`}
      onContextMenu={onContextMenu}
    >
      Portfolio Sensitivity Test
    </div>
  );
}

// DraggableBlock wraps SensitivityTestBlock with drag-and-drop functionality
// Uses @dnd-kit's useDraggable hook to enable:
// - Dragging blocks from the BlockBar to the main canvas
// - Moving blocks already placed on the canvas
// The id prop helps identify whether the block is from the BlockBar or already placed
function DraggableBlock({ id, onContextMenu, mode = 'classical', isSelected = false }: { 
  id: string; // Unique identifier (e.g., 'blockbar-classical' or 'main-classical')
  onContextMenu?: (e: React.MouseEvent) => void; 
  mode?: 'classical' | 'hybrid' | 'quantum'; 
  isSelected?: boolean 
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}>
      <SensitivityTestBlock isDragging={isDragging} onContextMenu={onContextMenu} mode={mode} isSelected={isSelected} />
    </div>
  );
}

// MainPage is the central canvas where users place and configure analysis blocks
// Key features:
// - Drop zone for dragging blocks from BlockBar
// - Grid background for visual alignment
// - Block positioning and movement after initial placement
// - Run button appears when blocks are configured
// - Handles both initial drag-drop placement and subsequent repositioning
function MainPage({ onEditRequest, showRunButton, onRunModel, isSelected, onSelect, onDeselect, currentProjectId, projectBlockPositions, projectBlockModes, openProjects, projectBlocks, projectBlockParams, blockMoveCount, resultsTabs, currentResultsTab, setProjectBlockPositions, setBlockMoveCount, triggerProjectAutosave }: {
  onEditRequest: (e: React.MouseEvent, blockType?: 'classical' | 'hybrid' | 'quantum') => void;
  showRunButton?: boolean;
  onRunModel?: () => void;
  isSelected: boolean;
  onSelect: () => void;
  onDeselect: () => void;
  currentProjectId: string;
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
  triggerProjectAutosave: (
    projectId: string,
    projectName: string,
    projectBlocks: Set<'classical' | 'hybrid' | 'quantum'>,
    projectBlockPositions: { [projectId: string]: { [blockType: string]: { x: number; y: number } } },
    projectBlockModes: { [projectId: string]: 'classical' | 'hybrid' | 'quantum' },
    projectBlockParams: { [projectId: string]: any },
    blockMoveCount: { [projectId: string]: number },
    resultsTabs: { [projectId: string]: Array<{ id: string; label: string; data: any }> },
    currentResultsTab: { [projectId: string]: string | null }
  ) => void;
}) {
  // Add CSS for hiding scrollbars while maintaining scroll functionality
  // This creates a cleaner UI by removing visual scrollbar clutter
  // Applied to the main canvas area when blocks are placed
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
  // Set up the main canvas as a drop zone for blocks
  const { setNodeRef, isOver } = useDroppable({ id: 'center-dropzone' });
  
  // Handle right-click context menu for block operations (edit/delete)
  const handleContextMenu = (e: React.MouseEvent, blockType: 'classical' | 'hybrid' | 'quantum') => {
    e.preventDefault();
    e.stopPropagation();
    onEditRequest(e, blockType);
  };
  
  // Track which block type is currently selected for operations
  const [selectedBlockType, setSelectedBlockType] = useState<'classical' | 'hybrid' | 'quantum' | null>(null);

  // Get all placed blocks for this project from global state
  const placedBlocks = projectBlockPositions[currentProjectId] || {};
  const hasAnyBlocks = Object.keys(placedBlocks).length > 0;
  
  // Manual drag implementation for repositioning blocks after initial placement
  // This is separate from @dnd-kit and allows fine-grained control
  const [dragging, setDragging] = useState(false); // Is user currently dragging?
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 }); // Click offset within block
  const dragStart = useRef<{ mouseX: number; mouseY: number; blockX: number; blockY: number } | null>(null); // Initial drag state
  const [tempDragPosition, setTempDragPosition] = useState<{ [blockType: string]: { x: number; y: number } } | null>(null); // Preview position during drag
  
  // Handle mouse down for manual block dragging (after initial placement)
  // This captures the initial click position and calculates offsets to ensure
  // smooth dragging without the block jumping to cursor position
  function handleMouseDown(e: React.MouseEvent, blockType: string) {
    console.log('handleMouseDown called for block:', blockType);
    const blockPos = placedBlocks[blockType];
    if (blockPos) {
      // Get the block element to calculate click offset within the block
      const blockElement = e.currentTarget.parentElement;
      const rect = blockElement?.getBoundingClientRect();
      const parentRect = blockElement?.parentElement?.getBoundingClientRect();
      
      if (rect && parentRect) {
        // Calculate where in the block the user clicked (prevents jump on drag start)
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

  // Handle mouse movement during manual drag operation
  // Updates temporary position for smooth visual feedback without
  // committing to state until drag ends (better performance)
  function handleMouseMove(e: MouseEvent) {
    if (dragging && dragStart.current && selectedBlockType) {
      // Calculate the total mouse movement from start position
      const dx = e.clientX - dragStart.current.mouseX;
      const dy = e.clientY - dragStart.current.mouseY;
      
      // Apply movement to the original block position
      const newX = dragStart.current.blockX + dx;
      const newY = dragStart.current.blockY + dy;
      
      // Ensure block stays within reasonable bounds (prevents losing blocks off-screen)
      const boundedX = Math.max(0, Math.min(1900, newX));
      const boundedY = Math.max(0, Math.min(1900, newY));
      
      // Update temporary position for smooth dragging animation
      setTempDragPosition({
        [selectedBlockType]: { x: boundedX, y: boundedY }
      });
    }
  }
  // Handle mouse up to complete manual drag operation
  // Commits the final position to state and triggers autosave
  function handleMouseUp() {
    console.log('handleMouseUp called, dragging:', dragging);
    if (dragging && selectedBlockType && tempDragPosition) {
      console.log('Ending drag for block:', selectedBlockType);
      setDragging(false);
      
      // Apply the final position from tempDragPosition to permanent state
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
      
      // Trigger autosave with the updated positions to persist changes
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
      
      // Increment move count to track if block has been manually positioned
      // (used to prevent auto-centering on window resize)
      setBlockMoveCount(prev => ({
        ...prev,
        [currentProjectId]: (prev[currentProjectId] || 0) + 1
      }));
    }
    // Reset all drag state
    dragStart.current = null;
    setDragOffset({ x: 0, y: 0 });
    setTempDragPosition(null);
  }
  // Set up global mouse event listeners for manual drag operations
  // We use window-level listeners to ensure drag continues even if
  // cursor temporarily leaves the block element
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
    width: '100%',
    height: '100%',
    backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
    backgroundSize: '20px 20px',
  }}
>
  {hasAnyBlocks ? (
    Object.entries(placedBlocks)
      .filter(([blockType]) => projectBlocks[currentProjectId]?.has(blockType as 'classical' | 'hybrid' | 'quantum'))
      .map(([blockType, position]) => {
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
            <DraggableBlock 
              id={`main-${blockType}`} 
              onContextMenu={(e) => handleContextMenu(e, blockType as 'classical' | 'hybrid' | 'quantum')} 
              mode={blockType as 'classical' | 'hybrid' | 'quantum'}
              isSelected={isSelected && selectedBlockType === blockType}
            />
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

// BlockBar component at the bottom of the screen
// Contains draggable blocks that haven't been placed yet
// Features:
// - Shows only unplaced block types
// - Mode toggle to switch between classical/hybrid/quantum
// - Acts as both source for new blocks and drop zone to remove blocks
function BlockBar({ mode, setMode, currentProjectId, isBlockTypePlaced }: { 
  mode: 'classical' | 'hybrid' | 'quantum'; 
  setMode: (m: 'classical' | 'hybrid' | 'quantum') => void;
  currentProjectId: string;
  isBlockTypePlaced: (projectId: string, blockType: 'classical' | 'hybrid' | 'quantum') => boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'blockbar-dropzone' });
  return (
    <div ref={setNodeRef} className={`w-full h-full bg-zinc-950 border-t border-zinc-800 flex items-center px-4 ${isOver ? 'bg-zinc-900' : ''}`}>      
      <div className="flex gap-2">
        {/* Only show block if it hasn't been placed in the current project */}
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

// ModeToggle allows switching between the three analysis engine types
// Visual feedback shows active mode with colored background
// Each mode represents:
// - Classical: Traditional Monte Carlo simulation
// - Hybrid: Combination of classical and quantum approaches
// - Quantum: Pure quantum computation using Qiskit
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

// ContextMenu appears on right-click of placed blocks
// Provides options to edit block parameters or delete the block
// Positioned at cursor location with proper viewport bounds checking
function ContextMenu({ x, y, onEdit, onDelete, onClose }: { 
  x: number; // X coordinate for menu position
  y: number; // Y coordinate for menu position
  onEdit: () => void; // Handler to open edit modal
  onDelete: () => void; // Handler to remove block
  onClose: () => void; // Handler to close menu
}) {
  // Position the menu at cursor, but keep it within the viewport
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

// FloatingModal is a simplified parameter configuration dialog
// (Note: This appears to be legacy code - the main configuration is now in BlockEditModal)
// Allows quick configuration of:
// - Asset to analyze
// - Parameter type (volatility, correlation, weight)
// - Sensitivity range and steps
// - Volatility fetching from market data
function FloatingModal({ onClose, blockMode }: { onClose: () => void; blockMode: 'classical' | 'hybrid' | 'quantum' }) {
  const [asset, setAsset] = useState('');
  const [parameter, setParameter] = useState('volatility');
  const [rangeMin, setRangeMin] = useState('');
  const [rangeMax, setRangeMax] = useState('');
  const [steps, setSteps] = useState('');
  const [volatility, setVolatility] = useState('');
  const [fetchingVol, setFetchingVol] = useState(false);
  const [fetchError, setFetchError] = useState('');

  // Helper to get default date range (last 6 months)
  function getDefaultDates() {
    const end = new Date();
    const start = new Date();
    start.setMonth(end.getMonth() - 6);
    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  }

  async function handleFetchVolatility() {
    setFetchingVol(true);
    setFetchError('');
    const { start, end } = getDefaultDates();
    try {
      const res = await fetch('http://localhost:5001/api/fetch_volatility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols: [asset], start, end, window: 60 }),
      });
      const data = await res.json();
      if (data.success && data.volatility && data.volatility[asset] && typeof data.volatility[asset] === 'number') {
        setVolatility(data.volatility[asset].toFixed(4));
      } else {
        setFetchError(data.volatility && data.volatility[asset] ? data.volatility[asset] : 'Could not fetch volatility.');
      }
    } catch (err) {
      setFetchError('Error fetching volatility.');
    }
    setFetchingVol(false);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    // For now, just log the values
    console.log({ asset, parameter, rangeMin, rangeMax, steps, volatility });
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
          
          {/* Correlation-specific explanation */}
          {parameter === 'correlation' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="text-sm text-blue-800 font-medium mb-2">⚠️ Correlation Delta Perturbation</div>
              <div className="text-xs text-blue-700 leading-relaxed">
                When you perturb correlation for <strong>{asset || 'this asset'}</strong>, you're shifting 
                <strong> ALL correlations</strong> between this asset and every other asset by the specified delta. 
                This preserves relative relationships while simulating how market stress affects correlation levels.
              </div>
            </div>
          )}
          
          {parameter === 'volatility' && (
            <div>
              <label className="block text-zinc-700 text-sm mb-1">Volatility</label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  step="0.0001"
                  className="w-full bg-zinc-600 border border-zinc-500 rounded px-2 py-1 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={volatility}
                  onChange={e => setVolatility(e.target.value)}
                  placeholder="e.g. 0.25"
                  required
                />
                <button
                  type="button"
                  className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
                  onClick={handleFetchVolatility}
                  disabled={!asset || fetchingVol}
                >
                  {fetchingVol ? 'Fetching...' : 'Fetch'}
                </button>
              </div>
              {fetchError && <div className="text-xs text-red-600 mt-1">{fetchError}</div>}
            </div>
          )}
          
          <div className="flex space-x-2">
                          <div className="flex-1">
                <label className="block text-zinc-700 text-sm mb-1">
                  {parameter === 'correlation' ? 'Correlation Delta Min' : 'Range Min'}
                </label>
                <input
                  type="number"
                  className="w-full border border-zinc-300 rounded px-2 py-1"
                  value={rangeMin}
                  onChange={e => setRangeMin(e.target.value)}
                  min={parameter === 'correlation' ? -0.5 : undefined}
                  max={parameter === 'correlation' ? 0.5 : undefined}
                  step={parameter === 'correlation' ? 0.0001 : undefined}
                  required
                />
                {parameter === 'correlation' && (
                  <div className="text-xs text-zinc-500 mt-1">Delta range: -0.5 to +0.5 (shifts existing correlations)</div>
                )}
              </div>
                          <div className="flex-1">
                <label className="block text-zinc-700 text-sm mb-1">
                  {parameter === 'correlation' ? 'Correlation Delta Max' : 'Range Max'}
                </label>
                <input
                  type="number"
                  className="w-full border border-zinc-300 rounded px-2 py-1"
                  value={rangeMax}
                  onChange={e => setRangeMax(e.target.value)}
                  min={parameter === 'correlation' ? -0.5 : undefined}
                  max={parameter === 'correlation' ? 0.5 : undefined}
                  step={parameter === 'correlation' ? 0.0001 : undefined}
                  required
                />
                {parameter === 'correlation' ? (
                  <div className="text-xs text-zinc-500 mt-1">Delta range: -0.5 to +0.5 (shifts existing correlations)</div>
                ) : null}
              </div>
          </div>
          
          <div>
            <label className="block text-zinc-700 text-sm mb-1">Steps</label>
            <input
              type="number"
              className="w-full border border-zinc-300 rounded px-2 py-1"
              value={steps}
              onChange={e => setSteps(e.target.value)}
              min="2"
              max="20"
              required
            />
            <div className="text-xs text-zinc-500 mt-1">Number of points to test in the range (2-20)</div>
          </div>
          
          {/* Additional correlation context */}
          {parameter === 'correlation' && (
            <></>
          )}
          
          <button
            type="submit"
            className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-bold"
          >
            Save
          </button>
        </form>
      </div>
    </div>
  );
}


// LayoutToggles provides UI controls to show/hide major panels
// Located in top-right corner for easy access
// Three toggles control:
// - File Manager (left sidebar with project explorer)
// - Noira Panel (right sidebar with AI assistant)
// - Block Bar (bottom panel with draggable blocks)
function LayoutToggles({ showNoira, setShowNoira, showBlockBar, setShowBlockBar, showFileManager, setShowFileManager }: { 
  showNoira: boolean; 
  setShowNoira: (v: boolean) => void; 
  showBlockBar: boolean; 
  setShowBlockBar: (v: boolean) => void; 
  showFileManager: boolean; 
  setShowFileManager: (v: boolean) => void; 
}) {
  return (
    <div className="absolute top-2 right-4 z-30 flex gap-2">
      <button
        className={`w-7 h-7 flex items-center justify-center rounded hover:bg-zinc-800 ${showFileManager ? 'bg-zinc-700' : ''}`}
        title="Toggle File Manager"
        onClick={() => setShowFileManager(!showFileManager)}
      >
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="4" height="12" rx="1" fill="#B0BEC5"/><rect x="7" y="2" width="7" height="12" rx="1" fill="#B0BEC5"/></svg>
      </button>
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

// SubtleResizableBorder creates resizable panels with drag handles
// Used for File Manager, Noira Panel, and Block Bar
// Features:
// - Draggable border for resizing
// - Min/max size constraints
// - Visual feedback on hover
// - Smooth resize animation
function SubtleResizableBorder({ onResize, direction, children, show = true, min = 200, max = 480, initial = 224 }: { 
  onResize?: (w: number) => void; // Callback when size changes
  direction: 'left' | 'right' | 'bottom'; // Which edge has the resize handle
  children: React.ReactNode; // Panel content
  show?: boolean; // Whether panel is visible
  min?: number; // Minimum size in pixels
  max?: number; // Maximum size in pixels
  initial?: number; // Initial size
}) {
  const [size, setSize] = useState(initial);
  const dragging = useRef(false);

  function onMouseDown(_e: React.MouseEvent) {
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

// RunModelButton appears when blocks are configured and ready to run
// Triggers the sensitivity analysis using the selected engine
// Positioned in bottom-right corner for easy access
function RunModelButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      className="absolute bottom-6 right-8 z-40 bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded shadow-lg transition"
      style={{ position: 'absolute', bottom: 40, right: 12 }}
      onClick={onClick}
    >
      Run
    </button>
  );
}

// App is the root component that manages all application state and orchestrates the UI
// Key responsibilities:
// - Project management (create, open, close, delete)
// - Block placement and configuration via drag-and-drop
// - Integration with backend for analysis and data persistence
// - Real-time updates via polling hooks
// - Layout management with resizable panels
function App() {
  // Drag and drop state
  const [activeId, setActiveId] = useState<string | null>(null); // Currently dragging block ID
  const [showModal, setShowModal] = useState(false); // Legacy modal visibility
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; blockType?: 'classical' | 'hybrid' | 'quantum' } | null>(null);
  const [editingBlockType, setEditingBlockType] = useState<'classical' | 'hybrid' | 'quantum' | null>(null);
  
  // Layout state
  const [showNoira, setShowNoira] = useState(true); // AI assistant panel visibility
  const [showBlockBar, setShowBlockBar] = useState(true); // Bottom block bar visibility
  const [selectedBlockProject, setSelectedBlockProject] = useState<string | null>(null); // Which project has selected block
  const [blockMoveCount, setBlockMoveCount] = useState<{ [projectId: string]: number }>({}); // Track manual moves per project

  // Effect to recenter unmoved blocks when window resizes
  // This improves UX by keeping newly placed blocks centered
  // Only affects blocks that haven't been manually positioned (moveCount === 0)
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
              // position is an object with block types, not a single position
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

  // Effect to cancel all pending autosaves when component unmounts
  // Prevents memory leaks and ensures clean shutdown
  useEffect(() => {
    return () => {
      autosaveManager.cancelAllAutosaves();
    };
  }, []);

  // Effect to load projects from backend on initial mount
  // Fetches the list of available projects but doesn't auto-open any
  // Users must explicitly choose which project to work on
  useEffect(() => {
    async function loadProjects() {
      try {
        const response = await fetch('http://localhost:5001/api/projects');
        const data = await response.json();
        if (data.success) {
          // Projects API returns flat structure with project_id and name
          const projectsList = data.projects.map((project: any) => ({
            id: project.project_id,
            name: project.name
          }));
          setProjects(projectsList);
          console.log('Loaded projects:', projectsList);
          
          // If no projects are open and we have projects, don't auto-open the first one
          // Let the user choose which project to open
        }
      } catch (error) {
        console.error('Error loading projects:', error);
      }
    }
    
    loadProjects();
  }, []);

  // Block mode state - tracks which analysis type is active
  const [mode, setMode] = useState<'classical' | 'hybrid' | 'quantum'>('classical');
  // Store block mode per project (each project can have different modes)
  const [projectBlockModes, setProjectBlockModes] = useState<{ [projectId: string]: 'classical' | 'hybrid' | 'quantum' }>({});

  // Modal state for creating new projects
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  // State for project deletion confirmation dialog
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null);

  // Results state - each project can have multiple test run results
  const [resultsTabs, setResultsTabs] = useState<{ [projectId: string]: Array<{ id: string; label: string; data: any }> }>({});
  const [currentResultsTab, setCurrentResultsTab] = useState<{ [projectId: string]: string | null }>({});

  // Analysis state
  const [isRunningModel, setIsRunningModel] = useState(false); // Shows loading indicator during analysis
  const [projectBlockParams, setProjectBlockParams] = useState<{ [projectId: string]: { [blockType: string]: any } }>({}); // Portfolio configurations per block type

  // File Manager visibility state
  const [showFileManager, setShowFileManager] = useState(true);

  // Projects state - list of all available projects from backend
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [projectRefreshTrigger, setProjectRefreshTrigger] = useState(0); // Force refresh of project explorer
  
  // Notification state for projects deleted externally
  const [deletedProjectNotification, setDeletedProjectNotification] = useState<string | null>(null);

  // Project tab state - tracks which projects are open and active
  const [openProjects, setOpenProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string>(''); // Active project ID
  
  // Per-project block state - supports multiple block types per project
  const [projectBlocks, setProjectBlocks] = useState<{ [projectId: string]: Set<'classical' | 'hybrid' | 'quantum'> }>({});
  const [projectBlockPositions, setProjectBlockPositions] = useState<{ [projectId: string]: { [blockType: string]: { x: number; y: number } } }>({});
  
  // Helper function to check if any block is placed in a project
  // Used to determine when to show the Run button
  function hasAnyBlock(projectId: string): boolean {
    return (projectBlocks[projectId]?.size || 0) > 0;
  }
  
  // Helper function to check if a specific block type is already placed
  // Prevents duplicate blocks of the same type in a project
  function isBlockTypePlaced(projectId: string, blockType: 'classical' | 'hybrid' | 'quantum'): boolean {
    return projectBlocks[projectId]?.has(blockType) || false;
  }
  
  // Helper function to add a block type to a project
  // Updates the Set of placed blocks for the project
  function addBlockTypeToProject(projectId: string, blockType: 'classical' | 'hybrid' | 'quantum') {
    setProjectBlocks(prev => ({
      ...prev,
      [projectId]: new Set([...(prev[projectId] || []), blockType])
    }));
  }
  
  // Helper function to remove a block type from a project
  // Also handles cleanup if no blocks remain
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

  // Poll for project list changes to detect external create/delete operations
  // This enables real-time updates when projects are modified outside the UI
  useProjectListPolling({
    enabled: true,
    onProjectsChanged: () => {
      console.log('Project list changed, refreshing...');
      setProjectRefreshTrigger(prev => prev + 1);
    },
    pollingInterval: 1000, // Check every second
  });

  // Poll for test run changes to update the project explorer
  // Shows new test runs created by Noira or other sources
  useTestRunPolling({
    enabled: true,
    onTestRunsChanged: () => {
      console.log('Test runs changed, refreshing...');
      setProjectRefreshTrigger(prev => prev + 1);
    },
    pollingInterval: 2000, // Check every 2 seconds
  });

  // Poll for current project changes to sync block modifications
  // Detects when Noira or other sources modify the active project
  const currentProject = openProjects.find(p => p.id === currentProjectId);
  useProjectPolling({
    projectName: currentProject?.name || null,
    enabled: !!currentProject,
    onProjectChanged: async () => {
      console.log('Current project changed, reloading...');
      if (currentProject) {
        // Reload the project data
        await handleOpenProject(currentProject.name);
        // Trigger refresh of ProjectExplorerPanel to show updated test run count
        setProjectRefreshTrigger(prev => prev + 1);
      }
    },
    pollingInterval: 500, // Check every 500ms for faster updates
  });
  

  // Handler to open a project from the file system
  // Loads all project data including:
  // - Block placements and positions
  // - Block parameters (portfolio configurations)
  // - UI state (current mode, etc.)
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
        
        // Load project configuration from .ksm file
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

  // Handler to open a test run from the project explorer
  // Test runs are stored separately from projects and linked by project_id
  // This function:
  // 1. Fetches the test run data
  // 2. Finds and opens the associated project
  // 3. Creates a results tab to display the analysis
  async function handleOpenTestRun(testRunId: string) {
    try {
      const response = await fetch(`http://localhost:5001/api/test-runs/${testRunId}`);
      const data = await response.json();
      if (data.success) {
        const testRun = data.test_run;
        console.log('handleOpenTestRun - received test run:', testRun);
        
        // Find the associated project
        const projectId = testRun.project_id;
        console.log('Looking for project ID:', projectId);
        console.log('Available projects:', projects.map(p => ({ id: p.id, name: p.name })));
        
        if (projectId) {
          // Find the project by ID - first check cached projects
          let project = projects.find(p => p.id === projectId);
          
          // If not found in cache, fetch fresh project list
          if (!project) {
            console.log('Project not in cache, fetching fresh project list...');
            const projectsResponse = await fetch('http://localhost:5001/api/projects');
            const projectsData = await projectsResponse.json();
            if (projectsData.success) {
              const freshProject = projectsData.projects.find((p: any) => p.project_id === projectId);
              if (freshProject) {
                project = {
                  id: freshProject.project_id,
                  name: freshProject.name
                };
                // Update the projects state with fresh data
                const projectsList = projectsData.projects.map((p: any) => ({
                  id: p.project_id,
                  name: p.name
                }));
                setProjects(projectsList);
              }
            }
          }
          
          if (project) {
            // Open the project if not already open
            if (!openProjects.find(p => p.id === projectId)) {
              await handleOpenProject(project.name);
            }
            
            // Set the project as current
            setCurrentProjectId(projectId);
            
            // Create a results tab for this test run
            // The test run already has all the data that ResultsChart expects
            const tabData = {
              perturbation: testRun.perturbation,
              asset: testRun.asset,
              range_tested: testRun.range_tested,
              baseline_portfolio_volatility_daily: testRun.baseline_portfolio_volatility_daily,
              baseline_portfolio_volatility_annualized: testRun.baseline_portfolio_volatility_annualized,
              results: testRun.results,
              analytics: testRun.analytics,
              testType: testRun.block_type
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

  // Handler to close a test run results tab
  // Searches through all projects to find which one contains the test run
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
  
  // Handler to close a project tab
  // Cleans up all associated state and switches to another open project
  function closeProject(id: string) {
    const idx = openProjects.findIndex(p => p.id === id);
    if (idx !== -1) {
      const newOpen = openProjects.filter(p => p.id !== id);
      setOpenProjects(newOpen);
      // Clean up project-specific state
      setProjectBlocks(prev => {
        const newBlocks = { ...prev };
        delete newBlocks[id];
        return newBlocks;
      });
      // Switch to another project if this was the active one
      if (currentProjectId === id && newOpen.length > 0) {
        setCurrentProjectId(newOpen[Math.max(0, idx - 1)].id);
      }
    }
  }


  // Handler for @dnd-kit drag start event
  // Tracks which block is being dragged for visual feedback
  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
    setContextMenu(null); // Hide context menu if dragging
  }

  // Handler for @dnd-kit drag end event
  // Main logic for placing blocks from BlockBar or moving existing blocks
  function handleDragEnd(event: DragEndEvent) {
    if (event.over) {
      if (event.over.id === 'center-dropzone') {
        const dropzoneElem = document.getElementById('kanosym-mbe-dropzone');
        const dropzoneRect = dropzoneElem?.getBoundingClientRect();
        let dropX = 200, dropY = 120; // fallback default position

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
        // Remove the correct block type from the project (the one being dragged)
        let blockTypeToRemove: 'classical' | 'hybrid' | 'quantum' | undefined;
        if (activeId?.startsWith('main-')) {
          blockTypeToRemove = activeId.replace('main-', '') as 'classical' | 'hybrid' | 'quantum';
        } else if (activeId?.startsWith('blockbar-')) {
          blockTypeToRemove = activeId.replace('blockbar-', '') as 'classical' | 'hybrid' | 'quantum';
        } else {
          blockTypeToRemove = projectBlockModes[currentProjectId];
        }
        if (blockTypeToRemove) {
          removeBlockTypeFromProject(currentProjectId, blockTypeToRemove);
          setProjectBlockPositions(prev => {
            const newPositions = { ...prev };
            if (newPositions[currentProjectId]) {
              delete newPositions[currentProjectId][blockTypeToRemove!];
              // Remove the project entry if no blocks remain
              if (Object.keys(newPositions[currentProjectId]).length === 0) {
                delete newPositions[currentProjectId];
              }
            }
            // Clean up block parameters
            setProjectBlockParams(prev => {
              const newParams = { ...prev };
              if (newParams[currentProjectId]) {
                delete newParams[currentProjectId][blockTypeToRemove!];
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
              updatedProjectBlocks.delete(blockTypeToRemove!);
              // Create updated projectBlockModes
              const updatedProjectBlockModes = { ...projectBlockModes };
              if (updatedProjectBlockModes[currentProjectId] === blockTypeToRemove) {
                delete updatedProjectBlockModes[currentProjectId];
              }
              // Create updated params
              const updatedParams = { ...projectBlockParams };
              if (updatedParams[currentProjectId]) {
                delete updatedParams[currentProjectId][blockTypeToRemove!];
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
          if (blockTypeToRemove && copy[currentProjectId] === blockTypeToRemove) {
            delete copy[currentProjectId];
          }
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

  // Handler to run the sensitivity analysis
  // Sends portfolio configuration to the appropriate backend engine
  // Creates a results tab when analysis completes
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
      
      // Trigger refresh of ProjectExplorerPanel to show new test run
      setProjectRefreshTrigger(prev => prev + 1);
      
      // Backend will handle all Noira messages through display history
      // NoiraPanel will poll for updates automatically
      
      setIsRunningModel(false);
    } catch (err) {
      setIsRunningModel(false);
      alert('Error running model: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }

  // Helper to add a results tab after analysis completes
  // Each tab contains the sensitivity analysis data for one test run
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
  // Handles tab switching logic when closing the active tab
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
        // Switch to previous tab if available, otherwise next tab
        if (idx > 0) newTabId = tabs[idx - 1].id;
        else newTabId = tabs[1].id;
      }
      return { ...prev, [projectId]: newTabId };
    });
  }

  // Component to render the results tabs bar
  // Similar to project tabs but for test run results within a project
  // Green highlighting indicates active results tab
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

  // Component to render the active results tab content
  // Passes the sensitivity analysis data to ResultsChart for visualization
  function ResultsTabContent({ projectId }: { projectId: string }) {
    const tabs = resultsTabs[projectId] || [];
    const activeTabId = currentResultsTab[projectId];
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab) return null;
    
    // Debug logging
    console.log('ResultsTabContent - tab data:', tab.data);
    
    return <ResultsChart data={tab.data} />;
  }

  const isBlockSelected = selectedBlockProject === currentProjectId;
  function handleBlockSelect() {
    setSelectedBlockProject(currentProjectId);
  }

  // Set minimums to ensure main pane never gets too small
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

  // Handler to create a new project
  // Creates a .ksm file in the backend projects directory
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
        // Trigger refresh of ProjectExplorerPanel with a small delay
        console.log('Triggering ProjectExplorerPanel refresh');
        setTimeout(() => {
          setProjectRefreshTrigger(prev => prev + 1);
        }, 100);
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
    // TODO: Add context menu for project folder
  }
  // Handler to delete a project after confirmation
  // Removes the .ksm file and all associated test runs
  async function handleDeleteProjectConfirm() {
    if (!projectToDelete) return;
    
    try {
      const response = await fetch(`http://localhost:5001/api/projects/${encodeURIComponent(projectToDelete.name)}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        // Remove from projects list
        setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
        // Close tab if open
        setOpenProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
        // Clean up all project-related state
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

  // BlockEditModal is the main configuration interface for sensitivity analysis
  // Features:
  // - Portfolio configuration (assets, weights, volatilities, correlations)
  // - Sensitivity analysis parameters (parameter type, range, steps)
  // - Market data fetching for volatility and correlation estimates
  // - Dynamic form updates based on parameter selection
  function BlockEditModal({ open, onClose, params, onSave }: { 
    open: boolean; 
    onClose: () => void; 
    params: any; 
    onSave: (params: any) => void 
  }) {
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
      use_noise_model: false, // Add noise model toggle for quantum blocks
      noise_model_type: 'fast', // Add noise model type selector
    });

    // Add state for correlation validity warnings
    const [correlationValidity, setCorrelationValidity] = useState<{invalid_min: number, invalid_max: number, loading: boolean, error?: string} | null>(null);

    // Effect to check correlation validity when relevant fields change
    useEffect(() => {
      if (form.param === 'correlation') {
        setCorrelationValidity({ invalid_min: 0, invalid_max: 0, loading: true });
        const assetIdx = form.portfolio.assets.indexOf(form.asset);
        if (assetIdx === -1) {
          setCorrelationValidity({ invalid_min: 0, invalid_max: 0, loading: false, error: 'Selected asset not found.' });
          return;
        }
        fetch('http://localhost:5001/api/check_correlation_validity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            correlation_matrix: form.portfolio.correlation_matrix,
            asset_idx: assetIdx,
            range_vals: form.range,
            steps: form.steps,
          })
        })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setCorrelationValidity({
                invalid_min: data.invalid_min,
                invalid_max: data.invalid_max,
                loading: false
              });
+              console.log('[Debug] correlationValidity updated', data);
            } else {
              setCorrelationValidity({ invalid_min: 0, invalid_max: 0, loading: false, error: data.error || 'Unknown error' });
            }
          })
          .catch(err => {
            setCorrelationValidity({ invalid_min: 0, invalid_max: 0, loading: false, error: err.message || 'Network error' });
          });
      } else {
        setCorrelationValidity(null);
      }
    }, [form.param, form.asset, form.range[0], form.range[1], form.steps, JSON.stringify(form.portfolio.correlation_matrix)]);

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

    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
      const { name, value } = e.target;
      setForm((prev: any) => {
        if (name === 'asset') {
          const idx = prev.portfolio.assets.indexOf(value);
          let newRange = prev.range;
          if (idx !== -1 && prev.param === 'volatility') {
            const v = prev.portfolio.volatility[idx];
            newRange = [Number((v - 0.05).toFixed(4)), Number((v + 0.05).toFixed(4))];
          } else if (idx !== -1 && prev.param === 'weight') {
            const w = prev.portfolio.weights[idx];
            newRange = [Number((w - 0.1).toFixed(4)), Number((w + 0.1).toFixed(4))];
          }
          return { ...prev, [name]: value, range: newRange };
        } else if (name === 'param') {
          let newRange = prev.range;
          if (value === 'volatility') {
            const idx = prev.portfolio.assets.indexOf(prev.asset);
            if (idx !== -1) {
              const v = prev.portfolio.volatility[idx];
              newRange = [Number((v - 0.05).toFixed(4)), Number((v + 0.05).toFixed(4))];
            }
          } else if (value === 'weight') {
            const idx = prev.portfolio.assets.indexOf(prev.asset);
            if (idx !== -1) {
              const w = prev.portfolio.weights[idx];
              newRange = [Number((w - 0.1).toFixed(4)), Number((w + 0.1).toFixed(4))];
            }
          } else if (value === 'correlation') {
            newRange = [-0.5, 0.5];
          }
          return { ...prev, [name]: value, range: newRange };
        }
        return { ...prev, [name]: name === 'steps' ? Number(value) : value };
      });
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
        let newRange = prev.range;
        // If this asset is the selected one for sensitivity AND parameter is volatility, auto-adjust range
        if (prev.asset === prev.portfolio.assets[idx] && prev.param === 'volatility') {
          const v = Number(value);
          newRange = [Number((v - 0.05).toFixed(4)), Number((v + 0.05).toFixed(4))];
        }
        return { ...prev, portfolio: { ...prev.portfolio, volatility }, range: newRange };
      });
    }
    
    function handleCorrelationChange(i: number, j: number, value: string) {
      setForm((prev: any) => {
        const matrix = prev.portfolio.correlation_matrix.map((row: number[], _idx: number) => [...row]);
        matrix[i][j] = Number(value);
        matrix[j][i] = Number(value);
        return { ...prev, portfolio: { ...prev.portfolio, correlation_matrix: matrix } };
      });
    }

    function handleNoiseToggle() {
      setForm((prev: any) => ({ ...prev, use_noise_model: !prev.use_noise_model }));
    }
    
    function handleNoiseTypeChange(e: React.ChangeEvent<HTMLSelectElement>) {
      setForm((prev: any) => ({ ...prev, noise_model_type: e.target.value }));
    }

    // TODO: Where the fuck did this go?

    const blockTypeLabel =
      projectBlockModes[currentProjectId] === 'classical'
        ? 'Classical Portfolio Sensitivity Test'
        : projectBlockModes[currentProjectId] === 'hybrid'
        ? 'Hybrid Portfolio Sensitivity Test'
        : 'Quantum Portfolio Sensitivity Test';

    const [fetchingVols, setFetchingVols] = useState<{[idx: number]: boolean}>({});
    const [fetchErrors, setFetchErrors] = useState<{[idx: number]: string}>({});

    function getDefaultDates() {
      const end = new Date();
      const start = new Date();
      start.setMonth(end.getMonth() - 6);
      return {
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
      };
    }

    async function handleFetchVolatilityForAsset(idx: number, params?: any): Promise<boolean> {
      setFetchingVols(prev => ({ ...prev, [idx]: true }));
      setFetchErrors(prev => ({ ...prev, [idx]: '' }));
      const symbol = form.portfolio.assets[idx];
      const { start, end, window, frequency } = params || { ...getDefaultDates(), window: 60, frequency: '1d' };
      try {
        const res = await fetch('http://localhost:5001/api/fetch_volatility', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbols: [symbol], start, end, window, frequency }),
        });
        const data = await res.json();
        if (data.success && data.volatility && typeof data.volatility[symbol] === 'number') {
          const rounded = Number(data.volatility[symbol]).toFixed(4);
          handleVolatilityChange(idx, rounded);
          setFetchingVols(prev => ({ ...prev, [idx]: false }));
          return true;
        } else {
          setFetchErrors(prev => ({ ...prev, [idx]: data.volatility && data.volatility[symbol] ? data.volatility[symbol] : 'Could not fetch volatility.' }));
          setFetchingVols(prev => ({ ...prev, [idx]: false }));
          return false;
        }
      } catch (err) {
        setFetchErrors(prev => ({ ...prev, [idx]: 'Error fetching volatility.' }));
        setFetchingVols(prev => ({ ...prev, [idx]: false }));
        return false;
      }
    }

    const [showFetchModalIdx, setShowFetchModalIdx] = useState<number|null>(null);
    const defaultFetchParams = { ...getDefaultDates(), window: 60, frequency: '1d' };

    // Inside BlockEditModal, before the return statement:
    function FetchVolatilityModal({ open, onClose, onFetch, defaultParams }: { open: boolean; onClose: () => void; onFetch: (params: { start: string; end: string; window: number; frequency: string; volType: string; }) => Promise<boolean>; defaultParams: any }) {
      const [start, setStart] = useState(defaultParams.start);
      const [end, setEnd] = useState(defaultParams.end);
      const [windowSize, setWindowSize] = useState(defaultParams.window);
      const [frequency, setFrequency] = useState(defaultParams.frequency || '1d');
      const [volType, setVolType] = useState('historical'); // Only one option for now
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState('');

      async function handleSubmit(e?: React.FormEvent) {
        if (e) e.preventDefault();
        setLoading(true);
        setError('');
        try {
          const success = await onFetch({ start, end, window: windowSize, frequency, volType });
          if (success) {
            onClose();
          } else {
            setError('Could not fetch volatility.');
          }
        } catch (err) {
          setError('Error fetching volatility.');
          if (err instanceof Error) {
            console.error('FetchVolatilityModal handleSubmit error:', err.message, err.stack);
          } else {
            console.error('FetchVolatilityModal handleSubmit error:', err);
          }
        }
        setLoading(false);
      }

      if (!open) return null;
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 min-w-[320px] relative">
            <button
              className="absolute top-2 right-2 text-zinc-500 hover:text-zinc-800 text-xl font-bold"
              onClick={onClose}
            >
              ×
            </button>
            <div className="text-lg font-bold mb-4 text-zinc-800">Fetching Historical Volatility</div>
            <div className="space-y-4">
              <div>
                <label className="block text-zinc-700 text-sm mb-1">Start Date</label>
                <input type="date" className="w-full border border-zinc-300 rounded px-2 py-1" value={start} onChange={e => setStart(e.target.value)} required />
              </div>
              <div>
                <label className="block text-zinc-700 text-sm mb-1">End Date</label>
                <input type="date" className="w-full border border-zinc-300 rounded px-2 py-1" value={end} onChange={e => setEnd(e.target.value)} required />
              </div>
              <div>
                <label className="block text-zinc-700 text-sm mb-1">Window Size (days)</label>
                <input type="number" className="w-full border border-zinc-300 rounded px-2 py-1" value={windowSize} onChange={e => setWindowSize(Number(e.target.value))} min={2} max={252} required />
              </div>
              <div>
                <label className="block text-zinc-700 text-sm mb-1">Frequency (optional)</label>
                <select className="w-full border border-zinc-300 rounded px-2 py-1" value={frequency} onChange={e => setFrequency(e.target.value)}>
                  <option value="1d">Daily</option>
                  <option value="1wk">Weekly</option>
                  <option value="1mo">Monthly</option>
                </select>
              </div>
              <div>
                <label className="block text-zinc-700 text-sm mb-1">Volatility Type</label>
                <select className="w-full border border-zinc-300 rounded px-2 py-1" value={volType} onChange={e => setVolType(e.target.value)}>
                  <option value="historical">Historical (stddev)</option>
                  {/* Future: <option value="ewma">EWMA</option> */}
                </select>
              </div>
              {error && <div className="text-red-500 text-sm">{error}</div>}
              <button type="button" className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-bold" disabled={loading} onClick={handleSubmit}>
                {loading ? 'Fetching...' : 'Compute'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    const [fetchingCorr, setFetchingCorr] = useState(false);
    const [fetchCorrError, setFetchCorrError] = useState('');
    const [showCorrModal, setShowCorrModal] = useState(false);
    const defaultCorrParams = { ...getDefaultDates(), frequency: '1d' };

    async function handleFetchCorrelationMatrix(params?: any) {
      setFetchingCorr(true);
      setFetchCorrError('');
      const symbols = form.portfolio.assets;
      const { start, end, frequency } = params || { ...getDefaultDates(), frequency: '1d' };
      try {
        const res = await fetch('http://localhost:5001/api/fetch_correlation_matrix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbols, start, end, frequency }),
        });
        const data = await res.json();
        if (data.success && data.correlation_matrix) {
          const roundedMatrix = data.correlation_matrix.map((row: any[]) => row.map((val: any) => Number(val).toFixed(4)));
          setForm((prev: any) => ({
            ...prev,
            portfolio: {
              ...prev.portfolio,
              correlation_matrix: roundedMatrix,
            },
          }));
          setFetchingCorr(false);
          return true;
        } else {
          setFetchCorrError(data.error || 'Could not fetch correlation matrix.');
          setFetchingCorr(false);
          return false;
        }
      } catch (err) {
        setFetchCorrError('Error fetching correlation matrix.');
        setFetchingCorr(false);
        if (err instanceof Error) {
          console.error('handleFetchCorrelationMatrix error:', err.message, err.stack);
        } else {
          console.error('handleFetchCorrelationMatrix error:', err);
        }
        return false;
      }
    }

    function FetchCorrelationModal({ open, onClose, onFetch, defaultParams }: { open: boolean; onClose: () => void; onFetch: (params: { start: string; end: string; frequency: string; }) => Promise<boolean>; defaultParams: any }) {
      const [start, setStart] = useState(defaultParams.start);
      const [end, setEnd] = useState(defaultParams.end);
      const [frequency, setFrequency] = useState(defaultParams.frequency || '1d');
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState('');

      async function handleSubmit(e?: React.FormEvent) {
        if (e) e.preventDefault();
        setLoading(true);
        setError('');
        try {
          const success = await onFetch({ start, end, frequency });
          if (success) {
            onClose();
          } else {
            setError('Could not fetch correlation matrix.');
          }
        } catch (err) {
          setError('Error fetching correlation matrix.');
          if (err instanceof Error) {
            console.error('FetchCorrelationModal handleSubmit error:', err.message, err.stack);
          } else {
            console.error('FetchCorrelationModal handleSubmit error:', err);
          }
        }
        setLoading(false);
      }

      if (!open) return null;
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 min-w-[320px] relative">
            <button
              className="absolute top-2 right-2 text-zinc-500 hover:text-zinc-800 text-xl font-bold"
              onClick={onClose}
            >
              ×
            </button>
            <div className="text-lg font-bold mb-4 text-zinc-800">Estimate Correlation Matrix</div>
            <div className="space-y-4">
              <div>
                <label className="block text-zinc-700 text-sm mb-1">Start Date</label>
                <input type="date" className="w-full border border-zinc-300 rounded px-2 py-1" value={start} onChange={e => setStart(e.target.value)} required />
              </div>
              <div>
                <label className="block text-zinc-700 text-sm mb-1">End Date</label>
                <input type="date" className="w-full border border-zinc-300 rounded px-2 py-1" value={end} onChange={e => setEnd(e.target.value)} required />
              </div>
              <div>
                <label className="block text-zinc-700 text-sm mb-1">Frequency (optional)</label>
                <select className="w-full border border-zinc-300 rounded px-2 py-1" value={frequency} onChange={e => setFrequency(e.target.value)}>
                  <option value="1d">Daily</option>
                  <option value="1wk">Weekly</option>
                  <option value="1mo">Monthly</option>
                </select>
              </div>
              {error && <div className="text-red-500 text-sm">{error}</div>}
              <button type="button" className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-bold" disabled={loading} onClick={handleSubmit}>
                {loading ? 'Fetching...' : 'Fetch'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    const [showRangeWarning, setShowRangeWarning] = useState(false);
    const [showCorrelationWarning, setShowCorrelationWarning] = useState(false);

    function handleSave(e: React.FormEvent) {
      e.preventDefault();
      console.log('[Debug] handleSave clicked - correlationValidity', correlationValidity);
      setShowCorrelationWarning(false);
      // Only validate range for volatility perturbation
      if (form.param === 'volatility') {
        const selectedIdx = form.portfolio.assets.findIndex((a: string) => a === form.asset);
        const v = form.portfolio.volatility[selectedIdx];
        const [min, max] = form.range;
        if (v < min || v > max) {
          setShowRangeWarning(true);
          return;
        }
      }
      // For correlation, show warning if there are invalid steps
      if (form.param === 'correlation' && correlationValidity && (correlationValidity.invalid_min > 0 || correlationValidity.invalid_max > 0)) {
        setShowCorrelationWarning(true);
        return;
      }
      setShowRangeWarning(false);
      setShowCorrelationWarning(false);
      onSave(form);
      onClose();
    }

    // Disable Save button when correlation check is loading
    const isSaveDisabled = form.param === 'correlation' && (
      (!correlationValidity || correlationValidity.loading || correlationValidity.invalid_min > 0 || correlationValidity.invalid_max > 0)
    );
    console.log('[Debug] isSaveDisabled:', isSaveDisabled, 'correlationValidity:', correlationValidity);

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

          <form className="space-y-6" onSubmit={handleSave}>
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
                  {form.portfolio.assets.map((_asset: string, idx: number) => (
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
                            value={form.portfolio.assets[idx]}
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
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              step="0.0001"
                              min="0"
                              className="w-full bg-zinc-600 border border-zinc-500 rounded px-2 py-1 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={form.portfolio.volatility[idx]}
                              onChange={e => handleVolatilityChange(idx, e.target.value)}
                            />
                            <button
                              type="button"
                              className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
                              onClick={() => handleFetchVolatilityForAsset(idx)}
                              onContextMenu={e => { e.preventDefault(); setShowFetchModalIdx(idx); }}
                              disabled={!form.portfolio.assets[idx] || fetchingVols[idx]}
                              title="Left click: Fetch. Right click: custom fetch."
                            >
                              {fetchingVols[idx] ? 'Fetching...' : 'Fetch'}
                            </button>
                          </div>
                          {fetchErrors[idx] && <div className="text-xs text-red-400 mt-1">{fetchErrors[idx]}</div>}
                          {showFetchModalIdx === idx && (
                            <FetchVolatilityModal
                              open={true}
                              onClose={() => setShowFetchModalIdx(null)}
                              defaultParams={defaultFetchParams}
                              onFetch={params => handleFetchVolatilityForAsset(idx, params)}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Correlation Matrix */}
              <div className="flex items-center mb-2">
                <label className="block text-zinc-300 text-sm font-medium">Correlation Matrix</label>
                <button
                  type="button"
                  className="ml-2 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
                  onClick={() => handleFetchCorrelationMatrix()}
                  onContextMenu={e => { e.preventDefault(); setShowCorrModal(true); }}
                  disabled={form.portfolio.assets.length < 2 || fetchingCorr}
                  title="Left click: estimate. Right click: custom fetch."
                >
                  {fetchingCorr ? 'Estimating...' : 'Estimate'}
                </button>
                {fetchCorrError && <div className="text-xs text-red-400 ml-2">{fetchCorrError}</div>}
                {showCorrModal && (
                  <FetchCorrelationModal
                    open={true}
                    onClose={() => setShowCorrModal(false)}
                    defaultParams={defaultCorrParams}
                    onFetch={async params => await handleFetchCorrelationMatrix(params)}
                  />
                )}
              </div>
              <div>
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
                            step="0.0001"
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
              
              {/* Correlation-specific explanation */}
              {form.param === 'correlation' && (
                <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 mb-4">
                  <div className="text-sm text-blue-300 font-medium mb-2 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Correlation Delta Perturbation
                  </div>
                  <div className="text-xs text-blue-200 leading-relaxed">
                    When you perturb correlation for <strong>{form.asset}</strong>, you're shifting 
                    <strong> ALL correlations</strong> between this asset and every other asset by the specified delta. 
                    This preserves relative relationships while simulating how market stress affects correlation levels.
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-zinc-300 text-sm font-medium mb-2">Parameter to Perturb</label>
                  <select 
                    name="param" 
                    className="w-full h-10 bg-zinc-600 border border-zinc-500 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" 
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
                    className="w-full h-10 bg-zinc-600 border border-zinc-500 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    value={form.asset} 
                    onChange={handleChange}
                  >
                    {form.portfolio.assets.map((asset: string, idx: number) => (
                      <option key={idx} value={asset}>{asset}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-zinc-300 text-sm font-medium mb-2">
                    {form.param === 'correlation' ? 'Correlation Delta Min' : 'Range Min'}
                  </label>
                  <input
                    type="number"
                    className="w-full h-10 bg-zinc-600 border border-zinc-500 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.range[0]}
                    onChange={e => handleRangeChange(0, e.target.value)}
                    min={form.param === 'correlation' ? -0.5 : undefined}
                    max={form.param === 'correlation' ? 0.5 : undefined}
                    step={form.param === 'correlation' ? 0.0001 : undefined}
                    required
                  />
                  {form.param === 'correlation' && correlationValidity && correlationValidity.invalid_min > 0 && (
                    <div className="text-xs text-red-500 mt-1">{correlationValidity.invalid_min} step(s) on this end will result in invalid correlation matrices. Please increase this value.</div>
                  )}
                  {form.param === 'correlation' && (
                    <div className="text-xs text-zinc-400 mt-1">Delta range: -0.5 to +0.5 (shifts existing correlations)</div>
                  )}
                </div>
                
                <div>
                  <label className="block text-zinc-300 text-sm font-medium mb-2">
                    {form.param === 'correlation' ? 'Correlation Delta Max' : 'Range Max'}
                  </label>
                  <input
                    type="number"
                    className="w-full h-10 bg-zinc-600 border border-zinc-500 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.range[1]}
                    onChange={e => handleRangeChange(1, e.target.value)}
                    min={form.param === 'correlation' ? -0.5 : undefined}
                    max={form.param === 'correlation' ? 0.5 : undefined}
                    step={form.param === 'correlation' ? 0.0001 : undefined}
                    required
                  />
                  {form.param === 'correlation' && correlationValidity && correlationValidity.invalid_max > 0 && (
                    <div className="text-xs text-red-500 mt-1">{correlationValidity.invalid_max} step(s) on this end will result in invalid correlation matrices. Please decrease this value.</div>
                  )}
                  {form.param === 'correlation' ? (
                    <div className="text-xs text-zinc-400 mt-1">Delta range: -0.5 to +0.5 (shifts existing correlations)</div>
                  ) : null}
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
              
              {/* Quantum-specific noise model toggle */}
              {(editingBlockType || projectBlockModes[currentProjectId] || mode) === 'quantum' && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <label className="block text-zinc-300 text-sm font-medium mb-1">Simulate Hardware Noise</label>
                      <p className="text-xs text-zinc-400">Use realistic quantum hardware noise model for more accurate results</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleNoiseToggle}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
                        form.use_noise_model ? 'bg-blue-600' : 'bg-zinc-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          form.use_noise_model ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  
                  {/* Noise model type selector */}
                  {form.use_noise_model && (
                    <div className="mt-3">
                      <label className="block text-zinc-300 text-sm font-medium mb-2">Noise Model Type</label>
                      <select
                        value={form.noise_model_type}
                        onChange={handleNoiseTypeChange}
                        className="w-full bg-zinc-600 border border-zinc-500 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="fast">Fast (Basic Noise)</option>
                        <option value="realistic">Realistic (Full Hardware)</option>
                      </select>
                      <p className="text-xs text-zinc-400 mt-1">
                        {form.noise_model_type === 'fast' 
                          ? 'Basic depolarizing noise for faster execution'
                          : 'Full IBM Toronto hardware noise model (slower but more accurate)'
                        }
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Additional correlation context */}
              {form.param === 'correlation' && (
                <></>
              )}
              
              {form.param === 'correlation' && correlationValidity && correlationValidity.error && (
                <div className="text-xs text-red-500 mt-1">Error: {correlationValidity.error}</div>
              )}
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
                disabled={isSaveDisabled}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Configuration
              </button>
            </div>
            {/* {showCorrelationWarning && correlationValidity && (
              <div className="text-xs text-red-500 mt-2">
                {correlationValidity.invalid_min > 0 && (
                  <div>{correlationValidity.invalid_min} step(s) at the minimum would result in invalid correlation matrices.</div>
                )}
                {correlationValidity.invalid_max > 0 && (
                  <div>{correlationValidity.invalid_max} step(s) at the maximum would result in invalid correlation matrices.</div>
                )}
              </div>
            )} */}
          </form>
        </div>
      </div>
    ) : null;
  }

  // Main render - wraps entire app in DndContext for drag-and-drop
  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {/* Monitor each open project for external deletion */}
      {openProjects.map(project => (
        <ProjectDeletionMonitor
          key={project.id}
          projectId={project.id}
          projectName={project.name}
          onDeleted={() => {
            console.log(`Auto-closing deleted project: ${project.name}`);
            // Show notification
            setDeletedProjectNotification(`Project "${project.name}" was deleted from the file system and has been closed.`);
            // Close the project
            closeProject(project.id);
            // Refresh project list
            setProjectRefreshTrigger(prev => prev + 1);
            // Clear notification after 5 seconds
            setTimeout(() => setDeletedProjectNotification(null), 5000);
          }}
        />
      ))}
      <div className="h-screen w-screen flex flex-col relative overflow-hidden" onClick={handleCloseContextMenu}>
        {/* Notification for deleted projects */}
        {deletedProjectNotification && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{deletedProjectNotification}</span>
            <button 
              onClick={() => setDeletedProjectNotification(null)}
              className="ml-4 text-white hover:text-gray-200"
            >
              ×
            </button>
          </div>
        )}
        <LayoutToggles
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
              refreshTrigger={projectRefreshTrigger}
            />
          </SubtleResizableBorder>
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
            {/* Show either results or main page */}
            {currentResultsTab[currentProjectId] && resultsTabs[currentProjectId]?.length > 0 ? (
              <ResultsTabContent projectId={currentProjectId} />
            ) : openProjects.length > 0 ? (
              <MainPage
              onEditRequest={handleEditRequest}
              showRunButton={hasAnyBlock(currentProjectId)}
              onRunModel={handleRunModel}
              isSelected={isBlockSelected}
              onSelect={handleBlockSelect}
              onDeselect={handleBlockDeselect}
              currentProjectId={currentProjectId}
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
        {/* {showCorrelationWarning && correlationValidity && (
          <div className="text-xs text-red-500 mt-2">
            {correlationValidity.invalid_min > 0 && (
              <div>{correlationValidity.invalid_min} step(s) at the minimum would result in invalid correlation matrices.</div>
            )}
            {correlationValidity.invalid_max > 0 && (
              <div>{correlationValidity.invalid_max} step(s) at the maximum would result in invalid correlation matrices.</div>
            )}
          </div>
        )} */}
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
