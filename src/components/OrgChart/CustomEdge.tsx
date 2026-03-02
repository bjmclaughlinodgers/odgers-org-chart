import React, { useState, useRef } from 'react';
import {
  getSmoothStepPath,
  BaseEdge,
  type EdgeProps,
} from '@xyflow/react';
import { X } from 'lucide-react';
import { useOrgStore } from '../../stores/orgStore';

interface EdgeData {
  sourceId: string;
  targetId: string;
  [key: string]: unknown;
}

function ReportingEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
}: EdgeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updatePerson = useOrgStore((s) => s.updatePerson);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const edgeData = data as EdgeData | undefined;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (edgeData?.targetId) {
      updatePerson(edgeData.targetId, { reportsTo: null });
    }
  };

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => setIsHovered(false), 200);
  };

  return (
    <g
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: '#94a3b8',
          strokeWidth: 1.5,
          ...style,
        }}
      />
      {/* Invisible wider path for easier hover detection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
      />
      <foreignObject
        x={labelX - 14}
        y={labelY - 14}
        width={28}
        height={28}
        style={{ pointerEvents: isHovered ? 'all' : 'none' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
          <button
            onClick={handleDelete}
            className={`flex items-center justify-center w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 cursor-pointer border-0 p-0 transition-opacity duration-150 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
            title="Remove reporting line"
          >
            <X size={12} color="white" strokeWidth={3} />
          </button>
        </div>
      </foreignObject>
    </g>
  );
}

function SupportEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
}: EdgeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updatePerson = useOrgStore((s) => s.updatePerson);
  const getPerson = useOrgStore((s) => s.getPerson);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const edgeData = data as EdgeData | undefined;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (edgeData?.sourceId && edgeData?.targetId) {
      const targetPerson = getPerson(edgeData.targetId);
      if (targetPerson) {
        updatePerson(edgeData.targetId, {
          supportLines: targetPerson.supportLines.filter(
            (sl) => sl !== edgeData.sourceId
          ),
        });
      }
    }
  };

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => setIsHovered(false), 200);
  };

  return (
    <g
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: '#cbd5e1',
          strokeWidth: 1,
          strokeDasharray: '5 5',
          ...style,
        }}
      />
      {/* Invisible wider path for easier hover detection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
      />
      <foreignObject
        x={labelX - 14}
        y={labelY - 14}
        width={28}
        height={28}
        style={{ pointerEvents: isHovered ? 'all' : 'none' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
          <button
            onClick={handleDelete}
            className={`flex items-center justify-center w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 cursor-pointer border-0 p-0 transition-opacity duration-150 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
            title="Remove support line"
          >
            <X size={12} color="white" strokeWidth={3} />
          </button>
        </div>
      </foreignObject>
    </g>
  );
}

export const edgeTypes = {
  reporting: ReportingEdge,
  support: SupportEdge,
};

export { ReportingEdge, SupportEdge };
