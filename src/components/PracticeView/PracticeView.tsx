import React, { useState, useMemo } from 'react';
import { Users, DollarSign, Clock, Briefcase, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { AnimatedNumber } from '../shared/AnimatedNumber';
import { DndContext, DragOverlay, useDroppable, useDraggable, closestCenter, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { useOrgData } from '../../hooks/useOrgData';
import { useOrgStore } from '../../stores/orgStore';
import { useUIStore } from '../../stores/uiStore';
import { PRACTICE_COLORS } from '../../types';
import type { Person, PracticeArea } from '../../types';
import { formatCurrency } from '../../utils/export';
import { computeTenure } from '../../utils/tenure';
import { getStaffCategory } from '../../utils/staffCategory';
import { isActivePerson } from '../../utils/personFilters';
import { StandardCard } from '../PersonCard/StandardCard';

const practices: (PracticeArea | 'Central')[] = ['Central', 'Financial Services', 'Industrial', 'Technology', 'Aerospace & Defense', 'Not for Profit', 'US Associations & Corporate Affairs', 'Life Sciences'];

function DraggablePersonCard({ person, onClick }: { person: Person; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: person.id,
    data: { person },
  });
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 50,
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}
      className={isDragging ? 'opacity-30' : ''}>
      <StandardCard person={person} onClick={onClick} />
    </div>
  );
}

function DroppablePracticeLane({ practiceArea, children }: { practiceArea: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `practice-${practiceArea}` });
  return (
    <div ref={setNodeRef} className={`transition-all duration-200 rounded-lg ${isOver ? 'ring-2 ring-teal-400 bg-teal-50/30' : ''}`}>
      {children}
    </div>
  );
}

