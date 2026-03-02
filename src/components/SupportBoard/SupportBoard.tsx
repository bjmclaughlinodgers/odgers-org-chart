import React, { useMemo, useState } from 'react';
import { Users, DollarSign, AlertCircle, X, ChevronDown, ChevronRight, ChevronLeft, ArrowLeftRight } from 'lucide-react';
import { DndContext, DragOverlay, useDroppable, useDraggable, closestCenter, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { useOrgData } from '../../hooks/useOrgData';
import { useOrgStore } from '../../stores/orgStore';
import { useUIStore } from '../../stores/uiStore';
import { PRACTICE_COLORS } from '../../types';
import type { Person, PracticeArea } from '../../types';
import { formatCurrency } from '../../utils/export';
import { isActivePerson } from '../../utils/personFilters';
import { getStaffCategory } from '../../utils/staffCategory';

const practiceOptions: PracticeArea[] = ['Financial Services', 'Industrial', 'Technology', 'Aerospace & Defense', 'Not for Profit', 'US Associations & Corporate Affairs', 'Life Sciences'];

function DraggableStaffCard({ person, children }: { person: Person; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: person.id,
    data: { person },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}
      className={`${isDragging ? 'opacity-30' : ''} cursor-grab active:cursor-grabbing`}>
      {children}
    </div>
  );
}

function DroppableColumn({ id, children, isOver }: { id: string; children: React.ReactNode; isOver?: boolean }) {
  const { setNodeRef, isOver: hovering } = useDroppable({ id });
  const active = isOver || hovering;

  return (
    <div ref={setNodeRef} className={`transition-all ${active ? 'ring-2 ring-teal-400 ring-dashed bg-teal-50/30 rounded-lg' : ''}`}>
      {children}
    </div>
  );
}

