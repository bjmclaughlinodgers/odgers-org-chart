import React, { useState } from 'react';
import { SlidersHorizontal, ChevronDown, Target, X, Bookmark, Trash2, Eye, EyeOff } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useOrgStore } from '../../stores/orgStore';
import { PRACTICE_COLORS, BAND_ORDER } from '../../types';
import { getDynamicPracticeOptions } from '../../constants/editOptions';

// Band level quick presets
const BAND_PRESETS = [
  { label: 'All', level: 0, title: 'Show all levels' },
  { label: 'Executive', level: 11, title: 'Senior Leadership + Revenue Producers only' },
  { label: 'Mid-Level', level: 7, title: 'Through Engagement Management and Research' },
  { label: 'Operations', level: 5, title: 'Through Operations & Project Coordination' },
];

export function OrgChartControls() {
  const {
    collapsedPractices,
    toggleCollapsedPractice,
    setCollapsedPractices,
    collapsedBandLevel,
    setCollapsedBandLevel,
    officeFilter,
    setOfficeFilter,
    showOpenSeats,
    toggleOpenSeats,
    showPursuitTargets,
    togglePursuitTargets,
    savedChartViews,
    saveChartView,
    loadChartView,
    deleteChartView,
  } = useUIStore();

  const { customPractices } = useOrgStore();

  const [expanded, setExpanded] = useState(false);
  const [hoveredPractice, setHoveredPractice] = useState<string | null>(null);
  const [savingView, setSavingView] = useState(false);
  const [newViewName, setNewViewName] = useState('');

  // All practices including custom ones
  const allPractices = getDynamicPracticeOptions();
  const hasFocus = collapsedPractices.length > 0;

  const focusPractice = (practice: string) => {
    setCollapsedPractices(allPractices.filter(p => p !== practice));
  };

  const clearFocus = () => {
    setCollapsedPractices([]);
  };

  const handleSaveView = () => {
    const name = newViewName.trim();
    if (!name) return;
    saveChartView(name);
    setNewViewName('');
    setSavingView(false);
  };

  return (
    <div className="absolute top-2 left-2 z-20">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`bg-white dark:bg-[#1a2332] rounded-lg shadow-md dark:shadow-gray-900/40 border
          ${hasFocus ? 'border-[#00857C] dark:border-teal-500' : 'border-gray-200 dark:border-gray-700'}
          p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`}
        title="Chart Controls"
      >
        <SlidersHorizontal
          size={16}
          className={hasFocus ? 'text-[#00857C] dark:text-teal-400' : 'text-gray-600 dark:text-gray-400'}
        />
      </button>

      {expanded && (
        <div className="mt-1 bg-white dark:bg-[#1a2332] rounded-xl shadow-lg dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 p-3 w-64 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Chart Controls</span>
            <button onClick={() => setExpanded(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
              <ChevronDown size={14} />
            </button>
          </div>

          {/* ── Saved Views ── */}
          {(savedChartViews.length > 0 || savingView) && (
            <div className="mb-3">
              <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Saved Views</div>
              <div className="flex flex-wrap gap-1 mb-1.5">
                {savedChartViews.map(view => (
                  <div key={view.id} className="flex items-center gap-0.5 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700/50 rounded-full pl-2 pr-1 py-0.5">
                    <button
                      onClick={() => loadChartView(view.id)}
                      className="text-[10px] font-medium text-teal-700 dark:text-teal-300 hover:text-teal-900 dark:hover:text-teal-100 transition-colors"
                    >
                      {view.name}
                    </button>
                    <button
                      onClick={() => deleteChartView(view.id)}
                      className="ml-0.5 text-teal-400 dark:text-teal-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      title="Delete view"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save view form / button */}
          <div className="mb-3">
            {savingView ? (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  type="text"
                  value={newViewName}
                  onChange={e => setNewViewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveView(); if (e.key === 'Escape') { setSavingView(false); setNewViewName(''); }}}
                  placeholder="View name..."
                  className="flex-1 text-[11px] px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700
                    bg-white dark:bg-[#0f1419] text-gray-900 dark:text-gray-100
                    focus:outline-none focus:ring-1 focus:ring-[#00857C] dark:focus:ring-teal-500"
                />
                <button
                  onClick={handleSaveView}
                  disabled={!newViewName.trim()}
                  className="text-[10px] font-semibold text-white bg-[#00857C] dark:bg-teal-600 px-2 py-1 rounded-md
                    hover:bg-[#006b63] dark:hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Save
                </button>
                <button onClick={() => { setSavingView(false); setNewViewName(''); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSavingView(true)}
                className="flex items-center gap-1.5 text-[10px] font-medium text-gray-500 dark:text-gray-400
                  hover:text-[#00857C] dark:hover:text-teal-400 transition-colors"
              >
                <Bookmark size={11} />
                Save current view...
              </button>
            )}
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800 pt-3 mb-3">
            {/* Clear Focus banner */}
            {hasFocus && (
              <div className="flex items-center justify-between mb-2 px-1.5 py-1 rounded-lg bg-[#00857C]/8 dark:bg-teal-900/20 border border-[#00857C]/20 dark:border-teal-700/40">
                <span className="text-[10px] font-semibold text-[#00857C] dark:text-teal-400">
                  {collapsedPractices.length} practice{collapsedPractices.length !== 1 ? 's' : ''} hidden
                </span>
                <button
                  onClick={clearFocus}
                  className="flex items-center gap-0.5 text-[10px] font-semibold text-[#00857C] dark:text-teal-400 hover:underline"
                >
                  <X size={10} /> Clear
                </button>
              </div>
            )}

            {/* Practice Areas */}
            <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Practice Areas</div>
            <div className="space-y-0.5">
              {allPractices.map(pa => {
                const color = PRACTICE_COLORS[pa as keyof typeof PRACTICE_COLORS] || '#36454F';
                const isVisible = !collapsedPractices.includes(pa);
                const isHovered = hoveredPractice === pa;
                return (
                  <div
                    key={pa}
                    className="flex items-center gap-1.5 rounded px-1 py-0.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                    onMouseEnter={() => setHoveredPractice(pa)}
                    onMouseLeave={() => setHoveredPractice(null)}
                  >
                    <input
                      type="checkbox"
                      checked={isVisible}
                      onChange={() => toggleCollapsedPractice(pa)}
                      className="rounded border-gray-300 dark:border-gray-600 text-teal-600 w-3.5 h-3.5 flex-shrink-0"
                    />
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-[11px] text-gray-700 dark:text-gray-300 truncate flex-1 cursor-pointer" onClick={() => toggleCollapsedPractice(pa)}>
                      {pa}
                    </span>
                    <button
                      onClick={() => focusPractice(pa)}
                      className={`flex-shrink-0 transition-all duration-150 ${
                        isHovered
                          ? 'opacity-100 text-[#00857C] dark:text-teal-400 hover:text-[#006b63]'
                          : 'opacity-0 text-gray-300'
                      }`}
                      title={`Focus on ${pa} only`}
                    >
                      <Target size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Visibility Toggles ── */}
          <div className="mb-3 border-t border-gray-100 dark:border-gray-800 pt-3">
            <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Visibility</div>
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-[11px] text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded px-1 py-0.5">
                <input
                  type="checkbox"
                  checked={showOpenSeats}
                  onChange={toggleOpenSeats}
                  className="rounded border-gray-300 dark:border-gray-600 text-teal-600 w-3.5 h-3.5"
                />
                <span className="w-2 h-2 rounded-full flex-shrink-0 border border-dashed border-teal-400" />
                Open Seats
              </label>
              <label className="flex items-center gap-2 text-[11px] text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded px-1 py-0.5">
                <input
                  type="checkbox"
                  checked={showPursuitTargets}
                  onChange={togglePursuitTargets}
                  className="rounded border-gray-300 dark:border-gray-600 text-amber-500 w-3.5 h-3.5"
                />
                <span className="w-2 h-2 rounded-full flex-shrink-0 border border-dashed border-amber-400" />
                Pursuit Targets
              </label>
            </div>
          </div>

          {/* ── Office Filter ── */}
          <div className="mb-3 border-t border-gray-100 dark:border-gray-800 pt-3">
            <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Offices</div>
            <div className="space-y-0.5">
              {['New York', 'Washington DC', 'Boston', 'Austin', 'Atlanta', 'Remote'].map(office => {
                const isVisible = officeFilter.length === 0 || officeFilter.includes(office);
                return (
                  <label key={office} className="flex items-center gap-2 text-[11px] text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded px-1 py-0.5 transition-colors">
                    <input
                      type="checkbox"
                      checked={isVisible}
                      onChange={() => {
                        if (officeFilter.length === 0) {
                          setOfficeFilter(['New York', 'Washington DC', 'Boston', 'Austin', 'Atlanta', 'Remote'].filter(o => o !== office));
                        } else if (officeFilter.includes(office)) {
                          const next = officeFilter.filter(o => o !== office);
                          setOfficeFilter(next.length === 0 ? [] : next);
                        } else {
                          const next = [...officeFilter, office];
                          if (next.length === 6) setOfficeFilter([]);
                          else setOfficeFilter(next);
                        }
                      }}
                      className="rounded border-gray-300 dark:border-gray-600 text-teal-600 w-3.5 h-3.5"
                    />
                    <span className="truncate">{office}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* ── Band Depth ── */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
            <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Hierarchy Depth</div>

            {/* Quick preset chips */}
            <div className="flex flex-wrap gap-1 mb-2">
              {BAND_PRESETS.map(({ label, level, title }) => (
                <button
                  key={label}
                  onClick={() => setCollapsedBandLevel(level)}
                  title={title}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all duration-200 ${
                    collapsedBandLevel === level
                      ? 'bg-[#00857C] dark:bg-teal-600 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <input
              type="range"
              min={0}
              max={BAND_ORDER.length}
              value={collapsedBandLevel}
              onChange={e => setCollapsedBandLevel(Number(e.target.value))}
              className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-teal-600"
            />
            <div className="flex justify-between text-[9px] text-gray-400 dark:text-gray-500 mt-1">
              <span>All Levels</span>
              <span>Leadership Only</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
