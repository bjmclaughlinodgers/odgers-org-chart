import { useState, useCallback, useMemo } from 'react';
import {
  X, Mail, Loader2, CheckCircle2, AlertCircle, UserPlus, RefreshCw,
  Linkedin, MapPin, Building2, ChevronDown, ChevronRight, AlertTriangle,
  Plus, ArrowRightLeft,
} from 'lucide-react';
import { useOrgStore } from '../../stores/orgStore';
import { getDynamicPracticeOptions, BAND_OPTIONS } from '../../constants/editOptions';
import { PracticeSelect } from '../shared/PracticeSelect';
import { v4 as uuidv4 } from 'uuid';
import type { Person, Candidate } from '../../types';

/* =========================================================
   Types for the parse response
   ========================================================= */
interface ParsedCandidate {
  name: string;
  linkedinUrl: string | null;
  currentTitle: string | null;
  currentCompany: string | null;
  location: string | null;
  notes: string | null;
  existingCandidateId: string | null;
  action: 'create' | 'update';
}

interface ParseResult {
  matchedSeatId: string | null;
  seatTitle: string | null;
  confidence: 'high' | 'medium' | 'low';
  newSeat: {
    title: string;
    practiceArea: string;
    band: string;
  } | null;
  candidates: ParsedCandidate[];
  summary: string;
}

/* =========================================================
   Per-candidate assignment state — extends ParsedCandidate
   with a user-chosen seat assignment
   ========================================================= */
interface CandidateAssignment extends ParsedCandidate {
  /** null = unassigned, '__new__' = create new seat, otherwise a seat person id */
  assignedSeatId: string | null;
  /** Duplicate info — if this candidate exists elsewhere */
  duplicateInfo: {
    seatId: string;
    seatTitle: string;
    candidateId: string;
    candidateName: string;
  } | null;
}

/* =========================================================
   New seat creation state
   ========================================================= */
interface NewSeatForm {
  title: string;
  practiceArea: string;
  band: string;
}

/* =========================================================
   Props
   ========================================================= */
interface EmailIngestPanelProps {
  onClose: () => void;
}

/* =========================================================
   Confidence badge
   ========================================================= */
function ConfidenceBadge({ level }: { level: 'high' | 'medium' | 'low' }) {
  const map = {
    high: 'badge-green',
    medium: 'badge-amber',
    low: 'badge-red',
  };
  return (
    <span className={`badge ${map[level]}`}>
      {level} confidence
    </span>
  );
}

/* =========================================================
   Duplicate warning badge
   ========================================================= */
function DuplicateWarning({ info }: { info: CandidateAssignment['duplicateInfo'] }) {
  if (!info) return null;
  return (
    <div className="flex items-center gap-1.5 mt-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/15
                    border border-amber-200/60 dark:border-amber-700/40">
      <AlertTriangle size={12} className="text-amber-500 dark:text-amber-400 flex-shrink-0" />
      <span className="text-[11px] text-amber-700 dark:text-amber-300">
        Already exists in <span className="font-semibold">{info.seatTitle}</span> — will update instead of creating duplicate
      </span>
    </div>
  );
}

/* =========================================================
   EmailIngestPanel — modal dialog for paste-and-parse
   ========================================================= */
