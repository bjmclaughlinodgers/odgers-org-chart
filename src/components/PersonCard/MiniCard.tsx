import React, { useMemo } from 'react';
import { Star, Check, AlertTriangle } from 'lucide-react';
import type { Person } from '../../types';
import type { RuleEvaluationResult } from '../../types/rules';
import { PRACTICE_COLORS } from '../../types';
import { formatCurrency } from '../../utils/export';
import { RuleBadge } from '../BusinessLogic/RuleBadge';

interface MiniCardProps {
  person: Person;
  onClick?: () => void;
  colorMode?: 'practiceArea' | 'performance' | 'band' | 'office';
  violations?: RuleEvaluationResult[];
}

const bandColors: Record<string, string> = {
  'Senior Leadership': '#1e293b',
  'Revenue Producer': '#00857C',
  'Engagement Management': '#6366f1',
  'Research Leadership': '#8b5cf6',
  'Research & Execution': '#3b82f6',
  'Research & Analysis': '#06b6d4',
  'Project Coordination': '#f59e0b',
  'Operations Leadership': '#64748b',
  'Finance': '#059669',
  'IT': '#2563eb',
  'Marketing': '#ec4899',
  'Knowledge Management': '#8b5cf6',
  'Operations & Admin': '#94a3b8',
};

const officeColors: Record<string, string> = {
  'New York': '#2563eb',
  'Washington DC': '#dc2626',
  'Boston': '#059669',
  'Austin': '#f59e0b',
  'Atlanta': '#8b5cf6',
  'Remote': '#6b7280',
};

const retentionDotColor: Record<string, string> = {
  'Watch': 'bg-amber-400',
  'Elevated': 'bg-orange-500',
  'Critical': 'bg-red-500',
};

function getCardBorderColor(person: Person, colorMode: string): string {
  switch (colorMode) {
    case 'practiceArea': return PRACTICE_COLORS[person.practiceArea as keyof typeof PRACTICE_COLORS] || '#36454F';
    case 'performance':
      return person.performanceRating === 'Star Performer' ? '#f59e0b'
        : person.performanceRating === 'Performance Improvement' ? '#f97316' : '#22c55e';
    case 'band': return bandColors[person.band] || '#64748b';
    case 'office': return officeColors[person.office] || '#6b7280';
    default: return PRACTICE_COLORS[person.practiceArea as keyof typeof PRACTICE_COLORS] || '#36454F';
  }
}

function getTenureLabel(startDate: string): string | null {
  const start = new Date(startDate);
  if (isNaN(start.getTime())) return null;
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const years = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
  const months = Math.floor(diffMs / (30.44 * 24 * 60 * 60 * 1000));
  if (years >= 1) return `${years}y`;
  if (months >= 1) return `${months}m`;
  return '<1m';
}

