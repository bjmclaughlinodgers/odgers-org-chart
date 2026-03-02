import { useMemo } from 'react';
import { useOrgStore } from '../stores/orgStore';
import { isActivePerson } from '../utils/personFilters';
import type { Person } from '../types';
import type { RetentionRisk } from '../types/enums';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AttritionRiskBreakdown {
  low: number;
  watch: number;
  elevated: number;
  critical: number;
}

export interface FirmMetrics {
  totalHeadcount: number;
  totalRevenue: number;
  totalPriorRevenue: number;
  revenueGrowthPct: number;
  totalCompCost: number;
  costToRevenueRatio: number;
  revenuePerHead: number;
  revenuePerProducer: number;
  avgTenureYears: number;
  producerCount: number;
  supportCount: number;
  openSeatCount: number;
  supportToProducerRatio: number;
  avgCompensation: number;
  attritionRiskBreakdown: AttritionRiskBreakdown;
}

export interface PracticeMetrics {
  practiceArea: string;
  headcount: number;
  producers: number;
  support: number;
  revenue: number;
  priorRevenue: number;
  revenueGrowth: number;
  compCost: number;
  margin: number;
  revenuePerProducer: number;
  supportRatio: number;
  openSeats: number;
  avgTenure: number;
  atRiskCount: number;
  healthScore: number;
}

