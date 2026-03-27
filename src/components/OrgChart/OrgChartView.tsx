import React, { useMemo, useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  type Node,
  type Edge,
  type Connection,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { PersonNode } from './PersonNode';
import { PracticeGroupNode } from './PracticeGroupNode';
import { edgeTypes } from './CustomEdge';
import { ConnectionDialog } from './ConnectionDialog';
import { OrgChartControls } from './OrgChartControls';
import { useOrgData } from '../../hooks/useOrgData';
import { useOrgStore } from '../../stores/orgStore';
import { useUIStore } from '../../stores/uiStore';
import type { Person } from '../../types';
import { PRACTICE_COLORS, BAND_ORDER } from '../../types';
import { isActivePerson } from '../../utils/personFilters';

const nodeTypes = { person: PersonNode, practiceGroup: PracticeGroupNode };

function wouldCreateCycle(
  people: Person[],
  targetId: string,
  newParentId: string
): boolean {
  let current = newParentId;
  const visited = new Set<string>();
  while (current) {
    if (current === targetId) return true;
    if (visited.has(current)) return false;
    visited.add(current);
    const parent = people.find((p) => p.id === current);
    current = parent?.reportsTo || '';
  }
  return false;
}

const NODE_WIDTH = 130;
const NODE_HEIGHT = 160;
const H_GAP = 18;
const V_GAP = 50;
const SWIM_LANE_PADDING = 25;
const SWIM_LANE_HEADER = 30;

function buildTree(
  people: Person[],
  showOpenSeats: boolean,
  showPursuitTargets: boolean,
  showSupportLines: boolean,
  collapsedPractices: string[],
  collapsedBandLevel: number,
  officeFilter: string[]
) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const visibleBands = new Set(BAND_ORDER.slice(0, BAND_ORDER.length - collapsedBandLevel));

  const filteredPeople = people
    .filter(p => {
      if (p.status === 'Terminated') return false;
      if (p.status === 'Open Seat') return showOpenSeats;
      if (p.status === 'Pursuit') return showPursuitTargets;
      return true; // Active, On Leave, Notice Period
    })
    .filter(p => !collapsedPractices.includes(p.practiceArea))
    .filter(p => visibleBands.has(p.band))
    .filter(p => officeFilter.length === 0 || officeFilter.includes(p.office));

  // Build adjacency map
  const childrenMap = new Map<string | 'root', Person[]>();
  childrenMap.set('root', []);

  filteredPeople.forEach((p) => {
    const parentKey = p.reportsTo || 'root';
    if (!childrenMap.has(parentKey)) childrenMap.set(parentKey, []);
    childrenMap.get(parentKey)!.push(p);
  });

  // Calculate subtree widths — single row per level
  const subtreeWidths = new Map<string, number>();

  function calcWidth(personId: string): number {
    const children = childrenMap.get(personId) || [];
    if (children.length === 0) {
      subtreeWidths.set(personId, NODE_WIDTH);
      return NODE_WIDTH;
    }
    const childrenTotalWidth = children.reduce(
      (sum, child) => sum + calcWidth(child.id) + H_GAP,
      -H_GAP
    );
    const width = Math.max(NODE_WIDTH, childrenTotalWidth);
    subtreeWidths.set(personId, width);
    return width;
  }

  // Start from root nodes
  const rootNodes = childrenMap.get('root') || [];
  rootNodes.forEach((p) => calcWidth(p.id));

  const totalRootWidth = rootNodes.reduce(
    (sum, p) => sum + (subtreeWidths.get(p.id) || NODE_WIDTH) + H_GAP,
    -H_GAP
  );

  // Track node positions for swim lane calculation
  const nodePositions = new Map<string, { x: number; y: number; practiceArea: string }>();

  function layoutNode(person: Person, x: number, y: number) {
    nodes.push({
      id: person.id,
      type: 'person',
      position: { x, y },
      data: { person },
      zIndex: 10,
    });

    nodePositions.set(person.id, { x, y, practiceArea: person.practiceArea });

    // Edge from parent (reporting line)
    if (person.reportsTo) {
      edges.push({
        id: `e-${person.reportsTo}-${person.id}`,
        source: person.reportsTo,
        target: person.id,
        type: 'reporting',
        data: { sourceId: person.reportsTo, targetId: person.id },
        style: { stroke: '#94a3b8', strokeWidth: 1.5 },
      });
    }

    // Support lines (dashed)
    if (showSupportLines && person.supportLines.length > 0) {
      person.supportLines.forEach((supportId) => {
        if (filteredPeople.some((p) => p.id === supportId)) {
          edges.push({
            id: `s-${supportId}-${person.id}`,
            source: supportId,
            target: person.id,
            type: 'support',
            data: { sourceId: supportId, targetId: person.id },
            style: {
              stroke: '#cbd5e1',
              strokeWidth: 1,
              strokeDasharray: '5 5',
            },
            animated: false,
          });
        }
      });
    }

    // Layout children — single row under this node
    const children = childrenMap.get(person.id) || [];
    if (children.length === 0) return;

    const childrenTotalWidth = children.reduce(
      (sum, child) => sum + (subtreeWidths.get(child.id) || NODE_WIDTH) + H_GAP,
      -H_GAP
    );

    const parentCenterX = x + NODE_WIDTH / 2;
    let childX = parentCenterX - childrenTotalWidth / 2;
    const childY = y + NODE_HEIGHT + V_GAP;

    children.forEach((child) => {
      const childWidth = subtreeWidths.get(child.id) || NODE_WIDTH;
      const childCenterX = childX + (childWidth - NODE_WIDTH) / 2;
      layoutNode(child, childCenterX, childY);
      childX += childWidth + H_GAP;
    });
  }

  // Layout root nodes
  let startX = -totalRootWidth / 2;
  rootNodes.forEach((p) => {
    const width = subtreeWidths.get(p.id) || NODE_WIDTH;
    const centerX = startX + (width - NODE_WIDTH) / 2;
    layoutNode(p, centerX, 0);
    startX += width + H_GAP;
  });

  // Build swim lane background nodes per practice area
  const practiceAreas = new Map<string, { minX: number; maxX: number; minY: number; maxY: number }>();

  nodePositions.forEach(({ x, y, practiceArea }) => {
    if (practiceArea === 'Central') return; // Skip Central since it's spread across top

    if (!practiceAreas.has(practiceArea)) {
      practiceAreas.set(practiceArea, {
        minX: x,
        maxX: x + NODE_WIDTH,
        minY: y,
        maxY: y + NODE_HEIGHT,
      });
    } else {
      const bounds = practiceAreas.get(practiceArea)!;
      bounds.minX = Math.min(bounds.minX, x);
      bounds.maxX = Math.max(bounds.maxX, x + NODE_WIDTH);
      bounds.minY = Math.min(bounds.minY, y);
      bounds.maxY = Math.max(bounds.maxY, y + NODE_HEIGHT);
    }
  });

  // Add swim lane group nodes (behind person nodes)
  practiceAreas.forEach((bounds, practiceArea) => {
    const color = PRACTICE_COLORS[practiceArea as keyof typeof PRACTICE_COLORS] || '#36454F';
    nodes.push({
      id: `swim-${practiceArea}`,
      type: 'practiceGroup',
      position: {
        x: bounds.minX - SWIM_LANE_PADDING,
        y: bounds.minY - SWIM_LANE_PADDING - SWIM_LANE_HEADER,
      },
      data: {
        label: practiceArea,
        color,
        width: bounds.maxX - bounds.minX + SWIM_LANE_PADDING * 2,
        height: bounds.maxY - bounds.minY + SWIM_LANE_PADDING * 2 + SWIM_LANE_HEADER,
      },
      zIndex: 0,
      selectable: false,
      draggable: false,
    });
  });

  return { nodes, edges };
}

