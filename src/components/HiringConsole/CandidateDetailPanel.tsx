import { useState, useRef, useEffect } from 'react';
import { X, Linkedin, Star, MapPin, Calendar, ExternalLink, CheckCircle2, Building2, Briefcase, Clock } from 'lucide-react';
import { useOrgStore } from '../../stores/orgStore';
import { CANDIDATE_STAGE_OPTIONS } from '../../constants/editOptions';
import type { Candidate } from '../../types';
import type { CandidateStage } from '../../types/enums';

/* =========================================================
   Avatar (larger version for detail panel)
   ========================================================= */
function DetailAvatar({ candidate }: { candidate: Candidate }) {
  const [imgError, setImgError] = useState(false);
  const initials = (candidate.name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0] ?? '')
    .join('')
    .toUpperCase() || '?';

  if (candidate.profilePic && !imgError) {
    return (
      <img
        src={candidate.profilePic}
        alt={candidate.name}
        className="w-16 h-16 rounded-2xl object-cover border-2 border-white dark:border-gray-700 shadow-md"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className="w-16 h-16 rounded-2xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center border-2 border-white dark:border-gray-700 shadow-md">
      <span className="text-lg font-bold text-gray-500 dark:text-gray-400 leading-none">
        {initials}
      </span>
    </div>
  );
}

/* =========================================================
   Stage badge color map
   ========================================================= */
const STAGE_BADGE: Record<CandidateStage, string> = {
  Identified: 'badge-gray',
  Screening: 'badge-teal',
  'First Interview': 'badge-amber',
  'Final Interview': 'badge-amber',
  'Offer Extended': 'badge-green',
  'Offer Accepted': 'badge-green',
  Placed: 'badge-green',
  Declined: 'badge-red',
  Withdrawn: 'badge-red',
};

/* =========================================================
   Props
   ========================================================= */
interface CandidateDetailPanelProps {
  candidate: Candidate;
  personId: string;
  onClose: () => void;
  onPlaceCandidate?: (candidateId: string) => void;
}

/* =========================================================
   Field input / label styles
   ========================================================= */
const fieldInputCls = `w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700
  bg-white dark:bg-[#0f1419] text-gray-900 dark:text-gray-100
  placeholder:text-gray-400 dark:placeholder:text-gray-600
  focus:outline-none focus:ring-2 focus:ring-[#00857C]/30 dark:focus:ring-teal-500/30 focus:border-[#00857C] dark:focus:border-teal-500
  transition-all duration-200`;

const fieldLabelCls = 'text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1 block';

/* =========================================================
   CandidateDetailPanel — slide-over from right
   ========================================================= */
