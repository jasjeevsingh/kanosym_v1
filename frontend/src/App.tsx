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

function FileExplorer() {
  return (
    <div className="h-full w-full bg-zinc-900 text-zinc-200 p-4 flex flex-col">
      <div className="font-bold mb-2">File Explorer</div>
      <div className="text-xs text-zinc-400">(placeholder)</div>
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

function App() {
  // blockLocation: 'blockbar' | 'main' | 'dragging'
  const [blockLocation, setBlockLocation] = useState<'blockbar' | 'main'>('blockbar');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

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
      <div className="h-screen w-screen flex flex-col" onClick={handleCloseContextMenu}>
        <div className="flex flex-1 min-h-0">
          {/* File Explorer */}
          <div className="w-56 min-w-[12rem] max-w-xs border-r border-zinc-800 flex-shrink-0">
            <FileExplorer />
          </div>
          {/* Main Page */}
          <div className="flex-1 min-w-0">
            <MainPage hasBlock={blockLocation === 'main'} onEditRequest={handleEditRequest} />
          </div>
          {/* Noira Panel */}
          <div className="w-80 min-w-[16rem] max-w-md border-l border-zinc-800 flex-shrink-0">
            <NoiraPanel />
          </div>
        </div>
        {/* Block Bar at the bottom */}
        <div className="h-16 border-t border-zinc-800">
          <BlockBar hasBlock={blockLocation === 'main'} />
        </div>
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
