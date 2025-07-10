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

// Block color scheme by mode (move to top-level scope)
const blockModeStyles = {
  classical: 'bg-blue-700 text-white border-blue-400',
  hybrid: 'bg-purple-700 text-white border-purple-400',
  quantum: 'bg-teal-700 text-white border-teal-400',
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
      style={{ resize: 'none', width: 'fit-content', minWidth: '203px', maxWidth: '203px' }}
      className={`px-4 py-2 rounded shadow mr-2 cursor-pointer transition select-none border-2 ${blockModeStyles[mode]} ${isDragging ? 'opacity-50' : ''}`}
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

function MainPage({ hasBlock, blockPosition, onEditRequest, showRunButton, onRunModel, isSelected, onSelect, onBlockDrag, onBlockDragEnd, onDeselect, blockMode }: {
  hasBlock: boolean;
  blockPosition: { x: number; y: number } | null;
  onEditRequest: (e: React.MouseEvent) => void;
  showRunButton?: boolean;
  onRunModel?: () => void;
  isSelected: boolean;
  onSelect: () => void;
  onBlockDrag: (dx: number, dy: number) => void;
  onBlockDragEnd: () => void;
  onDeselect: () => void;
  blockMode: 'classical' | 'hybrid' | 'quantum';
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
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onEditRequest(e);
  };
  // Drag logic for block
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  function handleMouseDown(e: React.MouseEvent) {
    console.log('handleMouseDown called, isSelected:', isSelected);
    if (!isSelected) return;
    console.log('Starting drag');
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    e.stopPropagation();
  }

  // might not being used, commenting out for now
  function handleMouseMove(e: MouseEvent) {
    // if (dragging && dragStart.current && blockPosition) {
    //   const dx = e.clientX - dragStart.current.x;
    //   const dy = e.clientY - dragStart.current.y;
    //   onBlockDrag(dx, dy);
    //   dragStart.current = { x: e.clientX, y: e.clientY };
    // }
  }
  function handleMouseUp() {
    if (dragging) {
      setDragging(false);
      onBlockDragEnd();
    }
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
  }, [dragging]);

  return (
    <div
      id="kanosym-mbe"
      ref={setNodeRef}
      className={`h-full w-full text-zinc-100 flex flex-col min-h-0 min-w-0 border-2 border-dashed transition relative ${isOver ? 'border-blue-400' : 'border-zinc-700'}`}
      style={{
        position: 'relative',
        backgroundColor: '#27272a',
        backgroundSize: '20px 20px',
      }}
      onClick={onDeselect}
    >
      <div 
        id="kanosym-mbe-dropzone" 
        className={`flex-1 relative ${hasBlock ? 'overflow-auto' : 'overflow-hidden'} scrollbar-hide`} 
        style={{ 
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none'
        }}
      >
        <div 
          className="relative"
          style={{
            width: hasBlock ? '2000px' : '100%',
            height: hasBlock ? '2000px' : '100%',
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        >
          {hasBlock && blockPosition ? (
            <div
              style={{ position: 'absolute', left: blockPosition.x, top: blockPosition.y, cursor: isSelected ? 'grab' : 'pointer', zIndex: 10 }}
              onClick={e => { e.stopPropagation(); onSelect(); }}
              onMouseDown={isSelected ? handleMouseDown : undefined}
            >
              <div className={`transition border-2 rounded ${isSelected ? 'border-blue-500 shadow-lg' : 'border-transparent'}`}>
                <DraggableBlock id="main-block" onContextMenu={handleContextMenu} mode={blockMode} />
              </div>
            </div>
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

function NoiraPanel() {
  const [messages, setMessages] = useState([
    { sender: 'noira', text: 'Hi! I am Noira, your modeling assistant. How can I help you today?' },
    { sender: 'user', text: 'What is a sensitivity test?' },
    { sender: 'noira', text: 'A sensitivity test lets you see how your model responds to changes in key parameters.' },
  ]);
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  function sendMessage() {
    if (input.trim()) {
      setMessages(msgs => [...msgs, { sender: 'user', text: input }]);
      setInput('');
      // Simulate Noira response (mock)
      setTimeout(() => {
        setMessages(msgs => [...msgs, { sender: 'noira', text: 'Noira is thinking... (real AI coming soon!)' }]);
      }, 800);
    }
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="h-full w-full bg-zinc-900 text-zinc-200 p-0 flex flex-col" style={{ fontFamily: 'Menlo, Monaco, Courier New, monospace', fontSize: 13 }}>
      <div className="font-bold px-4 pt-4 pb-2 text-base">Noira</div>
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`rounded-lg px-3 py-2 max-w-[80%] whitespace-pre-line ${msg.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-100 border border-zinc-700'}`}>{msg.text}</div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      <form
        className="flex items-center gap-2 p-2 border-t border-zinc-800 bg-zinc-900"
        onSubmit={e => { e.preventDefault(); sendMessage(); }}
      >
        <input
          className="flex-1 bg-zinc-800 text-zinc-100 rounded px-3 py-2 outline-none border border-zinc-700 focus:border-blue-500"
          placeholder="Ask Noira..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold transition"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function BlockBar({ hasBlock, mode, setMode }: { hasBlock: boolean; mode: 'classical' | 'hybrid' | 'quantum'; setMode: (m: 'classical' | 'hybrid' | 'quantum') => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'blockbar-dropzone' });
  return (
    <div ref={setNodeRef} className={`w-full h-full bg-zinc-950 border-t border-zinc-800 flex items-center px-4 ${isOver ? 'bg-zinc-900' : ''}`}>      
      {!hasBlock && <DraggableBlock id="blockbar-block" mode={mode} />}
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
        className={`px-3 py-1 text-xs font-bold transition ${mode === 'classical' ? 'bg-blue-700 text-white' : 'bg-zinc-900 text-blue-400 hover:bg-blue-800'}`}
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
        className={`px-3 py-1 text-xs font-bold transition ${mode === 'quantum' ? 'bg-teal-700 text-white' : 'bg-zinc-900 text-teal-400 hover:bg-teal-800'}`}
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

function LayoutToggles({ showExplorer, setShowExplorer, showNoira, setShowNoira, showBlockBar, setShowBlockBar }: { showExplorer: boolean; setShowExplorer: (v: boolean) => void; showNoira: boolean; setShowNoira: (v: boolean) => void; showBlockBar: boolean; setShowBlockBar: (v: boolean) => void; }) {
  return (
    <div className="absolute top-2 right-4 z-30 flex gap-2">
      <button
        className={`w-7 h-7 flex items-center justify-center rounded hover:bg-zinc-800 ${showExplorer ? 'bg-zinc-700' : ''}`}
        title="Toggle File Explorer"
        onClick={() => setShowExplorer(!showExplorer)}
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

function RunModelButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="absolute bottom-6 right-8 z-40 bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded shadow-lg transition"
      style={{ position: 'absolute', bottom: 40, right: 12 }}
      onClick={onClick}
    >
      Run Model
    </button>
  );
}

function App() {
  // blockLocation: 'blockbar' | 'main' | 'dragging'
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showExplorer, setShowExplorer] = useState(true);
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
              newPositions[projectId] = {
                x: dropzoneRect.width / 2 - blockWidth / 2,
                y: dropzoneRect.height / 2 - blockHeight / 2
              };
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

  // Add mode state to App
  const [mode, setMode] = useState<'classical' | 'hybrid' | 'quantum'>('classical');
  // Store block mode per project
  const [projectBlockModes, setProjectBlockModes] = useState<{ [projectId: string]: 'classical' | 'hybrid' | 'quantum' }>({});

  // Add state for new project modal
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  // Add state for project delete dialog
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null);

  // In App, add state for mockProjects and mockFiles
  const [mockProjects, setMockProjects] = useState([
    { id: 'proj-1', name: 'Project Alpha' },
    { id: 'proj-2', name: 'Project Beta' },
    { id: 'proj-3', name: 'Project Gamma' },
  ]);
  const [mockFiles, setMockFiles] = useState<FileNode[]>([
    { id: 'folder-proj-1', name: 'Project Alpha', type: 'folder', children: [ { id: 'ksm-proj-1', name: 'Project Alpha.ksm', type: 'file' } ] },
    { id: 'folder-proj-2', name: 'Project Beta', type: 'folder', children: [ { id: 'ksm-proj-2', name: 'Project Beta.ksm', type: 'file' } ] },
    { id: 'folder-proj-3', name: 'Project Gamma', type: 'folder', children: [ { id: 'ksm-proj-3', name: 'Project Gamma.ksm', type: 'file' } ] },
  ]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fsFiles, setFsFiles] = useState<FileNode[]>([]);
  const [fsPath, setFsPath] = useState<string | null>(null);

  // Project tab state
  const [openProjects, setOpenProjects] = useState([mockProjects[0]]);
  const [currentProjectId, setCurrentProjectId] = useState(mockProjects[0].id);
  // Per-project block state
  const [projectBlocks, setProjectBlocks] = useState<{ [projectId: string]: 'blockbar' | 'main' }>({ [mockProjects[0].id]: 'blockbar' });
  const [projectBlockPositions, setProjectBlockPositions] = useState<{ [projectId: string]: { x: number; y: number } | null }>({});
  const blockLocation = projectBlocks[currentProjectId] || 'blockbar';
  function setBlockLocationForCurrent(loc: 'blockbar' | 'main') {
    setProjectBlocks(prev => ({ ...prev, [currentProjectId]: loc }));
  }
  // Replace openProject logic with onKsmDoubleClick
  function onKsmDoubleClick(projectId: string) {
    if (!openProjects.find(p => p.id === projectId)) {
      setOpenProjects([...openProjects, mockProjects.find(p => p.id === projectId)!]);
    }
    setCurrentProjectId(projectId);
    setProjectBlocks(prev => ({ ...prev, [projectId]: prev[projectId] || 'blockbar' }));
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
        if (activeId === 'blockbar-block' && dropzoneRect) {
          // Always center the block when first dragged from blockbar, regardless of container size
          const blockWidth = 203; // Width of the portfolio sensitivity test block
          const blockHeight = 50;  // Approximate height of the block
          dropX = dropzoneRect.width / 2 - blockWidth / 2;  // Center horizontally
          dropY = dropzoneRect.height / 2 - blockHeight / 2; // Center vertically
        } else if (activeId === 'main-block' && dropzoneRect && projectBlockPositions[currentProjectId]) {
          // If dragging the block within the MBE, add delta to current position
          const prev = projectBlockPositions[currentProjectId];
          dropX = prev!.x + (event.delta?.x ?? 0);
          dropY = prev!.y + (event.delta?.y ?? 0);
        } else if (dropzoneRect) {
          // Fallback: center of dropzone (same as first-time drag)
          const blockWidth = 203; // Width of the portfolio sensitivity test block
          const blockHeight = 50;  // Approximate height of the block
          dropX = dropzoneRect.width / 2 - blockWidth / 2;  // Center horizontally
          dropY = dropzoneRect.height / 2 - blockHeight / 2; // Center vertically
        }
        // Clamp to dropzone bounds if rect is available
        if (dropzoneRect) {
          const blockWidth = 203; // Width of the portfolio sensitivity test block
          const blockHeight = 50;  // Approximate height of the block
          dropX = Math.max(0, Math.min(dropX, dropzoneRect.width - blockWidth));
          dropY = Math.max(0, Math.min(dropY, dropzoneRect.height - blockHeight));
        }
        setBlockLocationForCurrent('main');
        setProjectBlockPositions(prev => ({ ...prev, [currentProjectId]: { x: dropX, y: dropY } }));
        setProjectBlockModes(prev => ({ ...prev, [currentProjectId]: mode }));
        
        // Handle move count based on whether this is initial placement or a move
        if (activeId === 'blockbar-block') {
          // Reset move count when first placed (so it can be recentered on resize)
          setBlockMoveCount(prev => ({ ...prev, [currentProjectId]: 0 }));
        } else if (activeId === 'main-block') {
          // Increment move count when the main block is moved
          setBlockMoveCount(prev => {
            const currentCount = prev[currentProjectId] || 0;
            const newCount = currentCount + 1;
            console.log('Incrementing move count for project:', currentProjectId, 'from', currentCount, 'to', newCount);
            return { ...prev, [currentProjectId]: newCount };
          });
        }
      } else if (event.over.id === 'blockbar-dropzone') {
        setBlockLocationForCurrent('blockbar');
        setProjectBlockPositions(prev => ({ ...prev, [currentProjectId]: null }));
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

  function handleEditRequest(e: React.MouseEvent) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }

  function handleEdit() {
    setShowModal(true);
    setContextMenu(null);
  }

  function handleModalClose() {
    setShowModal(false);
  }

  function handleCloseContextMenu() {
    setContextMenu(null);
  }

  function handleRunModel() {
    alert('Model run triggered!');
  }

  const isBlockSelected = selectedBlockProject === currentProjectId;
  function handleBlockSelect() {
    setSelectedBlockProject(currentProjectId);
  }
  function handleBlockDrag(dx: number, dy: number) {
    console.log('handleBlockDrag called with dx:', dx, 'dy:', dy, 'for project:', currentProjectId);
    setProjectBlockPositions(prev => {
      const pos = prev[currentProjectId];
      if (!pos) return prev;
      return { ...prev, [currentProjectId]: { x: pos.x + dx, y: pos.y + dy } };
    });
    // Increment move count when user drags it within the main area
    setBlockMoveCount(prev => {
      const currentCount = prev[currentProjectId] || 0;
      const newCount = currentCount + 1;
      console.log('Incrementing move count for project:', currentProjectId, 'from', currentCount, 'to', newCount);
      return { ...prev, [currentProjectId]: newCount };
    });
  }
  function handleBlockDragEnd() {
    // Could add snap-to-grid or bounds logic here
  }

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
    setBlockLocationForCurrent('blockbar');
    setProjectBlockPositions(prev => ({ ...prev, [currentProjectId]: null }));
    setProjectBlockModes(prev => {
      const copy = { ...prev };
      delete copy[currentProjectId];
      return copy;
    });
    setSelectedBlockProject(null);
    setContextMenu(null);
  }

  // Add handler to create a new project
  function handleCreateProject() {
    if (!newProjectName.trim()) return;
    const name = newProjectName.trim();
    const id = `proj-${Date.now()}`;
    const newProject = { id, name };
    setMockProjects(prev => [...prev, newProject]);
    setMockFiles(prev => [
      ...prev,
      {
        id: `folder-${id}`,
        name,
        type: 'folder',
        children: [
          { id: `ksm-${id}`, name: `${name}.ksm`, type: 'file' },
        ],
      },
    ]);
    setShowNewProjectModal(false);
    setNewProjectName('');
  }

  // In App, add handler for project folder context menu
  const [projectFolderMenu, setProjectFolderMenu] = useState<{ x: number; y: number; project: { id: string; name: string } } | null>(null);
  function handleProjectFolderContextMenu(project: { id: string; name: string }, e: React.MouseEvent) {
    setProjectFolderMenu({ x: e.clientX, y: e.clientY, project });
  }
  function handleDeleteProjectConfirm() {
    if (!projectToDelete) return;
    setMockProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
    setMockFiles(prev => prev.filter(f => f.id !== `folder-${projectToDelete.id}`));
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
        />
        <div className="flex flex-1 min-h-0 relative">
          {/* File Explorer */}
          <SubtleResizableBorder direction="left" show={showExplorer} min={minExplorer} max={400} initial={224}>
            <FileExplorer
              files={fsFiles.length > 0 ? fsFiles : mockFiles}
              selected={selectedFile}
              onSelect={setSelectedFile}
              onChooseFolder={handleChooseFolder}
              currentPath={fsPath}
              onKsmDoubleClick={onKsmDoubleClick}
              projects={mockProjects}
              onBack={() => { setFsFiles([]); setFsPath(null); }}
              onShowNewProject={() => setShowNewProjectModal(true)}
              onProjectFolderContextMenu={handleProjectFolderContextMenu}
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
            {openProjects.length > 0 ? (
              <MainPage
                hasBlock={blockLocation === 'main'}
                blockPosition={projectBlockPositions[currentProjectId] || null}
                onEditRequest={handleEditRequest}
                showRunButton={blockLocation === 'main'}
                onRunModel={handleRunModel}
                isSelected={isBlockSelected}
                onSelect={handleBlockSelect}
                onBlockDrag={handleBlockDrag}
                onBlockDragEnd={handleBlockDragEnd}
                onDeselect={handleBlockDeselect}
                blockMode={projectBlockModes[currentProjectId] || mode}
              />
            ) : (
              <div className="h-full w-full bg-zinc-800 text-zinc-100 flex flex-col items-center justify-center border-2 border-dashed border-zinc-700 relative">
                <div className="text-2xl font-bold mb-2">Select a project to open</div>
                <div className="text-zinc-400">Double click a .ksm file in the explorer to get started.</div>
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
            <BlockBar hasBlock={blockLocation === 'main'} mode={mode} setMode={setMode} />
          </div>
        </SubtleResizableBorder>
        <DragOverlay>
          {activeId ? <SensitivityTestBlock isDragging /> : null}
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
      </div>
    </DndContext>
  );
}

export default App;

declare global {
  interface Window {
    electronAPI?: {
      chooseFolder: () => Promise<string | null>;
      readDir: (dirPath: string) => Promise<Array<{ name: string; type: 'file' | 'folder' }>>;
    };
  }
}
