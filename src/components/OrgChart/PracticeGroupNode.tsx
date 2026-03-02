import React, { memo } from 'react';
import type { NodeProps } from '@xyflow/react';

type PracticeGroupData = {
  label: string;
  color: string;
  width: number;
  height: number;
};

function PracticeGroupNodeComponent({ data }: NodeProps) {
  const { label, color, width, height } = data as unknown as PracticeGroupData;

  return (
    <div
      style={{
        width,
        height,
        backgroundColor: `${color}15`,
        border: `2px solid ${color}40`,
        borderLeft: `4px solid ${color}`,
        borderRadius: 12,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          padding: '6px 12px',
          fontSize: 12,
          fontWeight: 600,
          color: color,
          opacity: 0.85,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
    </div>
  );
}

export const PracticeGroupNode = memo(PracticeGroupNodeComponent);