export function SupportBoard() {
  const { people } = useOrgData();
  const { updatePerson } = useOrgStore();
  const { selectPerson } = useUIStore();
  const [practiceFilter, setPracticeFilter] = useState<string>('all');
  const [supportPracticeFilter, setSupportPracticeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'producer' | 'pc'>('producer');
  const [activeDragPerson, setActiveDragPerson] = useState<Person | null>(null);
  const [unassignedCollapsed, setUnassignedCollapsed] = useState(false);
  const [kmCollapsed, setKmCollapsed] = useState(false);

  const producers = useMemo(() => {
    let prods = people.filter(p => p.isRevenueProducer && isActivePerson(p));
    if (practiceFilter !== 'all') prods = prods.filter(p => p.practiceArea === practiceFilter);
    return prods.sort((a, b) => (b.currentYearOCE || 0) - (a.currentYearOCE || 0));
  }, [people, practiceFilter]);

  const supportStaff = useMemo(() => {
    let staff = people.filter(p => !p.isRevenueProducer && isActivePerson(p));
    if (supportPracticeFilter !== 'all') staff = staff.filter(p => p.practiceArea === supportPracticeFilter);
    return staff;
  }, [people, supportPracticeFilter]);

  const getSupportFor = (producerId: string) => {
    return supportStaff.filter(s => s.supportLines.includes(producerId) || s.reportsTo === producerId);
  };

  const unassigned = useMemo(() => {
    const assignedIds = new Set<string>();
    producers.forEach(prod => {
      getSupportFor(prod.id).forEach(s => assignedIds.add(s.id));
    });
    return supportStaff.filter(s => !assignedIds.has(s.id) && s.practiceArea !== 'Central');
  }, [producers, supportStaff]);

  const kmTeam = useMemo(() => people.filter(p => p.band === 'Knowledge Management' && isActivePerson(p)), [people]);

  // PC-centric view: support staff as columns, producers as cards
  const pcColumns = useMemo(() => {
    if (viewMode !== 'pc') return [];
    return supportStaff.filter(s => getStaffCategory(s) === 'Project Coordinator').sort((a, b) => a.lastName.localeCompare(b.lastName));
  }, [viewMode, supportStaff]);

  const getProducersFor = (supportPersonId: string) => {
    const supportPerson = people.find(p => p.id === supportPersonId);
    if (!supportPerson) return [];
    // A support person's supportLines contain the IDs of producers they support
    const producerIds = new Set([
      ...supportPerson.supportLines,
      ...(supportPerson.reportsTo ? [supportPerson.reportsTo] : []),
    ]);
    return producers.filter(prod => producerIds.has(prod.id));
  };

  // In PC mode, find support staff not assigned to any producer
  const unassignedPCs = useMemo(() => {
    if (viewMode !== 'pc') return [];
    const assignedIds = new Set<string>();
    producers.forEach(prod => {
      supportStaff.forEach(s => {
        if (s.supportLines.includes(prod.id) || s.reportsTo === prod.id) {
          assignedIds.add(s.id);
        }
      });
    });
    return pcColumns.filter(s => !assignedIds.has(s.id));
  }, [viewMode, pcColumns, producers, supportStaff]);

  // Find which producer column a person currently belongs to (via supportLines)
  const findCurrentProducer = (person: Person): string | null => {
    for (const prod of producers) {
      if (person.supportLines.includes(prod.id) || person.reportsTo === prod.id) {
        return prod.id;
      }
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const person = event.active.data.current?.person as Person | undefined;
    setActiveDragPerson(person || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragPerson(null);
    if (viewMode === 'pc') return; // No DnD in PC view
    const { active, over } = event;
    if (!over) return;

    const draggedPerson = active.data.current?.person as Person | undefined;
    if (!draggedPerson) return;

    const targetId = over.id as string;
    const currentProducerId = findCurrentProducer(draggedPerson);

    // No change if dropped on same column
    if (targetId === currentProducerId) return;
    if (targetId === 'unassigned' && currentProducerId === null) return;

    if (targetId === 'unassigned') {
      // Remove all producer IDs from supportLines
      const producerIds = new Set(producers.map(p => p.id));
      const newSupportLines = draggedPerson.supportLines.filter(id => !producerIds.has(id));
      updatePerson(draggedPerson.id, { supportLines: newSupportLines });
    } else {
      // Dropping on a producer column
      let newSupportLines = [...draggedPerson.supportLines];

      // Remove old producer if moving between producers
      if (currentProducerId && currentProducerId !== targetId) {
        newSupportLines = newSupportLines.filter(id => id !== currentProducerId);
      }

      // Add new producer if not already there
      if (!newSupportLines.includes(targetId)) {
        newSupportLines.push(targetId);
      }

      updatePerson(draggedPerson.id, { supportLines: newSupportLines });
    }
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
      <div className="p-4 animate-fade-in">
        {/* Practice Filter - Producers */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Producers:</span>
          <button onClick={() => setPracticeFilter('all')} className={`px-2 py-1 rounded text-xs transition-all duration-200 ${practiceFilter === 'all' ? 'bg-[#00857C] text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>All</button>
          {practiceOptions.map(pa => (
            <button key={pa} onClick={() => setPracticeFilter(pa)} className={`px-2 py-1 rounded text-xs transition-all duration-200 ${practiceFilter === pa ? 'text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
              style={practiceFilter === pa ? { backgroundColor: PRACTICE_COLORS[pa] } : {}}>
              {pa === 'Financial Services' ? 'Fin Svcs' : pa === 'Aerospace & Defense' ? 'A&D' : pa === 'US Associations & Corporate Affairs' ? 'US Assoc' : pa}
            </button>
          ))}
        </div>

        {/* Practice Filter - Support */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Support:</span>
          <button onClick={() => setSupportPracticeFilter('all')} className={`px-2 py-1 rounded text-xs transition-all duration-200 ${supportPracticeFilter === 'all' ? 'bg-[#00857C] text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>All</button>
          {practiceOptions.map(pa => (
            <button key={pa} onClick={() => setSupportPracticeFilter(pa)} className={`px-2 py-1 rounded text-xs transition-all duration-200 ${supportPracticeFilter === pa ? 'text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
              style={supportPracticeFilter === pa ? { backgroundColor: PRACTICE_COLORS[pa] } : {}}>
              {pa === 'Financial Services' ? 'Fin Svcs' : pa === 'Aerospace & Defense' ? 'A&D' : pa === 'US Associations & Corporate Affairs' ? 'US Assoc' : pa}
            </button>
          ))}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setViewMode(viewMode === 'producer' ? 'pc' : 'producer')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <ArrowLeftRight size={14} />
            {viewMode === 'producer' ? 'Switch to PC View' : 'Switch to Producer View'}
          </button>
          <span className="text-[10px] text-gray-400 dark:text-gray-500">
            {viewMode === 'producer' ? 'Columns = Revenue Producers' : 'Columns = Support Staff'}
          </span>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-4">
          {/* Pinned pools - sticky left */}
          <div className="sticky left-0 z-10 flex gap-3 flex-shrink-0 bg-gray-50 dark:bg-[#0d1117] pr-3" style={{ boxShadow: '4px 0 8px -2px rgba(0,0,0,0.08)' }}>
            {/* Unassigned Pool */}
            {unassignedCollapsed ? (
              <div className="min-w-[40px] max-w-[40px] card-flat flex-shrink-0 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-all" onClick={() => setUnassignedCollapsed(false)}>
                <div className="flex flex-col items-center justify-center h-full py-3">
                  <ChevronRight size={14} className="text-gray-400 mb-2" />
                  <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 [writing-mode:vertical-lr] rotate-180">Unassigned ({unassigned.length})</span>
                </div>
              </div>
            ) : (
              <DroppableColumn id="unassigned">
                <div className="min-w-[220px] max-w-[220px] card-flat flex-shrink-0">
                  <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between cursor-pointer select-none" onClick={() => setUnassignedCollapsed(true)}>
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400">Unassigned Pool ({unassigned.length})</h4>
                    <ChevronLeft size={14} className="text-gray-400" />
                  </div>
                  <div className="p-2 space-y-1.5 max-h-[70vh] overflow-y-auto">
                    {unassigned.map(s => (
                      <DraggableStaffCard key={s.id} person={s}>
                        <div onClick={() => selectPerson(s.id)} className="bg-white dark:bg-[#1a2332] rounded border border-gray-200 dark:border-gray-700 p-2 cursor-pointer hover:shadow-sm dark:hover:shadow-gray-900/30 text-xs transition-all duration-200">
                          <div className="font-medium text-gray-800 dark:text-gray-200">{s.firstName} {s.lastName}</div>
                          <div className="text-[10px] text-gray-400 dark:text-gray-500">{s.title}</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {s.skillsTags.slice(0, 3).map(tag => (<span key={tag} className="text-[9px] bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 px-1 rounded">{tag}</span>))}
                          </div>
                        </div>
                      </DraggableStaffCard>
                    ))}
                  </div>
                </div>
              </DroppableColumn>
            )}

            {/* KM Team */}
            {kmCollapsed ? (
              <div className="min-w-[40px] max-w-[40px] card-flat flex-shrink-0 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-all" onClick={() => setKmCollapsed(false)}>
                <div className="flex flex-col items-center justify-center h-full py-3">
                  <ChevronRight size={14} className="text-gray-400 mb-2" />
                  <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 [writing-mode:vertical-lr] rotate-180">Knowledge Mgmt ({kmTeam.length})</span>
                </div>
              </div>
            ) : (
              <div className="min-w-[220px] max-w-[220px] card-flat flex-shrink-0">
                <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between cursor-pointer select-none" onClick={() => setKmCollapsed(true)}>
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400">Knowledge Mgmt ({kmTeam.length})</h4>
                  <ChevronLeft size={14} className="text-gray-400" />
                </div>
                <div className="p-2 space-y-1.5">
                  {kmTeam.map(s => (
                    <div key={s.id} onClick={() => selectPerson(s.id)} className="bg-white dark:bg-[#1a2332] rounded border border-gray-200 dark:border-gray-700 p-2 cursor-pointer hover:shadow-sm dark:hover:shadow-gray-900/30 text-xs transition-all duration-200">
                      <div className="font-medium text-gray-800 dark:text-gray-200">{s.firstName} {s.lastName}</div>
                      <div className="text-[10px] text-gray-400 dark:text-gray-500">{s.title}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Columns: Producer View or PC-Centric View */}
          {viewMode === 'producer' ? (
            <>
              {producers.map(prod => {
                const support = getSupportFor(prod.id);
                const sr = prod.supportRequirements;
                const totalReq = sr ? Object.values(sr).reduce((s: number, v: any) => s + v.required, 0) : 0;
                const totalAlloc = sr ? Object.values(sr).reduce((s: number, v: any) => s + v.allocated, 0) : 0;
                const gapLevel = totalReq <= totalAlloc ? 'green' : totalReq - totalAlloc < 1 ? 'amber' : 'red';

                return (
                  <DroppableColumn key={prod.id} id={prod.id}>
                    <div className="min-w-[220px] max-w-[220px] card flex-shrink-0">
                      <div className="px-3 py-2 border-b-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors" style={{ borderBottomColor: PRACTICE_COLORS[prod.practiceArea as keyof typeof PRACTICE_COLORS] || '#36454F' }} onClick={() => selectPerson(prod.id)}>
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{prod.firstName} {prod.lastName}</div>
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${gapLevel === 'green' ? 'bg-green-500' : gapLevel === 'amber' ? 'bg-amber-500' : 'bg-red-500'}`} />
                        </div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500">{formatCurrency(prod.currentYearOCE)}</div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500">{totalAlloc}/{totalReq} support FTEs</div>
                      </div>
                      <div className="p-2 space-y-1.5 max-h-[60vh] overflow-y-auto">
                        {support.length === 0 && <div className="text-[10px] text-gray-400 dark:text-gray-500 italic p-2">No direct support assigned</div>}
                        {support.map(s => {
                          const isShared = s.supportLines.length > 1;
                          return (
                            <DraggableStaffCard key={s.id} person={s}>
                              <div onClick={() => selectPerson(s.id)} className={`rounded border p-2 cursor-pointer hover:shadow-sm dark:hover:shadow-gray-900/30 text-xs transition-all duration-200 ${s.status === 'On Leave' ? 'opacity-50' : ''} ${isShared ? 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a2332]'}`}>
                                <div className="flex items-center gap-1">
                                  <span className="font-medium text-gray-800 dark:text-gray-200 truncate flex-1 min-w-0">{s.firstName} {s.lastName}</span>
                                  {isShared && <span className="text-[9px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1 rounded flex-shrink-0">Shared</span>}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const newSupportLines = s.supportLines.filter(id => id !== prod.id);
                                      updatePerson(s.id, { supportLines: newSupportLines });
                                    }}
                                    className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                                    title="Remove assignment"
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                                <div className="text-[10px] text-gray-400 dark:text-gray-500">{s.title}</div>
                                {s.status === 'On Leave' && <span className="text-[9px] bg-amber-100 text-amber-700 px-1 rounded">ON LEAVE</span>}
                              </div>
                            </DraggableStaffCard>
                          );
                        })}
                      </div>
                    </div>
                  </DroppableColumn>
                );
              })}
            </>
          ) : (
            <>
              {pcColumns.map(staff => {
                const assignedProducers = getProducersFor(staff.id);
                const practiceColor = PRACTICE_COLORS[staff.practiceArea as keyof typeof PRACTICE_COLORS] || '#36454F';

                return (
                  <div key={staff.id} className="min-w-[220px] max-w-[220px] card flex-shrink-0">
                    <div className="px-3 py-2 border-b-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors" style={{ borderBottomColor: practiceColor }} onClick={() => selectPerson(staff.id)}>
                      <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{staff.firstName} {staff.lastName}</div>
                      <div className="text-[10px] text-gray-400 dark:text-gray-500">{staff.title}</div>
                      <div className="text-[10px] text-gray-400 dark:text-gray-500">{assignedProducers.length} producer{assignedProducers.length !== 1 ? 's' : ''}</div>
                    </div>
                    <div className="p-2 space-y-1.5 max-h-[60vh] overflow-y-auto">
                      {assignedProducers.length === 0 && <div className="text-[10px] text-gray-400 dark:text-gray-500 italic p-2">No producers assigned</div>}
                      {assignedProducers.map(prod => (
                        <div key={prod.id} onClick={() => selectPerson(prod.id)} className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a2332] p-2 cursor-pointer hover:shadow-sm dark:hover:shadow-gray-900/30 text-xs transition-all duration-200">
                          <div className="font-medium text-gray-800 dark:text-gray-200 truncate">{prod.firstName} {prod.lastName}</div>
                          <div className="text-[10px] text-gray-400 dark:text-gray-500">{formatCurrency(prod.currentYearOCE)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeDragPerson ? (
          <div className="bg-white dark:bg-[#1a2332] rounded border border-teal-300 dark:border-teal-700 p-2 text-xs shadow-lg dark:shadow-gray-900/50 opacity-80 w-[200px]">
            <div className="font-medium text-gray-800 dark:text-gray-200">{activeDragPerson.firstName} {activeDragPerson.lastName}</div>
            <div className="text-[10px] text-gray-400 dark:text-gray-500">{activeDragPerson.title}</div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