export function CandidateDetailPanel({
  candidate,
  personId,
  onClose,
  onPlaceCandidate,
}: CandidateDetailPanelProps) {
  const updateCandidate = useOrgStore(s => s.updateCandidate);

  // Local state for editable fields
  const [notes, setNotes] = useState(candidate.notes ?? '');
  const [source, setSource] = useState(candidate.source ?? '');
  const [currentTitle, setCurrentTitle] = useState(candidate.currentTitle ?? '');
  const [currentCompany, setCurrentCompany] = useState(candidate.currentCompany ?? '');
  const [availableFrom, setAvailableFrom] = useState(candidate.availableFrom ?? '');
  const [payoutDate, setPayoutDate] = useState(candidate.payoutDate ?? '');
  const [timelineNote, setTimelineNote] = useState(candidate.timelineNote ?? '');
  const panelRef = useRef<HTMLDivElement>(null);

  // Save helpers
  const saveNotes = () => {
    const trimmed = notes.trim();
    if (trimmed !== (candidate.notes ?? '')) {
      updateCandidate(personId, candidate.id, { notes: trimmed || undefined });
    }
  };
  const saveSource = () => {
    const trimmed = source.trim();
    if (trimmed !== (candidate.source ?? '')) {
      updateCandidate(personId, candidate.id, { source: trimmed || undefined });
    }
  };
  const saveTitle = () => {
    const trimmed = currentTitle.trim();
    if (trimmed !== (candidate.currentTitle ?? '')) {
      updateCandidate(personId, candidate.id, { currentTitle: trimmed || undefined });
    }
  };
  const saveCompany = () => {
    const trimmed = currentCompany.trim();
    if (trimmed !== (candidate.currentCompany ?? '')) {
      updateCandidate(personId, candidate.id, { currentCompany: trimmed || undefined });
    }
  };
  const saveAvailableFrom = () => {
    if (availableFrom !== (candidate.availableFrom ?? '')) {
      updateCandidate(personId, candidate.id, { availableFrom: availableFrom || undefined });
    }
  };
  const savePayoutDate = () => {
    if (payoutDate !== (candidate.payoutDate ?? '')) {
      updateCandidate(personId, candidate.id, { payoutDate: payoutDate || undefined });
    }
  };
  const saveTimelineNote = () => {
    const trimmed = timelineNote.trim();
    if (trimmed !== (candidate.timelineNote ?? '')) {
      updateCandidate(personId, candidate.id, { timelineNote: trimmed || undefined });
    }
  };

  // Sync local state when candidate changes (e.g., via realtime)
  useEffect(() => {
    setNotes(candidate.notes ?? '');
    setSource(candidate.source ?? '');
    setCurrentTitle(candidate.currentTitle ?? '');
    setCurrentCompany(candidate.currentCompany ?? '');
    setAvailableFrom(candidate.availableFrom ?? '');
    setPayoutDate(candidate.payoutDate ?? '');
    setTimelineNote(candidate.timelineNote ?? '');
  }, [candidate.notes, candidate.source, candidate.currentTitle, candidate.currentCompany,
      candidate.availableFrom, candidate.payoutDate, candidate.timelineNote]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleStageChange = (stage: CandidateStage) => {
    if (stage === 'Placed' && onPlaceCandidate) {
      onPlaceCandidate(candidate.id);
      return;
    }
    updateCandidate(personId, candidate.id, { stage });
  };

  const toggleFinalist = () => {
    updateCandidate(personId, candidate.id, { isFinalist: !candidate.isFinalist });
  };

  const addedDate = candidate.addedDate
    ? new Date(candidate.addedDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const canPlace = onPlaceCandidate && (candidate.stage === 'Offer Accepted' || candidate.stage === 'Offer Extended');

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[90] bg-black/30 dark:bg-black/50 animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 bottom-0 z-[95] w-[420px] max-w-[90vw]
                   bg-white dark:bg-[#141a24] border-l border-gray-200 dark:border-gray-700
                   shadow-2xl flex flex-col
                   animate-slide-in-right"
        style={{ animation: 'slideInRight 0.25s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-start gap-4 px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700/50">
          <DetailAvatar candidate={candidate} />

          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-odgers-navy dark:text-dark-text truncate">
                {candidate.name}
              </h2>
              <button
                onClick={toggleFinalist}
                className="flex-shrink-0 p-0.5 transition-colors duration-200"
                title={candidate.isFinalist ? 'Remove finalist' : 'Mark as finalist'}
              >
                <Star
                  size={16}
                  className={
                    candidate.isFinalist
                      ? 'text-amber-500 fill-amber-500'
                      : 'text-gray-300 dark:text-gray-600 hover:text-amber-400'
                  }
                />
              </button>
            </div>
            {(candidate.currentTitle || candidate.currentCompany) && (
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                {candidate.currentTitle}
                {candidate.currentTitle && candidate.currentCompany && ' at '}
                {candidate.currentCompany}
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 dark:text-gray-500
                       hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors duration-200"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Quick info row */}
          <div className="flex flex-wrap items-center gap-3">
            {candidate.location && (
              <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                <MapPin size={13} className="flex-shrink-0" />
                <span>{candidate.location}</span>
              </div>
            )}
            {addedDate && (
              <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                <Calendar size={13} className="flex-shrink-0" />
                <span>Added {addedDate}</span>
              </div>
            )}
          </div>

          {/* LinkedIn Link */}
          {candidate.linkedinUrl && (
            <a
              href={candidate.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                         bg-[#0A66C2]/5 dark:bg-blue-500/10 border border-[#0A66C2]/15 dark:border-blue-500/20
                         text-[#0A66C2] dark:text-blue-400 hover:bg-[#0A66C2]/10 dark:hover:bg-blue-500/15
                         transition-colors duration-200 group"
            >
              <Linkedin size={16} />
              <span className="text-sm font-medium truncate flex-1">View LinkedIn Profile</span>
              <ExternalLink size={13} className="flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
            </a>
          )}

          {/* Stage */}
          <div>
            <label className={fieldLabelCls}>Stage</label>
            <select
              value={candidate.stage}
              onChange={e => handleStageChange(e.target.value as CandidateStage)}
              className={fieldInputCls}
            >
              {CANDIDATE_STAGE_OPTIONS.map(stage => (
                <option key={stage} value={stage}>{stage}</option>
              ))}
            </select>
          </div>

          {/* Current Info — editable */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={fieldLabelCls}>
                <Briefcase size={10} className="inline mr-0.5 -mt-0.5" />
                Title
              </label>
              <input
                type="text"
                className={fieldInputCls}
                placeholder="Current title..."
                value={currentTitle}
                onChange={e => setCurrentTitle(e.target.value)}
                onBlur={saveTitle}
              />
            </div>
            <div>
              <label className={fieldLabelCls}>
                <Building2 size={10} className="inline mr-0.5 -mt-0.5" />
                Company
              </label>
              <input
                type="text"
                className={fieldInputCls}
                placeholder="Current company..."
                value={currentCompany}
                onChange={e => setCurrentCompany(e.target.value)}
                onBlur={saveCompany}
              />
            </div>
          </div>

          {/* Source */}
          <div>
            <label className={fieldLabelCls}>Source</label>
            <input
              type="text"
              className={fieldInputCls}
              placeholder="e.g. LinkedIn, Referral, Agency..."
              value={source}
              onChange={e => setSource(e.target.value)}
              onBlur={saveSource}
            />
          </div>

          {/* Notes */}
          <div>
            <label className={fieldLabelCls}>Notes</label>
            <textarea
              rows={8}
              className={`${fieldInputCls} resize-y`}
              placeholder="Add detailed notes about this candidate..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={saveNotes}
            />
          </div>

          {/* Timeline */}
          <div className="border-t border-gray-100 dark:border-gray-700/50 pt-4 space-y-3">
            <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              <Clock size={11} />
              Timeline
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={fieldLabelCls}>Available From</label>
                <input
                  type="date"
                  className={fieldInputCls}
                  value={availableFrom}
                  onChange={e => setAvailableFrom(e.target.value)}
                  onBlur={saveAvailableFrom}
                  title="Earliest start date"
                />
              </div>
              <div>
                <label className={fieldLabelCls}>Payout / Cliff Date</label>
                <input
                  type="date"
                  className={fieldInputCls}
                  value={payoutDate}
                  onChange={e => setPayoutDate(e.target.value)}
                  onBlur={savePayoutDate}
                  title="Bonus payout or equity cliff date before they can move"
                />
              </div>
            </div>
            <div>
              <label className={fieldLabelCls}>Timeline Note</label>
              <input
                type="text"
                className={fieldInputCls}
                placeholder="e.g. Waiting on equity vest, est. March 2027..."
                value={timelineNote}
                onChange={e => setTimelineNote(e.target.value)}
                onBlur={saveTimelineNote}
              />
            </div>
          </div>

          {/* Place Button */}
          {canPlace && (
            <button
              onClick={() => onPlaceCandidate!(candidate.id)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl
                         bg-green-600 dark:bg-green-600 text-white font-semibold text-sm
                         hover:bg-green-700 dark:hover:bg-green-500 transition-colors duration-200 shadow-sm"
            >
              <CheckCircle2 size={16} />
              Place Candidate & Close Seat
            </button>
          )}
        </div>
      </div>

      {/* Slide animation keyframes */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}

export default CandidateDetailPanel;
