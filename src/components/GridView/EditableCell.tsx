import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Pencil } from 'lucide-react';

interface EditableCellProps {
  value: string | number | null;
  onSave: (newValue: string | number | null) => void;
  type: 'text' | 'number' | 'select' | 'tags' | 'readonly';
  options?: string[];
  formatter?: (val: any) => string;
  className?: string;
}

export function EditableCell({ value, onSave, type, options = [], formatter, className = '' }: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(value != null ? String(value) : '');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const selectRef = useRef<HTMLSelectElement | null>(null);

  useEffect(() => {
    setDraft(value != null ? String(value) : '');
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
    if (editing && selectRef.current) {
      selectRef.current.focus();
    }
  }, [editing]);

  const displayValue = useCallback(() => {
    if (value == null || value === '') return '\u2014';
    if (formatter) return formatter(value);
    return String(value);
  }, [value, formatter]);

  const commitText = useCallback(() => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed === (value != null ? String(value) : '')) return;
    onSave(trimmed === '' ? null : trimmed);
  }, [draft, value, onSave]);

  const commitNumber = useCallback(() => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed === '') {
      if (value !== null) onSave(null);
      return;
    }
    const parsed = parseFloat(trimmed);
    if (isNaN(parsed)) return;
    if (parsed !== value) onSave(parsed);
  }, [draft, value, onSave]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (type === 'number') commitNumber();
      else commitText();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setDraft(value != null ? String(value) : '');
      setEditing(false);
    }
  }, [type, commitNumber, commitText, value]);

  // Readonly: just display
  if (type === 'readonly') {
    return (
      <div className={`px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300 ${className}`}>
        {displayValue()}
      </div>
    );
  }

  // Select: click to show dropdown
  if (type === 'select') {
    if (editing) {
      return (
        <div className={`px-1 py-0.5 ${className}`}>
          <select
            ref={selectRef}
            value={value != null ? String(value) : ''}
            onChange={(e) => {
              const newVal = e.target.value;
              onSave(newVal === '' ? null : newVal);
              setEditing(false);
            }}
            onBlur={() => setEditing(false)}
            className="w-full text-xs bg-white dark:bg-[#0f1419] border border-blue-400 dark:border-blue-600 rounded px-1 py-1 outline-none ring-1 ring-blue-400 dark:ring-blue-600 cursor-pointer text-gray-900 dark:text-gray-100"
          >
            <option value="">--</option>
            {options.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      );
    }
    return (
      <div
        className={`px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors ${className}`}
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
      >
        {displayValue()}
      </div>
    );
  }

  // Tags: click to open (handled externally via onSave callback pattern)
  if (type === 'tags') {
    return (
      <div
        className={`px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors ${className}`}
        onClick={(e) => {
          e.stopPropagation();
          onSave(value);
        }}
      >
        {value != null && String(value) !== '' ? String(value) : '\u2014'}
      </div>
    );
  }

  // Text and Number: double-click to edit
  if (editing) {
    return (
      <div className={`px-1 py-0.5 ${className}`}>
        <input
          ref={inputRef}
          type={type === 'number' ? 'number' : 'text'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (type === 'number') commitNumber();
            else commitText();
          }}
          onKeyDown={handleKeyDown}
          className="w-full text-xs bg-white dark:bg-[#0f1419] border border-blue-400 dark:border-blue-600 rounded px-1.5 py-1 outline-none ring-1 ring-blue-400 dark:ring-blue-600 text-gray-900 dark:text-gray-100"
          step={type === 'number' ? 'any' : undefined}
        />
      </div>
    );
  }

  return (
    <div
      className={`group relative px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors ${className}`}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
    >
      <span className="truncate block">{displayValue()}</span>
      <Pencil
        size={10}
        className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
      />
    </div>
  );
}
