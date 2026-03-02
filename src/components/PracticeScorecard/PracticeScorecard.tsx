import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Users, AlertTriangle, Briefcase, Clock, Target, ChevronDown, ChevronRight, DollarSign } from 'lucide-react';
import { useGapAnalysis } from '../../hooks/useGapAnalysis';
import { useUIStore } from '../../stores/uiStore';
import { PRACTICE_COLORS } from '../../types';

function getGrade(score: number): { grade: string; color: string } {
  if (score >= 85) return { grade: 'A', color: 'bg-green-500' };
  if (score >= 70) return { grade: 'B', color: 'bg-green-400' };
  if (score >= 55) return { grade: 'C', color: 'bg-amber-500' };
  return { grade: 'D', color: 'bg-red-500' };
}

function Gauge({ label, value, level, icon }: { label: string; value: string; level: 'green' | 'amber' | 'red'; icon: React.ReactNode }) {
  const colors = { green: 'text-green-600 bg-green-50', amber: 'text-amber-600 bg-amber-50', red: 'text-red-600 bg-red-50' };
  return (
    <div className={`flex items-center gap-2 px-2 py-1.5 rounded ${colors[level]}`}>
      <span className="flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className="text-[10px] opacity-70">{label}</div>
        <div className="text-xs font-semibold">{value}</div>
      </div>
    </div>
  );
}

export function PracticeScorecard() {
  const { practiceHealthScores } = useGapAnalysis();
  const { setActiveView } = useUIStore();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'health' | 'revenue' | 'headcount'>('health');

  const scored = practiceHealthScores.map(p => {
    let score = 50;
    // Revenue trend
    if (p.revChange > 10) score += 10; else if (p.revChange < -10) score -= 10;
    // Support ratio
    if (p.supportRatio >= 1.5) score += 10; else if (p.supportRatio < 1) score -= 10;
    // Open seats
    if (p.openSeatCount === 0) score += 5; else if (p.openSeatCount >= 2) score -= 10;
    // Retention
    if (p.riskCount === 0) score += 10; else if (p.hasElevatedOrCritical) score -= 15;
    // Skills
    if (p.skillsCoverage > 80) score += 10; else if (p.skillsCoverage < 60) score -= 10;
    // Tenure balance
    if (p.avgTenure >= 3 && p.avgTenure <= 10) score += 5;
    // Profitability
    if (p.profitMarginPct >= 30) score += 10; else if (p.profitMarginPct < 15) score -= 10;
    return { ...p, score: Math.max(0, Math.min(100, score)) };
  });

  const sorted = [...scored].sort((a, b) => {
    if (sortBy === 'revenue') return b.totalOCE - a.totalOCE;
    if (sortBy === 'headcount') return b.headcount - a.headcount;
    return a.score - b.score; // worst first for triage
  });

  return (
    <div className="p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title !mb-0">Practice Health Scorecard</h2>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-500 dark:text-gray-400">Sort:</span>
          {(['health', 'revenue', 'headcount'] as const).map(s => (
            <button key={s} onClick={() => setSortBy(s)} className={`px-2 py-1 rounded text-[11px] transition-all duration-200 ${sortBy === s ? 'bg-[#00857C] text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
              {s === 'health' ? 'Health (Triage)' : s === 'revenue' ? 'Revenue' : 'Headcount'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 stagger-children">
        {sorted.map(p => {
          const color = PRACTICE_COLORS[p.practiceArea as keyof typeof PRACTICE_COLORS] || '#36454F';
          const { grade, color: gradeColor } = getGrade(p.score);
          const isExpanded = expanded === p.practiceArea;
          const revLevel = p.revChange > 10 ? 'green' : p.revChange < -10 ? 'red' : 'amber';
          const supportLevel = p.supportRatio >= 1.5 ? 'green' : p.supportRatio >= 1 ? 'amber' : 'red';
          const seatLevel = p.openSeatCount === 0 ? 'green' : p.openSeatCount === 1 ? 'amber' : 'red';
          const riskLevel = p.riskCount === 0 ? 'green' : p.hasElevatedOrCritical ? 'red' : 'amber';
          const skillsLevel = p.skillsCoverage > 80 ? 'green' : p.skillsCoverage >= 60 ? 'amber' : 'red';
          const tenureLevel: 'green' | 'amber' | 'red' = p.avgTenure >= 3 && p.avgTenure <= 10 ? 'green' : 'amber';
          const profitLevel: 'green' | 'amber' | 'red' = p.profitMarginPct >= 30 ? 'green' : p.profitMarginPct >= 15 ? 'amber' : 'red';

          return (
            <div key={p.practiceArea} className="card overflow-hidden">
              <div className="px-4 py-3 border-b-2 flex items-center justify-between cursor-pointer" style={{ borderBottomColor: color }} onClick={() => setExpanded(isExpanded ? null : p.practiceArea)}>
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg ${gradeColor} flex items-center justify-center text-white font-bold text-sm shadow-sm`}>{grade}</div>
                  <div>
                    <h3 className="section-title !mb-0 !text-sm">{p.practiceArea}</h3>
                    <div className="text-[10px] text-gray-400 dark:text-gray-500">{p.headcount} people · {p.producerCount} producers</div>
                  </div>
                </div>
                {isExpanded ? <ChevronDown size={14} className="text-gray-400 dark:text-gray-500" /> : <ChevronRight size={14} className="text-gray-400 dark:text-gray-500" />}
              </div>
              <div className="p-3 space-y-1.5">
                <Gauge label="Revenue Trend" value={`${p.revChange >= 0 ? '+' : ''}${p.revChange.toFixed(1)}% YoY`} level={revLevel} icon={p.revChange >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />} />
                <Gauge label="Support Ratio" value={`${p.supportRatio.toFixed(1)} : 1`} level={supportLevel} icon={<Users size={12} />} />
                <Gauge label="Open Seats" value={`${p.openSeatCount}`} level={seatLevel} icon={<Briefcase size={12} />} />
                <Gauge label="Retention Risk" value={`${p.riskCount} flagged`} level={riskLevel} icon={<AlertTriangle size={12} />} />
                <Gauge label="Avg Tenure" value={`${p.avgTenure.toFixed(1)} years`} level={tenureLevel} icon={<Clock size={12} />} />
                <Gauge label="Skills Coverage" value={`${p.skillsCoverage}%`} level={skillsLevel} icon={<Target size={12} />} />
                <Gauge label="Profitability" value={`${p.profitMarginPct.toFixed(0)}%`} level={profitLevel} icon={<DollarSign size={12} />} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