function PracticeLane({ practiceArea, people }: { practiceArea: string; people: Person[] }) {
  const { selectPerson } = useUIStore();
  const color = PRACTICE_COLORS[practiceArea as keyof typeof PRACTICE_COLORS] || '#36454F';
  const producers = people.filter(p => p.isRevenueProducer && isActivePerson(p));
  const searchExec = people.filter(p => !p.isRevenueProducer && isActivePerson(p) && getStaffCategory(p) === 'Search Execution Support');
  const projectCoords = people.filter(p => !p.isRevenueProducer && isActivePerson(p) && getStaffCategory(p) === 'Project Coordinator');
  const centralSupport = people.filter(p => !p.isRevenueProducer && isActivePerson(p) && getStaffCategory(p) === 'Central/Corporate');
  const openSeats = people.filter(p => p.status === 'Open Seat');
  const active = people.filter(p => isActivePerson(p));
  const totalOCE = producers.reduce((sum, p) => sum + (p.currentYearOCE || 0), 0);
  const totalTarget = producers.reduce((sum, p) => sum + (p.revenueTarget || 0), 0);
  const peopleCost = active.reduce((sum, p) => sum + (p.totalOTE || p.baseSalary || 0), 0);
  const tenures = active.map(p => { const t = computeTenure(p.startDate); return t.years + t.months / 12; });
  const avgTenure = tenures.length > 0 ? (tenures.reduce((a, b) => a + b, 0) / tenures.length).toFixed(1) : '0';
  const avgTenureNum = tenures.length > 0 ? tenures.reduce((a, b) => a + b, 0) / tenures.length : 0;
  const attainment = totalTarget > 0 ? (totalOCE / totalTarget) * 100 : 0;
  const profit = totalOCE - peopleCost;
  const profitability = totalOCE > 0 ? ((totalOCE - peopleCost) / totalOCE) * 100 : 0;

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b-2 flex items-center justify-between" style={{ borderBottomColor: color }}>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
          <h3 className="section-title !mb-0">{practiceArea}</h3>
          <span className="text-xs text-gray-400 dark:text-gray-500">(<AnimatedNumber value={active.length} format={(n) => `${Math.round(n)}`} />)</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-gray-500 dark:text-gray-400">
          {totalOCE > 0 && <span className="flex items-center gap-1"><DollarSign size={11} /><AnimatedNumber value={totalOCE} format={formatCurrency} /></span>}
          <span className="flex items-center gap-1"><Users size={11} /><AnimatedNumber value={producers.length} format={(n) => `${Math.round(n)}`} />P / <AnimatedNumber value={searchExec.length + projectCoords.length} format={(n) => `${Math.round(n)}`} />S</span>
          <span className="flex items-center gap-1"><Clock size={11} /><AnimatedNumber value={avgTenureNum} format={(n) => n.toFixed(1)} />y avg</span>
        </div>
      </div>

      {/* Financial Summary Bar */}
      {practiceArea !== 'Central' && peopleCost > 0 && (
        <div className="stat-card !rounded-none !border-x-0 flex items-center gap-6 text-[11px] px-4 py-2">
          <div>
            <span className="text-gray-400 dark:text-gray-500">People Cost: </span>
            <span className="font-semibold text-gray-700 dark:text-gray-300"><AnimatedNumber value={peopleCost} format={formatCurrency} /></span>
          </div>
          {totalOCE > 0 && (
            <div>
              <span className="text-gray-400 dark:text-gray-500">YTD Revenue: </span>
              <span className="font-semibold text-gray-700 dark:text-gray-300"><AnimatedNumber value={totalOCE} format={formatCurrency} /></span>
            </div>
          )}
          {totalTarget > 0 && (
            <div>
              <span className="text-gray-400 dark:text-gray-500">Target: </span>
              <span className="font-semibold text-gray-700 dark:text-gray-300"><AnimatedNumber value={totalTarget} format={formatCurrency} /></span>
              <span className={`ml-1 font-medium ${attainment >= 100 ? 'text-green-600' : attainment >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                (<AnimatedNumber value={attainment} format={(n) => `${n.toFixed(0)}%`} />)
              </span>
            </div>
          )}
          {totalOCE > 0 && (
            <div>
              <span className="text-gray-400 dark:text-gray-500">Profit: </span>
              <span className={`font-semibold ${profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                <AnimatedNumber value={profit} format={formatCurrency} />
              </span>
            </div>
          )}
          {peopleCost > 0 && (
            <div>
              <span className="text-gray-400 dark:text-gray-500">Profitability: </span>
              <span className={`font-semibold ${profitability >= 30 ? 'text-green-600' : profitability >= 15 ? 'text-amber-600' : 'text-red-600'}`}>
                <AnimatedNumber value={profitability} format={(n) => `${n.toFixed(0)}%`} />
              </span>
            </div>
          )}
        </div>
      )}

      <div className="p-3 space-y-4">
        {producers.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Revenue Producers</div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 stagger-children">
              {producers.sort((a, b) => (b.currentYearOCE || 0) - (a.currentYearOCE || 0)).map(p => (
                <DraggablePersonCard key={p.id} person={p} onClick={() => selectPerson(p.id)} />
              ))}
            </div>
          </div>
        )}
        {searchExec.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Search Execution Support</div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 stagger-children">
              {searchExec.map(p => (<DraggablePersonCard key={p.id} person={p} onClick={() => selectPerson(p.id)} />))}
            </div>
          </div>
        )}
        {projectCoords.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Project Coordinators</div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 stagger-children">
              {projectCoords.map(p => (<DraggablePersonCard key={p.id} person={p} onClick={() => selectPerson(p.id)} />))}
            </div>
          </div>
        )}
        {centralSupport.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Operations & Support</div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 stagger-children">
              {centralSupport.map(p => (<DraggablePersonCard key={p.id} person={p} onClick={() => selectPerson(p.id)} />))}
            </div>
          </div>
        )}
        {openSeats.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Open Seats</div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 stagger-children">
              {openSeats.map(p => (<DraggablePersonCard key={p.id} person={p} onClick={() => selectPerson(p.id)} />))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function PracticeView() {
  const { people } = useOrgData();
  const { updatePerson } = useOrgStore();
  const [activeDrag, setActiveDrag] = useState<Person | null>(null);
  const [officeFilter, setOfficeFilter] = useState<string>('all');
  const [bandFilter, setBandFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('revenue');
  const [showOnlyOpenSeats, setShowOnlyOpenSeats] = useState(false);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDrag(event.active.data.current?.person as Person || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over) return;
    const person = active.data.current?.person as Person;
    if (!person) return;
    const targetPractice = (over.id as string).replace('practice-', '');
    if (targetPractice !== person.practiceArea) {
      updatePerson(person.id, { practiceArea: targetPractice as PracticeArea });
    }
  };

  const filteredPeople = useMemo(() => {
    let result = people;
    if (officeFilter !== 'all') result = result.filter(p => p.office === officeFilter);
    if (bandFilter !== 'all') result = result.filter(p => p.band === bandFilter);
    if (showOnlyOpenSeats) {
      // Show only open seats and the person they report to
      const openSeats = result.filter(p => p.status === 'Open Seat');
      const managerIds = new Set(openSeats.map(p => p.reportsTo).filter(Boolean));
      result = result.filter(p => p.status === 'Open Seat' || managerIds.has(p.id));
    }
    return result;
  }, [people, officeFilter, bandFilter, showOnlyOpenSeats]);

  const sortedPractices = useMemo(() => {
    const practiceData = practices.map(pa => ({
      practice: pa,
      people: filteredPeople.filter(p => p.practiceArea === pa),
    })).filter(({ people }) => people.length > 0);

    return practiceData.sort((a, b) => {
      switch (sortBy) {
        case 'revenue': {
          const aRev = a.people.filter(p => p.isRevenueProducer).reduce((sum, p) => sum + (p.currentYearOCE || 0), 0);
          const bRev = b.people.filter(p => p.isRevenueProducer).reduce((sum, p) => sum + (p.currentYearOCE || 0), 0);
          return bRev - aRev;
        }
        case 'name': return a.practice.localeCompare(b.practice);
        case 'headcount': return b.people.length - a.people.length;
        case 'tenure': {
          const avgTenure = (arr: Person[]) => arr.length > 0
            ? arr.reduce((sum: number, p) => sum + (new Date().getTime() - new Date(p.startDate).getTime()) / (365.25*24*60*60*1000), 0) / arr.length
            : 0;
          return avgTenure(b.people) - avgTenure(a.people);
        }
        default: return 0;
      }
    });
  }, [filteredPeople, sortBy]);

  return (
    <DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="p-4 space-y-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          {/* Office Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase">Office:</span>
            <select value={officeFilter} onChange={e => setOfficeFilter(e.target.value)}
              className="text-xs bg-white dark:bg-[#1a2332] border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-700 dark:text-gray-300">
              <option value="all">All Offices</option>
              {['New York', 'Washington DC', 'Boston', 'Austin', 'Atlanta', 'Remote'].map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          {/* Band Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase">Band:</span>
            <select value={bandFilter} onChange={e => setBandFilter(e.target.value)}
              className="text-xs bg-white dark:bg-[#1a2332] border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-700 dark:text-gray-300">
              <option value="all">All Bands</option>
              {['Senior Leadership', 'Revenue Producer', 'Engagement Management', 'Research Leadership', 'Research & Execution', 'Research & Analysis', 'Project Coordination', 'Operations Leadership', 'Finance', 'IT', 'Marketing', 'Knowledge Management', 'Operations & Admin'].map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase">Sort:</span>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="text-xs bg-white dark:bg-[#1a2332] border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-700 dark:text-gray-300">
              <option value="revenue">Revenue (High → Low)</option>
              <option value="name">Name (A → Z)</option>
              <option value="tenure">Tenure (Longest)</option>
              <option value="headcount">Headcount (Most)</option>
            </select>
          </div>

          {/* Open Seats Only */}
          <button
            onClick={() => setShowOnlyOpenSeats(!showOnlyOpenSeats)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all duration-200 ${
              showOnlyOpenSeats
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-800'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Open Seats Only
          </button>
        </div>

        {sortedPractices.map(({ practice: pa, people: pp }) => (
          <DroppablePracticeLane key={pa} practiceArea={pa}>
            <PracticeLane practiceArea={pa} people={pp} />
          </DroppablePracticeLane>
        ))}
      </div>
      <DragOverlay>
        {activeDrag && (
          <div className="opacity-80 rotate-2 shadow-xl">
            <StandardCard person={activeDrag} onClick={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
