import React from 'react';
import type { RuleEvaluationResult } from '../../types/rules';

interface RuleBadgeProps {
  violations: RuleEvaluationResult[];
}

export function RuleBadge({ violations }: RuleBadgeProps) {
  if (violations.length === 0) return null;

  const hasFail = violations.some(v => v.severity === 'fail');
  const dotColor = hasFail ? 'bg-red-500' : 'bg-amber-500';
  const ringColor = hasFail ? 'ring-red-200 dark:ring-red-900' : 'ring-amber-200 dark:ring-amber-900';

  return (
    <div className="relative group/badge inline-flex items-center justify-center mt-1">
      <span className={`w-2.5 h-2.5 rounded-full ${dotColor} ring-2 ${ringColor} animate-pulse`} style={{ animationDuration: '2s' }} />
      <span className="ml-1 text-[9px] font-semibold text-gray-500 dark:text-gray-400">{violations.length}</span>

      {/* CSS-only tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/badge:block z-50 pointer-events-none">
        <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] rounded-lg px-3 py-2 shadow-lg max-w-[200px] whitespace-normal">
          {violations.map((v, i) => (
            <div key={i} className="flex items-start gap-1.5 mb-1 last:mb-0">
              <span className={`inline-flex w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${v.severity === 'fail' ? 'bg-red-400' : 'bg-amber-400'}`} />
              <span>{v.message || v.ruleName}</span>
            </div>
          ))}
        </div>
        <div className="w-2 h-2 bg-gray-900 dark:bg-gray-100 rotate-45 mx-auto -mt-1" />
      </div>
    </div>
  );
}
