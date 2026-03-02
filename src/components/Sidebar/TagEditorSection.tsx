import React from 'react';
import { X } from 'lucide-react';
import { TagTypeahead } from '../shared/TagTypeahead';

interface TagEditorSectionProps {
  label: string;
  tags: string[];
  onUpdate: (newTags: string[]) => void;
  color: 'teal' | 'orange' | 'purple';
  placeholder?: string;
  allKnownTags?: string[];
}

const COLOR_CLASSES: Record<string, { bg: string; text: string; hoverX: string }> = {
  teal: { bg: 'bg-teal-50', text: 'text-teal-700', hoverX: 'hover:text-teal-900 hover:bg-teal-100' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', hoverX: 'hover:text-orange-900 hover:bg-orange-100' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', hoverX: 'hover:text-purple-900 hover:bg-purple-100' },
};

export function TagEditorSection({
  label,
  tags,
  onUpdate,
  color,
  placeholder = 'Add tag...',
  allKnownTags,
}: TagEditorSectionProps) {
  const colors = COLOR_CLASSES[color];

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed === '') return;
    if (tags.some(t => t.toLowerCase() === trimmed.toLowerCase())) return;
    onUpdate([...tags, trimmed]);
  };

  const removeTag = (tagToRemove: string) => {
    onUpdate(tags.filter(t => t !== tagToRemove));
  };

  return (
    <div className="mb-2">
      <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">{label}</div>
      <div className="flex flex-wrap gap-1">
        {tags.length > 0 ? (
          tags.map(tag => (
            <span
              key={tag}
              className={`inline-flex items-center gap-0.5 text-[10px] ${colors.bg} ${colors.text} px-1.5 py-0.5 rounded`}
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className={`ml-0.5 rounded-sm ${colors.hoverX}`}
                title={`Remove ${tag}`}
              >
                <X size={9} />
              </button>
            </span>
          ))
        ) : (
          <span className="text-[10px] text-gray-400 dark:text-gray-500 italic">None set</span>
        )}
      </div>
      <div className="mt-1.5">
        <TagTypeahead
          existingTags={tags}
          allKnownTags={allKnownTags || []}
          onAdd={addTag}
          placeholder={placeholder}
          color={color}
        />
      </div>
    </div>
  );
}
