import React, { useState, useMemo, useCallback } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Plus, Trash2, RotateCcw, Columns } from 'lucide-react';
import { useFilters } from '../../hooks/useFilters';
import { useUIStore } from '../../stores/uiStore';
import { useOrgStore } from '../../stores/orgStore';
import { PRACTICE_COLORS } from '../../types';
import type { Person } from '../../types';
import { computeTenure } from '../../utils/tenure';
import { isActivePerson } from '../../utils/personFilters';
import { formatCurrency } from '../../utils/export';
import {
  PRACTICE_OPTIONS,
  BAND_OPTIONS,
  OFFICE_OPTIONS,
  PERFORMANCE_OPTIONS,
  RISK_OPTIONS,
  STATUS_OPTIONS,
  EMPLOYMENT_OPTIONS,
} from '../../constants/editOptions';
import { EditableCell } from './EditableCell';
import { TagEditor } from './TagEditor';

type SortField =
  | 'name'
  | 'firstName'
  | 'lastName'
  | 'title'
  | 'practiceArea'
  | 'band'
  | 'office'
  | 'tenure'
  | 'performance'
  | 'retentionRisk'
  | 'oce'
  | 'status'
  | 'revenueTarget'
  | 'pipelineValue'
  | 'priorYearOCE'
  | 'employmentType'
  | 'skillsTags'
  | 'needsTags'
  | 'baseSalary'
  | 'totalOTE'
  | 'photoUrl';

type SortDir = 'asc' | 'desc';

interface OptionalColumn {
  key: string;
  label: string;
}

const OPTIONAL_COLUMNS: OptionalColumn[] = [
  { key: 'revenueTarget', label: 'Revenue Target' },
  { key: 'pipelineValue', label: 'Pipeline' },
  { key: 'priorYearOCE', label: 'Prior OCE' },
  { key: 'employmentType', label: 'Employment Type' },
  { key: 'skillsTags', label: 'Skills' },
  { key: 'needsTags', label: 'Needs' },
  { key: 'baseSalary', label: 'Base Salary' },
  { key: 'totalOTE', label: 'Total OTE' },
  { key: 'photoUrl', label: 'Photo URL' },
];

