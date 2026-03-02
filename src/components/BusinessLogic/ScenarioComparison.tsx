import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useRuleResults } from './RuleResultsContext';
import type { RuleEvaluationResult } from '../../types/rules';

export function ScenarioComparison() {
  const { newViolations, resolvedViolations, isPlanningActive, warnCount, failCount } = useRuleResults();

  if (!isPlanningActive) {
    return (
      <div className="p-6">
        <div className="bg-white dark:bg-[#1c2431] rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <Minus size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Planning Mode Required</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Enter Planning Mode to compare rule violations between baseline and scenario.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={18} className="text-red-500" />
            <span className="text-sm font-medium text-red-700 dark:text-red-400">New Violations</span>
          </div>
          <div className="text-3xl font-bold text-red-600 dark:text-red-400">{newViolations.length}</div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={18} className="text-green-500" />
            <span className="text-sm font-medium text-green-700 dark:text-green-400">Resolved</span>
          </div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">{resolvedViolations.length}</div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Minus size={18} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Scenario Total</span>
          </div>
          <div className="text-3xl font-bold text-gray-700 dark:text-gray-300">{warnCount + failCount}</div>
        </div>
      </div>

      {/* Two-column diff */}
      <div className="grid grid-cols-2 gap-4">
        {/* New Violations Column */}
        <div className="bg-white dark:bg-[#1c2431] rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/10">
            <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">
              + New Violations ({newViolations.length})
            </h3>
          </div>
          {newViolations.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-400">No new violations in this scenario</div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {newViolations.map((v, i) => (
                <DiffRow key={`new-${i}`} result={v} variant="new" />
              ))}
            </div>
          )}
        </div>

        {/* Resolved Column */}
        <div className="bg-white dark:bg-[#1c2431] rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-green-50 dark:bg-green-900/10">
            <h3 className="text-sm font-semibold text-green-700 dark:text-green-400">
              - Resolved ({resolvedViolations.length})
            </h3>
          </div>
          {resolvedViolations.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-400">No violations resolved in this scenario</div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {resolvedViolations.map((v, i) => (
                <DiffRow key={`resolved-${i}`} result={v} variant="resolved" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DiffRow({ result, variant }: { result: RuleEvaluationResult; variant: 'new' | 'resolved' }) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 mb-1">
        <span className={`inline-flex w-2 h-2 rounded-full ${
          variant === 'new' ? 'bg-red-500' : 'bg-green-500'
        }`} />
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{result.entityLabel}</span>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${
          result.severity === 'fail'
            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        }`}>
          {result.severity}
        </span>
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 pl-4">
        <span className="font-medium text-gray-600 dark:text-gray-300">{result.ruleName}:</span>{' '}
        {result.message}
      </div>
    </div>
  );
}
