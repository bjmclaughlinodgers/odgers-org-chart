import React from 'react';
import { GitBranch, RefreshCw } from 'lucide-react';
import type { Person } from '../../types';

interface ConnectionDialogProps {
  sourcePerson: Person;
  targetPerson: Person;
  currentManager?: Person | null;
  position: { x: number; y: number };
  onChoose: (type: 'primary' | 'support') => void;
  onCancel: () => void;
}

export function ConnectionDialog({
  sourcePerson,
  targetPerson,
  currentManager,
  position,
  onChoose,
  onCancel,
}: ConnectionDialogProps) {
  return (
    <div
      className="fixed z-50 bg-white/95 dark:bg-[#1a2332]/95 backdrop-blur-sm rounded-xl shadow-xl dark:shadow-gray-900/60 border border-gray-200 dark:border-gray-700 p-3 w-56"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
        Connection type for {targetPerson.firstName}
      </div>
      <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-3">
        {sourcePerson.firstName} {sourcePerson.lastName} &rarr;{' '}
        {targetPerson.firstName} {targetPerson.lastName}
      </div>

      <div className="flex flex-col gap-1.5">
        <button
          onClick={() => onChoose('primary')}
          className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 hover:bg-teal-100 dark:hover:bg-teal-900/50 rounded border border-teal-200 dark:border-teal-800 hover:border-teal-300 dark:hover:border-teal-700 transition-all duration-200 cursor-pointer"
        >
          <RefreshCw size={12} />
          <div className="flex flex-col items-start">
            <span>Change Reporting Line</span>
            {currentManager && (
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-normal">
                Replaces: {currentManager.firstName} {currentManager.lastName}
              </span>
            )}
          </div>
        </button>

        <button
          onClick={() => onChoose('support')}
          className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-400 rounded border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-800 transition-all duration-200 cursor-pointer"
        >
          <GitBranch size={12} />
          Add Support Line
        </button>

        <button
          onClick={onCancel}
          className="px-2.5 py-1 text-[10px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer bg-transparent border-0"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
