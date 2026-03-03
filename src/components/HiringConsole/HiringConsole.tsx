import { useState, useMemo, useCallback } from 'react';
import { useOrgStore } from '../../stores/orgStore';
import { useUIStore } from '../../stores/uiStore';
import { Briefcase, ChevronDown, ChevronRight, Search, Users, ArrowUpDown, ArrowUp, ArrowDown, DollarSign, Pencil, CheckCircle2, AlertTriangle } from 'lucide-react';
import { PipelineFunnel } from './PipelineFunnel';
import { CandidateTracker } from './CandidateTracker';
import {
  HIRING_PRIORITY_OPTIONS,
  RECRUITING_STATUS_OPTIONS,
  RECRUITER_TYPE_OPTIONS,
  getDynamicPracticeOptions,
  BAND_OPTIONS,
} from '../../constants/editOptions';
import type { Person } from '../../types';
import type { RecruitingStatus, HiringPriority } from '../../types/enums';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRIORITY_ORDER: HiringPriority[] = ['Critical', 'High', 'Medium', 'Low'];
const STATUS_ORDER: RecruitingStatus[] = [
  'Not Started',
  'Sourcing',
  'Screening',
  'Interviewing',
  'Offer',
  'Closed',
];

type SortField = 'priority' | 'practice' | 'status' | 'candidates' | 'daysToTarget' | 'budget' | 'role' | 'recruiter' | 'spend';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysToTarget(targetStartDate?: string): { days: number; overdue: boolean } | null {
  if (!targetStartDate) return null;
  const target = new Date(targetStartDate);
  const now = new Date();
  const diff = Math.floor((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return { days: Math.abs(diff), overdue: diff < 0 };
}

function parseBudget(budget?: string): number {
  if (!budget) return 0;
  const cleaned = budget.replace(/[^0-9.]/g, '');
  return parseFloat(cleaned) || 0;
}

function fmtCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

// ---------------------------------------------------------------------------
// Badge Components
// ---------------------------------------------------------------------------

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    Critical: 'badge-red',
    High: 'badge-amber',
    Medium: 'badge-teal',
    Low: 'badge-gray',
  };
  return (
    <span className={`badge ${map[priority] ?? 'badge-gray'}`}>
      {priority === 'Critical' && (
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
      )}
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    'Not Started': 'badge-gray',
    Sourcing: 'badge-teal',
    Screening: 'badge-teal',
    Interviewing: 'badge-amber',
    Offer: 'badge-green',
    Closed: 'badge-green',
  };
  return <span className={`badge ${map[status] ?? 'badge-gray'}`}>{status}</span>;
}

function DaysToTargetDisplay({ targetStartDate }: { targetStartDate?: string }) {
  const result = daysToTarget(targetStartDate);
  if (!result) {
    return <span className="text-[12px] text-gray-300 dark:text-gray-600">--</span>;
  }
  if (result.overdue) {
    return (
      <span className="text-[12px] font-semibold text-red-500 dark:text-red-400 tabular-nums">
        {result.days}d overdue
      </span>
    );
  }
  return (
    <span
      className={`text-[12px] font-medium tabular-nums ${
        result.days <= 14
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-gray-600 dark:text-gray-400'
      }`}
    >
      {result.days}d
    </span>
  );
}

// ---------------------------------------------------------------------------
// Sort Arrow
// ---------------------------------------------------------------------------

function SortIndicator({ field, currentField, currentDir }: {
  field: SortField;
  currentField: SortField;
  currentDir: 'asc' | 'desc';
}) {
  if (field !== currentField) {
    return <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" />;
  }
  return currentDir === 'asc'
    ? <ArrowUp className="w-3 h-3 text-odgers-teal dark:text-teal-400" />
    : <ArrowDown className="w-3 h-3 text-odgers-teal dark:text-teal-400" />;
}

// ---------------------------------------------------------------------------
// KPI Strip
// ---------------------------------------------------------------------------

