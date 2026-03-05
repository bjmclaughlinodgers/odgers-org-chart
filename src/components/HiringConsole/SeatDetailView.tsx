import { useCallback } from 'react';
import { ArrowLeft, Briefcase, Pencil, Users, DollarSign, Calendar, MapPin } from 'lucide-react';
import { useOrgStore } from '../../stores/orgStore';
import { CandidateTracker } from './CandidateTracker';
import { ErrorBoundary } from '../ErrorBoundary';
import {
  HIRING_PRIORITY_OPTIONS,
  RECRUITING_STATUS_OPTIONS,
  RECRUITER_TYPE_OPTIONS,
  getDynamicPracticeOptions,
  BAND_OPTIONS,
  OFFICE_OPTIONS,
} from '../../constants/editOptions';
import type { Person } from '../../types';

/* =========================================================================
   Shared field styles (same tokens as ExpandedPanel in HiringConsole)
   ========================================================================= */

const fieldInputCls = `w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700
  bg-white dark:bg-[#0f1419] text-gray-900 dark:text-gray-100
  placeholder:text-gray-400 dark:placeholder:text-gray-600
  focus:outline-none focus:ring-2 focus:ring-[#00857C]/30 dark:focus:ring-teal-500/30 focus:border-[#00857C] dark:focus:border-teal-500
  transition-all duration-200`;

const fieldLabelCls = 'text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1 block';

const sectionHeaderCls = 'flex items-center gap-2 mb-3';
const sectionTitleCls = 'text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500';

/* =========================================================================
   Priority / Status badge helpers
   ========================================================================= */

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

/* =========================================================================
   SeatDetailView
   ========================================================================= */

interface SeatDetailViewProps {
  seat: Person;
  onBack: () => void;
  onPlaceCandidate: (candidateId: string) => void;
}

export function SeatDetailView({ seat, onBack, onPlaceCandidate }: SeatDetailViewProps) {
  const updatePerson = useOrgStore(s => s.updatePerson);

  const update = useCallback(
    (field: string, value: unknown) => {
      updatePerson(seat.id, { [field]: value } as Partial<Person>);
    },
    [seat.id, updatePerson],
  );

  const practiceOptions = getDynamicPracticeOptions();
  const priority = seat.hiringPriority ?? 'Low';
  const status = seat.recruitingStatus ?? 'Not Started';

  return (
    <div className="w-full max-w-[1600px] mx-auto px-6 py-6 space-y-6 animate-fade-in">
      {/* ── Sticky Header Bar ── */}
      <header className="flex items-center gap-4 animate-fade-in-up">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 dark:bg-dark-surface-2
                     hover:bg-[#00857C]/10 dark:hover:bg-teal-500/10 transition-colors duration-150 cursor-pointer"
          title="Back to all seats"
        >
          <ArrowLeft size={18} className="text-odgers-navy dark:text-dark-text" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-extrabold tracking-tight text-odgers-navy dark:text-dark-text truncate">
              {seat.title}
            </h1>
            <PriorityBadge priority={priority} />
            <StatusBadge status={status} />
          </div>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
            {seat.practiceArea} &middot; {seat.band}
            {seat.office && <> &middot; {seat.office}</>}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Briefcase size={16} className="text-gray-300 dark:text-gray-600" />
          <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            Open Seat
          </span>
        </div>
      </header>

      {/* ── Section 1: Seat Details ── */}
      <section className="card p-6 space-y-5 animate-fade-in-up">
        <div className={sectionHeaderCls}>
          <Pencil size={13} className="text-gray-400 dark:text-gray-500" />
          <span className={sectionTitleCls}>Seat Details</span>
        </div>

        {/* Row 1: Role Title, Practice, Band, Office */}
        <div className="grid grid-cols-4 gap-4">
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
          <div>
            <label className={fieldLabelCls}>Office</label>
            <select
              className={fieldInputCls}
              value={seat.office ?? ''}
              onChange={e => update('office', e.target.value)}
            >
              <option value="">--</option>
              {OFFICE_OPTIONS.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Priority, Recruiting Status, Recruiter Type, Recruiter Name */}
        <div className="grid grid-cols-4 gap-4">
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

        {/* Row 3: Reports To, Target Start Date, Budget, Fee Structure */}
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className={fieldLabelCls}>Reports To</label>
            <input
              type="text"
              className={`${fieldInputCls} bg-gray-50 dark:bg-gray-800/40`}
              value={seat.reportsTo ?? 'Unassigned'}
              readOnly
              title="Edit via org chart"
            />
          </div>
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
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={fieldLabelCls}>
              <DollarSign size={10} className="inline mr-0.5 -mt-0.5" />
              Actual Spend
            </label>
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
            <label className={fieldLabelCls}>
              <DollarSign size={10} className="inline mr-0.5 -mt-0.5" />
              Committed
            </label>
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
            <label className={fieldLabelCls}>
              <DollarSign size={10} className="inline mr-0.5 -mt-0.5" />
              Projected
            </label>
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

        {/* Job Specification — large textarea */}
        <div>
          <label className={fieldLabelCls}>Job Specification</label>
          <textarea
            rows={6}
            className={`${fieldInputCls} resize-y`}
            placeholder="Describe the role, requirements, and ideal profile..."
            value={seat.jobSpec ?? ''}
            onChange={e => update('jobSpec', e.target.value)}
          />
        </div>

        {/* Recruiting Notes — large textarea */}
        <div>
          <label className={fieldLabelCls}>Recruiting Notes</label>
          <textarea
            rows={6}
            className={`${fieldInputCls} resize-y`}
            placeholder="Internal notes on the search, progress, contacts..."
            value={seat.recruitingNotes ?? ''}
            onChange={e => update('recruitingNotes', e.target.value)}
          />
        </div>
      </section>

      {/* ── Section 2: Candidates ── */}
      <section className="card p-6 animate-fade-in-up">
        <div className={sectionHeaderCls}>
          <Users size={13} className="text-gray-400 dark:text-gray-500" />
          <span className={sectionTitleCls}>
            Candidates ({seat.candidates?.length ?? 0})
          </span>
        </div>

        <ErrorBoundary fallbackLabel="Candidate Tracker">
          <CandidateTracker
            personId={seat.id}
            candidates={seat.candidates ?? []}
            onPlaceCandidate={onPlaceCandidate}
          />
        </ErrorBoundary>
      </section>
    </div>
  );
}

export default SeatDetailView;
