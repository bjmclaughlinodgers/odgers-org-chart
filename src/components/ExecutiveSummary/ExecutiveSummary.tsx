import { useMemo } from 'react';
import { useOrgStore } from '../../stores/orgStore';
import { useUIStore } from '../../stores/uiStore';
import {
  useComputedMetrics,
  computePersonMetrics,
} from '../../hooks/useComputedMetrics';
import type { PracticeMetrics } from '../../hooks/useComputedMetrics';
import type { Person } from '../../types';
import type { HiringPriority, RecruitingStatus } from '../../types/enums';
import { PRACTICE_COLORS } from '../../types/enums';
import { isActivePerson } from '../../utils/personFilters';
import { Briefcase, Users, ArrowRight, Calendar, Target } from 'lucide-react';

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function fmtCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
}

function fmtNumber(value: number): string {
  return value.toLocaleString();
}

function fmtPct(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function fmtPctPlain(value: number): string {
  return `${value.toFixed(1)}%`;
}

function fmtRatio(value: number): string {
  return `${value.toFixed(2)}:1`;
}

function fmtTenure(years: number): string {
  if (years < 1) return '<1y';
  const fullYears = Math.floor(years);
  const months = Math.round((years - fullYears) * 12);
  if (months === 0) return `${fullYears}y`;
  return `${fullYears}y ${months}m`;
}

function fmtDate(dateStr: string | undefined): string {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DeltaBadge({ value, suffix = '%' }: { value: number; suffix?: string }) {
  const isUp = value >= 0;
  return (
    <span className={`stat-delta ${isUp ? 'stat-delta-up' : 'stat-delta-down'}`}>
      <span className="text-[11px]">{isUp ? '\u2191' : '\u2193'}</span>
      {Math.abs(value).toFixed(1)}{suffix}
    </span>
  );
}

function HealthBar({ score }: { score: number }) {
  const color =
    score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div className="progress-bar w-full mt-2">
      <div
        className="progress-bar-fill"
        style={{ width: `${score}%`, backgroundColor: color }}
      />
    </div>
  );
}

function RiskBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    Critical: 'badge-red',
    Elevated: 'badge-amber',
    Watch: 'badge-gray',
    Low: 'badge-green',
  };
  return (
    <span className={`badge ${map[level] ?? 'badge-gray'}`}>
      {level === 'Critical' && (
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
      )}
      {level}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    Critical: 'badge-red',
    High: 'badge-amber',
    Medium: 'badge-teal',
    Low: 'badge-gray',
  };
  return (
    <span className={`badge ${map[priority] ?? 'badge-gray'}`}>
      {priority}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Section 1: Hero KPI Strip
// ---------------------------------------------------------------------------

function HeroKPIStrip() {
  const { firmMetrics } = useComputedMetrics();
  const people = useOrgStore(s => s.people);

  const profitMargin =
    firmMetrics.totalRevenue > 0
      ? ((firmMetrics.totalRevenue - firmMetrics.totalCompCost) / firmMetrics.totalRevenue) * 100
      : 0;

  // Exclude closed seats from the KPI count
  const activeOpenSeats = useMemo(
    () => people.filter(p => p.status === 'Open Seat' && p.recruitingStatus !== 'Closed').length,
    [people],
  );

  const cards = [
    {
      label: 'Total Headcount',
      value: fmtNumber(firmMetrics.totalHeadcount),
      sub: `${firmMetrics.producerCount} producers \u00B7 ${firmMetrics.supportCount} support`,
    },
    {
      label: 'Total Revenue',
      value: fmtCurrency(firmMetrics.totalRevenue),
      delta: firmMetrics.revenueGrowthPct,
    },
    {
      label: 'Revenue / Producer',
      value: fmtCurrency(firmMetrics.revenuePerProducer),
    },
    {
      label: 'Profit Margin',
      value: fmtPctPlain(profitMargin),
      delta: profitMargin > 0 ? profitMargin - 50 : undefined, // delta vs 50% target
    },
    {
      label: 'Support Ratio',
      value: fmtRatio(firmMetrics.supportToProducerRatio),
    },
    {
      label: 'Open Seats',
      value: fmtNumber(activeOpenSeats),
      accent: activeOpenSeats > 0,
    },
  ];

  return (
    <section className="stagger-children grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`stat-card !p-4 flex flex-col justify-between ${
            c.accent ? 'ring-2 ring-amber-300/60' : ''
          }`}
        >
          <p className="stat-label">{c.label}</p>
          <p className="stat-value mt-1">{c.value}</p>
          <div className="mt-2 min-h-[20px] flex items-center gap-2 flex-wrap">
            {c.delta !== undefined && <DeltaBadge value={c.delta} />}
            {c.sub && (
              <span className="text-[11px] text-gray-400 dark:text-gray-500">{c.sub}</span>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section 2: Practice Health Grid
// ---------------------------------------------------------------------------

function PracticeHealthGrid() {
  const { practiceMetrics } = useComputedMetrics();

  return (
    <section className="animate-fade-in-up">
      <div className="mb-4">
        <h2 className="section-title">Practice Health</h2>
        <p className="section-subtitle">Performance snapshot across all practice areas</p>
      </div>

      <div className="stagger-children grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {practiceMetrics.map((pm) => (
          <PracticeCard key={pm.practiceArea} pm={pm} />
        ))}
      </div>
    </section>
  );
}

function PracticeCard({ pm }: { pm: PracticeMetrics }) {
  const accentColor = PRACTICE_COLORS[pm.practiceArea] ?? '#6b7280';
  const healthLabel =
    pm.healthScore >= 70 ? 'Healthy' : pm.healthScore >= 40 ? 'Watch' : 'At Risk';
  const healthBadge =
    pm.healthScore >= 70
      ? 'badge-green'
      : pm.healthScore >= 40
        ? 'badge-amber'
        : 'badge-red';

  return (
    <div className="card px-6 py-5 relative overflow-hidden">
      {/* Accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
        style={{ backgroundColor: accentColor }}
      />

      <div className="pl-2">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-sm font-bold text-odgers-navy dark:text-dark-text leading-tight">
            {pm.practiceArea}
          </h3>
          <span className={`badge ${healthBadge} text-[10px]`}>{healthLabel}</span>
        </div>

        {/* Metric rows */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
          <MetricRow label="Headcount" value={fmtNumber(pm.headcount)} />
          <MetricRow label="Revenue" value={fmtCurrency(pm.revenue)} />
          <MetricRow label="Margin" value={fmtPctPlain(pm.margin)} />
          <MetricRow
            label="Growth"
            value={fmtPct(pm.revenueGrowth)}
            color={pm.revenueGrowth >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}
          />
        </div>

        {/* Health bar */}
        <HealthBar score={pm.healthScore} />
        <div className="flex items-center justify-between mt-2 text-[11px] text-gray-400 dark:text-gray-500">
          <span>Score {pm.healthScore}/100</span>
          <div className="flex items-center gap-3">
            {pm.openSeats > 0 && (
              <span className="text-amber-500 font-semibold">
                {pm.openSeats} open {pm.openSeats === 1 ? 'seat' : 'seats'}
              </span>
            )}
            {pm.atRiskCount > 0 && (
              <span className="text-red-500 font-semibold">
                {pm.atRiskCount} at risk
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400 dark:text-gray-500">{label}</span>
      <span className={`font-semibold ${color ?? 'text-odgers-navy dark:text-dark-text'}`}>
        {value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 3a: People at Risk
// ---------------------------------------------------------------------------

function PeopleAtRisk() {
  const people = useOrgStore((s) => s.people);

  const atRiskPeople = useMemo(() => {
    const riskOrder: Record<string, number> = { Critical: 0, Elevated: 1 };
    return people
      .filter(
        (p) =>
          isActivePerson(p) &&
          (p.retentionRisk === 'Critical' || p.retentionRisk === 'Elevated'),
      )
      .map((p) => ({
        ...p,
        metrics: computePersonMetrics(p),
      }))
      .sort(
        (a, b) =>
          (riskOrder[a.retentionRisk] ?? 99) - (riskOrder[b.retentionRisk] ?? 99),
      );
  }, [people]);

  return (
    <div className="card overflow-hidden flex flex-col">
      <div className="p-5 pb-3">
        <div className="flex items-center justify-between">
          <h2 className="section-title">People at Risk</h2>
          <span className="badge badge-red">{atRiskPeople.length}</span>
        </div>
        <p className="section-subtitle">Elevated and critical retention risk</p>
      </div>

      {atRiskPeople.length === 0 ? (
        <div className="px-5 pb-5 text-sm text-gray-400 italic">
          No people currently at risk.
        </div>
      ) : (
        <div className="overflow-y-auto max-h-[420px] flex-1">
          {/* Table header */}
          <div className="table-header grid grid-cols-[1fr_minmax(100px,0.8fr)_80px_60px] gap-2 sticky top-0 z-10">
            <span>Name</span>
            <span>Practice / Band</span>
            <span>Risk</span>
            <span>Tenure</span>
          </div>

          <div className="stagger-children">
            {atRiskPeople.map((p) => (
              <div
                key={p.id}
                className="table-row grid grid-cols-[1fr_minmax(100px,0.8fr)_80px_60px] gap-2 items-center"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <PersonAvatar person={p} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-odgers-navy dark:text-dark-text truncate leading-tight">
                      {p.firstName} {p.lastName}
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                      {p.title}
                    </p>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                    {p.practiceArea}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                    {p.band}
                  </p>
                </div>
                <RiskBadge level={p.retentionRisk} />
                <span className="text-[11px] text-gray-500 dark:text-gray-400 tabular-nums">
                  {p.metrics.tenureLabel}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PersonAvatar({ person }: { person: Person }) {
  const initials = `${person.firstName[0]}${person.lastName[0]}`;
  const accentColor = PRACTICE_COLORS[person.practiceArea] ?? '#6b7280';
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
      style={{ backgroundColor: accentColor }}
    >
      {initials}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section: Hiring Pipeline — Elevated (Full-width)
// ---------------------------------------------------------------------------

const PRIORITY_ORDER: HiringPriority[] = ['Critical', 'High', 'Medium', 'Low'];

const STATUS_BADGE: Record<string, string> = {
  'Not Started': 'badge-gray',
  Sourcing: 'badge-teal',
  Screening: 'badge-teal',
  Interviewing: 'badge-amber',
  Offer: 'badge-green',
  Closed: 'badge-green',
};

function HiringPipelineElevated() {
  const people = useOrgStore((s) => s.people);
  const setView = useUIStore((s) => s.setActiveView);

  const openSeats = useMemo(() => {
    return people
      .filter((p) => p.status === 'Open Seat' && p.recruitingStatus !== 'Closed')
      .sort((a, b) => {
        const ai = PRIORITY_ORDER.indexOf(a.hiringPriority ?? 'Low');
        const bi = PRIORITY_ORDER.indexOf(b.hiringPriority ?? 'Low');
        return ai - bi;
      });
  }, [people]);

  // Summary stats
  const stats = useMemo(() => {
    const totalCandidates = openSeats.reduce((sum, s) => sum + (s.candidates?.length ?? 0), 0);
    const inOffer = openSeats.filter(s => s.recruitingStatus === 'Offer').length;
    const criticalHigh = openSeats.filter(s => s.hiringPriority === 'Critical' || s.hiringPriority === 'High').length;
    return { totalCandidates, inOffer, criticalHigh };
  }, [openSeats]);

  // Group by priority
  const grouped = useMemo(() => {
    const map = new Map<string, Person[]>();
    for (const seat of openSeats) {
      const key = seat.hiringPriority ?? 'Low';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(seat);
    }
    return map;
  }, [openSeats]);

  return (
    <section className="animate-fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="section-title">Hiring Pipeline</h2>
          <p className="section-subtitle">Active open seats and recruiting progress</p>
        </div>
        <button
          onClick={() => setView('hiringConsole')}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#00857C] dark:text-teal-400
                     hover:text-[#006b63] dark:hover:text-teal-300 transition-colors duration-200
                     px-3 py-1.5 rounded-lg border border-[#00857C]/20 dark:border-teal-400/20
                     hover:bg-[#00857C]/5 dark:hover:bg-teal-400/5"
        >
          View Console
          <ArrowRight size={13} />
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="stat-card !p-3 flex flex-col">
          <p className="stat-label !text-[10px]">Active Seats</p>
          <p className="text-xl font-extrabold text-odgers-navy dark:text-dark-text tabular-nums">{openSeats.length}</p>
        </div>
        <div className="stat-card !p-3 flex flex-col">
          <p className="stat-label !text-[10px]">Critical / High</p>
          <p className={`text-xl font-extrabold tabular-nums ${stats.criticalHigh > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>
            {stats.criticalHigh}
          </p>
        </div>
        <div className="stat-card !p-3 flex flex-col">
          <p className="stat-label !text-[10px]">Pipeline Candidates</p>
          <p className="text-xl font-extrabold text-odgers-navy dark:text-dark-text tabular-nums">{stats.totalCandidates}</p>
        </div>
        <div className="stat-card !p-3 flex flex-col">
          <p className="stat-label !text-[10px]">In Offer Stage</p>
          <p className={`text-xl font-extrabold tabular-nums ${stats.inOffer > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
            {stats.inOffer}
          </p>
        </div>
      </div>

      {/* Seats grid */}
      {openSeats.length === 0 ? (
        <div className="card p-8 text-center">
          <Briefcase className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-400 dark:text-gray-500">No active open seats</p>
        </div>
      ) : (
        <div className="stagger-children space-y-4">
          {PRIORITY_ORDER.map((priority) => {
            const seats = grouped.get(priority);
            if (!seats || seats.length === 0) return null;
            return (
              <div key={priority}>
                <div className="flex items-center gap-2 mb-2">
                  <PriorityBadge priority={priority} />
                  <span className="text-[11px] text-gray-400 font-medium">
                    {seats.length} {seats.length === 1 ? 'seat' : 'seats'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {seats.map((seat) => (
                    <div
                      key={seat.id}
                      className="card-flat px-4 py-3 flex flex-col gap-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-odgers-navy dark:text-dark-text truncate leading-tight">
                            {seat.title}
                          </p>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                            {seat.practiceArea} {'\u00B7'} {seat.band}
                          </p>
                        </div>
                        <span className={`badge ${STATUS_BADGE[seat.recruitingStatus ?? 'Not Started'] ?? 'badge-gray'} text-[9px] flex-shrink-0`}>
                          {seat.recruitingStatus ?? 'Not Started'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-gray-400 dark:text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <Users size={10} />
                          {seat.candidates?.length ?? 0} candidates
                        </span>
                        {seat.targetStartDate && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar size={10} />
                            {fmtDate(seat.targetStartDate)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Attrition Risk Summary Bar (compact visual between sections)
// ---------------------------------------------------------------------------

function AttritionRiskBar() {
  const { firmMetrics } = useComputedMetrics();
  const { attritionRiskBreakdown: risk, totalHeadcount } = firmMetrics;
  const total = totalHeadcount || 1;

  const segments = [
    { label: 'Low', count: risk.low, color: '#22c55e' },
    { label: 'Watch', count: risk.watch, color: '#9ca3af' },
    { label: 'Elevated', count: risk.elevated, color: '#f97316' },
    { label: 'Critical', count: risk.critical, color: '#ef4444' },
  ];

  return (
    <section className="animate-fade-in-up">
      <div className="mb-4">
        <h2 className="section-title">Retention Risk Distribution</h2>
        <p className="section-subtitle">Across {fmtNumber(totalHeadcount)} active employees</p>
      </div>

      {/* Segmented bar */}
      <div className="card p-5">
        <div className="flex rounded-lg overflow-hidden h-3 mb-4">
          {segments.map((seg) => (
            <div
              key={seg.label}
              className="transition-all duration-700"
              style={{
                width: `${(seg.count / total) * 100}%`,
                backgroundColor: seg.color,
              }}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between flex-wrap gap-y-2">
          {segments.map((seg) => (
            <div key={seg.label} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: seg.color }}
              />
              <span className="text-[12px] text-gray-500 dark:text-gray-400">
                {seg.label}
              </span>
              <span className="text-[12px] font-bold text-odgers-navy dark:text-dark-text tabular-nums">
                {seg.count}
              </span>
              <span className="text-[11px] text-gray-300 dark:text-gray-600 tabular-nums">
                ({((seg.count / total) * 100).toFixed(0)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ExecutiveSummary() {
  return (
    <div className="w-full max-w-[1600px] mx-auto px-6 py-6 space-y-8 animate-fade-in">
      {/* Page header */}
      <header className="animate-fade-in-up">
        <h1 className="text-2xl font-extrabold tracking-tight text-odgers-navy dark:text-dark-text">
          Executive Summary
        </h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Firm-wide performance, practice health, and people insights
        </p>
      </header>

      {/* Section 1: Hero KPI Strip */}
      <HeroKPIStrip />

      {/* Section 2: Hiring Pipeline (elevated, full-width) */}
      <HiringPipelineElevated />

      {/* Attrition risk visual */}
      <AttritionRiskBar />

      {/* Section 3: Practice Health Grid */}
      <PracticeHealthGrid />

      {/* Section 4: People at Risk (full-width) */}
      <PeopleAtRisk />
    </div>
  );
}