export interface PersonMetrics {
  tenureYears: number;
  tenureLabel: string;
  revenueGrowthPct: number | null;
  compRatio: number | null;
  isTopPerformer: boolean;
  isAtRisk: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

function computeTenureYears(startDate: string): number {
  const start = new Date(startDate);
  const now = new Date();
  return (now.getTime() - start.getTime()) / MS_PER_YEAR;
}

function formatTenureLabel(years: number): string {
  if (years < 1) return '<1y';
  const fullYears = Math.floor(years);
  const months = Math.round((years - fullYears) * 12);
  if (months === 0) return `${fullYears}y`;
  return `${fullYears}y ${months}m`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ---------------------------------------------------------------------------
// Person-level computed metrics (pure function, no hooks)
// ---------------------------------------------------------------------------

export function computePersonMetrics(person: Person): PersonMetrics {
  const tenureYears = computeTenureYears(person.startDate);
  const tenureLabel = formatTenureLabel(tenureYears);

  // Revenue growth
  let revenueGrowthPct: number | null = null;
  if (
    person.currentYearOCE != null &&
    person.priorYearOCE != null &&
    person.priorYearOCE > 0
  ) {
    revenueGrowthPct =
      ((person.currentYearOCE - person.priorYearOCE) / person.priorYearOCE) *
      100;
  }

  // Comp ratio: baseSalary / totalOTE  (how much of OTE is guaranteed)
  let compRatio: number | null = null;
  if (person.baseSalary != null && person.totalOTE != null && person.totalOTE > 0) {
    compRatio = person.baseSalary / person.totalOTE;
  }

  // Top performer: Star Performer + Low retention risk + positive revenue growth
  const isTopPerformer =
    person.performanceRating === 'Star Performer' &&
    person.retentionRisk === 'Low' &&
    revenueGrowthPct !== null &&
    revenueGrowthPct > 0;

  // At risk: Elevated or Critical retention risk
  const isAtRisk =
    person.retentionRisk === 'Elevated' || person.retentionRisk === 'Critical';

  return {
    tenureYears,
    tenureLabel,
    revenueGrowthPct,
    compRatio,
    isTopPerformer,
    isAtRisk,
  };
}

// ---------------------------------------------------------------------------
// Main hook
// ---------------------------------------------------------------------------

export function useComputedMetrics() {
  const people = useOrgStore(state => state.people);

  // ------- Firm-level metrics -------
  const firmMetrics = useMemo<FirmMetrics>(() => {
    const active = people.filter(p => isActivePerson(p));
    const openSeats = people.filter(p => p.status === 'Open Seat');

    const producers = active.filter(p => p.isRevenueProducer);
    const support = active.filter(p => !p.isRevenueProducer);

    const totalRevenue = active.reduce(
      (sum, p) => sum + (p.currentYearOCE ?? 0),
      0,
    );
    const totalPriorRevenue = active.reduce(
      (sum, p) => sum + (p.priorYearOCE ?? 0),
      0,
    );
    const revenueGrowthPct =
      totalPriorRevenue > 0
        ? ((totalRevenue - totalPriorRevenue) / totalPriorRevenue) * 100
        : 0;

    const totalCompCost = active.reduce(
      (sum, p) => sum + (p.totalOTE ?? 0),
      0,
    );

    const costToRevenueRatio = totalRevenue > 0 ? totalCompCost / totalRevenue : 0;
    const revenuePerHead = active.length > 0 ? totalRevenue / active.length : 0;
    const revenuePerProducer =
      producers.length > 0 ? totalRevenue / producers.length : 0;

    // Average tenure
    const tenures = active.map(p => computeTenureYears(p.startDate));
    const avgTenureYears =
      tenures.length > 0
        ? tenures.reduce((a, b) => a + b, 0) / tenures.length
        : 0;

    const supportToProducerRatio =
      producers.length > 0 ? support.length / producers.length : 0;

    // Average compensation (totalOTE across active people who have it)
    const withComp = active.filter(p => p.totalOTE != null && p.totalOTE > 0);
    const avgCompensation =
      withComp.length > 0
        ? withComp.reduce((sum, p) => sum + (p.totalOTE ?? 0), 0) / withComp.length
        : 0;

    // Attrition risk breakdown
    const riskMap: Record<Lowercase<RetentionRisk>, number> = {
      low: 0,
      watch: 0,
      elevated: 0,
      critical: 0,
    };
    for (const p of active) {
      const key = p.retentionRisk.toLowerCase() as Lowercase<RetentionRisk>;
      riskMap[key] = (riskMap[key] ?? 0) + 1;
    }

    return {
      totalHeadcount: active.length,
      totalRevenue,
      totalPriorRevenue,
      revenueGrowthPct,
      totalCompCost,
      costToRevenueRatio,
      revenuePerHead,
      revenuePerProducer,
      avgTenureYears,
      producerCount: producers.length,
      supportCount: support.length,
      openSeatCount: openSeats.length,
      supportToProducerRatio,
      avgCompensation,
      attritionRiskBreakdown: riskMap,
    };
  }, [people]);

  // ------- Practice-level metrics -------
  const practiceMetrics = useMemo<PracticeMetrics[]>(() => {
    // Group people by practice area (excluding 'Central' for practice-level view)
    const practiceMap = new Map<
      string,
      {
        active: Person[];
        openSeats: Person[];
      }
    >();

    for (const p of people) {
      if (p.practiceArea === 'Central') continue;

      const pa = p.practiceArea;
      if (!practiceMap.has(pa)) {
        practiceMap.set(pa, { active: [], openSeats: [] });
      }
      const bucket = practiceMap.get(pa)!;

      if (p.status === 'Open Seat') {
        bucket.openSeats.push(p);
      } else if (isActivePerson(p)) {
        bucket.active.push(p);
      }
    }

    const results: PracticeMetrics[] = [];

    for (const [practiceArea, { active, openSeats }] of practiceMap) {
      const producers = active.filter(p => p.isRevenueProducer);
      const support = active.filter(p => !p.isRevenueProducer);

      const revenue = active.reduce(
        (sum, p) => sum + (p.currentYearOCE ?? 0),
        0,
      );
      const priorRevenue = active.reduce(
        (sum, p) => sum + (p.priorYearOCE ?? 0),
        0,
      );
      const revenueGrowth =
        priorRevenue > 0
          ? ((revenue - priorRevenue) / priorRevenue) * 100
          : 0;

      const compCost = active.reduce(
        (sum, p) => sum + (p.totalOTE ?? 0),
        0,
      );
      const margin = revenue > 0 ? ((revenue - compCost) / revenue) * 100 : 0;

      const revenuePerProducer =
        producers.length > 0 ? revenue / producers.length : 0;

      const supportRatio =
        producers.length > 0 ? support.length / producers.length : 0;

      // Average tenure for practice
      const tenures = active.map(p => computeTenureYears(p.startDate));
      const avgTenure =
        tenures.length > 0
          ? tenures.reduce((a, b) => a + b, 0) / tenures.length
          : 0;

      // At-risk count (Elevated + Critical retention risk)
      const atRiskCount = active.filter(
        p =>
          p.retentionRisk === 'Elevated' || p.retentionRisk === 'Critical',
      ).length;

      // Health score: composite 0-100 based on margin, growth, and risk
      const healthScore = computeHealthScore(
        margin,
        revenueGrowth,
        atRiskCount,
        active.length,
      );

      results.push({
        practiceArea,
        headcount: active.length,
        producers: producers.length,
        support: support.length,
        revenue,
        priorRevenue,
        revenueGrowth,
        compCost,
        margin,
        revenuePerProducer,
        supportRatio,
        openSeats: openSeats.length,
        avgTenure,
        atRiskCount,
        healthScore,
      });
    }

    // Sort by revenue descending
    return results.sort((a, b) => b.revenue - a.revenue);
  }, [people]);

  return { firmMetrics, practiceMetrics, computePersonMetrics };
}

// ---------------------------------------------------------------------------
// Health score computation
// ---------------------------------------------------------------------------

/**
 * Computes a composite health score from 0 to 100.
 *
 * Components (equal weight of ~33 each):
 *  - Margin score:  0% margin -> 0,  60%+ margin -> 33
 *  - Growth score: -20% or worse -> 0,  +20% or better -> 33
 *  - Risk score:  100% at-risk -> 0,  0% at-risk -> 34
 */
function computeHealthScore(
  margin: number,
  revenueGrowth: number,
  atRiskCount: number,
  headcount: number,
): number {
  // Margin component (0-33): scale linearly from 0% to 60%
  const marginScore = clamp(margin / 60, 0, 1) * 33;

  // Growth component (0-33): scale linearly from -20% to +20%
  const growthNormalized = (revenueGrowth + 20) / 40; // -20 -> 0, +20 -> 1
  const growthScore = clamp(growthNormalized, 0, 1) * 33;

  // Risk component (0-34): lower at-risk percentage is better
  const riskPct = headcount > 0 ? atRiskCount / headcount : 0;
  const riskScore = clamp(1 - riskPct, 0, 1) * 34;

  return Math.round(marginScore + growthScore + riskScore);
}
