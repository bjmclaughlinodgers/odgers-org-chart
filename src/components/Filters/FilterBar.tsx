import React from 'react';
import { X, Palette } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import type { ColorCoding, PracticeArea } from '../../types';
import { PRACTICE_COLORS } from '../../types';

const practiceAreas: (PracticeArea | 'Central')[] = [
  'Financial Services', 'Industrial', 'Technology', 'Aerospace & Defense',
  'Not for Profit', 'US Associations & Corporate Affairs', 'Life Sciences', 'Central'
];

const offices = ['New York', 'Washington DC', 'Boston', 'Austin', 'Atlanta', 'Remote'];
const bands = ['Senior Leadership', 'Revenue Producer', 'Engagement Management', 'Research & Execution', 'Research & Analysis', 'Research Leadership', 'Project Coordination', 'Operations Leadership', 'Finance', 'IT', 'Marketing', 'Knowledge Management', 'Operations & Admin'];
const performanceRatings = ['Star Performer', 'Performer', 'Performance Improvement'];
const colorOptions: { id: ColorCoding; label: string }[] = [
  { id: 'practiceArea', label: 'Practice' },
  { id: 'performance', label: 'Performance' },
  { id: 'band', label: 'Band' },
  { id: 'office', label: 'Office' },
];

export function FilterBar() {
  const {
    practiceAreaFilter, setPracticeAreaFilter,
    bandFilter, setBandFilter,
    officeFilter, setOfficeFilter,
    performanceFilter, setPerformanceFilter,
    colorCoding, setColorCoding,
    showOpenSeats, toggleOpenSeats,
    showSupportLines, toggleSupportLines,
    showRevenueLabels, toggleRevenueLabels,
    clearFilters,
  } = useUIStore();

  const hasFilters = practiceAreaFilter.length || bandFilter.length || officeFilter.length || performanceFilter.length;

  const toggleFilter = (current: string[], value: string, setter: (v: string[]) => void) => {
    setter(current.includes(value) ? current.filter(v => v !== value) : [...current, value]);
  };

  return (
    <div className="bg-white dark:bg-[#1a2332] border-b border-gray-200 dark:border-gray-700 px-4 py-2">
      <div className="flex items-center gap-4 flex-wrap">
        {/* Practice Area Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mr-1">Practice:</span>
          {practiceAreas.map(pa => (
            <button
              key={pa}
              onClick={() => toggleFilter(practiceAreaFilter, pa, setPracticeAreaFilter)}
              className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-all duration-200 ${
                practiceAreaFilter.includes(pa)
                  ? 'text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              style={practiceAreaFilter.includes(pa) ? { backgroundColor: PRACTICE_COLORS[pa] } : {}}
            >
              {pa === 'US Associations & Corporate Affairs' ? 'US Assoc' : pa === 'Aerospace & Defense' ? 'A&D' : pa}
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />

        {/* Color Coding */}
        <div className="flex items-center gap-1.5">
          <Palette size={13} className="text-gray-400 dark:text-gray-500" />
          {colorOptions.map(opt => (
            <button
              key={opt.id}
              onClick={() => setColorCoding(opt.id)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all duration-200 ${
                colorCoding === opt.id
                  ? 'bg-[#00857C] text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />

        {/* Toggles */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-400 cursor-pointer">
            <input type="checkbox" checked={showOpenSeats} onChange={toggleOpenSeats} className="rounded border-gray-300 dark:border-gray-600 text-[#00857C] focus:ring-[#00857C] w-3.5 h-3.5" />
            Open Seats
          </label>
          <label className="flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-400 cursor-pointer">
            <input type="checkbox" checked={showSupportLines} onChange={toggleSupportLines} className="rounded border-gray-300 dark:border-gray-600 text-[#00857C] focus:ring-[#00857C] w-3.5 h-3.5" />
            Support Lines
          </label>
          <label className="flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-400 cursor-pointer">
            <input type="checkbox" checked={showRevenueLabels} onChange={toggleRevenueLabels} className="rounded border-gray-300 dark:border-gray-600 text-[#00857C] focus:ring-[#00857C] w-3.5 h-3.5" />
            Revenue
          </label>
        </div>

        {/* Clear Filters */}
        {hasFilters ? (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
          >
            <X size={12} />
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}
