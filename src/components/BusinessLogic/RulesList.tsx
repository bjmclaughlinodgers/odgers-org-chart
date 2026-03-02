import React, { useState } from 'react';
import { Plus, Copy, Trash2, Pencil, ToggleLeft, ToggleRight } from 'lucide-react';
import { useRulesStore } from '../../stores/rulesStore';
import { RuleEditor } from './RuleEditor';
import type { Rule, RuleCondition } from '../../types/rules';
import { getMetricDefinition } from '../../utils/metricRegistry';

function formatCondition(cond: RuleCondition): string {
  const metric = getMetricDefinition(cond.metric);
  const label = metric?.label || cond.metric;
  const opLabels: Record<string, string> = {
    gt: '>', gte: '\u2265', lt: '<', lte: '\u2264', eq: '=', neq: '\u2260', between: 'between',
  };
  const op = opLabels[cond.operator] || cond.operator;

  if (cond.operator === 'between') {
    return `${label} ${op} ${cond.value} and ${cond.upperValue}`;
  }

  // Format value
  let formattedValue = String(cond.value);
  if (metric?.unit === 'currency' && cond.value > 1000) {
    formattedValue = `$${cond.value.toLocaleString()}`;
  } else if (metric?.unit === 'percent') {
    formattedValue = `${cond.value}%`;
  }

  return `${label} ${op} ${formattedValue}`;
}

const scopeColors: Record<string, string> = {
  firm: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  practice: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  partner: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  person: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

const categoryColors: Record<string, string> = {
  staffing: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  economics: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  capacity: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  custom: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

export function RulesList() {
  const { rules, toggleRule, removeRule, duplicateRule, resetToDefaults } = useRulesStore();
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  return (
    <div className="p-6 space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Rules ({rules.length})
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={resetToDefaults}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-2 py-1"
          >
            Reset to Defaults
          </button>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#00857C] text-white hover:bg-[#006d65] transition-colors"
          >
            <Plus size={14} />
            Add Rule
          </button>
        </div>
      </div>

      {/* Rule Cards */}
      {rules.map(rule => (
        <div
          key={rule.id}
          className={`bg-white dark:bg-[#1c2431] rounded-xl border border-gray-200 dark:border-gray-700 p-4 transition-all duration-200 ${
            !rule.enabled ? 'opacity-50' : ''
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{rule.name}</h4>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${scopeColors[rule.scope]}`}>
                  {rule.scope}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                  rule.severity === 'fail'
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                }`}>
                  {rule.severity}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${categoryColors[rule.category]}`}>
                  {rule.category}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{rule.description}</p>

              {/* Condition summary */}
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-medium">WHEN</span>
                {rule.conditions.map((cond, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && (
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-medium">
                        {rule.conditionOperator}
                      </span>
                    )}
                    <code className="text-[11px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300">
                      {formatCondition(cond)}
                    </code>
                  </React.Fragment>
                ))}
                {rule.scopeFilter && (
                  <>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-medium ml-1">FOR</span>
                    <code className="text-[11px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300">
                      {rule.scopeFilter}
                    </code>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => toggleRule(rule.id)}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title={rule.enabled ? 'Disable rule' : 'Enable rule'}
              >
                {rule.enabled ? (
                  <ToggleRight size={18} className="text-[#00857C]" />
                ) : (
                  <ToggleLeft size={18} className="text-gray-400" />
                )}
              </button>
              <button
                onClick={() => setEditingRule(rule)}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                title="Edit rule"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => duplicateRule(rule.id)}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                title="Duplicate rule"
              >
                <Copy size={14} />
              </button>
              <button
                onClick={() => removeRule(rule.id)}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 hover:text-red-500"
                title="Delete rule"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Editor Modal */}
      {(editingRule || isCreating) && (
        <RuleEditor
          rule={editingRule}
          onClose={() => { setEditingRule(null); setIsCreating(false); }}
        />
      )}
    </div>
  );
}
