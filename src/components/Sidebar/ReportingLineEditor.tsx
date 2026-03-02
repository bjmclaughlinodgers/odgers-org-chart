import React, { useState } from 'react';
import { Edit3, X, Plus } from 'lucide-react';
import type { Person } from '../../types';

interface ReportingLineEditorProps {
  person: Person;
  people: Person[];
  onUpdateReportsTo: (newManagerId: string | null) => void;
  onUpdateSupportLines: (newLines: string[]) => void;
  onSelectPerson: (id: string) => void;
}

function wouldCreateCycle(people: Person[], targetId: string, newParentId: string): boolean {
  let current = newParentId;
  const visited = new Set<string>();
  while (current) {
    if (current === targetId) return true;
    if (visited.has(current)) return false;
    visited.add(current);
    const parent = people.find(p => p.id === current);
    current = parent?.reportsTo || '';
  }
  return false;
}

function getDescendantIds(people: Person[], rootId: string): Set<string> {
  const descendants = new Set<string>();
  const queue = [rootId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = people.filter(p => p.reportsTo === current);
    for (const child of children) {
      if (!descendants.has(child.id)) {
        descendants.add(child.id);
        queue.push(child.id);
      }
    }
  }
  return descendants;
}

export function ReportingLineEditor({
  person,
  people,
  onUpdateReportsTo,
  onUpdateSupportLines,
  onSelectPerson,
}: ReportingLineEditorProps) {
  const [editingManager, setEditingManager] = useState(false);
  const [addingSupportLine, setAddingSupportLine] = useState(false);

  const manager = person.reportsTo ? people.find(p => p.id === person.reportsTo) : null;
  const directReports = people.filter(p => p.reportsTo === person.id);
  const descendantIds = getDescendantIds(people, person.id);

  // People eligible to be this person's manager: not self, not descendants
  const eligibleManagers = people.filter(p =>
    p.id !== person.id && !descendantIds.has(p.id)
  );

  // People eligible for support lines: not self, not already in support lines
  const eligibleSupportLines = people.filter(p =>
    p.id !== person.id && !person.supportLines.includes(p.id)
  );

  const handleManagerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    if (selectedId === '') {
      onUpdateReportsTo(null);
    } else {
      if (wouldCreateCycle(people, person.id, selectedId)) {
        return; // Prevent cycle
      }
      onUpdateReportsTo(selectedId);
    }
    setEditingManager(false);
  };

  const handleAddSupportLine = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    if (selectedId === '') {
      setAddingSupportLine(false);
      return;
    }
    if (!person.supportLines.includes(selectedId)) {
      onUpdateSupportLines([...person.supportLines, selectedId]);
    }
    setAddingSupportLine(false);
  };

  const removeSupportLine = (idToRemove: string) => {
    onUpdateSupportLines(person.supportLines.filter(id => id !== idToRemove));
  };

  return (
    <div className="space-y-3">
      {/* Reports To */}
      <div>
        <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Reports To</div>
        {editingManager ? (
          <select
            autoFocus
            value={person.reportsTo || ''}
            onChange={handleManagerChange}
            onBlur={() => setEditingManager(false)}
            className="w-full text-xs border border-gray-200 dark:border-gray-700 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-[#00857C] bg-white dark:bg-[#0f1419] text-gray-900 dark:text-gray-100"
          >
            <option value="">-- None --</option>
            {eligibleManagers.map(p => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName} — {p.title}
              </option>
            ))}
          </select>
        ) : (
          <div className="flex items-center gap-1">
            {manager ? (
              <button
                onClick={() => onSelectPerson(manager.id)}
                className="text-xs text-[#00857C] hover:underline font-medium"
              >
                {manager.firstName} {manager.lastName} — {manager.title}
              </button>
            ) : (
              <span className="text-xs text-gray-400 dark:text-gray-500 italic">None</span>
            )}
            <button
              onClick={() => setEditingManager(true)}
              className="p-0.5 text-gray-400 hover:text-[#00857C]"
              title="Edit manager"
            >
              <Edit3 size={10} />
            </button>
          </div>
        )}
      </div>

      {/* Direct Reports (read-only) */}
      {directReports.length > 0 && (
        <div>
          <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
            Direct Reports ({directReports.length})
          </div>
          <div className="space-y-1">
            {directReports.map(dr => (
              <button
                key={dr.id}
                onClick={() => onSelectPerson(dr.id)}
                className="block text-xs text-[#00857C] hover:underline"
              >
                {dr.status === 'Open Seat' ? `Open: ${dr.title}` : `${dr.firstName} ${dr.lastName}`} — {dr.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Support Lines */}
      <div>
        <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Support Lines</div>
        {person.supportLines.length > 0 ? (
          <div className="space-y-1">
            {person.supportLines.map(slId => {
              const sl = people.find(p => p.id === slId);
              if (!sl) return null;
              return (
                <div key={slId} className="flex items-center gap-1">
                  <button
                    onClick={() => onSelectPerson(slId)}
                    className="text-xs text-gray-600 dark:text-gray-400 hover:text-[#00857C]"
                  >
                    {sl.firstName} {sl.lastName}
                  </button>
                  <button
                    onClick={() => removeSupportLine(slId)}
                    className="p-0.5 text-gray-400 hover:text-red-500"
                    title={`Remove ${sl.firstName} ${sl.lastName}`}
                  >
                    <X size={10} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <span className="text-xs text-gray-400 dark:text-gray-500 italic">None</span>
        )}
        {addingSupportLine ? (
          <select
            autoFocus
            value=""
            onChange={handleAddSupportLine}
            onBlur={() => setAddingSupportLine(false)}
            className="mt-1 w-full text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-[#00857C] bg-white"
          >
            <option value="">-- Select person --</option>
            {eligibleSupportLines.map(p => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName} — {p.title}
              </option>
            ))}
          </select>
        ) : (
          <button
            onClick={() => setAddingSupportLine(true)}
            className="mt-1 flex items-center gap-1 text-[10px] text-[#00857C] hover:underline"
          >
            <Plus size={10} /> Add Support Line
          </button>
        )}
      </div>
    </div>
  );
}
