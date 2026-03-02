import React, { useState, useRef, useEffect } from 'react';
import { Edit3, Check, X } from 'lucide-react';

interface EditableFieldProps {
  label: string;
  value: string | number | null;
  onSave: (newValue: string | number | null) => void;
  type?: 'text' | 'number' | 'select' | 'date';
  options?: string[];
  icon?: React.ReactNode;
  formatter?: (val: any) => string;
}

export function EditableField({
  label,
  value,
  onSave,
  type = 'text',
  options = [],
  icon,
  formatter,
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const selectRef = useRef<HTMLSelectElement | null>(null);

  useEffect(() => {
    if (editing) {
      if (type === 'select') {
        selectRef.current?.focus();
      } else {
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
  }, [editing, type]);

  const startEdit = () => {
    setDraft(value === null || value === undefined ? '' : String(value));
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const saveEdit = () => {
    let newValue: string | number | null;
    if (draft.trim() === '') {
      newValue = null;
    } else if (type === 'number') {
      const parsed = Number(draft);
      newValue = isNaN(parsed) ? null : parsed;
    } else {
      newValue = draft.trim();
    }
    onSave(newValue);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    const newValue = selected === '' ? null : selected;
    onSave(newValue);
    setEditing(false);
  };

  const displayValue = formatter && value !== null && value !== undefined
    ? formatter(value)
    : (value === null || value === undefined ? '' : String(value));

  return (
    <div className="group flex items-start gap-2 py-1.5">
      {icon && <span className="text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0">{icon}</span>}
      <div className="min-w-0 flex-1">
        <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">{label}</div>
        {editing ? (
          <div className="mt-0.5">
            {type === 'select' ? (
              <select
                ref={selectRef}
                value={draft}
                onChange={handleSelectChange}
                onBlur={cancelEdit}
                className="w-full text-xs border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#00857C] bg-white dark:bg-[#0f1419] text-gray-900 dark:text-gray-100"
              >
                <option value="">-- None --</option>
                {options.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-1">
                <input
                  ref={inputRef}
                  type={type}
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={saveEdit}
                  className="flex-1 min-w-0 text-xs border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#00857C] bg-white dark:bg-[#0f1419] text-gray-900 dark:text-gray-100"
                />
                <button
                  onMouseDown={e => { e.preventDefault(); saveEdit(); }}
                  className="p-0.5 text-green-600 hover:text-green-700 dark:text-green-500 dark:hover:text-green-400"
                  title="Save"
                >
                  <Check size={12} />
                </button>
                <button
                  onMouseDown={e => { e.preventDefault(); cancelEdit(); }}
                  className="p-0.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  title="Cancel"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-xs text-gray-800 dark:text-gray-200">{displayValue || '\u2014'}</span>
            <button
              onClick={startEdit}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-gray-400 hover:text-[#00857C]"
              title={`Edit ${label}`}
            >
              <Edit3 size={10} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
