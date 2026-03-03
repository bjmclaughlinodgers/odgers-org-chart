import { useState, useRef, useEffect } from 'react';
import { Star, X, Plus, ChevronDown, Linkedin, Loader2, UserPlus, ExternalLink } from 'lucide-react';
import { useOrgStore } from '../../stores/orgStore';
import { v4 as uuidv4 } from 'uuid';
import { CANDIDATE_STAGE_OPTIONS } from '../../constants/editOptions';
import type { Candidate } from '../../types';
import type { CandidateStage } from '../../types/enums';

/* =========================================================
   Stage badge color mapping
   ========================================================= */
const STAGE_BADGE: Record<CandidateStage, string> = {
  Identified: 'badge-gray',
  Screening: 'badge-teal',
  'First Interview': 'badge-amber',
  'Final Interview': 'badge-amber',
  'Offer Extended': 'badge-green',
  'Offer Accepted': 'badge-green',
  Declined: 'badge-red',
  Withdrawn: 'badge-red',
};

/* =========================================================
   LinkedIn lookup helper
   ========================================================= */
interface LinkedInResult {
  name: string;
  firstName: string;
  lastName: string;
  currentTitle: string;
  currentCompany: string;
  location?: string;
  linkedinUrl: string;
  profilePic?: string;
}

async function lookupLinkedIn(url: string): Promise<LinkedInResult> {
  const res = await fetch('/api/rocketreach-lookup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ linkedinUrl: url }),
  });

  const data = await res.json();

  if (!res.ok) {
    if (res.status === 202 || data.retryable) {
      throw new Error('RETRYABLE: ' + (data.error ?? 'Still processing'));
    }
    throw new Error(data.error ?? `Lookup failed (${res.status})`);
  }

  return data as LinkedInResult;
}

/* =========================================================
   Props
   ========================================================= */
interface CandidateTrackerProps {
  personId: string;
  candidates: Candidate[];
  readonly?: boolean;
}

/* =========================================================
   CandidateTracker
   ========================================================= */
