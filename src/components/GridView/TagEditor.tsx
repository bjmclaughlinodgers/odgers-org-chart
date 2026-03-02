import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { TagTypeahead } from '../shared/TagTypeahead';

interface TagEditorProps {
  tags: string[];
  onSave: (newTags: string[]) => void;
  onClose: () => void;
  color?: 'teal' | 'orange';
  allKnownTags?: string[];
}

const COLOR_CLASSES = {
  teal: {
    pill: 'bg-teal-100 text-teal-800',
    pillHover: 'hover:bg-teal-200',
    button: 'bg-teal-600 hover:bg-teal-700 text-white',
  },
  orange: {
    pill: 'bg-orange-100 text-orange-800',
    pillHover: 'hover:bg-orange-200',
    button: 'bg-orange-600 hover:bg-orange-700 text-white',
  },
};

export function TagEditor({ tags, onSave, onClose, color = 'teal', allKnownTags }: TagEditorProps) {
  const [localTags, setLocalTags] = useState<string[]>([...tags]);
  const containerRef = useRef<HTMLDivElement>(null);
  const colors = COLOR_CLASSES[color];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onSave(localTags);
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [localTags, onSave, onClose]);

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed === '') return;
    if (localTags.some(t => t.toLowerCase() === trimmed.toLowerCase())) return;
    setLocalTags(prev => [...prev, trimmed]);
  };

  const removeTag = (idx: number) => {
    setLocalTags(prev => prev.filter((_, i) => i !== idx));
  };

  const handleDone = () => {
    onSave(localTags);
    onClose();
  };

  return (
    <div
      ref={containerRef}
      className="absolute z-50 top-full left-0 mt-1 bg-white dark:bg-[#1a2332] border border-gray-200 dark:border-gray-700 shadow-lg dark:shadow-gray-900/50 rounded-xl max-w-[280px] min-w-[200px] p-3"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Tags list */}
      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[24px]">
        {localTags.length === 0 && (
          <span className="text-[10px] text-gray-400 dark:text-gray-500 italic">No tags</span>
        )}
        {localTags.map((tag, idx) => (
          <span
            key={`${tag}-${idx}`}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${colors.pill}`}
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(idx);
              }}
              className={`rounded-full p-0.5 ${colors.pillHover} transition-colors`}
            >
              <X size={8} />
            </button>
          </span>
        ))}
      </div>

      {/* Typeahead input */}
      <TagTypeahead
        existingTags={localTags}
        allKnownTags={allKnownTags || []}
        onAdd={addTag}
        placeholder="Add tag..."
        color={color}
      />

      {/* Done button */}
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleDone();
          }}
          className="text-[10px] font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}
