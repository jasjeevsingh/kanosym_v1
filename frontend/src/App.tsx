import React, { useState, useRef } from 'react';
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

function FileExplorer({ files, selected, onSelect, onChooseFolder, currentPath }: { files: FileNode[]; selected: string | null; onSelect: (id: string) => void; onChooseFolder: () => void; currentPath: string | null }) {
  return (
    <div className="h-full w-full bg-zinc-900 text-zinc-200 flex flex-col overflow-y-auto border-r border-zinc-800" style={{ fontFamily: 'Menlo, Monaco, Courier New, monospace', fontSize: 13 }}>
      <div className="font-bold mb-2 flex items-center justify-between px-4 pt-4 text-xs tracking-widest text-zinc-400" style={{ letterSpacing: 1 }}>
        <span>EXPLORER</span>
        <button
          className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded ml-2"
          onClick={onChooseFolder}
        >
          Choose Folder
        </button>
      </div>
      {currentPath && (
        <div className="text-xs text-zinc-400 mb-2 px-4 break-all">{currentPath}</div>
      )}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <FileTree nodes={files} selected={selected} onSelect={onSelect} />
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

function FileTree({ nodes, selected, onSelect, level = 0 }: { nodes: FileNode[]; selected: string | null; onSelect: (id: string) => void; level?: number }) {
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});

  function toggleFolder(id: string) {
    setOpenFolders(prev => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <ul className="pl-0">
      {nodes.map(node => (
        <li key={node.id} className="mb-0.5">
          {node.type === 'folder' ? (
            <div
              className={`flex items-center cursor-pointer select-none rounded px-1 py-0.5 hover:bg-zinc-800 ${level === 0 ? 'font-semibold' : ''}`}
              style={{ paddingLeft: `${level * 16 + 4}px`, minHeight: 22 }}
              onClick={() => toggleFolder(node.id)}
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
            >
              <span className="mr-1" style={{ width: 16, display: 'inline-block', textAlign: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="12" height="12" rx="2" fill="#B0BEC5" stroke="#607D8B"/></svg>
              </span>
              <span className="flex-1 overflow-hidden whitespace-nowrap text-ellipsis">{node.name}</span>
            </div>
          )}
          {node.type === 'folder' && openFolders[node.id] && node.children && (
            <FileTree nodes={node.children} selected={selected} onSelect={onSelect} level={level + 1} />
          )}
        </li>
      ))}
    </ul>
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

function SensitivityTestBlock({ isDragging = false, onContextMenu }: { isDragging?: boolean; onContextMenu?: (e: React.MouseEvent) => void }) {
  return (
    <div
      className={`bg-zinc-800 text-zinc-100 px-4 py-2 rounded shadow mr-2 cursor-pointer hover:bg-zinc-700 transition select-none ${isDragging ? 'opacity-50' : ''}`}
      onContextMenu={onContextMenu}
    >
      Sensitivity Test
    </div>
  );
}

function DraggableBlock({ id, onContextMenu }: { id: string; onContextMenu?: (e: React.MouseEvent) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}>
      <SensitivityTestBlock isDragging={isDragging} onContextMenu={onContextMenu} />
    </div>
  );
}

function MainPage({ hasBlock, onEditRequest }: { hasBlock: boolean; onEditRequest: (x: number, y: number) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'center-dropzone' });
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onEditRequest(e.clientX, e.clientY);
  };
  return (
    <div
      ref={setNodeRef}
      className={`h-full w-full bg-zinc-800 text-zinc-100 p-8 flex flex-col items-center justify-center border-2 border-dashed transition ${isOver ? 'border-blue-400' : 'border-zinc-700'}`}
    >
      {hasBlock ? (
        <DraggableBlock id="main-block" onContextMenu={handleContextMenu} />
      ) : (
        <>
          <div className="text-3xl font-bold mb-4">Open Page</div>
          <div className="text-zinc-400">(Drag the Sensitivity Test block here)</div>
        </>
      )}
    </div>
  );
}

function NoiraPanel() {
  return (
    <div className="h-full w-full bg-zinc-900 text-zinc-200 p-4 flex flex-col">
      <div className="font-bold mb-2">Noira Chat</div>
      <div className="text-xs text-zinc-400">(placeholder for Noira chat panel)</div>
    </div>
  );
}

function BlockBar({ hasBlock }: { hasBlock: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'blockbar-dropzone' });
  return (
    <div ref={setNodeRef} className={`w-full h-full bg-zinc-950 border-t border-zinc-800 flex items-center px-4 ${isOver ? 'bg-zinc-900' : ''}`}>
      {!hasBlock && <DraggableBlock id="blockbar-block" />}
      {/* Add more blocks here in the future */}
    </div>
  );
}

function ContextMenu({ x, y, onEdit, onClose }: { x: number; y: number; onEdit: () => void; onClose: () => void }) {
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
    </div>
  );
}