export function CandidateTracker({
  personId,
  candidates,
  readonly = false,
}: CandidateTrackerProps) {
  const addCandidate = useOrgStore(s => s.addCandidate);
  const removeCandidate = useOrgStore(s => s.removeCandidate);
  const updateCandidate = useOrgStore(s => s.updateCandidate);

  /* -------------------------------------------------------
     Local state
     ------------------------------------------------------- */
  type AddMode = null | 'linkedin' | 'manual';
  const [addMode, setAddMode] = useState<AddMode>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);

  // LinkedIn lookup
  const [linkedinInput, setLinkedinInput] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<LinkedInResult | null>(null);

  // Manual / post-lookup form fields
  const [formName, setFormName] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formStage, setFormStage] = useState<CandidateStage>('Identified');
  const [formSource, setFormSource] = useState('');
  const [formLinkedinUrl, setFormLinkedinUrl] = useState('');

  const stageDropdownRef = useRef<HTMLDivElement>(null);
  const linkedinInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  /* -------------------------------------------------------
     Derived
     ------------------------------------------------------- */
  const finalistCount = candidates.filter(c => c.isFinalist).length;

  /* -------------------------------------------------------
     Close stage dropdown on outside click
     ------------------------------------------------------- */
  useEffect(() => {
    if (!editingStageId) return;
    const handler = (e: MouseEvent) => {
      if (stageDropdownRef.current && !stageDropdownRef.current.contains(e.target as Node)) {
        setEditingStageId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [editingStageId]);

  /* -------------------------------------------------------
     Focus inputs when modes open
     ------------------------------------------------------- */
  useEffect(() => {
    if (addMode === 'linkedin' && !lookupResult) {
      requestAnimationFrame(() => linkedinInputRef.current?.focus());
    } else if (addMode === 'manual') {
      requestAnimationFrame(() => nameInputRef.current?.focus());
    }
  }, [addMode, lookupResult]);

  /* -------------------------------------------------------
     Handlers
     ------------------------------------------------------- */
  const resetForm = () => {
    setFormName('');
    setFormCompany('');
    setFormTitle('');
    setFormStage('Identified');
    setFormSource('');
    setFormLinkedinUrl('');
    setLinkedinInput('');
    setLookupResult(null);
    setLookupError(null);
    setLookupLoading(false);
    setAddMode(null);
  };

  const handleLinkedInLookup = async () => {
    const url = linkedinInput.trim();
    if (!url) return;

    if (!url.includes('linkedin.com/in/')) {
      setLookupError('Please paste a LinkedIn profile URL (e.g. linkedin.com/in/...)');
      return;
    }

    setLookupLoading(true);
    setLookupError(null);

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const result = await lookupLinkedIn(url);
        setLookupResult(result);

        // Pre-fill form with lookup data
        setFormName(result.name);
        setFormTitle(result.currentTitle);
        setFormCompany(result.currentCompany);
        setFormLinkedinUrl(result.linkedinUrl || url);
        setFormSource('LinkedIn');
        setFormStage('Identified');

        setLookupLoading(false);
        return;
      } catch (err) {
        const msg = (err as Error).message;
        if (msg.startsWith('RETRYABLE:') && attempts < maxAttempts - 1) {
          attempts++;
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        setLookupError(msg.replace('RETRYABLE: ', ''));
        setLookupLoading(false);
        return;
      }
    }
  };

  const handleAdd = () => {
    if (!formName.trim()) return;
    addCandidate(personId, {
      id: uuidv4(),
      name: formName.trim(),
      currentCompany: formCompany.trim() || undefined,
      currentTitle: formTitle.trim() || undefined,
      stage: formStage,
      source: formSource.trim() || undefined,
      addedDate: new Date().toISOString(),
      isFinalist: false,
      linkedinUrl: formLinkedinUrl.trim() || undefined,
    });
    resetForm();
  };

  const handleRemoveClick = (candidateId: string) => {
    if (confirmRemoveId === candidateId) {
      removeCandidate(personId, candidateId);
      setConfirmRemoveId(null);
    } else {
      setConfirmRemoveId(candidateId);
    }
  };

  const handleStageChange = (candidateId: string, stage: CandidateStage) => {
    updateCandidate(personId, candidateId, { stage });
    setEditingStageId(null);
  };

  const toggleFinalist = (candidateId: string, current: boolean) => {
    updateCandidate(personId, candidateId, { isFinalist: !current });
  };

  /* -------------------------------------------------------
     Input classes (shared)
     ------------------------------------------------------- */
  const inputCls = `text-xs px-2.5 py-1.5 rounded-md border border-gray-200 dark:border-gray-700
                    bg-white dark:bg-[#0f1419] text-gray-900 dark:text-gray-100
                    placeholder:text-gray-400 dark:placeholder:text-gray-600
                    focus:outline-none focus:ring-1 focus:ring-[#00857C] dark:focus:ring-teal-500
                    transition-shadow duration-200`;

  /* -------------------------------------------------------
     Empty state
     ------------------------------------------------------- */
  if (candidates.length === 0 && !addMode) {
    return (
      <div className="py-4 text-center">
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">No candidates yet</p>
        {!readonly && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setAddMode('linkedin')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0A66C2] dark:text-blue-400
                         hover:text-[#084d94] dark:hover:text-blue-300 transition-colors duration-200
                         px-3 py-1.5 rounded-lg border border-[#0A66C2]/20 dark:border-blue-400/20
                         hover:bg-[#0A66C2]/5 dark:hover:bg-blue-400/5"
            >
              <Linkedin size={13} />
              Add via LinkedIn
            </button>
            <button
              onClick={() => setAddMode('manual')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400
                         hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-200
                         px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700
                         hover:bg-gray-50 dark:hover:bg-white/[0.03]"
            >
              <UserPlus size={13} />
              Add Manually
            </button>
          </div>
        )}
      </div>
    );
  }

  /* -------------------------------------------------------
     Render
     ------------------------------------------------------- */
  return (
    <div className="space-y-0">
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
            Candidates ({candidates.length})
          </span>
          {finalistCount > 0 && (
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
              {finalistCount} finalist{finalistCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {!readonly && !addMode && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setAddMode('linkedin')}
              className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#0A66C2] dark:text-blue-400
                         hover:text-[#084d94] dark:hover:text-blue-300 transition-colors duration-200 px-1.5 py-0.5 rounded"
              title="Add via LinkedIn"
            >
              <Linkedin size={11} />
            </button>
            <button
              onClick={() => setAddMode('manual')}
              className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#00857C] dark:text-teal-400
                         hover:text-[#006b63] dark:hover:text-teal-300 transition-colors duration-200"
            >
              <Plus size={12} />
              Add
            </button>
          </div>
        )}
      </div>

      {/* ---- Candidate rows ---- */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
        {candidates.map(candidate => (
          <div
            key={candidate.id}
            className="group/row flex items-center gap-2 py-1.5 px-1 -mx-1 rounded-md
                       hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors duration-200"
            style={{ minHeight: 32 }}
          >
            {/* Finalist star */}
            {!readonly && (
              <button
                onClick={() => toggleFinalist(candidate.id, candidate.isFinalist)}
                className="flex-shrink-0 p-0.5 transition-colors duration-200"
                title={candidate.isFinalist ? 'Remove finalist' : 'Mark as finalist'}
              >
                <Star
                  size={13}
                  className={
                    candidate.isFinalist
                      ? 'text-amber-500 dark:text-amber-400 fill-amber-500 dark:fill-amber-400'
                      : 'text-gray-300 dark:text-gray-600 hover:text-amber-400 dark:hover:text-amber-500'
                  }
                />
              </button>
            )}
            {readonly && candidate.isFinalist && (
              <Star size={13} className="flex-shrink-0 text-amber-500 dark:text-amber-400 fill-amber-500 dark:fill-amber-400" />
            )}

            {/* Name & title */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate leading-tight">
                  {candidate.name}
                </span>
                {candidate.linkedinUrl && (
                  <a
                    href={candidate.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 text-[#0A66C2] dark:text-blue-400 hover:text-[#084d94] dark:hover:text-blue-300
                               transition-colors duration-200"
                    title="View LinkedIn profile"
                    onClick={e => e.stopPropagation()}
                  >
                    <Linkedin size={11} />
                  </a>
                )}
              </div>
              {(candidate.currentTitle || candidate.currentCompany) && (
                <div className="text-[11px] text-gray-400 dark:text-gray-500 truncate leading-tight">
                  {candidate.currentTitle}
                  {candidate.currentTitle && candidate.currentCompany && ' @ '}
                  {candidate.currentCompany}
                </div>
              )}
            </div>

            {/* Source */}
            {candidate.source && (
              <span className="hidden sm:inline flex-shrink-0 text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                {candidate.source}
              </span>
            )}

            {/* Stage badge (with dropdown) */}
            <div className="relative flex-shrink-0" ref={editingStageId === candidate.id ? stageDropdownRef : undefined}>
              <button
                onClick={() => {
                  if (readonly) return;
                  setEditingStageId(editingStageId === candidate.id ? null : candidate.id);
                }}
                disabled={readonly}
                className={`badge ${STAGE_BADGE[candidate.stage]} flex items-center gap-0.5 transition-opacity duration-200
                           ${readonly ? '' : 'cursor-pointer hover:opacity-80'}`}
              >
                <span className="truncate max-w-[80px]">{candidate.stage}</span>
                {!readonly && <ChevronDown size={10} className="flex-shrink-0 opacity-50" />}
              </button>

              {/* Stage dropdown */}
              {editingStageId === candidate.id && (
                <div
                  className="absolute right-0 top-full mt-1 z-50 w-40 py-1
                             bg-white dark:bg-[#1c2333] border border-gray-200 dark:border-gray-700
                             rounded-lg shadow-lg animate-scale-in"
                >
                  {CANDIDATE_STAGE_OPTIONS.map(stage => (
                    <button
                      key={stage}
                      onClick={() => handleStageChange(candidate.id, stage)}
                      className={`w-full text-left text-[11px] px-3 py-1.5 transition-colors duration-150
                                 hover:bg-gray-50 dark:hover:bg-white/[0.05]
                                 ${candidate.stage === stage
                                   ? 'font-semibold text-[#00857C] dark:text-teal-400'
                                   : 'text-gray-700 dark:text-gray-300'
                                 }`}
                    >
                      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${
                        STAGE_BADGE[stage].replace('badge-', 'bg-').replace('gray', 'gray-400')
                          .replace('teal', '[#00857C]').replace('amber', 'amber-500')
                          .replace('green', 'green-500').replace('red', 'red-500')
                      }`} />
                      {stage}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Remove button */}
            {!readonly && (
              <button
                onClick={() => handleRemoveClick(candidate.id)}
                onBlur={() => {
                  if (confirmRemoveId === candidate.id) {
                    setTimeout(() => setConfirmRemoveId(null), 150);
                  }
                }}
                className={`flex-shrink-0 flex items-center gap-0.5 p-0.5 rounded transition-all duration-200
                           ${confirmRemoveId === candidate.id
                             ? 'text-red-600 dark:text-red-400'
                             : 'text-gray-300 dark:text-gray-600 opacity-0 group-hover/row:opacity-100 hover:text-red-500 dark:hover:text-red-400'
                           }`}
                title={confirmRemoveId === candidate.id ? 'Click again to confirm' : 'Remove candidate'}
              >
                {confirmRemoveId === candidate.id ? (
                  <span className="text-[10px] font-semibold whitespace-nowrap">Remove?</span>
                ) : (
                  <X size={13} />
                )}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* ---- LinkedIn Lookup Form ---- */}
      {addMode === 'linkedin' && !lookupResult && (
        <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-700/50 animate-fade-in-up">
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Linkedin size={12} className="text-[#0A66C2] dark:text-blue-400" />
                </div>
                <input
                  ref={linkedinInputRef}
                  type="text"
                  placeholder="Paste LinkedIn profile URL..."
                  value={linkedinInput}
                  onChange={e => { setLinkedinInput(e.target.value); setLookupError(null); }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleLinkedInLookup();
                    if (e.key === 'Escape') resetForm();
                  }}
                  onPaste={e => {
                    // Auto-trigger lookup on paste
                    const pasted = e.clipboardData.getData('text');
                    if (pasted.includes('linkedin.com/in/')) {
                      setLinkedinInput(pasted);
                      // Slight delay so state updates
                      setTimeout(() => {
                        setLookupLoading(true);
                        setLookupError(null);
                        lookupLinkedIn(pasted.trim())
                          .then(result => {
                            setLookupResult(result);
                            setFormName(result.name);
                            setFormTitle(result.currentTitle);
                            setFormCompany(result.currentCompany);
                            setFormLinkedinUrl(result.linkedinUrl || pasted.trim());
                            setFormSource('LinkedIn');
                            setFormStage('Identified');
                            setLookupLoading(false);
                          })
                          .catch(err => {
                            setLookupError((err as Error).message.replace('RETRYABLE: ', ''));
                            setLookupLoading(false);
                          });
                      }, 50);
                      e.preventDefault();
                    }
                  }}
                  className={`w-full ${inputCls} !pl-8`}
                />
              </div>
              <button
                onClick={handleLinkedInLookup}
                disabled={lookupLoading || !linkedinInput.trim()}
                className="flex-shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold text-white
                           bg-[#0A66C2] dark:bg-blue-600 hover:bg-[#084d94] dark:hover:bg-blue-500
                           disabled:opacity-40 disabled:cursor-not-allowed
                           px-3 py-1.5 rounded-md transition-colors duration-200"
              >
                {lookupLoading ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Looking up…
                  </>
                ) : (
                  'Lookup'
                )}
              </button>
            </div>

            {lookupError && (
              <p className="text-[11px] text-red-500 dark:text-red-400">{lookupError}</p>
            )}

            <div className="flex items-center justify-between pt-0.5">
              <button
                onClick={() => { resetForm(); setAddMode('manual'); }}
                className="text-[11px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300
                           transition-colors duration-200"
              >
                or add manually →
              </button>
              <button
                onClick={resetForm}
                className="text-[11px] font-medium text-gray-500 dark:text-gray-400
                           hover:text-gray-700 dark:hover:text-gray-200 px-2.5 py-1 rounded-md
                           hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Post-Lookup Confirmation / Manual Form ---- */}
      {(addMode === 'manual' || lookupResult) && (
        <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-700/50 animate-fade-in-up">
          {lookupResult && (
            <div className="flex items-center gap-2 mb-2 px-2.5 py-1.5 rounded-md
                            bg-[#0A66C2]/5 dark:bg-blue-500/10 border border-[#0A66C2]/10 dark:border-blue-500/20">
              <Linkedin size={13} className="flex-shrink-0 text-[#0A66C2] dark:text-blue-400" />
              <span className="text-[11px] text-[#0A66C2] dark:text-blue-400 font-medium truncate">
                Profile found — review & save
              </span>
              <a
                href={formLinkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 ml-auto text-[#0A66C2]/60 dark:text-blue-400/60 hover:text-[#0A66C2] dark:hover:text-blue-400
                           transition-colors duration-200"
                title="Open LinkedIn profile"
              >
                <ExternalLink size={11} />
              </a>
            </div>
          )}

          <div className="space-y-2">
            <input
              ref={nameInputRef}
              type="text"
              placeholder="Candidate name *"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAdd();
                if (e.key === 'Escape') resetForm();
              }}
              className={`w-full ${inputCls}`}
            />

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Current title"
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAdd();
                  if (e.key === 'Escape') resetForm();
                }}
                className={`flex-1 min-w-0 ${inputCls}`}
              />
              <input
                type="text"
                placeholder="Company"
                value={formCompany}
                onChange={e => setFormCompany(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAdd();
                  if (e.key === 'Escape') resetForm();
                }}
                className={`flex-1 min-w-0 ${inputCls}`}
              />
            </div>

            <div className="flex gap-2">
              <select
                value={formStage}
                onChange={e => setFormStage(e.target.value as CandidateStage)}
                className={`flex-1 min-w-0 ${inputCls}`}
              >
                {CANDIDATE_STAGE_OPTIONS.map(stage => (
                  <option key={stage} value={stage}>{stage}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Source"
                value={formSource}
                onChange={e => setFormSource(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAdd();
                  if (e.key === 'Escape') resetForm();
                }}
                className={`flex-1 min-w-0 ${inputCls}`}
              />
            </div>

            {addMode === 'manual' && (
              <div className="relative">
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Linkedin size={12} className="text-gray-300 dark:text-gray-600" />
                </div>
                <input
                  type="text"
                  placeholder="LinkedIn URL (optional)"
                  value={formLinkedinUrl}
                  onChange={e => setFormLinkedinUrl(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAdd();
                    if (e.key === 'Escape') resetForm();
                  }}
                  className={`w-full ${inputCls} !pl-8`}
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-0.5">
              <button
                onClick={resetForm}
                className="text-[11px] font-medium text-gray-500 dark:text-gray-400
                           hover:text-gray-700 dark:hover:text-gray-200 px-2.5 py-1 rounded-md
                           hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!formName.trim()}
                className="text-[11px] font-semibold text-white bg-[#00857C] dark:bg-teal-600
                           hover:bg-[#006b63] dark:hover:bg-teal-500
                           disabled:opacity-40 disabled:cursor-not-allowed
                           px-3 py-1 rounded-md transition-colors duration-200"
              >
                {lookupResult ? 'Save Candidate' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
