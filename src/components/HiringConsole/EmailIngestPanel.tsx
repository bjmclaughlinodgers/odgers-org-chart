import { useState, useCallback } from 'react';
import { X, Mail, Loader2, CheckCircle2, AlertCircle, UserPlus, RefreshCw, Linkedin, MapPin, Building2, ChevronDown, ChevronRight } from 'lucide-react';
import { useOrgStore } from '../../stores/orgStore';
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
   EmailIngestPanel — modal dialog for paste-and-parse
   ========================================================= */
export function EmailIngestPanel({ onClose }: EmailIngestPanelProps) {
  const people = useOrgStore(s => s.people);
  const addCandidate = useOrgStore(s => s.addCandidate);
  const updateCandidate = useOrgStore(s => s.updateCandidate);

  // State
  const [emailText, setEmailText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [applied, setApplied] = useState(false);
  const [applySummary, setApplySummary] = useState<string | null>(null);
  const [showRawEmail, setShowRawEmail] = useState(false);

  // Gather open seats for the API call
  const openSeats = people.filter(p => p.status === 'Open Seat' && p.recruitingStatus !== 'Closed');

  /* -------------------------------------------------------
     Parse handler
     ------------------------------------------------------- */
  const handleParse = useCallback(async () => {
    if (!emailText.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
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

      setResult(data as ParseResult);
    } catch (err) {
      console.error('[Email Ingest] Parse error:', err);
      setError('Failed to connect to the parsing service. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [emailText, openSeats]);

  /* -------------------------------------------------------
     Apply handler — creates/updates candidates
     ------------------------------------------------------- */
  const handleApply = useCallback(() => {
    if (!result) return;

    let created = 0;
    let updated = 0;
    const seatId = result.matchedSeatId;

    if (!seatId) {
      setError('No matched seat — cannot apply changes. Please match to a seat first.');
      return;
    }

    // Verify the seat exists
    const seat = people.find(p => p.id === seatId);
    if (!seat) {
      setError('Matched seat not found in database.');
      return;
    }

    for (const candidate of result.candidates) {
      if (candidate.action === 'create') {
        const newCandidate: Candidate = {
          id: uuidv4(),
          name: candidate.name,
          currentTitle: candidate.currentTitle ?? undefined,
          currentCompany: candidate.currentCompany ?? undefined,
          location: candidate.location ?? undefined,
          linkedinUrl: candidate.linkedinUrl ?? undefined,
          notes: candidate.notes ?? undefined,
          stage: 'Identified',
          source: 'Email Ingest',
          addedDate: new Date().toISOString(),
          isFinalist: false,
        };
        addCandidate(seatId, newCandidate);
        created++;
      } else if (candidate.action === 'update' && candidate.existingCandidateId) {
        const updates: Partial<Candidate> = {};
        if (candidate.notes) updates.notes = candidate.notes;
        if (candidate.currentTitle) updates.currentTitle = candidate.currentTitle;
        if (candidate.currentCompany) updates.currentCompany = candidate.currentCompany;
        if (candidate.location) updates.location = candidate.location;
        if (candidate.linkedinUrl) updates.linkedinUrl = candidate.linkedinUrl;

        if (Object.keys(updates).length > 0) {
          updateCandidate(seatId, candidate.existingCandidateId, updates);
          updated++;
        }
      }
    }

    setApplied(true);
    setApplySummary(
      `Added ${created} new candidate${created !== 1 ? 's' : ''}${
        updated > 0 ? `, updated ${updated} existing` : ''
      }.`
    );
  }, [result, people, addCandidate, updateCandidate]);

  /* -------------------------------------------------------
     Reset
     ------------------------------------------------------- */
  const handleReset = () => {
    setEmailText('');
    setResult(null);
    setError(null);
    setApplied(false);
    setApplySummary(null);
  };

  /* -------------------------------------------------------
     Find matched seat name
     ------------------------------------------------------- */
  const matchedSeat = result?.matchedSeatId
    ? openSeats.find(s => s.id === result.matchedSeatId)
    : null;

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
                      w-full max-w-2xl max-h-[85vh] flex flex-col animate-scale-in"
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
                {/* Matched Seat */}
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-dark-surface-2/50 border border-gray-100 dark:border-gray-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                      Matched Seat
                    </span>
                    <ConfidenceBadge level={result.confidence} />
                  </div>
                  {matchedSeat ? (
                    <div>
                      <p className="text-sm font-semibold text-odgers-navy dark:text-dark-text">
                        {matchedSeat.title}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {matchedSeat.practiceArea} &middot; {matchedSeat.band}
                      </p>
                    </div>
                  ) : result.seatTitle ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                      No match found — inferred: "{result.seatTitle}"
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                      Could not identify a matching seat
                    </p>
                  )}
                </div>

                {/* Summary */}
                <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                  {result.summary}
                </p>

                {/* Candidates */}
                {result.candidates.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
                      Candidates Found ({result.candidates.length})
                    </h4>
                    <div className="space-y-2">
                      {result.candidates.map((candidate, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-white dark:bg-[#1c2333] border border-gray-100 dark:border-gray-700/50
                                     shadow-sm"
                        >
                          <div className="flex items-center gap-3">
                            {/* Action badge */}
                            <span className={`badge flex-shrink-0 ${
                              candidate.action === 'create' ? 'badge-teal' : 'badge-amber'
                            }`}>
                              {candidate.action === 'create' ? (
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
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 italic mt-2 pl-[68px]">
                              {candidate.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.candidates.length === 0 && (
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
                  {result.candidates.length > 0 && matchedSeat && (
                    <button
                      onClick={handleApply}
                      className="flex items-center gap-2 text-sm font-semibold text-white
                                 bg-[#00857C] dark:bg-teal-600 hover:bg-[#006b63] dark:hover:bg-teal-500
                                 px-5 py-2.5 rounded-xl transition-colors duration-200 shadow-sm"
                    >
                      <CheckCircle2 size={16} />
                      Apply {result.candidates.length} Candidate{result.candidates.length !== 1 ? 's' : ''}
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