function FloatingModal({ onClose }: { onClose: () => void }) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-8 min-w-[320px] min-h-[180px] relative">
        <button
          className="absolute top-2 right-2 text-zinc-500 hover:text-zinc-800 text-xl font-bold"
          onClick={onClose}
        >
          ×
        </button>
        <div className="text-lg font-bold mb-4 text-zinc-800">Sensitivity Test Inputs</div>
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

function SubtleResizableBorder({ onResize, direction, children, show = true, min = 160, max = 480, initial = 224 }: { onResize?: (w: number) => void; direction: 'left' | 'right' | 'bottom'; children: React.ReactNode; show?: boolean; min?: number; max?: number; initial?: number }) {
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

function App() {
  // blockLocation: 'blockbar' | 'main' | 'dragging'
  const [blockLocation, setBlockLocation] = useState<'blockbar' | 'main'>('blockbar');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showExplorer, setShowExplorer] = useState(true);
  const [showNoira, setShowNoira] = useState(true);
  const [showBlockBar, setShowBlockBar] = useState(true);

  // Mock file structure
  const mockFiles: FileNode[] = [
    {
      id: 'folder-1',
      name: 'Portfolio Data',
      type: 'folder',
      children: [
        { id: 'file-1', name: 'portfolio.csv', type: 'file' },
        { id: 'file-2', name: 'example.json', type: 'file' },
      ],
    },
    {
      id: 'folder-2',
      name: 'Results',
      type: 'folder',
      children: [
        { id: 'file-3', name: 'run1.json', type: 'file' },
        { id: 'file-4', name: 'run2.json', type: 'file' },
      ],
    },
    { id: 'file-5', name: 'README.md', type: 'file' },
  ];
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fsFiles, setFsFiles] = useState<FileNode[]>([]);
  const [fsPath, setFsPath] = useState<string | null>(null);

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
        setBlockLocation('main');
      } else if (event.over.id === 'blockbar-dropzone') {
        setBlockLocation('blockbar');
      }
    }
    setActiveId(null);
  }

  function handleEditRequest(x: number, y: number) {
    setContextMenu({ x, y });
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
          <SubtleResizableBorder direction="left" show={showExplorer} min={160} max={400} initial={224}>
            <FileExplorer
              files={fsFiles.length > 0 ? fsFiles : mockFiles}
              selected={selectedFile}
              onSelect={setSelectedFile}
              onChooseFolder={handleChooseFolder}
              currentPath={fsPath}
            />
          </SubtleResizableBorder>
          {/* Main Page */}
          <div className="flex-1 min-w-0 relative">
            <MainPage hasBlock={blockLocation === 'main'} onEditRequest={handleEditRequest} />
          </div>
          {/* Noira Panel */}
          <SubtleResizableBorder direction="right" show={showNoira} min={200} max={480} initial={320}>
            <NoiraPanel />
          </SubtleResizableBorder>
        </div>
        {/* Block Bar at the bottom */}
        <SubtleResizableBorder direction="bottom" show={showBlockBar} min={48} max={160} initial={64}>
          <div className="h-full border-t border-zinc-800">
            <BlockBar hasBlock={blockLocation === 'main'} />
          </div>
        </SubtleResizableBorder>
        <DragOverlay>
          {activeId ? <SensitivityTestBlock isDragging /> : null}
        </DragOverlay>
        {contextMenu && (
          <ContextMenu x={contextMenu.x} y={contextMenu.y} onEdit={handleEdit} onClose={handleCloseContextMenu} />
        )}
        {showModal && <FloatingModal onClose={handleModalClose} />}
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
