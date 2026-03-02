import React, { useMemo, useState } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Users, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { useOrgData } from '../../hooks/useOrgData';
import { useUIStore } from '../../stores/uiStore';
import { PRACTICE_COLORS } from '../../types';
import { formatCurrency, formatPercent } from '../../utils/export';
import { isActivePerson } from '../../utils/personFilters';

type SortField = 'name' | 'practice' | 'oce' | 'priorOce' | 'yoy' | 'target' | 'pipeline';

export function RevenueDashboard() {
  const { people, firmMetrics, practiceFinancials } = useOrgData();
  const { selectPerson } = useUIStore();
  const [sortField, setSortField] = useState<SortField>('oce');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [chartMetrics, setChartMetrics] = useState<Set<string>>(new Set(['current']));
  const [selectedPractice, setSelectedPractice] = useState<string | null>(null);
  const [showOnlyOpenSeats, setShowOnlyOpenSeats] = useState(false);

  const producers = useMemo(() => people.filter(p => p.isRevenueProducer && isActivePerson(p)), [people]);

  const sorted = useMemo(() => {
    const arr = [...producers];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name': cmp = a.lastName.localeCompare(b.lastName); break;
        case 'practice': cmp = a.practiceArea.localeCompare(b.practiceArea); break;
        case 'oce': cmp = (a.currentYearOCE || 0) - (b.currentYearOCE || 0); break;
        case 'priorOce': cmp = (a.priorYearOCE || 0) - (b.priorYearOCE || 0); break;
        case 'yoy': {
          const aY = a.priorYearOCE ? ((a.currentYearOCE || 0) - a.priorYearOCE) / a.priorYearOCE : 0;
          const bY = b.priorYearOCE ? ((b.currentYearOCE || 0) - b.priorYearOCE) / b.priorYearOCE : 0;
          cmp = aY - bY; break;
        }
        case 'target': cmp = (a.revenueTarget || 0) - (b.revenueTarget || 0); break;
        case 'pipeline': cmp = (a.pipelineValue || 0) - (b.pipelineValue || 0); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [producers, sortField, sortDir]);

  const practiceRevenue = useMemo(() => {
    const map = new Map<string, { current: number; prior: number; target: number; count: number }>();
    producers.forEach(p => {
      const pa = p.practiceArea;
      if (!map.has(pa)) map.set(pa, { current: 0, prior: 0, target: 0, count: 0 });
      const e = map.get(pa)!;
      e.current += p.currentYearOCE || 0;
      e.prior += p.priorYearOCE || 0;
      e.target += p.revenueTarget || 0;
      e.count++;
    });
    const pfMap = new Map((practiceFinancials || []).map(pf => [pf.practiceArea, pf]));
    return Array.from(map.entries()).map(([name, data]) => ({
      name: name === 'US Associations & Corporate Affairs' ? 'US Assoc' : name === 'Aerospace & Defense' ? 'A&D' : name === 'Financial Services' ? 'Fin Svcs' : name,
      fullName: name, current: data.current, prior: data.prior, target: data.target, count: data.count,
      margin: pfMap.get(name)?.impliedMargin || 0,
      color: PRACTICE_COLORS[name as keyof typeof PRACTICE_COLORS] || '#36454F',
    })).sort((a, b) => b.current - a.current);
  }, [producers, practiceFinancials]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const displayedProducers = useMemo(() => {
    let result = selectedPractice ? sorted.filter(p => p.practiceArea === selectedPractice) : sorted;
    if (showOnlyOpenSeats) {
      const openSeats = people.filter(p => p.status === 'Open Seat');
      const managersWithOpenSeats = new Set(openSeats.map(os => os.reportsTo).filter(Boolean));
      result = result.filter(p => managersWithOpenSeats.has(p.id));
    }
    return result;
  }, [sorted, selectedPractice, showOnlyOpenSeats, people]);

  const SH = ({ field, label }: { field: SortField; label: string }) => (
    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider cursor-pointer hover:opacity-70 select-none transition-colors" onClick={() => toggleSort(field)}>
      <span className="flex items-center gap-1">{label}
        {sortField === field ? (sortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} className="text-gray-300 dark:text-gray-600" />}
      </span>
    </th>
  );

  return (
    <div className="p-4 space-y-6 animate-fade-in">
      <div className="grid grid-cols-4 gap-4 stagger-children">
        {[
          {
            label: 'Total OCE',
            value: formatCurrency(firmMetrics.totalOCE),
            sub: <span className={firmMetrics.yoyChange >= 0 ? 'text-green-600' : 'text-red-600'}>
              {firmMetrics.yoyChange >= 0 ? <TrendingUp size={12} className="inline" /> : <TrendingDown size={12} className="inline" />}
              {' '}{formatPercent(firmMetrics.yoyChange)} YoY
            </span>,
            icon: DollarSign,
          },
          {
            label: 'Revenue Producers',
            value: String(firmMetrics.producerCount),
            sub: `Avg: ${formatCurrency(firmMetrics.producerCount > 0 ? firmMetrics.totalOCE / firmMetrics.producerCount : 0)}/producer`,
            icon: Users,
          },
          {
            label: 'Execution Support Ratio',
            value: `${firmMetrics.executionSupportRatio.toFixed(1)}:1`,
            sub: `${firmMetrics.executionSupportCount} exec support / ${firmMetrics.producerCount} producers`,
            icon: Users,
          },
          {
            label: 'Admin Support Ratio',
            value: `${firmMetrics.adminSupportRatio.toFixed(2)}:1`,
            sub: `${firmMetrics.projectCoordinatorCount} PCs / ${firmMetrics.producerCount} producers`,
            icon: Users,
          },
        ].map((card, i) => (
          <div key={i} className="stat-card">
            <div className="flex items-center gap-2 mb-2"><card.icon size={14} className="text-[#00857C]" /><span className="stat-label">{card.label}</span></div>
            <div className="stat-value">{card.value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Practice Profitability Table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="section-title text-base">Practice Profitability</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider">Practice</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider">HC</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider">People Cost</th>
                {[
                  { key: 'prior', label: 'Prior Year' },
                  { key: 'current', label: 'YTD Revenue' },
                  { key: 'target', label: 'Target' },
                ].map(({ key, label }) => (
                  <th key={key}
                    onClick={() => setChartMetrics(prev => {
                      const next = new Set(prev);
                      if (next.has(key)) { if (next.size > 1) next.delete(key); }
                      else next.add(key);
                      return next;
                    })}
                    className={`px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-colors select-none ${
                      chartMetrics.has(key)
                        ? 'text-[#00857C] dark:text-teal-400 bg-teal-50/50 dark:bg-teal-900/20'
                        : 'hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <span className="flex items-center justify-end gap-1">
                      {label}
                      <span className={`w-1.5 h-1.5 rounded-full ${chartMetrics.has(key) ? 'bg-[#00857C]' : 'bg-gray-300 dark:bg-gray-600'}`} />
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider">Attainment</th>
                <th
                  onClick={() => setChartMetrics(prev => {
                    const next = new Set(prev);
                    if (next.has('margin')) { if (next.size > 1) next.delete('margin'); }
                    else next.add('margin');
                    return next;
                  })}
                  className={`px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-colors select-none ${
                    chartMetrics.has('margin')
                      ? 'text-[#00857C] dark:text-teal-400 bg-teal-50/50 dark:bg-teal-900/20'
                      : 'hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <span className="flex items-center justify-end gap-1">
                    Margin
                    <span className={`w-1.5 h-1.5 rounded-full ${chartMetrics.has('margin') ? 'bg-[#00857C]' : 'bg-gray-300 dark:bg-gray-600'}`} />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {(practiceFinancials || []).map(pf => (
                <tr key={pf.practiceArea} className="table-row cursor-default">
                  <td className="px-4 py-3">
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: PRACTICE_COLORS[pf.practiceArea as keyof typeof PRACTICE_COLORS] || '#36454F' }}
                    >
                      {pf.practiceArea === 'Financial Services' ? 'Fin Svcs' : pf.practiceArea === 'Aerospace & Defense' ? 'A&D' : pf.practiceArea === 'US Associations & Corporate Affairs' ? 'US Assoc' : pf.practiceArea}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-right text-gray-600 dark:text-gray-400">{pf.headcount} <span className="text-gray-400 dark:text-gray-500">({pf.producerCount}P/{pf.supportCount}S)</span></td>
                  <td className="px-4 py-3 text-xs text-right font-medium text-gray-900 dark:text-gray-100">{formatCurrency(pf.totalPeopleCost)}</td>
                  <td className={`px-4 py-3 text-xs text-right transition-colors ${chartMetrics.has('prior') ? 'text-[#00857C] dark:text-teal-400 bg-teal-50/30 dark:bg-teal-900/10 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>{formatCurrency(pf.priorYearOCE)}</td>
                  <td className={`px-4 py-3 text-xs text-right font-semibold transition-colors ${chartMetrics.has('current') ? 'text-[#00857C] dark:text-teal-400 bg-teal-50/30 dark:bg-teal-900/10' : 'text-gray-900 dark:text-gray-100'}`}>{formatCurrency(pf.ytdOCE)}</td>
                  <td className={`px-4 py-3 text-xs text-right transition-colors ${chartMetrics.has('target') ? 'text-[#00857C] dark:text-teal-400 bg-teal-50/30 dark:bg-teal-900/10 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>{formatCurrency(pf.revenueTarget)}</td>
                  <td className="px-4 py-3 text-xs text-right">
                    <span className={`font-medium ${pf.targetAttainment >= 100 ? 'text-green-600' : pf.targetAttainment >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                      {pf.targetAttainment.toFixed(0)}%
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-xs text-right transition-colors ${chartMetrics.has('margin') ? 'bg-teal-50/30 dark:bg-teal-900/10' : ''}`}>
                    <span className={`font-semibold ${chartMetrics.has('margin') ? 'text-[#00857C] dark:text-teal-400' : pf.impliedMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {pf.impliedMargin.toFixed(0)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="section-title text-base">Revenue by Practice Area</h3>
          <div className="flex gap-1 ml-auto">
            {[
              { key: 'prior', label: 'Prior Year' },
              { key: 'current', label: 'YTD' },
              { key: 'target', label: 'Target' },
              { key: 'margin', label: 'Margin %' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setChartMetrics(prev => {
                  const next = new Set(prev);
                  if (next.has(key)) { if (next.size > 1) next.delete(key); }
                  else next.add(key);
                  return next;
                })}
                className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-all duration-200 ${
                  chartMetrics.has(key)
                    ? 'bg-[#00857C] text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={practiceRevenue} margin={{ top: 5, right: chartMetrics.has('margin') ? 40 : 20, left: 20, bottom: 5 }}
              onClick={(data: any) => {
                if (data?.activePayload?.[0]?.payload?.fullName) {
                  const practice = data.activePayload[0].payload.fullName;
                  setSelectedPractice((prev: string | null) => prev === practice ? null : practice);
                }
              }}
              className="cursor-pointer"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="revenue" tick={{ fontSize: 11 }} tickFormatter={v => `$${(Number(v) / 1000000).toFixed(1)}M`} />
              {chartMetrics.has('margin') && (
                <YAxis yAxisId="margin" orientation="right" tick={{ fontSize: 11 }} tickFormatter={v => `${Number(v).toFixed(0)}%`} domain={[-50, 100]} />
              )}
              <Tooltip formatter={((value: number | undefined, name: string | undefined) => {
                if (value == null) return '';
                return name === 'Margin' ? `${value.toFixed(1)}%` : formatCurrency(value);
              }) as never} />
              {chartMetrics.has('prior') && (
                <Bar yAxisId="revenue" dataKey="prior" name="Prior Year" radius={[4, 4, 0, 0]} fill="#94a3b8" opacity={0.6} />
              )}
              {chartMetrics.has('current') && (
                <Bar yAxisId="revenue" dataKey="current" name="YTD" radius={[4, 4, 0, 0]}>
                  {practiceRevenue.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
                </Bar>
              )}
              {chartMetrics.has('target') && (
                <Bar yAxisId="revenue" dataKey="target" name="Target" radius={[4, 4, 0, 0]} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={1} />
              )}
              {chartMetrics.has('margin') && (
                <Line yAxisId="margin" type="monotone" dataKey="margin" name="Margin" stroke="#00857C" strokeWidth={2} dot={{ fill: '#00857C', r: 4 }} activeDot={{ r: 6 }} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="section-title text-base">Revenue Producers ({displayedProducers.length})</h3>
          <button
            onClick={() => setShowOnlyOpenSeats(!showOnlyOpenSeats)}
            className={`badge cursor-pointer transition-all duration-200 ${
              showOnlyOpenSeats
                ? 'badge-teal ring-1 ring-[#00857C]/20'
                : 'badge-gray hover:opacity-80'
            }`}
          >
            <Users size={12} />
            Open Seats Only
          </button>
        </div>
        {selectedPractice && (
          <div className="px-4 py-2 bg-gray-50 dark:bg-[#0f1419] border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Showing:</span>
            <span className="text-xs font-medium text-gray-900 dark:text-gray-100 bg-white dark:bg-[#1a2332] px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">
              {selectedPractice}
            </span>
            <button onClick={() => setSelectedPractice(null)} className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">{'\u2715'}</button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="table-header">
              <SH field="name" label="Name" /><SH field="practice" label="Practice" />
              <SH field="oce" label="YTD OCE" /><SH field="priorOce" label="Prior OCE" />
              <SH field="yoy" label="YoY %" /><SH field="target" label="Target" />
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider">Progress</th>
              <SH field="pipeline" label="Pipeline" />
            </tr></thead>
            <tbody>
              {displayedProducers.map(p => {
                const yoy = p.priorYearOCE ? ((p.currentYearOCE || 0) - p.priorYearOCE) / p.priorYearOCE * 100 : 0;
                const progress = p.revenueTarget ? ((p.currentYearOCE || 0) / p.revenueTarget) * 100 : 0;
                return (
                  <tr key={p.id} onClick={() => selectPerson(p.id)} className="table-row cursor-pointer">
                    <td className="px-4 py-3"><div className="text-xs font-medium text-gray-900 dark:text-gray-100">{p.firstName} {p.lastName}</div><div className="text-[10px] text-gray-400 dark:text-gray-500">{p.title}</div></td>
                    <td className="px-4 py-3"><span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: PRACTICE_COLORS[p.practiceArea as keyof typeof PRACTICE_COLORS] || '#36454F' }}>{p.practiceArea === 'Financial Services' ? 'Fin Svcs' : p.practiceArea === 'Aerospace & Defense' ? 'A&D' : p.practiceArea === 'US Associations & Corporate Affairs' ? 'US Assoc' : p.practiceArea}</span></td>
                    <td className="px-4 py-3 text-xs font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(p.currentYearOCE)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{formatCurrency(p.priorYearOCE)}</td>
                    <td className="px-4 py-3"><span className={`text-xs font-medium ${yoy > 0 ? 'text-green-600' : yoy < 0 ? 'text-red-600' : 'text-gray-500 dark:text-gray-400'}`}>{formatPercent(yoy)}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{formatCurrency(p.revenueTarget)}</td>
                    <td className="px-4 py-3"><div className="w-20"><div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.min(100, progress)}%`, backgroundColor: progress >= 100 ? '#22c55e' : progress >= 90 ? '#f59e0b' : '#ef4444' }} /></div><span className="text-[10px] text-gray-400 dark:text-gray-500">{Math.round(progress)}%</span></div></td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{formatCurrency(p.pipelineValue)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