export function MiniCard({ person, onClick, colorMode = 'practiceArea', violations }: MiniCardProps) {
  const isOpenSeat = person.status === 'Open Seat';
  const isPursuit = person.status === 'Pursuit';
  const isOnLeave = person.status === 'On Leave';
  const isTerminated = person.status === 'Terminated';
  const borderColor = getCardBorderColor(person, colorMode);
  const candidateCount = person.candidates?.length ?? 0;

  const tenureLabel = useMemo(() => {
    if (isOpenSeat || !person.startDate) return null;
    return getTenureLabel(person.startDate);
  }, [person.startDate, isOpenSeat]);

  const revenuePercent = useMemo(() => {
    if (!person.isRevenueProducer || !person.currentYearOCE || !person.revenueTarget || isOpenSeat) return null;
    return Math.min(100, (person.currentYearOCE / person.revenueTarget) * 100);
  }, [person.isRevenueProducer, person.currentYearOCE, person.revenueTarget, isOpenSeat]);

  const revenueBarColor = useMemo(() => {
    if (revenuePercent === null || !person.revenueTarget || !person.currentYearOCE) return '#22c55e';
    if (person.currentYearOCE >= person.revenueTarget) return '#22c55e';
    if (person.currentYearOCE >= person.revenueTarget * 0.9) return '#f59e0b';
    return '#ef4444';
  }, [revenuePercent, person.revenueTarget, person.currentYearOCE]);

  return (
    <div
      onClick={onClick}
      className={`
        animate-fade-in-up
        w-[140px] rounded-lg cursor-pointer
        transition-shadow duration-200 ease-out
        ${isOpenSeat
          ? 'border border-dashed border-teal-300 dark:border-teal-700 bg-teal-50/60 dark:bg-teal-950/30'
          : isPursuit
          ? 'border border-dashed border-amber-300 dark:border-amber-600 bg-amber-50/60 dark:bg-amber-950/20'
          : 'bg-white dark:bg-[#1a2332] shadow-sm hover:shadow-md dark:shadow-gray-900/30 dark:hover:shadow-gray-900/50'
        }
        ${isOnLeave ? 'opacity-60' : ''}
        ${isTerminated ? 'grayscale opacity-50' : ''}
      `}
      style={(!isOpenSeat && !isPursuit) ? {
        borderLeft: `3px solid ${borderColor}`,
        borderTopLeftRadius: '8px',
      } : undefined}
    >
      <div className="p-2.5 flex flex-col items-center gap-1">

        {/* ── Avatar ── */}
        <div className="relative">
          {isOpenSeat ? (
            <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center text-teal-400 dark:text-teal-500 text-sm font-semibold ring-1 ring-teal-200 dark:ring-teal-800">
              ?
            </div>
          ) : isPursuit ? (
            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-500 dark:text-amber-400 text-sm font-semibold ring-1 ring-amber-200 dark:ring-amber-700">
              ◎
            </div>
          ) : person.photoUrl ? (
            <img
              src={person.photoUrl}
              alt=""
              className="w-8 h-8 rounded-full object-cover ring-1 ring-gray-200 dark:ring-gray-700"
            />
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-1 ring-white/30"
              style={{ backgroundColor: borderColor }}
            >
              {person.firstName[0]}{person.lastName[0]}
            </div>
          )}

          {/* Performance star overlay for Star Performer */}
          {!isOpenSeat && person.performanceRating === 'Star Performer' && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-amber-50 dark:bg-amber-900/60 ring-1 ring-amber-300 dark:ring-amber-600">
              <Star size={9} className="text-amber-500 fill-amber-500" />
            </span>
          )}
        </div>

        {/* ── Name + Title ── */}
        {isOpenSeat ? (
          <div className="text-center w-full mt-0.5">
            <div className="text-[11px] font-semibold tracking-wide text-teal-500 dark:text-teal-400 uppercase">Open</div>
            <div className="text-[9px] text-gray-400 dark:text-gray-500 truncate w-full leading-tight mt-0.5">{person.title}</div>
          </div>
        ) : isPursuit ? (
          <div className="text-center w-full mt-0.5">
            <div className="text-[11px] font-semibold tracking-wide text-amber-500 dark:text-amber-400 uppercase">Pursuing</div>
            <div className="text-[9px] text-gray-400 dark:text-gray-500 truncate w-full leading-tight mt-0.5">{person.title}</div>
          </div>
        ) : (
          <div className="text-center w-full mt-0.5">
            <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate w-full leading-snug">
              {person.firstName} {person.lastName}
            </div>
            <div className="text-[9px] font-normal text-gray-400 dark:text-gray-500 truncate w-full leading-tight mt-px">
              {person.title}
            </div>
          </div>
        )}

        {/* ── Indicators row: performance + retention dot + tenure ── */}
        {!isOpenSeat && !isTerminated && (
          <div className="flex items-center gap-1.5 justify-center">
            {/* Performance icon (non-star, since star is on avatar) */}
            {person.performanceRating === 'Performer' && (
              <Check size={10} className="text-green-500" />
            )}
            {person.performanceRating === 'Performance Improvement' && (
              <AlertTriangle size={10} className="text-orange-500" />
            )}

            {/* Retention risk dot */}
            {person.retentionRisk !== 'Low' && retentionDotColor[person.retentionRisk] && (
              <span
                className={`w-1.5 h-1.5 rounded-full ${retentionDotColor[person.retentionRisk]}`}
                title={`Retention: ${person.retentionRisk}`}
              />
            )}

            {/* Tenure label */}
            {tenureLabel && (
              <span className="text-[8px] text-gray-400 dark:text-gray-500 font-medium tabular-nums">{tenureLabel}</span>
            )}
          </div>
        )}

        {/* ── Revenue mini-bar ── */}
        {revenuePercent !== null && (
          <div className="w-full mt-0.5">
            <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${revenuePercent}%`,
                  backgroundColor: revenueBarColor,
                }}
              />
            </div>
            <div className="text-[8px] text-gray-400 dark:text-gray-500 text-center mt-0.5 tabular-nums">
              {formatCurrency(person.currentYearOCE!)}
            </div>
          </div>
        )}

        {/* ── Status badges ── */}
        {isOnLeave && (
          <span className="inline-block text-[8px] bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-medium tracking-wide uppercase">
            On Leave
          </span>
        )}
        {isTerminated && (
          <span className="inline-block text-[8px] bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full font-semibold tracking-wide uppercase ring-1 ring-gray-200 dark:ring-gray-700">
            Terminated
          </span>
        )}
        {isOpenSeat && person.hiringPriority && (
          <span className={`inline-block text-[8px] px-1.5 py-0.5 rounded-full font-medium tracking-wide ${
            person.hiringPriority === 'Critical' ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
            : person.hiringPriority === 'High' ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
            : person.hiringPriority === 'Medium' ? 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
            : 'bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
          }`}>
            {person.hiringPriority}
          </span>
        )}

        {/* Pursuit priority badge */}
        {isPursuit && person.hiringPriority && (
          <span className={`inline-block text-[8px] px-1.5 py-0.5 rounded-full font-medium tracking-wide ${
            person.hiringPriority === 'Critical' ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
            : person.hiringPriority === 'High' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
            : 'bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
          }`}>
            {person.hiringPriority}
          </span>
        )}

        {/* Candidate count pill for Open Seat and Pursuit */}
        {(isOpenSeat || isPursuit) && candidateCount > 0 && (
          <span className="inline-flex items-center gap-0.5 text-[8px] px-1.5 py-0.5 rounded-full font-medium
                           bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
            {candidateCount} candidate{candidateCount !== 1 ? 's' : ''}
          </span>
        )}

        {/* Target fill quarter chip */}
        {(isOpenSeat || isPursuit) && person.targetFillQuarter && (
          <span className="inline-block text-[8px] px-1.5 py-0.5 rounded-full font-medium
                           bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 tabular-nums">
            {person.targetFillQuarter}
          </span>
        )}

        {/* ── Rule violation badges ── */}
        {violations && violations.length > 0 && (
          <RuleBadge violations={violations} />
        )}
      </div>
    </div>
  );
}
