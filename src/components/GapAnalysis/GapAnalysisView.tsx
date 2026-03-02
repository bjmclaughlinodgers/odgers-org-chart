import React, { useState } from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, Users, Target } from 'lucide-react';
import { useGapAnalysis } from '../../hooks/useGapAnalysis';
import { useUIStore } from '../../stores/uiStore';
import { PRACTICE_COLORS } from '../../types';
import type { PracticeArea } from '../../types';

const practiceOptions: PracticeArea[] = ['Financial Services', 'Industrial', 'Technology', 'Aerospace & Defense', 'Not for Profit', 'US Associations & Corporate Affairs', 'Life Sciences'];

const roleLabels: Record<string, string> = {
  engagementManagers: 'Engagement Managers',
  seniorAssociates: 'Senior Associates',
  associates: 'Associates',
  analysts: 'Analysts',
  projectCoordinators: 'Project Coordinators',
};

export function GapAnalysisView() {
  const [practiceFilter, setPracticeFilter] = useState<string | undefined>(undefined);
  const [tab, setTab] = useState<'staffing' | 'skills' | 'excess'>('staffing');
  const { personGaps, practiceGaps, excessAnalysis, skillsAnalysis } = useGapAnalysis(practiceFilter);
  const { selectPerson } = useUIStore();

  return (
    <div className="p-4 space-y-4">
      {/* Tabs & Filter */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {([['staffing', 'Support Staffing'], ['skills', 'Skills Matrix'], ['excess', 'Excess Analysis']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${tab === key ? 'bg-[#00857C] text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>{label}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">Practice:</span>
          <select value={practiceFilter || ''} onChange={e => setPracticeFilter(e.target.value || undefined)} className="text-xs border border-gray-200 dark:border-gray-700 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#00857C] bg-white dark:bg-[#0f1419] text-gray-900 dark:text-gray-100">
            <option value="">All Practices</option>
            {practiceOptions.map(pa => (<option key={pa} value={pa}>{pa}</option>))}
          </select>
        </div>
      </div>

      {/* Staffing Gaps Tab */}
      {tab === 'staffing' && (
        <div className="space-y-4">
          {/* Practice-Level Rollup */}
          <div className="bg-white dark:bg-[#1a2332] rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700"><h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Practice-Level Staffing Gaps</h3></div>
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-[#0f1419] border-b border-gray-200 dark:border-gray-700"><tr>
                <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Practice</th>
                {Object.keys(roleLabels).map(k => (<th key={k} className="px-3 py-2 text-center text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase">{roleLabels[k]}</th>))}
                <th className="px-3 py-2 text-center text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {practiceGaps.map(pg => (
                  <tr key={pg.practiceArea} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-3 py-2.5"><span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PRACTICE_COLORS[pg.practiceArea as keyof typeof PRACTICE_COLORS] || '#36454F' }} /><span className="text-xs font-medium">{pg.practiceArea}</span></span></td>
                    {Object.keys(roleLabels).map(role => {
                      const g = pg.gaps[role];
                      return (
                        <td key={role} className="px-3 py-2.5 text-center">
                          <span className={`text-xs font-medium ${g && g.gap > 0 ? (g.gap >= 1 ? 'text-red-600' : 'text-amber-600') : 'text-green-600'}`}>
                            {g ? `${g.allocated}/${g.required}` : '—'}
                          </span>
                          {g && g.gap > 0 && <div className="text-[9px] text-gray-400 dark:text-gray-500">-{g.gap.toFixed(1)}</div>}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5 text-center">
                      {pg.overallLevel === 'green' && <CheckCircle size={14} className="text-green-500 mx-auto" />}
                      {pg.overallLevel === 'amber' && <AlertTriangle size={14} className="text-amber-500 mx-auto" />}
                      {pg.overallLevel === 'red' && <AlertCircle size={14} className="text-red-500 mx-auto" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Person-Level Gaps */}
          <div className="bg-white dark:bg-[#1a2332] rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700"><h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Per-Producer Staffing ({personGaps.length})</h3></div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[500px] overflow-y-auto">
              {personGaps.map(pg => (
                <div key={pg.personId} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer" onClick={() => selectPerson(pg.personId)}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${pg.overallLevel === 'green' ? 'bg-green-500' : pg.overallLevel === 'amber' ? 'bg-amber-500' : 'bg-red-500'}`} />
                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">{pg.personName}</span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">{pg.practiceArea}</span>
                    </div>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">{pg.totalAllocated}/{pg.totalRequired} FTEs</span>
                  </div>
                  <div className="flex gap-3">
                    {pg.gaps.map(g => (
                      <div key={g.role} className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${g.level === 'green' ? 'bg-green-400' : g.level === 'amber' ? 'bg-amber-400' : 'bg-red-400'}`} />
                        <span className="text-[10px] text-gray-500 dark:text-gray-400">{roleLabels[g.role]?.split(' ').pop()}: {g.allocated}/{g.required}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Skills Matrix Tab */}
      {tab === 'skills' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#1a2332] rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700"><h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Skills Coverage — Unmet Needs</h3></div>
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-[#0f1419] border-b border-gray-200 dark:border-gray-700"><tr>
                <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Skill / Need</th>
                <th className="px-3 py-2 text-center text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Producers Need</th>
                <th className="px-3 py-2 text-center text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Staff Cover</th>
                <th className="px-3 py-2 text-center text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Coverage</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {skillsAnalysis.coverage.map(sc => (
                  <tr key={sc.need} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-3 py-2.5 text-xs font-medium text-gray-900 dark:text-gray-100">{sc.need}</td>
                    <td className="px-3 py-2.5 text-xs text-center text-gray-600 dark:text-gray-400">{sc.producersRequiring}</td>
                    <td className="px-3 py-2.5 text-xs text-center text-gray-600 dark:text-gray-400">{sc.staffCovering}</td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${sc.coveragePercent}%`, backgroundColor: sc.coveragePercent > 80 ? '#22c55e' : sc.coveragePercent >= 60 ? '#f59e0b' : '#ef4444' }} />
                        </div>
                        <span className={`text-[10px] font-medium ${sc.coveragePercent > 80 ? 'text-green-600' : sc.coveragePercent >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{sc.coveragePercent}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {skillsAnalysis.underutilized.length > 0 && (
            <div className="bg-white dark:bg-[#1a2332] rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700"><h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Underutilized Skills</h3></div>
              <div className="p-4 flex flex-wrap gap-2">
                {skillsAnalysis.underutilized.map(u => (
                  <div key={u.skill} className="bg-gray-50 dark:bg-[#0f1419] rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300">{u.skill}</div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-500">{u.staffWithSkill} staff · 0 producers need</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Excess Analysis Tab */}
      {tab === 'excess' && (
        <div className="bg-white dark:bg-[#1a2332] rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700"><h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Support Efficiency by Practice</h3></div>
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-[#0f1419] border-b border-gray-200 dark:border-gray-700"><tr>
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Practice</th>
              <th className="px-3 py-2 text-center text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Producers</th>
              <th className="px-3 py-2 text-center text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Support</th>
              <th className="px-3 py-2 text-center text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Ratio</th>
              <th className="px-3 py-2 text-center text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Revenue</th>
              <th className="px-3 py-2 text-center text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Rev/Support</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {excessAnalysis.sort((a, b) => b.revenue - a.revenue).map(ea => (
                <tr key={ea.practiceArea} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-3 py-2.5"><span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PRACTICE_COLORS[ea.practiceArea as keyof typeof PRACTICE_COLORS] || '#36454F' }} /><span className="text-xs font-medium">{ea.practiceArea}</span></span></td>
                  <td className="px-3 py-2.5 text-xs text-center">{ea.producers}</td>
                  <td className="px-3 py-2.5 text-xs text-center">{ea.support}</td>
                  <td className="px-3 py-2.5 text-xs text-center font-medium">{ea.ratio.toFixed(1)}:1</td>
                  <td className="px-3 py-2.5 text-xs text-center">${(ea.revenue / 1000000).toFixed(1)}M</td>
                  <td className="px-3 py-2.5 text-xs text-center font-medium">{ea.support > 0 ? `$${(ea.revenuePerSupport / 1000).toFixed(0)}K` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