export function GridView() {
  const { filteredPeople } = useFilters();
  const { selectPerson } = useUIStore();
  const { updatePerson, addDefaultPerson, removePerson, resetToDefault } = useOrgStore();

  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleOptionalCols, setVisibleOptionalCols] = useState<Set<string>>(new Set());
  const [columnPickerOpen, setColumnPickerOpen] = useState(false);
  const [activeTagEditor, setActiveTagEditor] = useState<{ personId: string; field: 'skillsTags' | 'needsTags' } | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  const toggleSort = useCallback((field: SortField) => {
    setSortField(prev => {
      if (prev === field) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        return field;
      }
      setSortDir('asc');
      return field;
    });
  }, []);

  const sorted = useMemo(() => {
    const arr = [...filteredPeople];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`);
          break;
        case 'firstName':
          cmp = a.firstName.localeCompare(b.firstName);
          break;
        case 'lastName':
          cmp = a.lastName.localeCompare(b.lastName);
          break;
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'practiceArea':
          cmp = a.practiceArea.localeCompare(b.practiceArea);
          break;
        case 'band':
          cmp = a.band.localeCompare(b.band);
          break;
        case 'office':
          cmp = a.office.localeCompare(b.office);
          break;
        case 'tenure': {
          const ta = new Date(a.startDate).getTime();
          const tb = new Date(b.startDate).getTime();
          cmp = ta - tb;
          break;
        }
        case 'performance':
          cmp = a.performanceRating.localeCompare(b.performanceRating);
          break;
        case 'retentionRisk': {
          const riskOrder: Record<string, number> = { Low: 0, Watch: 1, Elevated: 2, Critical: 3 };
          cmp = (riskOrder[a.retentionRisk] || 0) - (riskOrder[b.retentionRisk] || 0);
          break;
        }
        case 'oce':
          cmp = (a.currentYearOCE || 0) - (b.currentYearOCE || 0);
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
        case 'revenueTarget':
          cmp = (a.revenueTarget || 0) - (b.revenueTarget || 0);
          break;
        case 'pipelineValue':
          cmp = (a.pipelineValue || 0) - (b.pipelineValue || 0);
          break;
        case 'priorYearOCE':
          cmp = (a.priorYearOCE || 0) - (b.priorYearOCE || 0);
          break;
        case 'employmentType':
          cmp = a.employmentType.localeCompare(b.employmentType);
          break;
        case 'skillsTags':
          cmp = a.skillsTags.join(',').localeCompare(b.skillsTags.join(','));
          break;
        case 'needsTags':
          cmp = a.needsTags.join(',').localeCompare(b.needsTags.join(','));
          break;
        case 'baseSalary':
          cmp = (a.baseSalary || 0) - (b.baseSalary || 0);
          break;
        case 'totalOTE':
          cmp = (a.totalOTE || 0) - (b.totalOTE || 0);
          break;
        case 'photoUrl':
          cmp = (a.photoUrl || '').localeCompare(b.photoUrl || '');
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [filteredPeople, sortField, sortDir]);

  const filtered = useMemo(() => {
    return sorted.filter(person => {
      for (const [col, filterVal] of Object.entries(columnFilters)) {
        if (!filterVal) continue;
        const personVal = String((person as any)[col] || '').toLowerCase();
        if (col === 'firstName' || col === 'lastName' || col === 'title') {
          if (!personVal.includes(filterVal.toLowerCase())) return false;
        } else {
          if (personVal !== filterVal.toLowerCase()) return false;
        }
      }
      return true;
    });
  }, [sorted, columnFilters]);

  // Selection helpers
  const allSelected = filtered.length > 0 && filtered.every(p => selectedIds.has(p.id));
  const someSelected = filtered.some(p => selectedIds.has(p.id));

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(p => p.id)));
    }
  }, [allSelected, filtered]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Toolbar actions
  const handleAddPerson = useCallback(() => {
    const newId = addDefaultPerson();
    setSelectedIds(new Set());
    selectPerson(newId);
  }, [addDefaultPerson, selectPerson]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    const confirmed = window.confirm(`Delete ${selectedIds.size} selected person(s)? This cannot be undone.`);
    if (!confirmed) return;
    selectedIds.forEach(id => removePerson(id));
    setSelectedIds(new Set());
  }, [selectedIds, removePerson]);

  const handleReset = useCallback(() => {
    const confirmed = window.confirm('Reset all data to defaults? All changes will be lost.');
    if (!confirmed) return;
    resetToDefault();
    setSelectedIds(new Set());
  }, [resetToDefault]);

  const toggleOptionalColumn = useCallback((key: string) => {
    setVisibleOptionalCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Save handler
  const handleSave = useCallback((personId: string, field: keyof Person, value: string | number | null) => {
    updatePerson(personId, { [field]: value } as Partial<Person>);
  }, [updatePerson]);

  const handleTagsSave = useCallback((personId: string, field: 'skillsTags' | 'needsTags', newTags: string[]) => {
    updatePerson(personId, { [field]: newTags });
    setActiveTagEditor(null);
  }, [updatePerson]);

  // Sort header component
  const SortHeader = ({ field, label, className = '' }: { field: SortField; label: string; className?: string }) => (
    <th
      className={`px-4 py-3 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-[0.08em] cursor-pointer hover:bg-gray-100/60 dark:hover:bg-[#1e2736]/60 select-none whitespace-nowrap transition-colors ${className}`}
      onClick={() => toggleSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        {sortField === field ? (
          sortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
        ) : (
          <ArrowUpDown size={11} className="text-gray-300 dark:text-gray-600" />
        )}
      </span>
    </th>
  );

  // Format tags for display
  const formatTags = (tags: string[]): string => {
    if (!tags || tags.length === 0) return '';
    return tags.join(', ');
  };

  return (
    <div className="p-4 animate-fade-in">
      <div className="bg-white dark:bg-[#1a2332] rounded-xl border border-gray-200/80 dark:border-gray-700/60 overflow-hidden shadow-sm">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-gray-200/80 dark:border-gray-700/60 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">All Personnel ({filtered.length})</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddPerson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm hover:shadow transition-all"
            >
              <Plus size={13} />
              Add Person
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={selectedIds.size === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 size={13} />
              Delete ({selectedIds.size})
            </button>
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100/80 dark:bg-gray-800/80 hover:bg-gray-200/80 dark:hover:bg-gray-700/80 rounded-lg transition-all"
            >
              <RotateCcw size={13} />
              Reset
            </button>

            {Object.values(columnFilters).some(v => v) && (
              <button
                onClick={() => setColumnFilters({})}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50 rounded-lg transition-all"
              >
                Clear Filters
              </button>
            )}

            {/* Column picker */}
            <div className="relative">
              <button
                onClick={() => setColumnPickerOpen(prev => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100/80 dark:bg-gray-800/80 hover:bg-gray-200/80 dark:hover:bg-gray-700/80 rounded-lg transition-all"
              >
                <Columns size={13} />
                Columns
              </button>
              {columnPickerOpen && (
                <div className="absolute right-0 top-full mt-1.5 z-50 bg-white/95 dark:bg-[#1a2332]/95 backdrop-blur-xl border border-gray-200/80 dark:border-gray-700/60 rounded-xl shadow-xl dark:shadow-gray-900/60 py-1.5 min-w-[200px]">
                  <div className="flex gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-800/60">
                    <button onClick={() => setVisibleOptionalCols(new Set(OPTIONAL_COLUMNS.map(c => c.key)))} className="text-[10px] font-medium text-teal-600 dark:text-teal-400 hover:underline">Show All</button>
                    <span className="text-[10px] text-gray-300 dark:text-gray-600">|</span>
                    <button onClick={() => setVisibleOptionalCols(new Set())} className="text-[10px] font-medium text-teal-600 dark:text-teal-400 hover:underline">Hide All</button>
                  </div>
                  {OPTIONAL_COLUMNS.map(col => (
                    <label
                      key={col.key}
                      className="flex items-center gap-2.5 px-3 py-2 text-[11px] text-gray-700 dark:text-gray-300 hover:bg-gray-50/80 dark:hover:bg-gray-800/40 cursor-pointer transition-colors rounded-md mx-1"
                    >
                      <input
                        type="checkbox"
                        checked={visibleOptionalCols.has(col.key)}
                        onChange={() => toggleOptionalColumn(col.key)}
                        className="rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:ring-teal-500"
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/80 dark:bg-[#161b22]/80 backdrop-blur-sm border-b border-gray-200/80 dark:border-gray-700/60 sticky top-0 z-10">
              <tr>
                {/* Checkbox column */}
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:ring-teal-500"
                  />
                </th>
                <SortHeader field="firstName" label="First Name" />
                <SortHeader field="lastName" label="Last Name" />
                <SortHeader field="title" label="Title" />
                <SortHeader field="practiceArea" label="Practice" />
                <SortHeader field="band" label="Band" />
                <SortHeader field="office" label="Office" />
                <SortHeader field="tenure" label="Tenure" />
                <SortHeader field="performance" label="Performance" />
                <SortHeader field="retentionRisk" label="Risk" />
                <SortHeader field="oce" label="YTD OCE" />
                <SortHeader field="status" label="Status" />
                {/* Optional columns */}
                {visibleOptionalCols.has('revenueTarget') && <SortHeader field="revenueTarget" label="Rev Target" />}
                {visibleOptionalCols.has('pipelineValue') && <SortHeader field="pipelineValue" label="Pipeline" />}
                {visibleOptionalCols.has('priorYearOCE') && <SortHeader field="priorYearOCE" label="Prior OCE" />}
                {visibleOptionalCols.has('employmentType') && <SortHeader field="employmentType" label="Employment" />}
                {visibleOptionalCols.has('skillsTags') && <SortHeader field="skillsTags" label="Skills" />}
                {visibleOptionalCols.has('needsTags') && <SortHeader field="needsTags" label="Needs" />}
                {visibleOptionalCols.has('baseSalary') && <SortHeader field="baseSalary" label="Base Salary" />}
                {visibleOptionalCols.has('totalOTE') && <SortHeader field="totalOTE" label="Total OTE" />}
                {visibleOptionalCols.has('photoUrl') && <SortHeader field="photoUrl" label="Photo" />}
              </tr>
              <tr className="bg-gray-50/40 dark:bg-[#161b22]/40">
                <td></td>{/* checkbox col */}
                <td className="px-1 py-1"><input value={columnFilters.firstName || ''} onChange={e => setColumnFilters(f => ({...f, firstName: e.target.value}))} placeholder="Filter..." className="w-full text-[10px] bg-white/80 dark:bg-[#1a2332]/80 border border-gray-200/80 dark:border-gray-700/60 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-teal-400 dark:focus:ring-teal-500 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-600 transition-colors" /></td>
                <td className="px-1 py-1"><input value={columnFilters.lastName || ''} onChange={e => setColumnFilters(f => ({...f, lastName: e.target.value}))} placeholder="Filter..." className="w-full text-[10px] bg-white/80 dark:bg-[#1a2332]/80 border border-gray-200/80 dark:border-gray-700/60 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-teal-400 dark:focus:ring-teal-500 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-600 transition-colors" /></td>
                <td className="px-1 py-1"><input value={columnFilters.title || ''} onChange={e => setColumnFilters(f => ({...f, title: e.target.value}))} placeholder="Filter..." className="w-full text-[10px] bg-white/80 dark:bg-[#1a2332]/80 border border-gray-200/80 dark:border-gray-700/60 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-teal-400 dark:focus:ring-teal-500 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-600 transition-colors" /></td>
                {/* Select filters for practice, band, office etc */}
                <td className="px-1 py-1">
                  <select value={columnFilters.practiceArea || ''} onChange={e => setColumnFilters(f => ({...f, practiceArea: e.target.value}))} className="w-full text-[10px] bg-white/80 dark:bg-[#1a2332]/80 border border-gray-200/80 dark:border-gray-700/60 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-teal-400 dark:focus:ring-teal-500 dark:text-gray-300 transition-colors">
                    <option value="">All</option>
                    {PRACTICE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </td>
                <td className="px-1 py-1">
                  <select value={columnFilters.band || ''} onChange={e => setColumnFilters(f => ({...f, band: e.target.value}))} className="w-full text-[10px] bg-white/80 dark:bg-[#1a2332]/80 border border-gray-200/80 dark:border-gray-700/60 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-teal-400 dark:focus:ring-teal-500 dark:text-gray-300 transition-colors">
                    <option value="">All</option>
                    {BAND_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </td>
                <td className="px-1 py-1">
                  <select value={columnFilters.office || ''} onChange={e => setColumnFilters(f => ({...f, office: e.target.value}))} className="w-full text-[10px] bg-white/80 dark:bg-[#1a2332]/80 border border-gray-200/80 dark:border-gray-700/60 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-teal-400 dark:focus:ring-teal-500 dark:text-gray-300 transition-colors">
                    <option value="">All</option>
                    {OFFICE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </td>
                <td></td>{/* tenure - no filter */}
                <td className="px-1 py-1">
                  <select value={columnFilters.performanceRating || ''} onChange={e => setColumnFilters(f => ({...f, performanceRating: e.target.value}))} className="w-full text-[10px] bg-white/80 dark:bg-[#1a2332]/80 border border-gray-200/80 dark:border-gray-700/60 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-teal-400 dark:focus:ring-teal-500 dark:text-gray-300 transition-colors">
                    <option value="">All</option>
                    {PERFORMANCE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </td>
                <td className="px-1 py-1">
                  <select value={columnFilters.retentionRisk || ''} onChange={e => setColumnFilters(f => ({...f, retentionRisk: e.target.value}))} className="w-full text-[10px] bg-white/80 dark:bg-[#1a2332]/80 border border-gray-200/80 dark:border-gray-700/60 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-teal-400 dark:focus:ring-teal-500 dark:text-gray-300 transition-colors">
                    <option value="">All</option>
                    {RISK_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </td>
                <td></td>{/* OCE - no filter */}
                <td className="px-1 py-1">
                  <select value={columnFilters.status || ''} onChange={e => setColumnFilters(f => ({...f, status: e.target.value}))} className="w-full text-[10px] bg-white/80 dark:bg-[#1a2332]/80 border border-gray-200/80 dark:border-gray-700/60 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-teal-400 dark:focus:ring-teal-500 dark:text-gray-300 transition-colors">
                    <option value="">All</option>
                    {STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </td>
                {/* Empty cells for optional columns */}
                {visibleOptionalCols.has('revenueTarget') && <td></td>}
                {visibleOptionalCols.has('pipelineValue') && <td></td>}
                {visibleOptionalCols.has('priorYearOCE') && <td></td>}
                {visibleOptionalCols.has('employmentType') && <td className="px-1 py-1">
                  <select value={columnFilters.employmentType || ''} onChange={e => setColumnFilters(f => ({...f, employmentType: e.target.value}))} className="w-full text-[10px] bg-white/80 dark:bg-[#1a2332]/80 border border-gray-200/80 dark:border-gray-700/60 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-teal-400 dark:focus:ring-teal-500 dark:text-gray-300 transition-colors">
                    <option value="">All</option>
                    {EMPLOYMENT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </td>}
                {visibleOptionalCols.has('skillsTags') && <td></td>}
                {visibleOptionalCols.has('needsTags') && <td></td>}
                {visibleOptionalCols.has('baseSalary') && <td></td>}
                {visibleOptionalCols.has('totalOTE') && <td></td>}
                {visibleOptionalCols.has('photoUrl') && <td></td>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/80 dark:divide-gray-800/60">
              {filtered.map((person, rowIndex) => {
                const tenure = isActivePerson(person) ? computeTenure(person.startDate) : null;
                const isOpenSeat = person.status === 'Open Seat';
                const isSelected = selectedIds.has(person.id);

                return (
                  <tr
                    key={person.id}
                    className={`transition-colors hover:bg-gray-50 dark:hover:bg-[#161b22] ${
                      isSelected
                        ? 'bg-blue-50/80 dark:bg-blue-900/20'
                        : person.status === 'Terminated'
                          ? 'bg-gray-100 dark:bg-gray-800/50'
                          : rowIndex % 2 === 0
                            ? 'bg-white dark:bg-[#1a2332]'
                            : 'bg-gray-50/30 dark:bg-[#0f1419]/30'
                    } ${isOpenSeat ? 'opacity-70' : ''} ${person.status === 'On Leave' ? 'opacity-60' : ''} ${person.status === 'Terminated' ? 'opacity-60' : ''}`}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-2.5 w-8">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelect(person.id);
                        }}
                        className="rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:ring-teal-500"
                      />
                    </td>

                    {/* First Name */}
                    <td className="px-2 py-1.5" onClick={() => selectPerson(person.id)}>
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-5 h-5 rounded flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0"
                          style={{ backgroundColor: PRACTICE_COLORS[person.practiceArea as keyof typeof PRACTICE_COLORS] || '#36454F' }}
                        >
                          {isOpenSeat ? '?' : `${person.firstName[0]}${person.lastName[0]}`}
                        </div>
                        <div onClick={(e) => e.stopPropagation()}>
                          <EditableCell
                            value={person.firstName}
                            onSave={(val) => handleSave(person.id, 'firstName', val)}
                            type="text"
                          />
                        </div>
                      </div>
                    </td>

                    {/* Last Name */}
                    <td className="px-2 py-1.5" onClick={() => selectPerson(person.id)}>
                      <div onClick={(e) => e.stopPropagation()}>
                        <EditableCell
                          value={person.lastName}
                          onSave={(val) => handleSave(person.id, 'lastName', val)}
                          type="text"
                        />
                      </div>
                    </td>

                    {/* Title */}
                    <td className="px-2 py-1.5 max-w-[150px]" onClick={() => selectPerson(person.id)}>
                      <div onClick={(e) => e.stopPropagation()}>
                        <EditableCell
                          value={person.title}
                          onSave={(val) => handleSave(person.id, 'title', val)}
                          type="text"
                        />
                      </div>
                    </td>

                    {/* Practice */}
                    <td className="px-2 py-1.5" onClick={() => selectPerson(person.id)}>
                      <div onClick={(e) => e.stopPropagation()}>
                        <EditableCell
                          value={person.practiceArea}
                          onSave={(val) => handleSave(person.id, 'practiceArea', val)}
                          type="select"
                          options={PRACTICE_OPTIONS as string[]}
                        />
                      </div>
                    </td>

                    {/* Band */}
                    <td className="px-2 py-1.5" onClick={() => selectPerson(person.id)}>
                      <div onClick={(e) => e.stopPropagation()}>
                        <EditableCell
                          value={person.band}
                          onSave={(val) => handleSave(person.id, 'band', val)}
                          type="select"
                          options={BAND_OPTIONS as string[]}
                        />
                      </div>
                    </td>

                    {/* Office */}
                    <td className="px-2 py-1.5" onClick={() => selectPerson(person.id)}>
                      <div onClick={(e) => e.stopPropagation()}>
                        <EditableCell
                          value={person.office}
                          onSave={(val) => handleSave(person.id, 'office', val)}
                          type="select"
                          options={OFFICE_OPTIONS as string[]}
                        />
                      </div>
                    </td>

                    {/* Tenure (readonly) */}
                    <td className="px-2 py-1.5" onClick={() => selectPerson(person.id)}>
                      <EditableCell
                        value={tenure?.display || '\u2014'}
                        onSave={() => {}}
                        type="readonly"
                      />
                    </td>

                    {/* Performance */}
                    <td className="px-2 py-1.5" onClick={() => selectPerson(person.id)}>
                      <div onClick={(e) => e.stopPropagation()}>
                        <EditableCell
                          value={person.performanceRating}
                          onSave={(val) => handleSave(person.id, 'performanceRating', val)}
                          type="select"
                          options={PERFORMANCE_OPTIONS as string[]}
                        />
                      </div>
                    </td>

                    {/* Retention Risk */}
                    <td className="px-2 py-1.5" onClick={() => selectPerson(person.id)}>
                      <div onClick={(e) => e.stopPropagation()}>
                        <EditableCell
                          value={person.retentionRisk}
                          onSave={(val) => handleSave(person.id, 'retentionRisk', val)}
                          type="select"
                          options={RISK_OPTIONS as string[]}
                        />
                      </div>
                    </td>

                    {/* OCE */}
                    <td className="px-2 py-1.5" onClick={() => selectPerson(person.id)}>
                      <div onClick={(e) => e.stopPropagation()}>
                        <EditableCell
                          value={person.currentYearOCE}
                          onSave={(val) => handleSave(person.id, 'currentYearOCE', val)}
                          type="number"
                          formatter={formatCurrency}
                        />
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-2 py-1.5" onClick={() => selectPerson(person.id)}>
                      <div onClick={(e) => e.stopPropagation()}>
                        <EditableCell
                          value={person.status}
                          onSave={(val) => handleSave(person.id, 'status', val)}
                          type="select"
                          options={STATUS_OPTIONS as string[]}
                        />
                      </div>
                    </td>

                    {/* Optional columns */}
                    {visibleOptionalCols.has('revenueTarget') && (
                      <td className="px-2 py-1.5" onClick={() => selectPerson(person.id)}>
                        <div onClick={(e) => e.stopPropagation()}>
                          <EditableCell
                            value={person.revenueTarget}
                            onSave={(val) => handleSave(person.id, 'revenueTarget', val)}
                            type="number"
                            formatter={formatCurrency}
                          />
                        </div>
                      </td>
                    )}
                    {visibleOptionalCols.has('pipelineValue') && (
                      <td className="px-2 py-1.5" onClick={() => selectPerson(person.id)}>
                        <div onClick={(e) => e.stopPropagation()}>
                          <EditableCell
                            value={person.pipelineValue}
                            onSave={(val) => handleSave(person.id, 'pipelineValue', val)}
                            type="number"
                            formatter={formatCurrency}
                          />
                        </div>
                      </td>
                    )}
                    {visibleOptionalCols.has('priorYearOCE') && (
                      <td className="px-2 py-1.5" onClick={() => selectPerson(person.id)}>
                        <div onClick={(e) => e.stopPropagation()}>
                          <EditableCell
                            value={person.priorYearOCE}
                            onSave={(val) => handleSave(person.id, 'priorYearOCE', val)}
                            type="number"
                            formatter={formatCurrency}
                          />
                        </div>
                      </td>
                    )}
                    {visibleOptionalCols.has('employmentType') && (
                      <td className="px-2 py-1.5" onClick={() => selectPerson(person.id)}>
                        <div onClick={(e) => e.stopPropagation()}>
                          <EditableCell
                            value={person.employmentType}
                            onSave={(val) => handleSave(person.id, 'employmentType', val)}
                            type="select"
                            options={EMPLOYMENT_OPTIONS as string[]}
                          />
                        </div>
                      </td>
                    )}
                    {visibleOptionalCols.has('skillsTags') && (
                      <td className="px-2 py-1.5 relative" onClick={() => selectPerson(person.id)}>
                        <div onClick={(e) => e.stopPropagation()}>
                          <EditableCell
                            value={formatTags(person.skillsTags)}
                            onSave={() => setActiveTagEditor({ personId: person.id, field: 'skillsTags' })}
                            type="tags"
                          />
                          {activeTagEditor?.personId === person.id && activeTagEditor?.field === 'skillsTags' && (
                            <TagEditor
                              tags={person.skillsTags}
                              onSave={(newTags) => handleTagsSave(person.id, 'skillsTags', newTags)}
                              onClose={() => setActiveTagEditor(null)}
                              color="teal"
                            />
                          )}
                        </div>
                      </td>
                    )}
                    {visibleOptionalCols.has('needsTags') && (
                      <td className="px-2 py-1.5 relative" onClick={() => selectPerson(person.id)}>
                        <div onClick={(e) => e.stopPropagation()}>
                          <EditableCell
                            value={formatTags(person.needsTags)}
                            onSave={() => setActiveTagEditor({ personId: person.id, field: 'needsTags' })}
                            type="tags"
                          />
                          {activeTagEditor?.personId === person.id && activeTagEditor?.field === 'needsTags' && (
                            <TagEditor
                              tags={person.needsTags}
                              onSave={(newTags) => handleTagsSave(person.id, 'needsTags', newTags)}
                              onClose={() => setActiveTagEditor(null)}
                              color="orange"
                            />
                          )}
                        </div>
                      </td>
                    )}
                    {visibleOptionalCols.has('baseSalary') && (
                      <td className="px-2 py-1.5" onClick={() => selectPerson(person.id)}>
                        <div onClick={(e) => e.stopPropagation()}>
                          <EditableCell
                            value={person.baseSalary}
                            onSave={(val) => handleSave(person.id, 'baseSalary', val)}
                            type="number"
                            formatter={formatCurrency}
                          />
                        </div>
                      </td>
                    )}
                    {visibleOptionalCols.has('totalOTE') && (
                      <td className="px-2 py-1.5" onClick={() => selectPerson(person.id)}>
                        <div onClick={(e) => e.stopPropagation()}>
                          <EditableCell
                            value={person.totalOTE}
                            onSave={(val) => handleSave(person.id, 'totalOTE', val)}
                            type="number"
                            formatter={formatCurrency}
                          />
                        </div>
                      </td>
                    )}
                    {visibleOptionalCols.has('photoUrl') && (
                      <td className="px-2 py-1.5" onClick={() => selectPerson(person.id)}>
                        <div className="flex items-center gap-1">
                          {person.photoUrl ? (
                            <img src={person.photoUrl} alt="" className="w-5 h-5 rounded-full" />
                          ) : (
                            <span className="text-[10px] text-gray-400">{'\u2014'}</span>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-gray-400 dark:text-gray-500">
            No personnel found matching the current filters.
          </div>
        )}
      </div>
    </div>
  );
}