export function EmailIngestPanel({ onClose }: EmailIngestPanelProps) {
  const people = useOrgStore(s => s.people);
  const addCandidate = useOrgStore(s => s.addCandidate);
  const updateCandidate = useOrgStore(s => s.updateCandidate);
  const addPerson = useOrgStore(s => s.addPerson);

  // State
  const [emailText, setEmailText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [assignments, setAssignments] = useState<CandidateAssignment[]>([]);
  const [applied, setApplied] = useState(false);
  const [applySummary, setApplySummary] = useState<string | null>(null);
  const [showRawEmail, setShowRawEmail] = useState(false);
  const [showNewSeatForm, setShowNewSeatForm] = useState(false);
  const [newSeatForm, setNewSeatForm] = useState<NewSeatForm>({
    title: '',
    practiceArea: getDynamicPracticeOptions()[0] ?? 'Central',
    band: 'Revenue Producer',
  });

  // Gather open seats for the API call
  const openSeats = useMemo(
    () => people.filter(p => p.status === 'Open Seat' && p.recruitingStatus !== 'Closed'),
    [people],
  );

  // Build a lookup of ALL candidates across ALL seats for de-duplication
  const allCandidatesMap = useMemo(() => {
    const map: { byLinkedin: Map<string, { seatId: string; seatTitle: string; candidateId: string; candidateName: string }>; byNameLower: Map<string, { seatId: string; seatTitle: string; candidateId: string; candidateName: string }> } = {
      byLinkedin: new Map(),
      byNameLower: new Map(),
    };
    for (const person of people) {
      if (person.status !== 'Open Seat') continue;
      for (const c of person.candidates ?? []) {
        if (c.linkedinUrl) {
          // Normalize LinkedIn URL for comparison
          const normalized = c.linkedinUrl.replace(/\/$/, '').toLowerCase();
          map.byLinkedin.set(normalized, { seatId: person.id, seatTitle: person.title, candidateId: c.id, candidateName: c.name });
        }
        map.byNameLower.set(c.name.toLowerCase().trim(), { seatId: person.id, seatTitle: person.title, candidateId: c.id, candidateName: c.name });
      }
    }
    return map;
  }, [people]);

  /* -------------------------------------------------------
     De-dup check for a single candidate
     ------------------------------------------------------- */
  const findDuplicate = useCallback((candidate: ParsedCandidate): CandidateAssignment['duplicateInfo'] => {
    // 1. Check by LinkedIn URL (most reliable)
    if (candidate.linkedinUrl) {
      const normalized = candidate.linkedinUrl.replace(/\/$/, '').toLowerCase();
      const match = allCandidatesMap.byLinkedin.get(normalized);
      if (match) return match;
    }
    // 2. Check by exact name match (case-insensitive)
    const nameMatch = allCandidatesMap.byNameLower.get(candidate.name.toLowerCase().trim());
    if (nameMatch) return nameMatch;

    return null;
  }, [allCandidatesMap]);

  /* -------------------------------------------------------
     Parse handler
     ------------------------------------------------------- */
  const handleParse = useCallback(async () => {
    if (!emailText.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setAssignments([]);
    setApplied(false);
    setApplySummary(null);

    try {
      const seatsSummary = openSeats.map(s => ({
        id: s.id,
        title: s.title,
        practiceArea: s.practiceArea,
        band: s.band,
        candidates: (s.candidates ?? []).map(c => ({
          id: c.id,
          name: c.name,
          linkedinUrl: c.linkedinUrl,
        })),
      }));

      const res = await fetch('/api/email-ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailText: emailText.trim(), openSeats: seatsSummary }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || `Request failed (${res.status})`);
        return;
      }

      const parsed = data as ParseResult;
      setResult(parsed);

      // Build per-candidate assignments with de-dup check
      const candidateAssignments: CandidateAssignment[] = parsed.candidates.map(c => {
        const dup = findDuplicate(c);
        return {
          ...c,
          // If AI matched a seat globally, pre-assign it to each candidate
          assignedSeatId: parsed.matchedSeatId,
          // If duplicate found, override action to 'update' and record the info
          duplicateInfo: dup,
          action: dup ? 'update' : c.action,
          existingCandidateId: dup ? dup.candidateId : c.existingCandidateId,
        };
      });
      setAssignments(candidateAssignments);
    } catch (err) {
      console.error('[Email Ingest] Parse error:', err);
      setError('Failed to connect to the parsing service. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [emailText, openSeats, findDuplicate]);

  /* -------------------------------------------------------
     Update assignment for a specific candidate
     ------------------------------------------------------- */
  const updateAssignment = (idx: number, seatId: string | null) => {
    setAssignments(prev => prev.map((a, i) =>
      i === idx ? { ...a, assignedSeatId: seatId } : a
    ));
  };

  /* -------------------------------------------------------
     Create new seat from the inline form
     ------------------------------------------------------- */
  const handleCreateNewSeat = () => {
    if (!newSeatForm.title.trim()) return;

    const newId = uuidv4();
    const newPerson: Person = {
      id: newId,
      firstName: 'Open',
      lastName: 'Seat',
      title: newSeatForm.title.trim(),
      band: newSeatForm.band as Person['band'],
      practiceArea: newSeatForm.practiceArea,
      subPracticeSpecialties: [],
      office: 'New York',
      employmentType: 'Full-Time',
      status: 'Open Seat',
      reportsTo: null,
      supportLines: [],
      practiceAreaLead: false,
      performanceRating: 'Performer',
      retentionRisk: 'Low',
      performanceNotes: '',
      retentionNotes: '',
      lastReviewDate: null,
      isRevenueProducer: newSeatForm.band === 'Revenue Producer' || newSeatForm.band === 'Senior Leadership',
      currentYearOCE: null,
      priorYearOCE: null,
      revenueTarget: null,
      pipelineValue: null,
      startDate: new Date().toISOString().split('T')[0],
      lastPayIncreaseDate: null,
      lastPayIncreasePercent: null,
      birthday: null,
      compensationType: 'Base + Bonus',
      baseSalary: null,
      totalOTE: null,
      employeeFileLink: null,
      skillsTags: [],
      needsTags: [],
      supportRequirements: null,
      adminNotes: '',
      recruitingStatus: 'Sourcing',
      hiringPriority: 'Medium',
      candidates: [],
      lastUpdated: new Date().toISOString(),
    };

    addPerson(newPerson);
    setShowNewSeatForm(false);
    setNewSeatForm({
      title: '',
      practiceArea: getDynamicPracticeOptions()[0] ?? 'Central',
      band: 'Revenue Producer',
    });

    // Auto-assign all currently unassigned candidates to this new seat
    setAssignments(prev => prev.map(a =>
      a.assignedSeatId === '__new__' || a.assignedSeatId === null
        ? { ...a, assignedSeatId: newId }
        : a
    ));
  };

  /* -------------------------------------------------------
     Apply handler — creates/updates candidates per-assignment
     ------------------------------------------------------- */
  const handleApply = useCallback(() => {
    if (assignments.length === 0) return;

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const assignment of assignments) {
      const seatId = assignment.assignedSeatId;

      // Skip candidates with no seat assigned
      if (!seatId || seatId === '__new__') {
        skipped++;
        continue;
      }

      // Verify the seat exists
      const seat = people.find(p => p.id === seatId);
      if (!seat) {
        skipped++;
        continue;
      }

      if (assignment.duplicateInfo) {
        // This is a duplicate — update the existing candidate in the seat it already belongs to
        const existingSeatId = assignment.duplicateInfo.seatId;
        const existingCandidateId = assignment.duplicateInfo.candidateId;
        const updates: Partial<Candidate> = {};
        if (assignment.notes) updates.notes = assignment.notes;
        if (assignment.currentTitle) updates.currentTitle = assignment.currentTitle;
        if (assignment.currentCompany) updates.currentCompany = assignment.currentCompany;
        if (assignment.location) updates.location = assignment.location;
        if (assignment.linkedinUrl) updates.linkedinUrl = assignment.linkedinUrl;

        if (Object.keys(updates).length > 0) {
          updateCandidate(existingSeatId, existingCandidateId, updates);
          updated++;
        } else {
          skipped++;
        }
      } else if (assignment.action === 'create') {
        const newCandidate: Candidate = {
          id: uuidv4(),
          name: assignment.name,
          currentTitle: assignment.currentTitle ?? undefined,
          currentCompany: assignment.currentCompany ?? undefined,
          location: assignment.location ?? undefined,
          linkedinUrl: assignment.linkedinUrl ?? undefined,
          notes: assignment.notes ?? undefined,
          stage: 'Identified',
          source: 'Email Ingest',
          addedDate: new Date().toISOString(),
          isFinalist: false,
        };
        addCandidate(seatId, newCandidate);
        created++;
      } else if (assignment.action === 'update' && assignment.existingCandidateId) {
        const updates: Partial<Candidate> = {};
        if (assignment.notes) updates.notes = assignment.notes;
        if (assignment.currentTitle) updates.currentTitle = assignment.currentTitle;
        if (assignment.currentCompany) updates.currentCompany = assignment.currentCompany;
        if (assignment.location) updates.location = assignment.location;
        if (assignment.linkedinUrl) updates.linkedinUrl = assignment.linkedinUrl;

        if (Object.keys(updates).length > 0) {
          updateCandidate(seatId, assignment.existingCandidateId, updates);
          updated++;
        }
      }
    }

    setApplied(true);
    const parts: string[] = [];
    if (created > 0) parts.push(`added ${created} new candidate${created !== 1 ? 's' : ''}`);
    if (updated > 0) parts.push(`updated ${updated} existing`);
    if (skipped > 0) parts.push(`skipped ${skipped} (no seat assigned)`);
    setApplySummary(parts.length > 0 ? parts.join(', ') + '.' : 'No changes made.');
  }, [assignments, people, addCandidate, updateCandidate]);

  /* -------------------------------------------------------
     Reset
     ------------------------------------------------------- */
  const handleReset = () => {
    setEmailText('');
    setResult(null);
    setAssignments([]);
    setError(null);
    setApplied(false);
    setApplySummary(null);
    setShowNewSeatForm(false);
  };

  /* -------------------------------------------------------
     Derived: all candidates assigned?
     ------------------------------------------------------- */
  const allAssigned = assignments.length > 0 && assignments.every(a =>
    a.assignedSeatId && a.assignedSeatId !== '__new__'
  );
  const anyAssigned = assignments.some(a =>
    a.assignedSeatId && a.assignedSeatId !== '__new__'
  );

  /* -------------------------------------------------------
     Field styles
     ------------------------------------------------------- */
  const fieldInputCls = `w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700
    bg-white dark:bg-[#0f1419] text-gray-900 dark:text-gray-100
    placeholder:text-gray-400 dark:placeholder:text-gray-600
    focus:outline-none focus:ring-2 focus:ring-[#00857C]/30 dark:focus:ring-teal-500/30 focus:border-[#00857C] dark:focus:border-teal-500
    transition-all duration-200`;

  const fieldLabelCls = 'text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1 block';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[90] bg-black/40 dark:bg-black/60 animate-fade-in"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className="fixed inset-0 z-[95] flex items-center justify-center p-4"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          className="bg-white dark:bg-[#141a24] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700
                      w-full max-w-3xl max-h-[90vh] flex flex-col animate-scale-in"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700/50">
            <div className="w-10 h-10 rounded-xl bg-[#00857C]/10 dark:bg-teal-500/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-[#00857C] dark:text-teal-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-bold text-odgers-navy dark:text-dark-text">
                Email Ingest
              </h2>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                Paste email text to extract candidates and update your pipeline
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500
                         hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors duration-200"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

            {/* Success state */}
            {applied && applySummary && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-900/15 border border-green-200/60 dark:border-green-700/40">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                    Changes Applied
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                    {applySummary}
                  </p>
                </div>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1 text-xs font-semibold text-green-700 dark:text-green-400
                             hover:underline transition-colors duration-200"
                >
                  <RefreshCw size={12} />
                  Parse Another
                </button>
              </div>
            )}

            {/* Paste area */}
            {!applied && (
              <>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1 block">
                    Email Text
                  </label>
                  <textarea
                    rows={result ? 4 : 12}
                    className={`w-full text-sm px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700
                      bg-gray-50 dark:bg-[#0f1419] text-gray-900 dark:text-gray-100
                      placeholder:text-gray-400 dark:placeholder:text-gray-600
                      focus:outline-none focus:ring-2 focus:ring-[#00857C]/30 dark:focus:ring-teal-500/30
                      focus:border-[#00857C] dark:focus:border-teal-500 transition-all duration-200 resize-y`}
                    placeholder="Paste the full email text here. Include any candidate lists, LinkedIn URLs, role descriptions, or recruiter updates..."
                    value={emailText}
                    onChange={e => setEmailText(e.target.value)}
                    disabled={loading}
                  />
                  <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1">
                    {openSeats.length} open seat{openSeats.length !== 1 ? 's' : ''} will be cross-referenced
                  </p>
                </div>

                {/* Parse button */}
                {!result && (
                  <button
                    onClick={handleParse}
                    disabled={loading || !emailText.trim()}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl
                               bg-[#00857C] dark:bg-teal-600 text-white font-semibold text-sm
                               hover:bg-[#006b63] dark:hover:bg-teal-500 transition-colors duration-200
                               disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Parsing with AI...
                      </>
                    ) : (
                      <>
                        <Mail size={16} />
                        Parse Email
                      </>
                    )}
                  </button>
                )}
              </>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/15 border border-red-200/60 dark:border-red-700/40">
                <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Results preview */}
            {result && !applied && (
              <div className="space-y-4 animate-fade-in-up">
                {/* AI Parse Summary */}
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-dark-surface-2/50 border border-gray-100 dark:border-gray-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                      AI Parse Result
                    </span>
                    <ConfidenceBadge level={result.confidence} />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                    {result.summary}
                  </p>
                  {result.seatTitle && !result.matchedSeatId && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                      Inferred seat: &ldquo;{result.seatTitle}&rdquo; — not matched to an existing seat
                    </p>
                  )}
                </div>

                {/* Candidates with per-candidate seat assignment */}
                {assignments.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
                      Candidates Found ({assignments.length}) — Assign Each to an Open Seat
                    </h4>
                    <div className="space-y-3">
                      {assignments.map((candidate, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-white dark:bg-[#1c2333] border border-gray-100 dark:border-gray-700/50
                                     shadow-sm space-y-2"
                        >
                          {/* Top row: candidate info */}
                          <div className="flex items-center gap-3">
                            {/* Action badge */}
                            <span className={`badge flex-shrink-0 ${
                              candidate.duplicateInfo
                                ? 'badge-amber'
                                : candidate.action === 'create' ? 'badge-teal' : 'badge-amber'
                            }`}>
                              {candidate.duplicateInfo ? (
                                <><ArrowRightLeft size={10} className="mr-0.5" /> Existing</>
                              ) : candidate.action === 'create' ? (
                                <><UserPlus size={10} className="mr-0.5" /> New</>
                              ) : (
                                'Update'
                              )}
                            </span>

                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                                {candidate.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {(candidate.currentTitle || candidate.currentCompany) && (
                                  <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
                                    <Building2 size={10} />
                                    {candidate.currentTitle}
                                    {candidate.currentTitle && candidate.currentCompany && ' @ '}
                                    {candidate.currentCompany}
                                  </span>
                                )}
                                {candidate.location && (
                                  <span className="flex items-center gap-0.5 text-[11px] text-gray-400 dark:text-gray-500">
                                    <MapPin size={10} />
                                    {candidate.location}
                                  </span>
                                )}
                              </div>
                            </div>

                            {candidate.linkedinUrl && (
                              <a
                                href={candidate.linkedinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-shrink-0 text-[#0A66C2] dark:text-blue-400 hover:text-[#084d94]
                                           transition-colors duration-200"
                                title="LinkedIn"
                              >
                                <Linkedin size={14} />
                              </a>
                            )}
                          </div>

                          {candidate.notes && (
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 italic pl-[68px]">
                              {candidate.notes}
                            </p>
                          )}

                          {/* Duplicate warning */}
                          <DuplicateWarning info={candidate.duplicateInfo} />

                          {/* Seat assignment dropdown */}
                          {!candidate.duplicateInfo && (
                            <div className="flex items-center gap-2 pt-1">
                              <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex-shrink-0">
                                Assign to:
                              </label>
                              <select
                                className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700
                                  bg-white dark:bg-[#0f1419] text-gray-800 dark:text-gray-200
                                  focus:outline-none focus:ring-2 focus:ring-[#00857C]/30 dark:focus:ring-teal-500/30
                                  focus:border-[#00857C] dark:focus:border-teal-500 transition-all duration-200"
                                value={candidate.assignedSeatId ?? ''}
                                onChange={e => updateAssignment(idx, e.target.value || null)}
                              >
                                <option value="">— Select Open Seat —</option>
                                {openSeats.map(s => (
                                  <option key={s.id} value={s.id}>
                                    {s.title} ({s.practiceArea})
                                  </option>
                                ))}
                                <option value="__new__">+ Create New Seat...</option>
                              </select>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* New Seat creation inline form */}
                {(showNewSeatForm || assignments.some(a => a.assignedSeatId === '__new__')) && (
                  <div className="p-4 rounded-xl bg-teal-50/50 dark:bg-teal-900/10 border border-teal-200/60 dark:border-teal-700/40 space-y-3">
                    <div className="flex items-center gap-2">
                      <Plus size={14} className="text-[#00857C] dark:text-teal-400" />
                      <span className="text-xs font-bold text-[#00857C] dark:text-teal-400 uppercase tracking-wider">
                        Create New Open Seat
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className={fieldLabelCls}>Seat Title</label>
                        <input
                          type="text"
                          className={fieldInputCls}
                          placeholder="e.g. VP of Technology"
                          value={newSeatForm.title}
                          onChange={e => setNewSeatForm(f => ({ ...f, title: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className={fieldLabelCls}>Practice</label>
                        <PracticeSelect
                          value={newSeatForm.practiceArea}
                          onChange={val => setNewSeatForm(f => ({ ...f, practiceArea: val }))}
                          className={fieldInputCls}
                        />
                      </div>
                      <div>
                        <label className={fieldLabelCls}>Band</label>
                        <select
                          className={fieldInputCls}
                          value={newSeatForm.band}
                          onChange={e => setNewSeatForm(f => ({ ...f, band: e.target.value }))}
                        >
                          {BAND_OPTIONS.map(b => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={handleCreateNewSeat}
                        disabled={!newSeatForm.title.trim()}
                        className="flex items-center gap-1.5 text-xs font-semibold text-white
                                   bg-[#00857C] dark:bg-teal-600 hover:bg-[#006b63] dark:hover:bg-teal-500
                                   px-4 py-2 rounded-lg transition-colors duration-200
                                   disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Plus size={12} />
                        Create Seat & Assign
                      </button>
                      <button
                        onClick={() => {
                          setShowNewSeatForm(false);
                          // Reset any __new__ assignments to null
                          setAssignments(prev => prev.map(a =>
                            a.assignedSeatId === '__new__' ? { ...a, assignedSeatId: null } : a
                          ));
                        }}
                        className="text-xs text-gray-500 dark:text-gray-400 px-3 py-2 rounded-lg
                                   hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                    {/* Pre-fill from AI if it suggested a new seat */}
                    {result.newSeat && !newSeatForm.title && (
                      <button
                        onClick={() => setNewSeatForm({
                          title: result.newSeat!.title,
                          practiceArea: result.newSeat!.practiceArea || (getDynamicPracticeOptions()[0] ?? 'Central'),
                          band: result.newSeat!.band || 'Revenue Producer',
                        })}
                        className="text-[11px] text-[#00857C] dark:text-teal-400 hover:underline"
                      >
                        Use AI suggestion: &ldquo;{result.newSeat.title}&rdquo;
                      </button>
                    )}
                  </div>
                )}

                {assignments.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      No candidates found in the email text.
                    </p>
                  </div>
                )}

                {/* Collapsible raw email */}
                <button
                  onClick={() => setShowRawEmail(!showRawEmail)}
                  className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500
                             hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
                >
                  {showRawEmail ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  {showRawEmail ? 'Hide' : 'Show'} original email text
                </button>
                {showRawEmail && (
                  <pre className="text-[11px] text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-[#0f1419]
                                  rounded-lg p-3 max-h-48 overflow-y-auto whitespace-pre-wrap font-mono border
                                  border-gray-100 dark:border-gray-700/50">
                    {emailText}
                  </pre>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleReset}
                    className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-4 py-2 rounded-lg
                               hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors duration-200"
                  >
                    Start Over
                  </button>
                  <div className="flex-1" />
                  {!allAssigned && anyAssigned && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400">
                      Some candidates unassigned
                    </span>
                  )}
                  {assignments.length > 0 && anyAssigned && (
                    <button
                      onClick={handleApply}
                      className="flex items-center gap-2 text-sm font-semibold text-white
                                 bg-[#00857C] dark:bg-teal-600 hover:bg-[#006b63] dark:hover:bg-teal-500
                                 px-5 py-2.5 rounded-xl transition-colors duration-200 shadow-sm"
                    >
                      <CheckCircle2 size={16} />
                      Apply {assignments.filter(a => a.assignedSeatId && a.assignedSeatId !== '__new__').length} Candidate{assignments.filter(a => a.assignedSeatId && a.assignedSeatId !== '__new__').length !== 1 ? 's' : ''}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default EmailIngestPanel;
