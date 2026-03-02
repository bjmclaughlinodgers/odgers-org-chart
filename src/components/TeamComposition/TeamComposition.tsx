import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useOrgData } from '../../hooks/useOrgData';
import { PRACTICE_COLORS } from '../../types';
import type { PracticeArea } from '../../types';
import { computeTenure } from '../../utils/tenure';
import { formatCurrency } from '../../utils/export';
import { isActivePerson } from '../../utils/personFilters';

const practices: (PracticeArea | 'Central')[] = ['Financial Services', 'Industrial', 'Technology', 'Aerospace & Defense', 'Not for Profit', 'US Associations & Corporate Affairs', 'Life Sciences', 'Central'];
const bandGroups = [
  { key: 'leadership', label: 'Leadership', bands: ['Senior Leadership', 'Operations Leadership'], color: '#1e293b' },
  { key: 'producers', label: 'Revenue Producers', bands: ['Revenue Producer'], color: '#00857C' },
  { key: 'engagement', label: 'Engagement Mgmt', bands: ['Engagement Management'], color: '#6366f1' },
  { key: 'research', label: 'Research', bands: ['Research Leadership', 'Research & Execution', 'Research & Analysis'], color: '#3b82f6' },
  { key: 'coordination', label: 'Project Coord', bands: ['Project Coordination'], color: '#f59e0b' },
  { key: 'corporate', label: 'Corporate', bands: ['Finance', 'IT', 'Marketing', 'Knowledge Management', 'Operations & Admin'], color: '#94a3b8' },
];

export function TeamComposition() {
  const { people, firmMetrics } = useOrgData();
  const practiceData = useMemo(() => practices.map(pa => {
    const pp = people.filter(p => p.practiceArea === pa && isActivePerson(p));
    const result: Record<string, any> = { name: pa === 'US Associations & Corporate Affairs' ? 'US Assoc' : pa === 'Aerospace & Defense' ? 'A&D' : pa === 'Financial Services' ? 'Fin Svcs' : pa, fullName: pa, total: pp.length };
    bandGroups.forEach(bg => { result[bg.key] = pp.filter(p => bg.bands.includes(p.band)).length; });
    return result;
  }), [people]);

  const byOffice = useMemo(() => {
    const map = new Map<string, number>();
    people.filter(p => isActivePerson(p)).forEach(p => map.set(p.office, (map.get(p.office) || 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [people]);

  const avgTenure = useMemo(() => {
    const active = people.filter(p => isActivePerson(p));
    const tenures = active.map(p => { const t = computeTenure(p.startDate); return t.years + t.months / 12; });
    return tenures.length > 0 ? tenures.reduce((a, b) => a + b, 0) / tenures.length : 0;
  }, [people]);

  return (
    <div className="p-4 space-y-6 animate-fade-in">
      <div className="grid grid-cols-5 gap-4 stagger-children">
        {[
          { label: 'Total Headcount', value: firmMetrics.totalHeadcount, sub: `${firmMetrics.openSeats} open seats` },
          { label: 'Revenue Producers', value: firmMetrics.producerCount, sub: '' },
          { label: 'Support Staff', value: firmMetrics.supportCount, sub: `${firmMetrics.supportRatio.toFixed(1)}:1 ratio` },
          { label: 'Avg Tenure', value: `${avgTenure.toFixed(1)}y`, sub: '' },
          { label: 'Total OCE', value: formatCurrency(firmMetrics.totalOCE), sub: '' },
        ].map((c, i) => (
          <div key={i} className="stat-card">
            <div className="stat-label">{c.label}</div>
            <div className="stat-value">{c.value}</div>
            {c.sub && <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{c.sub}</div>}
          </div>
        ))}
      </div>

      <div className="card p-6">
        <h3 className="section-title">Team Composition by Practice</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={practiceData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {bandGroups.map(bg => (<Bar key={bg.key} dataKey={bg.key} name={bg.label} stackId="a" fill={bg.color} />))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="section-title">Office Distribution</h3>
        <div className="flex gap-3 flex-wrap">
          {byOffice.map(([office, count]) => (
            <div key={office} className="text-center p-3 bg-gray-50 dark:bg-[#0f1419] rounded-lg min-w-[100px]">
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{count}</div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400">{office}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700"><h3 className="section-title !mb-0">Practice Area Breakdown</h3></div>
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-[#0f1419] border-b border-gray-200 dark:border-gray-700"><tr>
            <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Practice</th>
            <th className="px-3 py-2 text-center text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Total</th>
            {bandGroups.map(bg => (<th key={bg.key} className="px-3 py-2 text-center text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase">{bg.label}</th>))}
          </tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {practiceData.map((pd, i) => (
              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-3 py-2.5"><span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PRACTICE_COLORS[pd.fullName as keyof typeof PRACTICE_COLORS] || '#36454F' }} /><span className="text-xs font-medium text-gray-900 dark:text-gray-100">{pd.fullName}</span></span></td>
                <td className="px-3 py-2.5 text-xs font-bold text-center text-gray-900 dark:text-gray-100">{pd.total}</td>
                {bandGroups.map(bg => (<td key={bg.key} className="px-3 py-2.5 text-xs text-center text-gray-600 dark:text-gray-400">{pd[bg.key] || 0}</td>))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