function KPIStrip({ seats }: { seats: Person[] }) {
  const stats = useMemo(() => {
    const criticalHigh = seats.filter(
      (s) => s.hiringPriority === 'Critical' || s.hiringPriority === 'High'
    ).length;

    const activeSearches = seats.filter(
      (s) =>
        s.recruitingStatus !== undefined &&
        s.recruitingStatus !== 'Not Started' &&
        s.recruitingStatus !== 'Closed'
    ).length;

    const allCandidates = seats.reduce(
      (sum, s) => sum + (s.candidates?.length ?? 0),
      0
    );

    const finalists = seats.reduce(
      (sum, s) =>
        sum + (s.candidates?.filter((c) => c.isFinalist).length ?? 0),
      0
    );

    const seatsWithDates = seats.filter((s) => s.targetStartDate);
    let avgDaysLabel = 'N/A';
    if (seatsWithDates.length > 0) {
      const totalDays = seatsWithDates.reduce((sum, s) => {
        const result = daysToTarget(s.targetStartDate);
        if (!result) return sum;
        return sum + (result.overdue ? -result.days : result.days);
      }, 0);
      const avg = Math.round(totalDays / seatsWithDates.length);
      if (avg < 0) {
        avgDaysLabel = `${Math.abs(avg)}d avg overdue`;
      } else {
        avgDaysLabel = `${avg}d`;
      }
    }

    // Recruiting Spend
    const actualSpend = seats.reduce((sum, s) => sum + (s.recruitingSpendActual ?? 0), 0);
    const committedSpend = seats.reduce((sum, s) => sum + (s.recruitingSpendCommitted ?? 0), 0);
    const totalExposure = actualSpend + committedSpend;

    return { criticalHigh, activeSearches, allCandidates, finalists, avgDaysLabel, actualSpend, committedSpend, totalExposure };
  }, [seats]);

  const cards = [
    {
      label: 'Total Open Seats',
      value: String(seats.length),
      accent: false,
    },
    {
      label: 'Critical / High',
      value: String(stats.criticalHigh),
      accent: stats.criticalHigh > 0,
    },
    {
      label: 'Active Searches',
      value: String(stats.activeSearches),
      accent: false,
    },
    {
      label: 'Total Candidates',
      value: String(stats.allCandidates),
      accent: false,
    },
    {
      label: 'Finalists',
      value: String(stats.finalists),
      accent: false,
    },
    {
      label: 'Avg. Days to Target',
      value: stats.avgDaysLabel,
      accent: stats.avgDaysLabel.includes('overdue'),
    },
  ];

  return (
    <section className="stagger-children space-y-4">
      {/* Operational KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`stat-card !p-4 flex flex-col justify-between ${
              c.accent ? 'ring-2 ring-red-300/60 dark:ring-red-500/30' : ''
            }`}
          >
            <p className="stat-label">{c.label}</p>
            <p className="stat-value mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Recruiting Spend Summary */}
      <div className="card-flat !p-0 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-gray-100 dark:divide-dark-border">
          {/* Actual Spend */}
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-red-500 dark:text-red-400" />
            </div>
            <div>
              <p className="stat-label !text-[10px]">Actual Spend (Invoiced)</p>
              <p className="text-lg font-extrabold text-red-600 dark:text-red-400 tabular-nums leading-tight">
                {stats.actualSpend > 0 ? fmtCurrency(stats.actualSpend) : '$0'}
              </p>
            </div>
          </div>

          {/* Committed / Projected */}
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            </div>
            <div>
              <p className="stat-label !text-[10px]">Committed / Projected</p>
              <p className="text-lg font-extrabold text-amber-600 dark:text-amber-400 tabular-nums leading-tight">
                {stats.committedSpend > 0 ? fmtCurrency(stats.committedSpend) : '$0'}
              </p>
            </div>
          </div>

          {/* Total Exposure */}
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gray-100 dark:bg-dark-elevated flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="stat-label !text-[10px]">Total Budget Exposure</p>
              <p className={`text-lg font-extrabold tabular-nums leading-tight ${
                stats.totalExposure > 0 ? 'text-odgers-navy dark:text-dark-text' : 'text-gray-400 dark:text-gray-500'
              }`}>
                {stats.totalExposure > 0 ? fmtCurrency(stats.totalExposure) : '$0'}
              </p>
            </div>
          </div>

          {/* Per-Seat Average */}
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-odgers-teal dark:text-teal-400" />
            </div>
            <div>
              <p className="stat-label !text-[10px]">Avg. Cost per Search</p>
              <p className="text-lg font-extrabold text-odgers-teal dark:text-teal-400 tabular-nums leading-tight">
                {seats.length > 0 && stats.totalExposure > 0
                  ? fmtCurrency(Math.round(stats.totalExposure / seats.length))
                  : '$0'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function FilterBar({
  practiceAreas,
  practiceFilter,
  setPracticeFilter,
  priorityFilter,
  setPriorityFilter,
  searchQuery,
  setSearchQuery,
}: {
  practiceAreas: string[];
  practiceFilter: string;
  setPracticeFilter: (v: string) => void;
  priorityFilter: string;
  setPriorityFilter: (v: string) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
}) {
  return (
    <section className="animate-fade-in-up space-y-3">
      {/* Practice pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mr-1">
          Practice
        </span>
        {['all', ...practiceAreas].map((area) => (
          <button
            key={area}
            onClick={() => setPracticeFilter(area)}
            className={`px-3 py-1 rounded-full text-[12px] font-semibold transition-all duration-150 cursor-pointer ${
              practiceFilter === area
                ? 'bg-odgers-teal text-white shadow-sm'
                : 'bg-gray-100 dark:bg-dark-surface-2 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-elevated'
            }`}
          >
            {area === 'all' ? 'All' : area}
          </button>
        ))}
      </div>

      {/* Priority pills + Search */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mr-1">
            Priority
          </span>
          {['all', ...PRIORITY_ORDER].map((prio) => (
            <button
              key={prio}
              onClick={() => setPriorityFilter(prio)}
              className={`px-3 py-1 rounded-full text-[12px] font-semibold transition-all duration-150 cursor-pointer ${
                priorityFilter === prio
                  ? 'bg-odgers-teal text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-dark-surface-2 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-elevated'
              }`}
            >
              {prio === 'all' ? 'All' : prio}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex-1 min-w-[200px] max-w-[360px] ml-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search roles, practices, recruiters..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-100 dark:bg-dark-surface-2 border border-transparent focus:border-odgers-teal focus:ring-2 focus:ring-odgers-teal/20 text-sm text-odgers-navy dark:text-dark-text placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all duration-150"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Shared inline-edit styles
// ---------------------------------------------------------------------------

const fieldInputCls = `w-full text-xs px-2.5 py-1.5 rounded-md border border-gray-200 dark:border-gray-700
  bg-white dark:bg-[#0f1419] text-gray-900 dark:text-gray-100
  placeholder:text-gray-400 dark:placeholder:text-gray-600
  focus:outline-none focus:ring-1 focus:ring-[#00857C] dark:focus:ring-teal-500
  transition-shadow duration-200`;

const fieldLabelCls = 'text-[11px] font-semibold text-gray-400 dark:text-gray-500 mb-0.5 block';

// ---------------------------------------------------------------------------
// Expanded Row Panel — fully editable
// ---------------------------------------------------------------------------

function ExpandedPanel({ seat, onPlaceCandidate }: { seat: Person; onPlaceCandidate: (candidateId: string) => void }) {
  const updatePerson = useOrgStore(s => s.updatePerson);

  const update = useCallback(
    (field: string, value: unknown) => {
      updatePerson(seat.id, { [field]: value } as Partial<Person>);
    },
    [seat.id, updatePerson],
  );

  const practiceOptions = getDynamicPracticeOptions();

  return (
    <div
      className="animate-fade-in-up bg-gray-50/70 dark:bg-dark-surface-2/70 border-t border-gray-100 dark:border-dark-border px-6 py-5"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex flex-col gap-6">
        {/* ---- Seat Details (full width) ---- */}
        <div className="space-y-4">
          {/* Section label */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <Pencil size={11} className="text-gray-400 dark:text-gray-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              Seat Details
            </span>
          </div>

          {/* Row 1: Role Title, Practice, Band */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={fieldLabelCls}>Role Title</label>
              <input
                type="text"
                className={fieldInputCls}
                value={seat.title}
                onChange={e => update('title', e.target.value)}
              />
            </div>
            <div>
              <label className={fieldLabelCls}>Practice</label>
              <select
                className={fieldInputCls}
                value={seat.practiceArea}
                onChange={e => update('practiceArea', e.target.value)}
              >
                {practiceOptions.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={fieldLabelCls}>Band</label>
              <select
                className={fieldInputCls}
                value={seat.band ?? ''}
                onChange={e => update('band', e.target.value)}
              >
                <option value="">--</option>
                {BAND_OPTIONS.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Priority, Recruiting Status, Recruiter Type, Recruiter Name */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className={fieldLabelCls}>Priority</label>
              <select
                className={fieldInputCls}
                value={seat.hiringPriority ?? ''}
                onChange={e => update('hiringPriority', e.target.value || undefined)}
              >
                <option value="">--</option>
                {HIRING_PRIORITY_OPTIONS.map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={fieldLabelCls}>Recruiting Status</label>
              <select
                className={fieldInputCls}
                value={seat.recruitingStatus ?? ''}
                onChange={e => update('recruitingStatus', e.target.value || undefined)}
              >
                <option value="">--</option>
                {RECRUITING_STATUS_OPTIONS.map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={fieldLabelCls}>Recruiter Type</label>
              <select
                className={fieldInputCls}
                value={seat.recruiterType ?? ''}
                onChange={e => update('recruiterType', e.target.value || undefined)}
              >
                <option value="">--</option>
                {RECRUITER_TYPE_OPTIONS.map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={fieldLabelCls}>Recruiter / Firm</label>
              <input
                type="text"
                className={fieldInputCls}
                placeholder="Name or firm"
                value={seat.recruiterName ?? ''}
                onChange={e => update('recruiterName', e.target.value)}
              />
            </div>
          </div>

          {/* Row 3: Target Start, Budget, Fee Structure */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={fieldLabelCls}>Target Start Date</label>
              <input
                type="date"
                className={fieldInputCls}
                value={seat.targetStartDate ?? ''}
                onChange={e => update('targetStartDate', e.target.value || undefined)}
              />
            </div>
            <div>
              <label className={fieldLabelCls}>Budgeted Compensation</label>
              <input
                type="text"
                className={fieldInputCls}
                placeholder="e.g. $200K"
                value={seat.budgetedCompensation ?? ''}
                onChange={e => update('budgetedCompensation', e.target.value)}
              />
            </div>
            <div>
              <label className={fieldLabelCls}>Fee Structure</label>
              <input
                type="text"
                className={fieldInputCls}
                placeholder="e.g. 30% retained"
                value={seat.recruitingFeeStructure ?? ''}
                onChange={e => update('recruitingFeeStructure', e.target.value)}
              />
            </div>
          </div>

          {/* Row 4: Spend (Actual / Committed / Projected) */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={fieldLabelCls}>Actual Spend ($)</label>
              <input
                type="number"
                min="0"
                step="100"
                className={fieldInputCls}
                value={seat.recruitingSpendActual ?? ''}
                onChange={e => update('recruitingSpendActual', e.target.value ? Number(e.target.value) : 0)}
              />
            </div>
            <div>
              <label className={fieldLabelCls}>Committed ($)</label>
              <input
                type="number"
                min="0"
                step="100"
                className={fieldInputCls}
                value={seat.recruitingSpendCommitted ?? ''}
                onChange={e => update('recruitingSpendCommitted', e.target.value ? Number(e.target.value) : 0)}
              />
            </div>
            <div>
              <label className={fieldLabelCls}>Projected ($)</label>
              <input
                type="number"
                min="0"
                step="100"
                className={fieldInputCls}
                value={seat.recruitingSpendProjected ?? ''}
                onChange={e => update('recruitingSpendProjected', e.target.value ? Number(e.target.value) : 0)}
              />
            </div>
          </div>

          {/* Job Spec (editable textarea) */}
          <div>
            <label className={fieldLabelCls}>Job Specification</label>
            <textarea
              rows={4}
              className={`${fieldInputCls} resize-y`}
              placeholder="Describe the role, requirements, and ideal profile..."
              value={seat.jobSpec ?? ''}
              onChange={e => update('jobSpec', e.target.value)}
            />
          </div>

          {/* Recruiting Notes (editable textarea) */}
          <div>
            <label className={fieldLabelCls}>Recruiting Notes</label>
            <textarea
              rows={3}
              className={`${fieldInputCls} resize-y`}
              placeholder="Internal notes on the search..."
              value={seat.recruitingNotes ?? ''}
              onChange={e => update('recruitingNotes', e.target.value)}
            />
          </div>
        </div>

        {/* ---- Candidates (full width) ---- */}
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Candidates ({seat.candidates?.length ?? 0})
          </h4>
          <CandidateTracker
            personId={seat.id}
            candidates={seat.candidates ?? []}
            onPlaceCandidate={onPlaceCandidate}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in-up">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-dark-surface-2 flex items-center justify-center mb-4">
        <Briefcase className="w-8 h-8 text-gray-300 dark:text-gray-600" />
      </div>
      <h3 className="text-lg font-bold text-odgers-navy dark:text-dark-text mb-1">
        No open positions
      </h3>
      <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs">
        No seats match the current filters. Try adjusting your search criteria or clearing filters.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function HiringConsole() {
  const people = useOrgStore((s) => s.people);
  const placeCandidate = useOrgStore((s) => s.placeCandidate);
  const selectPerson = useUIStore((s) => s.selectPerson);

  // Local state
  const [practiceFilter, setPracticeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<RecruitingStatus | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('priority');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showClosed, setShowClosed] = useState(false);

  // Placement confirmation state
  const [placementPending, setPlacementPending] = useState<{ seatId: string; candidateId: string; candidateName: string } | null>(null);

  // All open seats — subscribe to people array so candidates/fields updates trigger re-render
  const allOpenSeats = useMemo(() => people.filter(p => p.status === 'Open Seat'), [people]);
  const allSeats = useMemo(
    () => showClosed ? allOpenSeats : allOpenSeats.filter(s => s.recruitingStatus !== 'Closed'),
    [allOpenSeats, showClosed],
  );

  // Unique practice areas
  const practiceAreas = useMemo(() => {
    const set = new Set<string>();
    for (const seat of allSeats) {
      if (seat.practiceArea) set.add(seat.practiceArea);
    }
    return Array.from(set).sort();
  }, [allSeats]);

  // Filtered seats
  const filteredSeats = useMemo(() => {
    let result = allSeats;

    if (practiceFilter !== 'all') {
      result = result.filter((s) => s.practiceArea === practiceFilter);
    }

    if (priorityFilter !== 'all') {
      result = result.filter(
        (s) => (s.hiringPriority ?? 'Low') === priorityFilter
      );
    }

    if (stageFilter) {
      result = result.filter(
        (s) => (s.recruitingStatus ?? 'Not Started') === stageFilter
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.practiceArea.toLowerCase().includes(q) ||
          (s.recruiterName ?? '').toLowerCase().includes(q) ||
          (s.recruitingNotes ?? '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [allSeats, practiceFilter, priorityFilter, stageFilter, searchQuery]);

  // Sorted seats
  const sortedSeats = useMemo(() => {
    const sorted = [...filteredSeats].sort((a, b) => {
      let cmp = 0;

      switch (sortField) {
        case 'priority': {
          const ai = PRIORITY_ORDER.indexOf((a.hiringPriority ?? 'Low') as HiringPriority);
          const bi = PRIORITY_ORDER.indexOf((b.hiringPriority ?? 'Low') as HiringPriority);
          cmp = ai - bi;
          break;
        }
        case 'role':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'practice':
          cmp = a.practiceArea.localeCompare(b.practiceArea);
          break;
        case 'status': {
          const ai = STATUS_ORDER.indexOf((a.recruitingStatus ?? 'Not Started') as RecruitingStatus);
          const bi = STATUS_ORDER.indexOf((b.recruitingStatus ?? 'Not Started') as RecruitingStatus);
          cmp = ai - bi;
          break;
        }
        case 'recruiter':
          cmp = (a.recruiterName ?? '').localeCompare(b.recruiterName ?? '');
          break;
        case 'candidates':
          cmp = (a.candidates?.length ?? 0) - (b.candidates?.length ?? 0);
          break;
        case 'daysToTarget': {
          const aDays = daysToTarget(a.targetStartDate);
          const bDays = daysToTarget(b.targetStartDate);
          const aVal = aDays ? (aDays.overdue ? -aDays.days : aDays.days) : Infinity;
          const bVal = bDays ? (bDays.overdue ? -bDays.days : bDays.days) : Infinity;
          cmp = aVal - bVal;
          break;
        }
        case 'budget':
          cmp = parseBudget(a.budgetedCompensation) - parseBudget(b.budgetedCompensation);
          break;
        case 'spend': {
          const aSpend = (a.recruitingSpendActual ?? 0) + (a.recruitingSpendCommitted ?? 0);
          const bSpend = (b.recruitingSpendActual ?? 0) + (b.recruitingSpendCommitted ?? 0);
          cmp = aSpend - bSpend;
          break;
        }
      }

      return sortDir === 'desc' ? -cmp : cmp;
    });

    return sorted;
  }, [filteredSeats, sortField, sortDir]);

  // Toggle sort
  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  // Toggle expand
  function handleToggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  // Placement handler — shows confirmation dialog
  function handlePlaceRequest(seatId: string, candidateId: string) {
    const seat = people.find(p => p.id === seatId);
    const candidate = seat?.candidates?.find(c => c.id === candidateId);
    if (!seat || !candidate) return;
    setPlacementPending({ seatId, candidateId, candidateName: candidate.name });
  }

  function confirmPlacement() {
    if (!placementPending) return;
    placeCandidate(placementPending.seatId, placementPending.candidateId);
    setPlacementPending(null);
    setExpandedId(null);
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto px-6 py-6 space-y-6 animate-fade-in">
      {/* Page Header */}
      <header className="animate-fade-in-up">
        <h1 className="text-2xl font-extrabold tracking-tight text-odgers-navy dark:text-dark-text">
          Hiring Console
        </h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Recruiting pipeline, open seats, and candidate tracking
        </p>
      </header>

      {/* 1. KPI Strip */}
      <KPIStrip seats={allSeats} />

      {/* 2. Pipeline Funnel */}
      <PipelineFunnel
        seats={allSeats}
        activeStage={stageFilter}
        onStageClick={setStageFilter}
      />

      {/* 3. Filter Bar */}
      <FilterBar
        practiceAreas={practiceAreas}
        practiceFilter={practiceFilter}
        setPracticeFilter={setPracticeFilter}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Show Closed toggle */}
      <div className="flex items-center gap-2 -mt-2">
        <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showClosed}
            onChange={e => setShowClosed(e.target.checked)}
            className="accent-[#00857C] w-3.5 h-3.5 rounded cursor-pointer"
          />
          <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
            Show closed seats
          </span>
        </label>
        {!showClosed && allOpenSeats.filter(s => s.recruitingStatus === 'Closed').length > 0 && (
          <span className="text-[10px] text-gray-300 dark:text-gray-600">
            ({allOpenSeats.filter(s => s.recruitingStatus === 'Closed').length} hidden)
          </span>
        )}
      </div>

      {/* 4. Open Seats Table */}
      {sortedSeats.length === 0 ? (
        <EmptyState />
      ) : (
        <section className="card overflow-hidden animate-fade-in-up">
          {/* Table Header */}
          <div className="table-header grid grid-cols-[1.3fr_0.8fr_85px_95px_0.9fr_65px_70px_80px_90px_32px] gap-2 items-center">
            <HeaderCell label="Role" field="role" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
            <HeaderCell label="Practice" field="practice" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
            <HeaderCell label="Priority" field="priority" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
            <HeaderCell label="Status" field="status" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
            <HeaderCell label="Recruiter" field="recruiter" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
            <HeaderCell label="Cands." field="candidates" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
            <HeaderCell label="Target" field="daysToTarget" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
            <HeaderCell label="Budget" field="budget" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
            <HeaderCell label="Spend" field="spend" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
            {/* Spacer for chevron */}
            <span />
          </div>

          {/* Table Body */}
          <div className="stagger-children">
            {sortedSeats.map((seat) => {
              const isExpanded = expandedId === seat.id;
              const priority = seat.hiringPriority ?? 'Low';
              const status = seat.recruitingStatus ?? 'Not Started';

              return (
                <div key={seat.id}>
                  <div
                    className={`table-row grid grid-cols-[1.3fr_0.8fr_85px_95px_0.9fr_65px_70px_80px_90px_32px] gap-2 items-center cursor-pointer select-none transition-colors duration-100 ${
                      isExpanded
                        ? 'bg-odgers-teal-light/40 dark:bg-dark-elevated'
                        : ''
                    }`}
                    onClick={() => handleToggleExpand(seat.id)}
                    role="row"
                    aria-expanded={isExpanded}
                  >
                    {/* Role */}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-odgers-navy dark:text-dark-text truncate leading-tight">
                        {seat.title}
                      </p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                        {seat.band}
                      </p>
                    </div>

                    {/* Practice */}
                    <p className="text-[12px] text-gray-600 dark:text-gray-400 truncate">
                      {seat.practiceArea}
                    </p>

                    {/* Priority */}
                    <PriorityBadge priority={priority} />

                    {/* Status */}
                    <StatusBadge status={status} />

                    {/* Recruiter */}
                    <div className="min-w-0">
                      <p className="text-[12px] text-gray-700 dark:text-gray-300 truncate">
                        {seat.recruiterName || '--'}
                      </p>
                      {seat.recruiterType && (
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                          {seat.recruiterType}
                        </p>
                      )}
                    </div>

                    {/* Candidates */}
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                      <span className="text-[12px] font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
                        {seat.candidates?.length ?? 0}
                      </span>
                    </div>

                    {/* Days to Target */}
                    <DaysToTargetDisplay targetStartDate={seat.targetStartDate} />

                    {/* Budget */}
                    <span className="text-[12px] text-gray-600 dark:text-gray-400 truncate tabular-nums">
                      {seat.budgetedCompensation || '--'}
                    </span>

                    {/* Spend */}
                    <div className="min-w-0">
                      {(seat.recruitingSpendActual ?? 0) > 0 || (seat.recruitingSpendCommitted ?? 0) > 0 ? (
                        <>
                          <p className="text-[11px] font-semibold text-red-600 dark:text-red-400 tabular-nums truncate">
                            {fmtCurrency(seat.recruitingSpendActual ?? 0)}
                          </p>
                          {(seat.recruitingSpendCommitted ?? 0) > 0 && (
                            <p className="text-[10px] text-amber-500 dark:text-amber-400 tabular-nums truncate">
                              +{fmtCurrency(seat.recruitingSpendCommitted ?? 0)}
                            </p>
                          )}
                        </>
                      ) : (
                        <span className="text-[12px] text-gray-300 dark:text-gray-600">--</span>
                      )}
                    </div>

                    {/* Chevron */}
                    <div className="flex items-center justify-center">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-odgers-teal dark:text-teal-400 transition-transform duration-200" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform duration-200" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Panel */}
                  {isExpanded && (
                    <ExpandedPanel
                      seat={seat}
                      onPlaceCandidate={(candidateId) => handlePlaceRequest(seat.id, candidateId)}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer summary */}
          <div className="px-4 py-3 border-t border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-surface-2/50 flex items-center justify-between">
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              Showing {sortedSeats.length} of {allOpenSeats.length} open seats
              {!showClosed && allOpenSeats.filter(s => s.recruitingStatus === 'Closed').length > 0 && (
                <span className="ml-1">(excluding closed)</span>
              )}
            </p>
            {stageFilter && (
              <button
                onClick={() => setStageFilter(null)}
                className="text-[11px] font-semibold text-odgers-teal dark:text-teal-400 hover:underline cursor-pointer"
              >
                Clear stage filter
              </button>
            )}
          </div>
        </section>
      )}

      {/* Placement Confirmation Dialog */}
      {placementPending && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 dark:bg-black/60 animate-fade-in">
          <div
            className="bg-white dark:bg-[#1c2333] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700
                        w-full max-w-md mx-4 p-6 animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  Place Candidate
                </h3>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">
                  This action will close the seat and create a new team member
                </p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-dark-surface-2 rounded-xl p-4 mb-4 space-y-1.5">
              <p className="text-xs text-gray-600 dark:text-gray-300">
                <span className="font-semibold">{placementPending.candidateName}</span> will be added as an active team member.
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                The seat's recruiting status will be set to <span className="font-semibold text-gray-600 dark:text-gray-300">Closed</span>.
              </p>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-amber-600 dark:text-amber-400 mb-4">
              <AlertTriangle size={13} className="flex-shrink-0" />
              <span>This action cannot be undone from here.</span>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPlacementPending(null)}
                className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-4 py-2 rounded-lg
                           hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmPlacement}
                className="text-xs font-semibold text-white bg-green-600 dark:bg-green-600
                           hover:bg-green-700 dark:hover:bg-green-500 px-4 py-2 rounded-lg
                           transition-colors duration-200 shadow-sm"
              >
                Place & Close Seat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header Cell (sortable)
// ---------------------------------------------------------------------------

function HeaderCell({
  label,
  field,
  sortField,
  sortDir,
  onSort,
}: {
  label: string;
  field: SortField;
  sortField: SortField;
  sortDir: 'asc' | 'desc';
  onSort: (field: SortField) => void;
}) {
  return (
    <button
      className="flex items-center gap-1 group cursor-pointer hover:text-odgers-teal dark:hover:text-teal-400 transition-colors duration-100 text-left"
      onClick={() => onSort(field)}
    >
      <span>{label}</span>
      <SortIndicator field={field} currentField={sortField} currentDir={sortDir} />
    </button>
  );
}

export default HiringConsole;
