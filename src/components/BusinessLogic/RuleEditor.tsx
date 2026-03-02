import React, { useState, useMemo } from 'react';
import { X, Plus, Trash2, Eye } from 'lucide-react';
import { useRulesStore } from '../../stores/rulesStore';
import { useRuleResults } from './RuleResultsContext';
import { evaluateRule } from '../../utils/ruleEngine';
import { getMetricsForScope } from '../../utils/metricRegistry';
import type { Rule, RuleCondition, RuleScope, RuleSeverity, RuleCategory, ConditionOperator, RuleEvaluationResult } from '../../types/rules';

interface RuleEditorProps {
  rule: Rule | null; // null = creating new
  onClose: () => void;
}

const defaultCondition: RuleCondition = {
  metric: '',
  operator: 'gt',
  value: 0,
};

export function RuleEditor({ rule, onClose }: RuleEditorProps) {
  const { addRule, updateRule } = useRulesStore();
  const { results } = useRuleResults();

  const [name, setName] = useState(rule?.name || '');
  const [description, setDescription] = useState(rule?.description || '');
  const [scope, setScope] = useState<RuleScope>(rule?.scope || 'person');
  const [scopeFilter, setScopeFilter] = useState(rule?.scopeFilter || '');
  const [conditions, setConditions] = useState<RuleCondition[]>(rule?.conditions || [{ ...defaultCondition }]);
  const [conditionOperator, setConditionOperator] = useState<'AND' | 'OR'>(rule?.conditionOperator || 'AND');
  const [severity, setSeverity] = useState<RuleSeverity>(rule?.severity || 'warn');
  const [category, setCategory] = useState<RuleCategory>(rule?.category || 'custom');
  const [messageTemplate, setMessageTemplate] = useState(rule?.messageTemplate || '');

  const availableMetrics = useMemo(() => getMetricsForScope(scope), [scope]);

  // Live preview: show first 5 evaluation results
  const preview = useMemo((): RuleEvaluationResult[] => {
    if (!name || conditions.length === 0 || !conditions[0].metric) return [];

    const testRule: Rule = {
      id: 'preview',
      name,
      description,
      enabled: true,
      scope,
      scopeFilter: scopeFilter || undefined,
      conditions,
      conditionOperator,
      severity,
      messageTemplate: messageTemplate || `${name} violation on {{entityLabel}}`,
      category,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Use existing results' computed values for preview
    const relevantResults = results.filter(r => r.scope === scope);
    const uniqueEntities = new Map<string, Record<string, number>>();
    for (const r of relevantResults) {
      if (!uniqueEntities.has(r.entityId)) {
        uniqueEntities.set(r.entityId, r.computedValues);
      }
    }

    const previewResults: RuleEvaluationResult[] = [];
    for (const [entityId, metrics] of uniqueEntities) {
      const r = relevantResults.find(rr => rr.entityId === entityId);
      if (!r) continue;
      const result = evaluateRule(testRule, entityId, r.entityLabel, metrics);
      if (result.status !== 'pass') {
        previewResults.push(result);
      }
      if (previewResults.length >= 5) break;
    }

    return previewResults;
  }, [name, description, scope, scopeFilter, conditions, conditionOperator, severity, category, messageTemplate, results]);

  const handleSave = () => {
    const now = new Date().toISOString();
    if (rule) {
      updateRule(rule.id, {
        name,
        description,
        scope,
        scopeFilter: scopeFilter || undefined,
        conditions,
        conditionOperator,
        severity,
        messageTemplate,
        category,
      });
    } else {
      const newRule: Rule = {
        id: `custom-${Date.now()}`,
        name,
        description,
        enabled: true,
        scope,
        scopeFilter: scopeFilter || undefined,
        conditions,
        conditionOperator,
        severity,
        messageTemplate,
        category,
        createdAt: now,
        updatedAt: now,
      };
      addRule(newRule);
    }
    onClose();
  };

  const updateCondition = (index: number, updates: Partial<RuleCondition>) => {
    setConditions(prev => prev.map((c, i) => i === index ? { ...c, ...updates } : c));
  };

  const addCondition = () => {
    setConditions(prev => [...prev, { ...defaultCondition }]);
  };

  const removeCondition = (index: number) => {
    setConditions(prev => prev.filter((_, i) => i !== index));
  };

  const operators: { value: ConditionOperator; label: string }[] = [
    { value: 'gt', label: '>' },
    { value: 'gte', label: '\u2265' },
    { value: 'lt', label: '<' },
    { value: 'lte', label: '\u2264' },
    { value: 'eq', label: '=' },
    { value: 'neq', label: '\u2260' },
    { value: 'between', label: 'between' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-white dark:bg-[#1c2431] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {rule ? 'Edit Rule' : 'Create Rule'}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Name & Description */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f1419] text-gray-900 dark:text-gray-100 rounded-md px-3 py-2"
                placeholder="Rule name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as RuleCategory)}
                className="w-full text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f1419] text-gray-900 dark:text-gray-100 rounded-md px-3 py-2"
              >
                <option value="staffing">Staffing</option>
                <option value="economics">Economics</option>
                <option value="capacity">Capacity</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f1419] text-gray-900 dark:text-gray-100 rounded-md px-3 py-2"
              placeholder="What does this rule check?"
            />
          </div>

          {/* Scope & Severity */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Scope</label>
              <select
                value={scope}
                onChange={e => { setScope(e.target.value as RuleScope); setConditions([{ ...defaultCondition }]); }}
                className="w-full text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f1419] text-gray-900 dark:text-gray-100 rounded-md px-3 py-2"
              >
                <option value="firm">Firm</option>
                <option value="practice">Practice</option>
                <option value="partner">Partner</option>
                <option value="person">Person</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Severity</label>
              <select
                value={severity}
                onChange={e => setSeverity(e.target.value as RuleSeverity)}
                className="w-full text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f1419] text-gray-900 dark:text-gray-100 rounded-md px-3 py-2"
              >
                <option value="warn">Warning</option>
                <option value="fail">Failure</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Scope Filter (optional)</label>
              <input
                value={scopeFilter}
                onChange={e => setScopeFilter(e.target.value)}
                className="w-full text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f1419] text-gray-900 dark:text-gray-100 rounded-md px-3 py-2"
                placeholder="e.g. Search Execution Support"
              />
            </div>
          </div>

          {/* Condition Builder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                Conditions
                <span className="ml-2 text-[10px] text-gray-400">
                  ({conditionOperator === 'AND' ? 'All must match' : 'Any can match'})
                </span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setConditionOperator(conditionOperator === 'AND' ? 'OR' : 'AND')}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  {conditionOperator}
                </button>
                <button
                  onClick={addCondition}
                  className="flex items-center gap-1 text-xs text-[#00857C] hover:underline"
                >
                  <Plus size={12} /> Add
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {conditions.map((cond, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-50 dark:bg-[#0f1419] rounded-lg p-2">
                  <select
                    value={cond.metric}
                    onChange={e => updateCondition(i, { metric: e.target.value })}
                    className="flex-1 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1c2431] text-gray-700 dark:text-gray-300 rounded px-2 py-1.5"
                  >
                    <option value="">Select metric...</option>
                    {availableMetrics.map(m => (
                      <option key={m.key} value={m.key}>{m.label}</option>
                    ))}
                  </select>

                  <select
                    value={cond.operator}
                    onChange={e => updateCondition(i, { operator: e.target.value as ConditionOperator })}
                    className="w-20 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1c2431] text-gray-700 dark:text-gray-300 rounded px-2 py-1.5"
                  >
                    {operators.map(op => (
                      <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                  </select>

                  <input
                    type="number"
                    value={cond.value}
                    onChange={e => updateCondition(i, { value: parseFloat(e.target.value) || 0 })}
                    className="w-24 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1c2431] text-gray-700 dark:text-gray-300 rounded px-2 py-1.5"
                    placeholder="Value"
                  />

                  {cond.operator === 'between' && (
                    <input
                      type="number"
                      value={cond.upperValue || 0}
                      onChange={e => updateCondition(i, { upperValue: parseFloat(e.target.value) || 0 })}
                      className="w-24 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1c2431] text-gray-700 dark:text-gray-300 rounded px-2 py-1.5"
                      placeholder="Upper"
                    />
                  )}

                  {conditions.length > 1 && (
                    <button
                      onClick={() => removeCondition(i)}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Message Template */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Message Template
              <span className="ml-2 text-[10px] text-gray-400">Use {'{{key}}'} for metric values</span>
            </label>
            <input
              value={messageTemplate}
              onChange={e => setMessageTemplate(e.target.value)}
              className="w-full text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f1419] text-gray-900 dark:text-gray-100 rounded-md px-3 py-2"
              placeholder="e.g. {{name}} has {{activeAssignments}} assignments (limit: 8)"
            />
          </div>

          {/* Live Preview */}
          {preview.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Eye size={14} className="text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                  Live Preview — {preview.length} violation{preview.length !== 1 ? 's' : ''} found against current data
                </span>
              </div>
              <div className="space-y-1">
                {preview.map((r, i) => (
                  <div key={i} className="text-xs text-amber-800 dark:text-amber-300">
                    <span className={`inline-flex w-1.5 h-1.5 rounded-full mr-1.5 ${r.status === 'fail' ? 'bg-red-500' : 'bg-amber-500'}`} />
                    {r.message || r.entityLabel}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name || conditions.length === 0}
            className="px-4 py-2 text-sm font-medium bg-[#00857C] text-white rounded-md hover:bg-[#006d65] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {rule ? 'Save Changes' : 'Create Rule'}
          </button>
        </div>
      </div>
    </div>
  );
}
