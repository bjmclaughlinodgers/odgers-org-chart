import React, { useState } from 'react';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useOrgStore } from '../../stores/orgStore';
import { PRACTICE_COLORS, BAND_ORDER } from '../../types';
import { DEFAULT_PRACTICE_AREAS } from '../../types/enums';

export function OrgChartControls() {
  const { collapsedPractices, toggleCollapsedPractice, collapsedBandLevel, setCollapsedBandLevel, officeFilter, setOfficeFilter } = useUIStore();
  const [expanded, setExpanded] = useState(false);

  // Also get custom practices from org store
  const allPractices = [...DEFAULT_PRACTICE_AREAS, 'Central'];

  return (
    <div className="absolute top-2 left-2 z-20">
      <button
        onClick={() => setExpanded(!expanded)}
        className="bg-white dark:bg-[#1a2332] rounded-lg shadow-md dark:shadow-gray-900/40 border border-gray-200 dark:border-gray-700 p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        title="Chart Controls"
      >
        <SlidersHorizontal size={16} className="text-gray-600 dark:text-gray-400" />
      </button>
      {expanded && (
        <div className="mt-1 bg-white dark:bg-[#1a2332] rounded-xl shadow-lg dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 p-3 w-60 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Chart Controls</span>
            <button onClick={() => setExpanded(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
              <ChevronDown size={14} />
            </button>
          </div>

          {/* Practice Areas */}
          <div className="mb-3">
            <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Practice Areas</div>
            <div className="space-y-1">
              {allPractices.map(pa => {
                const color = PRACTICE_COLORS[pa as keyof typeof PRACTICE_COLORS] || '#36454F';
                const isVisible = !collapsedPractices.includes(pa);
                return (
                  <label key={pa} className="flex items-center gap-2 text-[11px] text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded px-1 py-0.5 transition-colors">
                    <input
                      type="checkbox"
                      checked={isVisible}
                      onChange={() => toggleCollapsedPractice(pa)}
                      className="rounded border-gray-300 dark:border-gray-600 text-teal-600 w-3.5 h-3.5"
                    />
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="truncate">{pa}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Office Filter */}
          <div className="mb-3 border-t border-gray-100 dark:border-gray-800 pt-3">
            <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Offices</div>
            <div className="space-y-1">
              {['New York', 'Washington DC', 'Boston', 'Austin', 'Atlanta', 'Remote'].map(office => {
                const isVisible = officeFilter.length === 0 || officeFilter.includes(office);
                return (
                  <label key={office} className="flex items-center gap-2 text-[11px] text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded px-1 py-0.5 transition-colors">
                    <input
                      type="checkbox"
                      checked={isVisible}
                      onChange={() => {
                        if (officeFilter.length === 0) {
                          // First uncheck: set all EXCEPT this one
                          setOfficeFilter(['New York', 'Washington DC', 'Boston', 'Austin', 'Atlanta', 'Remote'].filter(o => o !== office));
                        } else if (officeFilter.includes(office)) {
                          const next = officeFilter.filter(o => o !== office);
                          setOfficeFilter(next.length === 0 ? [] : next);
                        } else {
                          const next = [...officeFilter, office];
                          // If all are now selected, clear to empty (means "all")
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

          {/* Band Depth */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
            <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Depth Level</div>
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
              <span>Leadership</span>
            </div>

            {/* Quick presets */}
            <div className="flex gap-1 mt-2">
              {[
                { label: 'All', level: 0 },
                { label: 'Through EM', level: 7 },
                { label: 'Leadership', level: 11 },
              ].map(({ label, level }) => (
                <button
                  key={label}
                  onClick={() => setCollapsedBandLevel(level)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all duration-200 ${
                    collapsedBandLevel === level
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
