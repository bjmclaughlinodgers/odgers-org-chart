import React, { memo, useCallback } from 'react';
import { Handle, Position, type NodeProps, type IsValidConnection } from '@xyflow/react';
import type { Person } from '../../types';
import { MiniCard } from '../PersonCard/MiniCard';
import { useUIStore } from '../../stores/uiStore';
import { usePersonViolations } from '../../hooks/usePersonViolations';

type PersonNodeData = {
  person: Person;
};

function PersonNodeComponent({ data, id }: NodeProps) {
  const { selectPerson, colorCoding } = useUIStore();
  const nodeData = data as unknown as PersonNodeData;
  const violations = usePersonViolations(nodeData.person.id);

  const isValidConnection: IsValidConnection = useCallback(
    (connection) => {
      // Prevent self-connections
      return connection.source !== connection.target;
    },
    []
  );

  return (
    <div>
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={true}
        isValidConnection={isValidConnection}
        className="!bg-gray-300 dark:!bg-gray-600 !w-2 !h-2 !border-0 hover:!bg-teal-500 hover:!w-3 hover:!h-3 !transition-all !duration-150"
      />
      <MiniCard
        person={nodeData.person}
        onClick={() => selectPerson(nodeData.person.id)}
        colorMode={colorCoding}
        violations={violations}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={true}
        isValidConnection={isValidConnection}
        className="!bg-gray-300 dark:!bg-gray-600 !w-2 !h-2 !border-0 hover:!bg-teal-500 hover:!w-3 hover:!h-3 !transition-all !duration-150"
      />
    </div>
  );
}

export const PersonNode = memo(PersonNodeComponent);
