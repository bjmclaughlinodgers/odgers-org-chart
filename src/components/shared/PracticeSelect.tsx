import { useState, useRef, useEffect } from 'react';
import { Plus, X, Check } from 'lucide-react';
import { useOrgStore } from '../../stores/orgStore';
import { getDynamicPracticeOptions } from '../../constants/editOptions';
import { PRACTICE_COLORS } from '../../types/enums';

/* =========================================================
   PracticeSelect — drop-in replacement for a <select> that
   lists dynamic practices AND has a "+ New Practice" option
   that opens an inline input for name + color.
   ========================================================= */

interface PracticeSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  /** If true, shows a compact inline add form. Default: true */
  allowNew?: boolean;
}

/** Small color palette for new practices */
const COLOR_PALETTE = [
  '#00857C', '#2F3C7E', '#B85042', '#6D2E46', '#065A82', '#028090',
  '#2C5F2D', '#8B4513', '#5B2C6F', '#1A5276', '#7D3C98', '#117A65',
];

export function PracticeSelect({ value, onChange, className = '', allowNew = true }: PracticeSelectProps) {
  const addPractice = useOrgStore(s => s.addPractice);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLOR_PALETTE[0]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showNew && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showNew]);

  const options = getDynamicPracticeOptions();

  const handleSelectChange = (selectValue: string) => {
    if (selectValue === '__new_practice__') {
      setShowNew(true);
    } else {
      onChange(selectValue);
    }
  };

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    // Check for duplicate (case-insensitive)
    if (options.some(o => o.toLowerCase() === trimmed.toLowerCase())) {
      // Already exists — just select it
      const existing = options.find(o => o.toLowerCase() === trimmed.toLowerCase());
      if (existing) onChange(existing);
      setShowNew(false);
      setNewName('');
      return;
    }
    addPractice(trimmed, newColor);
    onChange(trimmed);
    setShowNew(false);
    setNewName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreate();
    } else if (e.key === 'Escape') {
      setShowNew(false);
      setNewName('');
    }
  };

  if (showNew) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <input
            ref={inputRef}
            type="text"
            className={`flex-1 text-sm px-3 py-2 rounded-lg border border-[#00857C] dark:border-teal-500
              bg-white dark:bg-[#0f1419] text-gray-900 dark:text-gray-100
              placeholder:text-gray-400 dark:placeholder:text-gray-600
              focus:outline-none focus:ring-2 focus:ring-[#00857C]/30 dark:focus:ring-teal-500/30
              transition-all duration-200`}
            placeholder="New practice name..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim()}
            className="p-2 rounded-lg bg-[#00857C] dark:bg-teal-600 text-white
                       hover:bg-[#006b63] dark:hover:bg-teal-500 transition-colors duration-200
                       disabled:opacity-40 disabled:cursor-not-allowed"
            title="Create practice"
          >
            <Check size={14} />
          </button>
          <button
            onClick={() => { setShowNew(false); setNewName(''); }}
            className="p-2 rounded-lg text-gray-400 dark:text-gray-500
                       hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors duration-200"
            title="Cancel"
          >
            <X size={14} />
          </button>
        </div>
        {/* Color picker row */}
        <div className="flex items-center gap-1 pl-0.5">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mr-1">
            Color:
          </span>
          {COLOR_PALETTE.map(c => (
            <button
              key={c}
              onClick={() => setNewColor(c)}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                newColor === c
                  ? 'border-gray-800 dark:border-white scale-125'
                  : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
              }`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <select
      className={className}
      value={value}
      onChange={e => handleSelectChange(e.target.value)}
    >
      {options.map(p => (
        <option key={p} value={p}>{p}</option>
      ))}
      {allowNew && (
        <option value="__new_practice__">+ New Practice...</option>
      )}
    </select>
  );
}

export default PracticeSelect;
