import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useOrgData } from '../../hooks/useOrgData';
import { searchPeople, initSearch } from '../../utils/search';
import { PRACTICE_COLORS } from '../../types';
import type { Person } from '../../types';

export function SearchModal() {
  const { searchModalOpen, setSearchModalOpen, selectPerson } = useUIStore();
  const { people } = useOrgData();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Person[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchModalOpen) {
      initSearch(people);
      setQuery('');
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [searchModalOpen, people]);

  useEffect(() => {
    if (query.length >= 2) {
      setResults(searchPeople(query).slice(0, 15));
    } else {
      setResults([]);
    }
  }, [query]);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchModalOpen(!searchModalOpen);
      }
      if (e.key === 'Escape' && searchModalOpen) {
        setSearchModalOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [searchModalOpen, setSearchModalOpen]);

  if (!searchModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={() => setSearchModalOpen(false)}>
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-[#1a2332] rounded-xl shadow-2xl dark:shadow-gray-900/50 w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <Search size={18} className="text-gray-400 dark:text-gray-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search people, titles, practices, skills..."
            className="flex-1 text-sm outline-none bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
          />
          <button onClick={() => setSearchModalOpen(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={16} className="text-gray-400 dark:text-gray-500" />
          </button>
        </div>

        {results.length > 0 && (
          <div className="max-h-[400px] overflow-y-auto py-2">
            {results.map(person => (
              <button
                key={person.id}
                onClick={() => { selectPerson(person.id); setSearchModalOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: PRACTICE_COLORS[person.practiceArea as keyof typeof PRACTICE_COLORS] || '#36454F' }}
                />
                <div className="text-left flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {person.firstName} {person.lastName}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {person.title} · {person.practiceArea} · {person.office}
                  </div>
                </div>
                {person.isRevenueProducer && person.currentYearOCE && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                    ${(person.currentYearOCE / 1000000).toFixed(1)}M
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {query.length >= 2 && results.length === 0 && (
          <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">No results found</div>
        )}

        {query.length < 2 && (
          <div className="py-6 text-center text-xs text-gray-400 dark:text-gray-500">Type at least 2 characters to search</div>
        )}
      </div>
    </div>
  );
}
