import React, { useState, useRef, useEffect } from 'react';

interface TagTypeaheadProps {
  existingTags: string[];
  allKnownTags: string[];
  onAdd: (tag: string) => void;
  placeholder?: string;
  color?: 'teal' | 'orange' | 'purple';
}

const colorClasses = {
  teal: 'border-teal-300 focus:ring-teal-500',
  orange: 'border-orange-300 focus:ring-orange-500',
  purple: 'border-purple-300 focus:ring-purple-500',
};

const suggestionHighlight = {
  teal: 'bg-teal-50 text-teal-800',
  orange: 'bg-orange-50 text-orange-800',
  purple: 'bg-purple-50 text-purple-800',
};

export function TagTypeahead({ existingTags, allKnownTags, onAdd, placeholder = 'Add tag...', color = 'teal' }: TagTypeaheadProps) {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const existingLower = new Set(existingTags.map(t => t.toLowerCase()));

  const suggestions = query.length >= 1
    ? allKnownTags
        .filter(t =>
          t.toLowerCase().includes(query.toLowerCase()) &&
          !existingLower.has(t.toLowerCase())
        )
        .slice(0, 8)
    : [];

  const handleAdd = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (existingLower.has(trimmed.toLowerCase())) return;
    onAdd(trimmed);
    setQuery('');
    setShowSuggestions(false);
    setSelectedIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0 && showSuggestions) {
        handleAdd(suggestions[selectedIndex] || query);
      } else {
        handleAdd(query);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setShowSuggestions(true); }}
        onFocus={() => query.length >= 1 && setShowSuggestions(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full text-xs border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 bg-white dark:bg-[#0f1419] text-gray-900 dark:text-gray-100 ${colorClasses[color]}`}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-[#1a2332] border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg dark:shadow-gray-900/50 max-h-48 overflow-y-auto"
        >
          {suggestions.map((tag, idx) => (
            <button
              key={tag}
              onClick={() => handleAdd(tag)}
              className={`w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                idx === selectedIndex ? suggestionHighlight[color] : ''
              }`}
            >
              {tag}
            </button>
          ))}
          {query.trim() && !suggestions.some(s => s.toLowerCase() === query.toLowerCase()) && (
            <button
              onClick={() => handleAdd(query)}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 transition-colors"
            >
              Create "{query.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}
