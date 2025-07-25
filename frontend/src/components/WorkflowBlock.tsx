import React from 'react';
import { BlockDefinition } from '../blocks/blockDefinitions';

interface WorkflowBlockProps {
  block: BlockDefinition;
  position: { x: number; y: number };
  isSelected?: boolean;
  isDragging?: boolean;
  onPortClick?: (blockId: string, portId: string, type: 'input' | 'output') => void;
}

export const WorkflowBlock: React.FC<WorkflowBlockProps> = ({
  block,
  position,
  isSelected = false,
  isDragging = false,
  onPortClick
}) => {
  const blockStyle: React.CSSProperties = {
    position: 'absolute',
    left: position.x,
    top: position.y,
    width: '220px',
    backgroundColor: '#ffffff',
    border: `2px solid ${isSelected ? block.color : '#e0e0e0'}`,
    borderRadius: '8px',
    boxShadow: isDragging 
      ? '0 10px 30px rgba(0,0,0,0.3)' 
      : isSelected 
      ? `0 0 0 2px ${block.color}40` 
      : '0 2px 4px rgba(0,0,0,0.1)',
    cursor: isDragging ? 'grabbing' : 'grab',
    transition: 'all 0.2s ease',
    opacity: isDragging ? 0.8 : 1,
    transform: isDragging ? 'scale(1.05)' : 'scale(1)',
    zIndex: isDragging ? 1000 : isSelected ? 100 : 1,
  };

  const headerStyle: React.CSSProperties = {
    backgroundColor: block.color,
    color: 'white',
    padding: '10px 12px',
    borderRadius: '6px 6px 0 0',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  const portStyle = (type: 'input' | 'output'): React.CSSProperties => ({
    position: 'absolute',
    width: '14px',
    height: '14px',
    backgroundColor: '#ffffff',
    border: '2px solid ' + block.color,
    borderRadius: '50%',
    top: '50%',
    transform: 'translateY(-50%)',
    ...(type === 'input' ? { left: '-7px' } : { right: '-7px' }),
    cursor: 'crosshair',
    zIndex: 10,
    transition: 'all 0.2s ease',
  });

  const portHoverStyle: React.CSSProperties = {
    backgroundColor: block.color,
    transform: 'translateY(-50%) scale(1.2)',
  };

  return (
    <div style={blockStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <span style={{ fontSize: '16px' }}>{block.icon || '📦'}</span>
        <span>{block.name}</span>
      </div>

      {/* Body */}
      <div style={{ padding: '12px' }}>
        <p style={{ 
          fontSize: '12px', 
          color: '#666', 
          margin: 0,
          lineHeight: '1.4'
        }}>
          {block.description}
        </p>

        {/* Input Ports */}
        {block.inputs.map((input, index) => (
          <div
            key={input.id}
            style={{
              ...portStyle('input'),
              top: `${60 + (index * 25)}px`,
            }}
            className="workflow-port"
            onMouseEnter={(e) => {
              Object.assign(e.currentTarget.style, portHoverStyle);
            }}
            onMouseLeave={(e) => {
              Object.assign(e.currentTarget.style, portStyle('input'));
            }}
            onClick={() => onPortClick?.(block.id, input.id, 'input')}
            title={input.name}
          />
        ))}

        {/* Output Ports */}
        {block.outputs.map((output, index) => (
          <div
            key={output.id}
            style={{
              ...portStyle('output'),
              top: `${60 + (index * 25)}px`,
            }}
            className="workflow-port"
            onMouseEnter={(e) => {
              Object.assign(e.currentTarget.style, portHoverStyle);
            }}
            onMouseLeave={(e) => {
              Object.assign(e.currentTarget.style, portStyle('output'));
            }}
            onClick={() => onPortClick?.(block.id, output.id, 'output')}
            title={output.name}
          />
        ))}

        {/* Port Labels (shown on hover) */}
        <style>{`
          .workflow-port:hover::after {
            content: attr(title);
            position: absolute;
            ${block.inputs.length > 0 ? 'left: 20px;' : 'right: 20px;'}
            top: 50%;
            transform: translateY(-50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 11px;
            white-space: nowrap;
            pointer-events: none;
            z-index: 1000;
          }
        `}</style>
      </div>
    </div>
  );
};