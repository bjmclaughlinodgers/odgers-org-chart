import React, { useMemo, useState } from 'react';
import { AlertTriangle, TrendingUp, Flag } from 'lucide-react';
import { DndContext, DragOverlay, useDroppable, useDraggable, closestCenter, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { useOrgData } from '../../hooks/useOrgData';
import { useOrgStore } from '../../stores/orgStore';
import { useUIStore } from '../../stores/uiStore';
import { PRACTICE_COLORS } from '../../types';
import type { Person, PerformanceRating, RetentionRisk } from '../../types';
import { formatCurrency } from '../../utils/export';
import { getStaffCategory } from '../../utils/staffCategory';
import { isActivePerson } from '../../utils/personFilters';

interface QuadrantPerson {
  person: Person;
  x: number; // 0=left (Improvement), 1=right (Star)
  y: number; // 0=bottom (Low), 1=top (Critical)
}

const riskOrder: Record<string, number> = { 'Low': 0, 'Watch': 0.33, 'Elevated': 0.66, 'Critical': 1 };
const perfOrder: Record<string, number> = { 'Performance Improvement': 0, 'Performer': 0.5, 'Star Performer': 1 };

// Quadrant IDs and their mappings
const QUADRANT_MAP: Record<string, { performance: PerformanceRating; riskIsHigh: boolean }> = {
  'star-high': { performance: 'Star Performer', riskIsHigh: true },
  'star-low': { performance: 'Star Performer', riskIsHigh: false },
  'low-high': { performance: 'Performance Improvement', riskIsHigh: true },
  'low-low': { performance: 'Performance Improvement', riskIsHigh: false },
};

interface PendingDrop {
  personId: string;
  performance: PerformanceRating;
  position: { x: number; y: number };
}

interface OptimisticOverride {
  personId: string;
  performance: PerformanceRating;
  retentionRisk: RetentionRisk;
}

function RiskLevelPicker({ position, onSelect, onCancel }: {
  position: { x: number; y: number };
  onSelect: (risk: 'Watch' | 'Elevated' | 'Critical') => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed z-50 bg-white dark:bg-[#1a2332] border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl dark:shadow-gray-900/60 backdrop-blur-sm p-2 space-y-1"
      style={{ left: position.x, top: position.y }}
    >
      <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2 pb-1">Select Risk Level</div>
      {(['Watch', 'Elevated', 'Critical'] as const).map(risk => (
        <button
          key={risk}
          onClick={() => onSelect(risk)}
          className={`w-full text-left px-3 py-1.5 text-xs rounded hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
            risk === 'Critical' ? 'text-red-600 dark:text-red-400 font-medium' :
            risk === 'Elevated' ? 'text-orange-600 dark:text-orange-400 font-medium' :
            'text-gray-600 dark:text-gray-400'
          }`}
        >
          {risk}
        </button>
      ))}
      <button onClick={onCancel} className="w-full text-left px-3 py-1 text-[10px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
        Cancel
      </button>
    </div>
  );
}

function DraggablePersonDot({ qp, children }: { qp: QuadrantPerson; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: qp.person.id,
    data: { person: qp.person },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}
      className={`${isDragging ? 'opacity-30' : ''} cursor-grab active:cursor-grabbing inline-block`}>
      {children}
    </div>
  );
}

function DroppableQuadrant({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className={`transition-all ${isOver ? 'ring-2 ring-teal-400 ring-dashed' : ''}`}>
      {children}
    </div>
  );
}

function PersonPhoto({ person, size = 'sm' }: { person: Person; size?: 'sm' | 'list' }) {
  const color = PRACTICE_COLORS[person.practiceArea as keyof typeof PRACTICE_COLORS] || '#36454F';
  const borderColor = person.retentionRisk === 'Critical' ? '#ef4444' : person.retentionRisk === 'Elevated' ? '#f97316' : 'transparent';
  const sizeClass = size === 'list' ? 'w-8 h-8' : 'w-11 h-11';
  const textSize = size === 'list' ? 'text-[10px]' : 'text-[11px]';

  if (person.photoUrl) {
    return (
      <div className={`${sizeClass} rounded-full border-2 overflow-hidden flex-shrink-0`} style={{ borderColor }}>
        <img src={person.photoUrl} className="w-full h-full object-cover rounded-full" alt={`${person.firstName} ${person.lastName}`} />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full border-2 flex items-center justify-center text-white ${textSize} font-bold flex-shrink-0`}
      style={{ backgroundColor: color, borderColor }}
    >
      {person.firstName[0]}{person.lastName[0]}
    </div>
  );
}

export function RetentionMatrix() {
  const { people } = useOrgData();
  const { updatePerson } = useOrgStore();
  const { selectPerson } = useUIStore();
  const [activeDragPerson, setActiveDragPerson] = useState<Person | null>(null);
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);
  const [optimisticOverride, setOptimisticOverride] = useState<OptimisticOverride | null>(null);
  const [practiceFilter, setPracticeFilter] = useState<string[]>([]);
  const [functionFilter, setFunctionFilter] = useState<string[]>([]);

  const activePeople = useMemo(() => people.filter(p => isActivePerson(p)), [people]);

  // Compute unique practices for filter chips
  const uniquePractices = useMemo(() => {
    const set = new Set(activePeople.map(p => p.practiceArea));
    return Array.from(set).sort();
  }, [activePeople]);

  // Apply practice and function filters
  const filteredPeople = useMemo(() => {
    let result = activePeople;
    if (practiceFilter.length > 0) {
      result = result.filter(p => practiceFilter.includes(p.practiceArea));
    }
    if (functionFilter.length > 0) {
      result = result.filter(p => functionFilter.includes(getStaffCategory(p)));
    }
    return result;
  }, [activePeople, practiceFilter, functionFilter]);

  const quadrantData = useMemo((): QuadrantPerson[] => {
    return filteredPeople.map(p => {
      // Check for optimistic override
      if (optimisticOverride && optimisticOverride.personId === p.id) {
        return {
          person: p,
          x: perfOrder[optimisticOverride.performance] ?? 0.5,
          y: riskOrder[optimisticOverride.retentionRisk] ?? 0,
        };
      }
      return {
        person: p,
        x: perfOrder[p.performanceRating] ?? 0.5,
        y: riskOrder[p.retentionRisk] ?? 0,
      };
    });
  }, [filteredPeople, optimisticOverride]);

  // Quadrant groups
  const topRight = quadrantData.filter(q => q.x >= 0.5 && q.y >= 0.5); // Star + High Risk = RETAIN AT ALL COSTS
  const topLeft = quadrantData.filter(q => q.x < 0.5 && q.y >= 0.5); // Improvement + High Risk = May self-resolve
  const bottomRight = quadrantData.filter(q => q.x >= 0.5 && q.y < 0.5); // Star + Low Risk = Nurture
  const bottomLeft = quadrantData.filter(q => q.x < 0.5 && q.y < 0.5); // Improvement + Low Risk = Develop

  const riskSummary = useMemo(() => {
    const critical = filteredPeople.filter(p => p.retentionRisk === 'Critical');
    const elevated = filteredPeople.filter(p => p.retentionRisk === 'Elevated');
    const watch = filteredPeople.filter(p => p.retentionRisk === 'Watch');
    const totalAtRiskRevenue = [...critical, ...elevated].filter(p => p.isRevenueProducer).reduce((s, p) => s + (p.currentYearOCE || 0), 0);
    return { critical, elevated, watch, totalAtRiskRevenue };
  }, [filteredPeople]);

  function PersonDot({ qp }: { qp: QuadrantPerson }) {
    const p = qp.person;
    return (
      <button
        onClick={() => selectPerson(p.id)}
        className="group relative flex flex-col items-center"
        title={`${p.firstName} ${p.lastName} — ${p.title}`}
      >
        <PersonPhoto person={p} size="sm" />
        <span className="text-[9px] text-gray-500 dark:text-gray-400 mt-0.5 max-w-[52px] truncate text-center">
          {p.lastName}
        </span>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
          {p.firstName} {p.lastName} · {p.title}
          {p.isRevenueProducer && p.currentYearOCE ? ` · ${formatCurrency(p.currentYearOCE)}` : ''}
        </div>
      </button>
    );
  }

  const handleDragStart = (event: DragStartEvent) => {
    const person = event.active.data.current?.person as Person | undefined;
    setActiveDragPerson(person || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragPerson(null);
    const { active, over } = event;
    if (!over) return;

    const draggedPerson = active.data.current?.person as Person | undefined;
    if (!draggedPerson) return;

    const quadrantId = over.id as string;
    const mapping = QUADRANT_MAP[quadrantId];
    if (!mapping) return;

    if (mapping.riskIsHigh) {
      // High risk quadrants: set optimistic override FIRST (tile moves immediately)
      setOptimisticOverride({
        personId: draggedPerson.id,
        performance: mapping.performance,
        retentionRisk: 'Elevated', // default optimistic risk
      });
      // THEN show risk picker
      const mouseEvent = (event.activatorEvent as MouseEvent);
      const position = {
        x: mouseEvent?.clientX ?? window.innerWidth / 2,
        y: mouseEvent?.clientY ?? window.innerHeight / 2,
      };
      setPendingDrop({
        personId: draggedPerson.id,
        performance: mapping.performance,
        position,
      });
    } else {
      // Low risk quadrants: set directly to 'Low'
      updatePerson(draggedPerson.id, {
        performanceRating: mapping.performance,
        retentionRisk: 'Low',
      });
    }
  };

  const handleRiskSelect = (risk: 'Watch' | 'Elevated' | 'Critical') => {
    if (!pendingDrop) return;
    updatePerson(pendingDrop.personId, {
      performanceRating: pendingDrop.performance,
      retentionRisk: risk,
    });
    setOptimisticOverride(null);
    setPendingDrop(null);
  };

  const handleRiskCancel = () => {
    setOptimisticOverride(null);
    setPendingDrop(null);
  };

  // Abbreviate long practice names for filter chips
  const abbreviatePractice = (pa: string) => {
    if (pa === 'US Associations & Corporate Affairs') return 'US Assoc';
    if (pa === 'Aerospace & Defense') return 'A&D';
    if (pa === 'Financial Services') return 'Fin Svcs';
    return pa;
  };

  const abbreviateFunction = (cat: string) => {
    if (cat === 'Search Execution Support') return 'Exec Support';
    if (cat === 'Central/Corporate') return 'Central';
    return cat;
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
      <div className="p-4 space-y-6 animate-fade-in">
        {/* Risk Summary Cards */}
        <div className="grid grid-cols-4 gap-4 stagger-children">
          <div className="stat-card !bg-red-50 dark:!bg-red-900/20 !border-red-200 dark:!border-red-800">
            <div className="flex items-center gap-2 mb-1"><Flag size={14} className="text-red-500" /><span className="stat-label !text-red-600 dark:!text-red-400">Critical Risk</span></div>
            <div className="stat-value !text-red-700 dark:!text-red-400">{riskSummary.critical.length}</div>
            <div className="text-xs text-red-500 dark:text-red-400 mt-1">{riskSummary.critical.map(p => `${p.firstName} ${p.lastName}`).join(', ') || 'None'}</div>
          </div>
          <div className="stat-card !bg-orange-50 dark:!bg-orange-900/20 !border-orange-200 dark:!border-orange-800">
            <div className="flex items-center gap-2 mb-1"><Flag size={14} className="text-orange-500" /><span className="stat-label !text-orange-600 dark:!text-orange-400">Elevated Risk</span></div>
            <div className="stat-value !text-orange-700 dark:!text-orange-400">{riskSummary.elevated.length}</div>
            <div className="text-xs text-orange-500 dark:text-orange-400 mt-1">{riskSummary.elevated.map(p => `${p.firstName} ${p.lastName}`).join(', ') || 'None'}</div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-1"><AlertTriangle size={14} className="text-gray-500" /><span className="stat-label">Watch</span></div>
            <div className="stat-value">{riskSummary.watch.length}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{riskSummary.watch.map(p => `${p.firstName} ${p.lastName}`).join(', ') || 'None'}</div>
          </div>
          <div className="stat-card !bg-red-50 dark:!bg-red-900/20 !border-red-200 dark:!border-red-800">
            <div className="flex items-center gap-2 mb-1"><TrendingUp size={14} className="text-red-500" /><span className="stat-label !text-red-600 dark:!text-red-400">Revenue at Risk</span></div>
            <div className="stat-value !text-red-700 dark:!text-red-400">{formatCurrency(riskSummary.totalAtRiskRevenue)}</div>
            <div className="text-xs text-red-500 dark:text-red-400 mt-1">From Elevated + Critical producers</div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-3 flex-wrap card-flat px-3 py-2">
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Filter</span>
          {/* Practice chips */}
          <div className="flex gap-1 flex-wrap">
            {uniquePractices.map(pa => (
              <button key={pa}
                onClick={() => setPracticeFilter(prev =>
                  prev.includes(pa) ? prev.filter(x => x !== pa) : [...prev, pa]
                )}
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all duration-200 ${
                  practiceFilter.includes(pa) ? 'text-white' : 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
                style={practiceFilter.includes(pa) ? { backgroundColor: PRACTICE_COLORS[pa as keyof typeof PRACTICE_COLORS] || '#36454F' } : {}}
              >
                {abbreviatePractice(pa)}
              </button>
            ))}
          </div>
          <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
          {/* Function chips */}
          <div className="flex gap-1">
            {(['Revenue Producer', 'Search Execution Support', 'Project Coordinator', 'Central/Corporate'] as const).map(cat => (
              <button key={cat}
                onClick={() => setFunctionFilter(prev =>
                  prev.includes(cat) ? prev.filter(x => x !== cat) : [...prev, cat]
                )}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all duration-200 ${
                  functionFilter.includes(cat) ? 'bg-teal-600 text-white' : 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {abbreviateFunction(cat)}
              </button>
            ))}
          </div>
          {(practiceFilter.length > 0 || functionFilter.length > 0) && (
            <button onClick={() => { setPracticeFilter([]); setFunctionFilter([]); }}
              className="text-[10px] text-red-500 hover:text-red-700 ml-auto">Clear All</button>
          )}
        </div>

        {/* 2x2 Quadrant */}
        <div className="card p-6">
          <h3 className="section-title">Performance x Retention Risk Quadrant</h3>
          <div className="grid grid-cols-2 gap-0.5 max-w-3xl mx-auto">
            {/* Top Left: Improvement + High Risk */}
            <DroppableQuadrant id="low-high">
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-tl-lg p-4 min-h-[200px] border border-amber-100 dark:border-amber-800">
                <div className="text-[10px] font-semibold text-amber-700 uppercase mb-2">May Self-Resolve</div>
                <div className="text-[9px] text-amber-500 mb-3">Low performance + High risk — prepare backfill</div>
                <div className="flex flex-wrap gap-2">
                  {topLeft.map(qp => (
                    <DraggablePersonDot key={qp.person.id} qp={qp}>
                      <PersonDot qp={qp} />
                    </DraggablePersonDot>
                  ))}
                  {topLeft.length === 0 && <span className="text-[10px] text-amber-300 italic">None</span>}
                </div>
              </div>
            </DroppableQuadrant>
            {/* Top Right: Star + High Risk = RETAIN */}
            <DroppableQuadrant id="star-high">
              <div className="bg-red-50 dark:bg-red-900/20 rounded-tr-lg p-4 min-h-[200px] border border-red-200 dark:border-red-800">
                <div className="text-[10px] font-semibold text-red-700 uppercase mb-2">Retain at All Costs</div>
                <div className="text-[9px] text-red-500 mb-3">High performance + High risk — immediate action</div>
                <div className="flex flex-wrap gap-2">
                  {topRight.map(qp => (
                    <DraggablePersonDot key={qp.person.id} qp={qp}>
                      <PersonDot qp={qp} />
                    </DraggablePersonDot>
                  ))}
                  {topRight.length === 0 && <span className="text-[10px] text-red-300 italic">None</span>}
                </div>
              </div>
            </DroppableQuadrant>
            {/* Bottom Left: Improvement + Low Risk */}
            <DroppableQuadrant id="low-low">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-bl-lg p-4 min-h-[200px] border border-gray-200 dark:border-gray-700">
                <div className="text-[10px] font-semibold text-gray-600 uppercase mb-2">Develop or Transition</div>
                <div className="text-[9px] text-gray-400 mb-3">Low performance + Low risk — coaching investment</div>
                <div className="flex flex-wrap gap-2">
                  {bottomLeft.map(qp => (
                    <DraggablePersonDot key={qp.person.id} qp={qp}>
                      <PersonDot qp={qp} />
                    </DraggablePersonDot>
                  ))}
                  {bottomLeft.length === 0 && <span className="text-[10px] text-gray-300 italic">None</span>}
                </div>
              </div>
            </DroppableQuadrant>
            {/* Bottom Right: Star + Low Risk = Nurture */}
            <DroppableQuadrant id="star-low">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-br-lg p-4 min-h-[200px] border border-green-200 dark:border-green-800">
                <div className="text-[10px] font-semibold text-green-700 uppercase mb-2">Nurture</div>
                <div className="text-[9px] text-green-500 mb-3">High performance + Low risk — stable foundation</div>
                <div className="flex flex-wrap gap-2">
                  {bottomRight.map(qp => (
                    <DraggablePersonDot key={qp.person.id} qp={qp}>
                      <PersonDot qp={qp} />
                    </DraggablePersonDot>
                  ))}
                  {bottomRight.length === 0 && <span className="text-[10px] text-green-300 italic">None</span>}
                </div>
              </div>
            </DroppableQuadrant>
          </div>
          {/* Axis Labels */}
          <div className="flex justify-between mt-2 max-w-3xl mx-auto">
            <span className="text-[10px] text-gray-400 dark:text-gray-500">Performance Improvement</span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">Star Performer</span>
          </div>
        </div>

        {/* Flagged People Detail List */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700"><h3 className="section-title !mb-0">Flagged Individuals</h3></div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {[...riskSummary.critical, ...riskSummary.elevated, ...riskSummary.watch].map(p => (
              <div key={p.id} onClick={() => selectPerson(p.id)} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer flex items-center justify-between transition-colors">
                <div className="flex items-center gap-3">
                  <PersonPhoto person={p} size="list" />
                  <div>
                    <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">{p.firstName} {p.lastName}</div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-500">{p.title} · {p.practiceArea}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`badge ${p.performanceRating === 'Star Performer' ? 'badge-warning' : p.performanceRating === 'Performance Improvement' ? 'badge-danger' : 'badge-success'}`}>{p.performanceRating}</span>
                  <span className={`badge ${p.retentionRisk === 'Critical' ? 'badge-danger' : p.retentionRisk === 'Elevated' ? 'badge-warning' : 'badge-neutral'}`}>{p.retentionRisk}</span>
                  {p.isRevenueProducer && <span className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(p.currentYearOCE)}</span>}
                </div>
              </div>
            ))}
            {riskSummary.critical.length === 0 && riskSummary.elevated.length === 0 && riskSummary.watch.length === 0 && (
              <div className="px-4 py-8 text-center text-xs text-gray-400 dark:text-gray-500">No flagged individuals</div>
            )}
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeDragPerson ? (
          <div className="flex flex-col items-center opacity-80">
            <PersonPhoto person={activeDragPerson} size="sm" />
            <span className="text-[9px] text-gray-500 mt-0.5 max-w-[52px] truncate text-center font-medium">
              {activeDragPerson.lastName}
            </span>
          </div>
        ) : null}
      </DragOverlay>

      {/* Risk Level Picker Popup */}
      {pendingDrop && (
        <RiskLevelPicker
          position={pendingDrop.position}
          onSelect={handleRiskSelect}
          onCancel={handleRiskCancel}
        />
      )}
    </DndContext>
  );
}
