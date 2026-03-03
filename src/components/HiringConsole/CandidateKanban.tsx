import { useState, useRef, useCallback } from 'react';
import { Star, Linkedin, GripVertical, MapPin } from 'lucide-react';
import { useOrgStore } from '../../stores/orgStore';
import { CANDIDATE_STAGE_OPTIONS } from '../../constants/editOptions';
import type { Candidate } from '../../types';
import type { CandidateStage } from '../../types/enums';

/* =========================================================
   Stage column color / accent mapping
   ========================================================= */
const STAGE_COLOR: Record<CandidateStage, { bg: string; border: string; header: string; dot: string }> = {
  Identified: {
    bg: 'bg-gray-50 dark:bg-gray-800/30',
    border: 'border-gray-200 dark:border-gray-700',
    header: 'text-gray-500 dark:text-gray-400',
    dot: 'bg-gray-400',
  },
  Screening: {
    bg: 'bg-teal-50/50 dark:bg-teal-900/10',
    border: 'border-teal-200/60 dark:border-teal-700/40',
    header: 'text-teal-700 dark:text-teal-400',
    dot: 'bg-teal-500',
  },
  'First Interview': {
    bg: 'bg-amber-50/50 dark:bg-amber-900/10',
    border: 'border-amber-200/60 dark:border-amber-700/40',
    header: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  'Final Interview': {
    bg: 'bg-amber-50/50 dark:bg-amber-900/10',
    border: 'border-amber-200/60 dark:border-amber-700/40',
    header: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  'Offer Extended': {
    bg: 'bg-green-50/50 dark:bg-green-900/10',
    border: 'border-green-200/60 dark:border-green-700/40',
    header: 'text-green-700 dark:text-green-400',
    dot: 'bg-green-500',
  },
  'Offer Accepted': {
    bg: 'bg-green-50/50 dark:bg-green-900/10',
    border: 'border-green-200/60 dark:border-green-700/40',
    header: 'text-green-700 dark:text-green-400',
    dot: 'bg-green-500',
  },
  Placed: {
    bg: 'bg-emerald-50/60 dark:bg-emerald-900/15',
    border: 'border-emerald-300/60 dark:border-emerald-700/40',
    header: 'text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-600',
  },
  Declined: {
    bg: 'bg-red-50/50 dark:bg-red-900/10',
    border: 'border-red-200/60 dark:border-red-700/40',
    header: 'text-red-600 dark:text-red-400',
    dot: 'bg-red-500',
  },
  Withdrawn: {
    bg: 'bg-red-50/50 dark:bg-red-900/10',
    border: 'border-red-200/60 dark:border-red-700/40',
    header: 'text-red-600 dark:text-red-400',
    dot: 'bg-red-500',
  },
};

/* =========================================================
   Avatar helper
   ========================================================= */
function KanbanAvatar({ candidate }: { candidate: Candidate }) {
  const initials = candidate.name
    .split(/\s+/)
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();

  if (candidate.profilePic) {
    return (
      <img
        src={candidate.profilePic}
        alt={candidate.name}
        className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-white dark:border-gray-700 shadow-sm"
        onError={e => {
          (e.target as HTMLImageElement).style.display = 'none';
          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
        }}
      />
    );
  }

  return (
    <div className="w-7 h-7 rounded-full flex-shrink-0 bg-gray-200 dark:bg-gray-700 flex items-center justify-center border border-white dark:border-gray-600 shadow-sm">
      <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 leading-none">
        {initials}
      </span>
    </div>
  );
}

/* =========================================================
   Props
   ========================================================= */
interface CandidateKanbanProps {
  personId: string;
  candidates: Candidate[];
  readonly?: boolean;
  onCandidateClick?: (candidate: Candidate) => void;
  onPlaceCandidate?: (candidateId: string) => void;
}

/* =========================================================
   CandidateKanban — Drag-and-drop board by stage
   ========================================================= */
export function CandidateKanban({
  personId,
  candidates,
  readonly = false,
  onCandidateClick,
  onPlaceCandidate,
}: CandidateKanbanProps) {
  const updateCandidate = useOrgStore(s => s.updateCandidate);

  // Drag state
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<CandidateStage | null>(null);
  const dragRef = useRef<string | null>(null);

  // Group candidates by stage
  const grouped = new Map<CandidateStage, Candidate[]>();
  for (const stage of CANDIDATE_STAGE_OPTIONS) {
    grouped.set(stage, []);
  }
  for (const c of candidates) {
    const arr = grouped.get(c.stage);
    if (arr) arr.push(c);
  }

  // Only show stages that have candidates or are the first 4 active stages
  const activeStages = CANDIDATE_STAGE_OPTIONS.filter((stage, idx) => {
    const count = grouped.get(stage)?.length ?? 0;
    return count > 0 || idx < 4; // always show first 4 stages
  });

  // --- Drag handlers ---
  const handleDragStart = useCallback((candidateId: string) => {
    dragRef.current = candidateId;
    setDragId(candidateId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, stage: CandidateStage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(stage);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDropTarget(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, stage: CandidateStage) => {
      e.preventDefault();
      const candidateId = dragRef.current;
      if (candidateId && !readonly) {
        const candidate = candidates.find(c => c.id === candidateId);
        if (candidate && candidate.stage !== stage) {
          // Placed stage triggers placement flow instead of regular update
          if (stage === 'Placed' && onPlaceCandidate) {
            onPlaceCandidate(candidateId);
          } else {
            updateCandidate(personId, candidateId, { stage });
          }
        }
      }
      setDragId(null);
      setDropTarget(null);
      dragRef.current = null;
    },
    [personId, candidates, updateCandidate, readonly, onPlaceCandidate],
  );

  const handleDragEnd = useCallback(() => {
    setDragId(null);
    setDropTarget(null);
    dragRef.current = null;
  }, []);

  return (
    <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-1 px-1">
      {activeStages.map(stage => {
        const stageCandidates = grouped.get(stage) ?? [];
        const colors = STAGE_COLOR[stage];
        const isDropHere = dropTarget === stage;

        return (
          <div
            key={stage}
            className={`flex-shrink-0 w-[210px] rounded-xl border transition-all duration-200 ${colors.bg} ${colors.border} ${
              isDropHere ? 'ring-2 ring-[#00857C] dark:ring-teal-500 scale-[1.01]' : ''
            }`}
            onDragOver={e => handleDragOver(e, stage)}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, stage)}
          >
            {/* Column header */}
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                <span className={`text-[10px] font-bold uppercase tracking-wider ${colors.header} truncate`}>
                  {stage}
                </span>
                <span className="ml-auto text-[10px] font-semibold text-gray-400 dark:text-gray-500 tabular-nums">
                  {stageCandidates.length}
                </span>
              </div>
            </div>

            {/* Cards */}
            <div className="p-1.5 space-y-1.5 min-h-[60px]">
              {stageCandidates.length === 0 && (
                <div className="text-center py-3">
                  <p className="text-[10px] text-gray-300 dark:text-gray-600 italic">
                    {isDropHere ? 'Drop here' : 'None'}
                  </p>
                </div>
              )}
              {stageCandidates.map(candidate => (
                <div
                  key={candidate.id}
                  draggable={!readonly}
                  onDragStart={() => handleDragStart(candidate.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onCandidateClick?.(candidate)}
                  className={`group/card rounded-lg bg-white dark:bg-[#141a24] border border-gray-100 dark:border-gray-700/50
                    px-2.5 py-2 cursor-grab active:cursor-grabbing shadow-sm
                    hover:shadow-md hover:border-gray-200 dark:hover:border-gray-600
                    transition-all duration-200 ${
                      dragId === candidate.id ? 'opacity-30 scale-95' : ''
                    }`}
                >
                  {/* Top row: drag handle + avatar + name/info + linkedin */}
                  <div className="flex items-start gap-1.5">
                    {!readonly && (
                      <GripVertical
                        size={12}
                        className="flex-shrink-0 mt-1 text-gray-300 dark:text-gray-600
                          opacity-0 group-hover/card:opacity-100 transition-opacity duration-200"
                      />
                    )}

                    {/* Avatar */}
                    <KanbanAvatar candidate={candidate} />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-semibold text-gray-800 dark:text-gray-100 truncate leading-tight">
                          {candidate.name}
                        </span>
                        {candidate.isFinalist && (
                          <Star
                            size={10}
                            className="flex-shrink-0 text-amber-500 fill-amber-500"
                          />
                        )}
                      </div>
                      {(candidate.currentTitle || candidate.currentCompany) && (
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate leading-tight mt-0.5">
                          {candidate.currentTitle}
                          {candidate.currentTitle && candidate.currentCompany && ' · '}
                          {candidate.currentCompany}
                        </p>
                      )}
                    </div>
                    {candidate.linkedinUrl && (
                      <a
                        href={candidate.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 text-[#0A66C2] dark:text-blue-400 hover:text-[#084d94] opacity-60 hover:opacity-100
                          transition-opacity duration-200"
                        title="LinkedIn"
                        onClick={e => e.stopPropagation()}
                      >
                        <Linkedin size={10} />
                      </a>
                    )}
                  </div>

                  {/* Location */}
                  {candidate.location && (
                    <div className="flex items-center gap-0.5 mt-1 ml-[calc(12px+0.375rem+28px+0.375rem)]">
                      <MapPin size={8} className="flex-shrink-0 text-gray-400 dark:text-gray-500" />
                      <p className="text-[9px] text-gray-400 dark:text-gray-500 truncate">
                        {candidate.location}
                      </p>
                    </div>
                  )}

                  {/* Notes preview */}
                  {candidate.notes && (
                    <p className="text-[9px] text-gray-400 dark:text-gray-500 italic mt-1 truncate ml-[calc(12px+0.375rem+28px+0.375rem)]">
                      {candidate.notes.length > 50 ? candidate.notes.slice(0, 50) + '…' : candidate.notes}
                    </p>
                  )}

                  {/* Source */}
                  {candidate.source && !candidate.location && !candidate.notes && (
                    <p className="text-[9px] text-gray-400 dark:text-gray-600 mt-1 truncate">
                      via {candidate.source}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