function OrgChartInner() {
  const { people } = useOrgData();
  const { showOpenSeats, showPursuitTargets, showSupportLines, collapsedPractices, collapsedBandLevel, officeFilter } = useUIStore();
  const darkMode = useUIStore(s => s.darkMode);
  const updatePerson = useOrgStore((s) => s.updatePerson);
  const reactFlowInstance = useReactFlow();

  const [pendingConnection, setPendingConnection] = useState<{
    source: string;
    target: string;
    position: { x: number; y: number };
  } | null>(null);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildTree(people, showOpenSeats, showPursuitTargets, showSupportLines, collapsedPractices, collapsedBandLevel, officeFilter),
    [people, showOpenSeats, showPursuitTargets, showSupportLines, collapsedPractices, collapsedBandLevel, officeFilter]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update when data changes
  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Auto-zoom on collapse changes
  const collapsedKey = collapsedPractices.join(',');
  useEffect(() => {
    const timer = setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.1, maxZoom: 0.55, duration: 400 });
    }, 50);
    return () => clearTimeout(timer);
  }, [collapsedKey, collapsedBandLevel, reactFlowInstance]);

  const onConnect = useCallback(
    (connection: Connection) => {
      const { source, target } = connection;
      if (!source || !target || source === target) return;

      if (wouldCreateCycle(people, target, source)) {
        return;
      }

      const targetPerson = people.find((p) => p.id === target);
      const sourcePerson = people.find((p) => p.id === source);
      if (!targetPerson || !sourcePerson) return;

      if (!targetPerson.reportsTo) {
        updatePerson(target, { reportsTo: source });
      } else {
        const chartContainer = document.getElementById('org-chart-container');
        const rect = chartContainer?.getBoundingClientRect();
        const dialogX = rect ? rect.left + rect.width / 2 - 112 : 400;
        const dialogY = rect ? rect.top + rect.height / 2 - 80 : 300;

        setPendingConnection({
          source,
          target,
          position: { x: dialogX, y: dialogY },
        });
      }
    },
    [people, updatePerson]
  );

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.type !== 'person') return;

      const intersections = reactFlowInstance.getIntersectingNodes(node);
      const targetNode = intersections.find(
        (n) => n.type === 'person' && n.id !== node.id
      );

      if (!targetNode) return;

      const draggedPerson = people.find((p) => p.id === node.id);
      const targetPerson = people.find((p) => p.id === targetNode.id);
      if (!draggedPerson || !targetPerson) return;

      if (wouldCreateCycle(people, node.id, targetNode.id)) return;

      if (!draggedPerson.reportsTo) {
        updatePerson(node.id, { reportsTo: targetNode.id });
        return;
      }

      const chartContainer = document.getElementById('org-chart-container');
      const rect = chartContainer?.getBoundingClientRect();
      const dialogX = rect ? rect.left + rect.width / 2 - 112 : 400;
      const dialogY = rect ? rect.top + rect.height / 2 - 80 : 300;

      setPendingConnection({
        source: targetNode.id,
        target: node.id,
        position: { x: dialogX, y: dialogY },
      });
    },
    [people, updatePerson, reactFlowInstance]
  );

  const handleConnectionChoice = useCallback(
    (type: 'primary' | 'support') => {
      if (!pendingConnection) return;

      const { source, target } = pendingConnection;
      const targetPerson = people.find((p) => p.id === target);

      if (!targetPerson) {
        setPendingConnection(null);
        return;
      }

      if (type === 'primary') {
        updatePerson(target, { reportsTo: source });
      } else {
        const currentSupport = targetPerson.supportLines || [];
        if (!currentSupport.includes(source)) {
          updatePerson(target, {
            supportLines: [...currentSupport, source],
          });
        }
      }

      setPendingConnection(null);
    },
    [pendingConnection, people, updatePerson]
  );

  const handleConnectionCancel = useCallback(() => {
    setPendingConnection(null);
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  const sourcePerson = pendingConnection
    ? people.find((p) => p.id === pendingConnection.source)
    : null;
  const targetPerson = pendingConnection
    ? people.find((p) => p.id === pendingConnection.target)
    : null;
  const currentManager = pendingConnection && targetPerson
    ? people.find((p) => p.id === targetPerson.reportsTo) || null
    : null;

  return (
    <div className="h-full w-full relative" id="org-chart-container">
      <OrgChartControls />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.1, maxZoom: 0.55 }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
      >
        <Controls className={`!rounded-lg !shadow-sm ${darkMode ? '!bg-[#1a2332] !border-gray-700' : '!bg-white !border !border-gray-200'}`} />
        <MiniMap
          className={`!rounded-lg ${darkMode ? '!bg-[#1a2332] !border-gray-700' : '!bg-white !border !border-gray-200'}`}
          nodeColor={(node) => {
            const person = (node.data as any)?.person as Person;
            if (!person) return '#e2e8f0';
            return (
              PRACTICE_COLORS[
                person.practiceArea as keyof typeof PRACTICE_COLORS
              ] || '#36454F'
            );
          }}
          maskColor={darkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.08)'}
        />
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color={darkMode ? '#2d3748' : '#e2e8f0'}
        />
      </ReactFlow>

      {pendingConnection && sourcePerson && targetPerson && (
        <ConnectionDialog
          sourcePerson={sourcePerson}
          targetPerson={targetPerson}
          currentManager={currentManager}
          position={pendingConnection.position}
          onChoose={handleConnectionChoice}
          onCancel={handleConnectionCancel}
        />
      )}
    </div>
  );
}

export function OrgChartView() {
  return (
    <ReactFlowProvider>
      <OrgChartInner />
    </ReactFlowProvider>
  );
}
