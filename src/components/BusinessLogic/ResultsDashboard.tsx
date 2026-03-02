import React, { useState, useMemo } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Filter } from 'lucide-react';
import { useRuleResults } from './RuleResultsContext';
import { useUIStore } from '../../stores/uiStore';
import type { RuleEvaluationResult, RuleScope, RuleCategory } from '../../types/rules';

export function ResultsDashboard() {
  const { results, passCount, warnCount, failCount } = useRuleResults();
  const selectPerson = useUIStore(s => s.selectPerson);

  // Filters
  const [scopeFilter, setScopeFilter] = useState<RuleScope | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'warn' | 'fail'>('all');
  const [categoryFilter, setCategoryFilter] = useState<RuleCategory | 'all'>('all');

  const violations = useMemo(() => {
    let filtered = results.filter(r => r.status !== 'pass');

    if (scopeFilter !== 'all') {
      filtered = filtered.filter(r => r.scope === scopeFilter);
    }
    if (severityFilter !== 'all') {
      filtered = filtered.filter(r => r.status === severityFilter);
    }
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(r => r.category === categoryFilter);
    }

    return filtered;
  }, [results, scopeFilter, severityFilter, categoryFilter]);

  return (
    <div className="p-6 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard icon={<CheckCircle2 size={20} />} label="Passing" count={passCount} color="green" />
        <SummaryCard icon={<AlertTriangle size={20} />} label="Warnings" count={warnCount} color="amber" />
        <SummaryCard icon={<XCircle size={20} />} label="Failures" count={failCount} color="red" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
          <Filter size={14} />
          <span>Filters:</span>
        </div>

        <select
          value={scopeFilter}
          onChange={e => setScopeFilter(e.target.value as RuleScope | 'all')}
          className="text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1c2431] text-gray-700 dark:text-gray-300 rounded-md px-2 py-1.5"
        >
          <option value="all">All Scopes</option>
          <option value="firm">Firm</option>
          <option value="practice">Practice</option>
          <option value="partner">Partner</option>
          <option value="person">Person</option>
        </select>

        <select
          value={severityFilter}
          onChange={e => setSeverityFilter(e.target.value as 'all' | 'warn' | 'fail')}
          className="text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1c2431] text-gray-700 dark:text-gray-300 rounded-md px-2 py-1.5"
        >
          <option value="all">All Severities</option>
          <option value="warn">Warnings</option>
          <option value="fail">Failures</option>
        </select>

        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value as RuleCategory | 'all')}
          className="text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1c2431] text-gray-700 dark:text-gray-300 rounded-md px-2 py-1.5"
        >
          <option value="all">All Categories</option>
          <option value="staffing">Staffing</option>
          <option value="economics">Economics</option>
          <option value="capacity">Capacity</option>
          <option value="custom">Custom</option>
        </select>

        {(scopeFilter !== 'all' || severityFilter !== 'all' || categoryFilter !== 'all') && (
          <button
            onClick={() => { setScopeFilter('all'); setSeverityFilter('all'); setCategoryFilter('all'); }}
            className="text-xs text-[#00857C] hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Violations Table */}
      <div className="bg-white dark:bg-[#1c2431] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Violations ({violations.length})
          </h3>
        </div>

        {violations.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle2 size={32} className="mx-auto text-green-400 mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No violations found. All rules passing!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#0f1419]">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Entity</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rule</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Severity</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {violations.map((v, i) => (
                  <ViolationRow key={`${v.ruleId}-${v.entityId}-${i}`} violation={v} onClickEntity={selectPerson} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, count, color }: { icon: React.ReactNode; label: string; count: number; color: string }) {
  const colorMap: Record<string, string> = {
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
  };

  return (
    <div className={`rounded-xl border p-4 ${colorMap[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="text-3xl font-bold">{count}</div>
    </div>
  );
}

function ViolationRow({ violation, onClickEntity }: { violation: RuleEvaluationResult; onClickEntity: (id: string) => void }) {
  const isClickable = violation.scope === 'partner' || violation.scope === 'person';

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-[#0f1419]/50">
      <td className="px-4 py-3">
        <span className={`inline-flex w-2.5 h-2.5 rounded-full ${violation.status === 'fail' ? 'bg-red-500' : 'bg-amber-500'}`} />
      </td>
      <td className="px-4 py-3">
        {isClickable ? (
          <button
            onClick={() => onClickEntity(violation.entityId)}
            className="text-[#00857C] hover:underline font-medium"
          >
            {violation.entityLabel}
          </button>
        ) : (
          <span className="text-gray-900 dark:text-gray-100 font-medium">{violation.entityLabel}</span>
        )}
      </td>
      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{violation.ruleName}</td>
      <td className="px-4 py-3">
        <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${
          violation.severity === 'fail'
            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        }`}>
          {violation.severity}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 uppercase tracking-wide">
          {violation.category}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-md truncate">{violation.message}</td>
    </tr>
  );
}
