import React from 'react';

interface Point {
  x: number;
  y: number;
}

interface WorkflowConnectionProps {
  from: Point;
  to: Point;
  color?: string;
  isActive?: boolean;
  isAnimated?: boolean;
}

export const WorkflowConnection: React.FC<WorkflowConnectionProps> = ({
  from,
  to,
  color = '#4A90E2',
  isActive = false,
  isAnimated = false
}) => {
  // Calculate control points for a smooth bezier curve
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Control point offset based on distance
  const cpOffset = Math.min(distance * 0.5, 100);
  
  const cp1 = {
    x: from.x + cpOffset,
    y: from.y
  };
  
  const cp2 = {
    x: to.x - cpOffset,
    y: to.y
  };

  const pathData = `M ${from.x} ${from.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${to.x} ${to.y}`;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0
      }}
    >
      <defs>
        {/* Define arrow marker */}
        <marker
          id={`arrowhead-${color.replace('#', '')}`}
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3, 0 6"
            fill={color}
          />
        </marker>

        {/* Animated gradient for active connections */}
        {isAnimated && (
          <linearGradient id={`animated-gradient-${from.x}-${from.y}`}>
            <stop offset="0%" stopColor={color} stopOpacity="0.2">
              <animate
                attributeName="stop-opacity"
                values="0.2;1;0.2"
                dur="2s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="50%" stopColor={color} stopOpacity="1">
              <animate
                attributeName="stop-opacity"
                values="1;0.2;1"
                dur="2s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="100%" stopColor={color} stopOpacity="0.2">
              <animate
                attributeName="stop-opacity"
                values="0.2;1;0.2"
                dur="2s"
                repeatCount="indefinite"
              />
            </stop>
          </linearGradient>
        )}
      </defs>

      {/* Shadow/glow effect for active connections */}
      {isActive && (
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeOpacity="0.2"
          filter="blur(4px)"
        />
      )}

      {/* Main connection line */}
      <path
        d={pathData}
        fill="none"
        stroke={isAnimated ? `url(#animated-gradient-${from.x}-${from.y})` : color}
        strokeWidth={isActive ? "3" : "2"}
        markerEnd={`url(#arrowhead-${color.replace('#', '')})`}
        style={{
          transition: 'all 0.3s ease'
        }}
      />

      {/* Animated dots for data flow visualization */}
      {isAnimated && (
        <circle r="4" fill={color}>
          <animateMotion
            dur="3s"
            repeatCount="indefinite"
            path={pathData}
          />
        </circle>
      )}
    </svg>
  );
};