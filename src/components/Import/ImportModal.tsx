import React, { useState, useCallback, useEffect } from 'react';
import { X, Download, Upload, ChevronDown, ChevronRight, CheckCircle2, AlertCircle, AlertTriangle, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { FileDropzone } from './FileDropzone';
import {
  parseFile,
  validateAndProcessRows,
  downloadTemplate,
  downloadOpenSeatsTemplate,
  downloadCandidatesTemplate,
  TEMPLATE_COLUMNS,
  OPEN_SEAT_COLUMNS,
  CANDIDATE_COLUMNS,
} from '../../utils/csvImport';
import type { ImportResult } from '../../types/import';
import type { Person } from '../../types/person';
import { useOrgStore } from '../../stores/orgStore';
import { useUIStore } from '../../stores/uiStore';

type Tab = 'import' | 'download';

// ---------------------------------------------------------------------------
// Download Tab — CSV templates for all data types
// ---------------------------------------------------------------------------

type TemplateType = 'people' | 'openSeats' | 'candidates';

const TEMPLATE_TYPES: { id: TemplateType; label: string; description: string; icon: string }[] = [
  { id: 'people', label: 'People / Team', description: 'All employees, contractors, and active team members', icon: '👤' },
  { id: 'openSeats', label: 'Open Seats', description: 'Hiring pipeline, recruiting status, budget, and timeline', icon: '💼' },
  { id: 'candidates', label: 'Candidates', description: 'Candidate pipeline linked to open seats with stages and notes', icon: '📋' },
];

function DownloadTab({ people }: { people: Person[] }) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('people');

  const openSeatCount = people.filter(p => p.status === 'Open Seat').length;
  const candidateCount = people.reduce((sum, p) => sum + (p.status === 'Open Seat' ? (p.candidates?.length ?? 0) : 0), 0);

  const columnsForTemplate = {
    people: TEMPLATE_COLUMNS,
    openSeats: OPEN_SEAT_COLUMNS,
    candidates: CANDIDATE_COLUMNS,
  };

  const dataCountForTemplate = {
    people: people.length,
    openSeats: openSeatCount,
    candidates: candidateCount,
  };

  const downloadBlank = () => {
    switch (selectedTemplate) {
      case 'people': downloadTemplate(); break;
      case 'openSeats': downloadOpenSeatsTemplate(); break;
      case 'candidates': downloadCandidatesTemplate(); break;
    }
  };

  const downloadWithData = () => {
    switch (selectedTemplate) {
      case 'people': downloadTemplate(people); break;
      case 'openSeats': downloadOpenSeatsTemplate(people); break;
      case 'candidates': downloadCandidatesTemplate(people); break;
    }
  };

  const cols = columnsForTemplate[selectedTemplate];
  const dataCount = dataCountForTemplate[selectedTemplate];

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Download CSV templates to populate offline, then upload via the Import tab.
      </p>

      {/* Template type selector */}
      <div className="grid grid-cols-3 gap-2">
        {TEMPLATE_TYPES.map(t => (
          <button
            key={t.id}
            onClick={() => setSelectedTemplate(t.id)}
            className={`flex flex-col items-start gap-1 p-3 rounded-xl border-2 transition-all duration-200 text-left ${
              selectedTemplate === t.id
                ? 'border-teal-400 dark:border-teal-600 bg-teal-50/50 dark:bg-teal-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
            }`}
          >
            <span className="text-lg leading-none">{t.icon}</span>
            <span className={`text-xs font-semibold ${selectedTemplate === t.id ? 'text-teal-700 dark:text-teal-400' : 'text-gray-700 dark:text-gray-300'}`}>
              {t.label}
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 leading-snug">
              {t.description}
            </span>
          </button>
        ))}
      </div>

      {/* Download buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={downloadBlank}
          className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-teal-300 dark:hover:border-teal-700 hover:bg-teal-50/50 dark:hover:bg-teal-900/20 transition-all duration-200"
        >
          <Download size={24} className="text-teal-600 dark:text-teal-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Blank Template</span>
          <span className="text-[11px] text-gray-400 dark:text-gray-500">Headers only</span>
        </button>
        <button
          onClick={downloadWithData}
          className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-teal-300 dark:hover:border-teal-700 hover:bg-teal-50/50 dark:hover:bg-teal-900/20 transition-all duration-200"
        >
          <Download size={24} className="text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Data</span>
          <span className="text-[11px] text-gray-400 dark:text-gray-500">{dataCount} records</span>
        </button>
      </div>

      {/* Column reference */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
          {TEMPLATE_TYPES.find(t => t.id === selectedTemplate)?.label} Columns ({cols.length})
        </div>
        <div className="flex flex-wrap gap-1.5">
          {cols.map(col => (
            <span key={col.key} className={`px-2 py-0.5 rounded text-[11px] ${col.required ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 font-medium' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
              {col.header}{col.required ? '*' : ''}
            </span>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">* = required. Tags: separate with semicolons. Booleans: TRUE/FALSE. Dates: YYYY-MM-DD.</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ImportModal
// ---------------------------------------------------------------------------

export function ImportModal() {
  const isOpen = useUIStore(s => s.importModalOpen);
  const setOpen = useUIStore(s => s.setImportModalOpen);
  const people = useOrgStore(s => s.people);
  const bulkImport = useOrgStore(s => s.bulkImport);

  const [activeTab, setActiveTab] = useState<Tab>('import');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [imported, setImported] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['errors']));

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    if (isOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, setOpen]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setResult(null);
      setParseError(null);
      setImported(false);
      setParsing(false);
    }
  }, [isOpen]);

  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file);
    setParseError(null);
    setResult(null);
    setImported(false);
    setParsing(true);
    try {
      const rows = await parseFile(file);
      if (rows.length === 0) {
        setParseError('File contains no data rows.');
        setParsing(false);
        return;
      }
      const importResult = validateAndProcessRows(rows, people);
      setResult(importResult);
    } catch (err) {
      setParseError((err as Error).message);
    }
    setParsing(false);
  }, [people]);

  const handleImport = useCallback(() => {
    if (!result) return;
    bulkImport(result.toAdd, result.toUpdate);
    setImported(true);
  }, [result, bulkImport]);

  const toggleSection = (key: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  if (!isOpen) return null;

  const validCount = (result?.toAdd.length || 0) + (result?.toUpdate.length || 0);
  const errorCount = result?.errors.length || 0;
  const warningCount = result?.warnings.length || 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-[#1a2332] rounded-2xl shadow-2xl dark:shadow-gray-900/60 border border-gray-200 dark:border-gray-700 w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <FileSpreadsheet size={20} className="text-teal-600 dark:text-teal-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Import / Export Data</h2>
          </div>
          <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
          {([
            { id: 'import' as Tab, label: 'Import', icon: <Upload size={14} /> },
            { id: 'download' as Tab, label: 'Download', icon: <Download size={14} /> },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {activeTab === 'download' && (
            <DownloadTab people={people} />
          )}

          {activeTab === 'import' && (
            <div className="space-y-4">
              {imported ? (
                <div className="text-center py-8">
                  <CheckCircle2 size={48} className="mx-auto mb-3 text-green-500" />
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Import Complete!</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {result?.toAdd.length || 0} added, {result?.toUpdate.length || 0} updated
                  </div>
                  <button onClick={() => setOpen(false)} className="mt-4 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors">
                    Close
                  </button>
                </div>
              ) : (
                <>
                  <FileDropzone
                    onFileSelect={handleFileSelect}
                    selectedFile={selectedFile}
                    onClear={() => { setSelectedFile(null); setResult(null); setParseError(null); }}
                  />

                  {parsing && (
                    <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500 dark:text-gray-400">
                      <RefreshCw size={16} className="animate-spin" />
                      Parsing file...
                    </div>
                  )}

                  {parseError && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-red-700 dark:text-red-400">{parseError}</div>
                    </div>
                  )}

                  {result && !parsing && (
                    <div className="space-y-3">
                      {/* Summary badges */}
                      <div className="flex gap-3">
                        {result.toAdd.length > 0 && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-400 font-medium">
                            <CheckCircle2 size={14} /> {result.toAdd.length} New
                          </div>
                        )}
                        {result.toUpdate.length > 0 && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-700 dark:text-blue-400 font-medium">
                            <RefreshCw size={14} /> {result.toUpdate.length} Updates
                          </div>
                        )}
                        {errorCount > 0 && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400 font-medium">
                            <AlertCircle size={14} /> {errorCount} Errors
                          </div>
                        )}
                        {warningCount > 0 && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-400 font-medium">
                            <AlertTriangle size={14} /> {warningCount} Warnings
                          </div>
                        )}
                      </div>

                      {/* Errors section */}
                      {errorCount > 0 && (
                        <div className="border border-red-200 dark:border-red-800 rounded-lg overflow-hidden">
                          <button onClick={() => toggleSection('errors')} className="w-full flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                            {expandedSections.has('errors') ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            Errors ({errorCount})
                          </button>
                          {expandedSections.has('errors') && (
                            <div className="max-h-40 overflow-y-auto px-3 py-2 space-y-1 bg-white dark:bg-[#1a2332]">
                              {result.errors.map((err, i) => (
                                <div key={i} className="text-xs text-gray-700 dark:text-gray-300">
                                  <span className="font-medium text-red-600 dark:text-red-400">Row {err.rowIndex}:</span>{' '}
                                  {err.errors.map(e => e.message).join('; ')}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Warnings section */}
                      {warningCount > 0 && (
                        <div className="border border-amber-200 dark:border-amber-800 rounded-lg overflow-hidden">
                          <button onClick={() => toggleSection('warnings')} className="w-full flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 text-sm font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
                            {expandedSections.has('warnings') ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            Warnings ({warningCount})
                          </button>
                          {expandedSections.has('warnings') && (
                            <div className="max-h-40 overflow-y-auto px-3 py-2 space-y-1 bg-white dark:bg-[#1a2332]">
                              {result.warnings.map((w, i) => (
                                <div key={i} className="text-xs text-gray-700 dark:text-gray-300">
                                  <span className="font-medium text-amber-600 dark:text-amber-400">Row {w.rowIndex}:</span>{' '}
                                  {w.warnings.join('; ')}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* New records preview */}
                      {result.toAdd.length > 0 && (
                        <div className="border border-green-200 dark:border-green-800 rounded-lg overflow-hidden">
                          <button onClick={() => toggleSection('new')} className="w-full flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 text-sm font-medium text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                            {expandedSections.has('new') ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            New Records ({result.toAdd.length})
                          </button>
                          {expandedSections.has('new') && (
                            <div className="max-h-48 overflow-y-auto">
                              <table className="w-full text-xs">
                                <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                                  <tr>
                                    <th className="px-3 py-1.5 text-left text-gray-500 dark:text-gray-400 font-medium">Name</th>
                                    <th className="px-3 py-1.5 text-left text-gray-500 dark:text-gray-400 font-medium">Title</th>
                                    <th className="px-3 py-1.5 text-left text-gray-500 dark:text-gray-400 font-medium">Practice</th>
                                    <th className="px-3 py-1.5 text-left text-gray-500 dark:text-gray-400 font-medium">Office</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                  {result.toAdd.map(p => (
                                    <tr key={p.id} className="bg-white dark:bg-[#1a2332]">
                                      <td className="px-3 py-1.5 text-gray-900 dark:text-gray-100 font-medium">{p.firstName} {p.lastName}</td>
                                      <td className="px-3 py-1.5 text-gray-600 dark:text-gray-400">{p.title}</td>
                                      <td className="px-3 py-1.5 text-gray-600 dark:text-gray-400">{p.practiceArea}</td>
                                      <td className="px-3 py-1.5 text-gray-600 dark:text-gray-400">{p.office}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Updates preview */}
                      {result.toUpdate.length > 0 && (
                        <div className="border border-blue-200 dark:border-blue-800 rounded-lg overflow-hidden">
                          <button onClick={() => toggleSection('updates')} className="w-full flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-sm font-medium text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                            {expandedSections.has('updates') ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            Updates ({result.toUpdate.length})
                          </button>
                          {expandedSections.has('updates') && (
                            <div className="max-h-48 overflow-y-auto px-3 py-2 space-y-1 bg-white dark:bg-[#1a2332]">
                              {result.toUpdate.map(u => (
                                <div key={u.id} className="text-xs text-gray-700 dark:text-gray-300">
                                  <span className="font-medium">{u.id}</span>: {Object.keys(u.updates).join(', ')}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action buttons */}
                      {validCount > 0 && (
                        <div className="flex justify-end gap-2 pt-2">
                          <button onClick={() => { setSelectedFile(null); setResult(null); }} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
                            Cancel
                          </button>
                          <button onClick={handleImport} className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors">
                            Import {validCount} Record{validCount !== 1 ? 's' : ''}
                          </button>
                        </div>
                      )}

                      {validCount === 0 && errorCount > 0 && (
                        <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                          No valid records to import. Please fix the errors above and try again.
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
