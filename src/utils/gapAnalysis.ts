import type { Person, SupportRequirements } from '../types';

export type GapLevel = 'green' | 'amber' | 'red';

export interface SupportGap {
  role: keyof SupportRequirements;
  required: number;
  allocated: number;
  gap: number;
  level: GapLevel;
}

export interface PersonGapAnalysis {
  personId: string;
  personName: string;
  practiceArea: string;
  gaps: SupportGap[];
  overallLevel: GapLevel;
  totalRequired: number;
  totalAllocated: number;
}

export interface PracticeGapSummary {
  practiceArea: string;
  gaps: Record<string, { required: number; allocated: number; gap: number }>;
  overallLevel: GapLevel;
}

function getGapLevel(required: number, allocated: number): GapLevel {
  const gap = required - allocated;
  if (gap <= 0 || gap <= 0.5) return 'green';
  if (gap < 1) return 'amber';
  return 'red';
}

function worstLevel(levels: GapLevel[]): GapLevel {
  if (levels.includes('red')) return 'red';
  if (levels.includes('amber')) return 'amber';
  return 'green';
}

export function analyzePersonGaps(person: Person): PersonGapAnalysis | null {
  if (!person.isRevenueProducer || !person.supportRequirements) return null;

  const sr = person.supportRequirements;
  const roles = Object.keys(sr) as (keyof SupportRequirements)[];

  const gaps: SupportGap[] = roles.map(role => {
    const { required, allocated } = sr[role];
    return {
      role,
      required,
      allocated,
      gap: Math.max(0, required - allocated),
      level: getGapLevel(required, allocated),
    };
  });

  return {
    personId: person.id,
    personName: `${person.firstName} ${person.lastName}`,
    practiceArea: person.practiceArea,
    gaps,
    overallLevel: worstLevel(gaps.map(g => g.level)),
    totalRequired: gaps.reduce((sum, g) => sum + g.required, 0),
    totalAllocated: gaps.reduce((sum, g) => sum + g.allocated, 0),
  };
}

export function analyzePracticeGaps(people: Person[]): PracticeGapSummary[] {
  const practiceMap = new Map<string, Person[]>();

  people.forEach(p => {
    if (!p.isRevenueProducer || !p.supportRequirements) return;
    const pa = p.practiceArea;
    if (!practiceMap.has(pa)) practiceMap.set(pa, []);
    practiceMap.get(pa)!.push(p);
  });

  return Array.from(practiceMap.entries()).map(([practiceArea, producers]) => {
    const gaps: Record<string, { required: number; allocated: number; gap: number }> = {};
    const roleNames = ['engagementManagers', 'seniorAssociates', 'associates', 'analysts', 'projectCoordinators'];

    roleNames.forEach(role => {
      const key = role as keyof SupportRequirements;
      let totalReq = 0;
      let totalAlloc = 0;
      producers.forEach(p => {
        if (p.supportRequirements) {
          totalReq += p.supportRequirements[key].required;
          totalAlloc += p.supportRequirements[key].allocated;
        }
      });
      gaps[role] = { required: totalReq, allocated: totalAlloc, gap: Math.max(0, totalReq - totalAlloc) };
    });

    const levels = Object.values(gaps).map(g => getGapLevel(g.required, g.allocated));

    return { practiceArea, gaps, overallLevel: worstLevel(levels) };
  });
}

export function analyzeExcess(people: Person[]): Array<{ practiceArea: string; producers: number; support: number; ratio: number; revenue: number; revenuePerSupport: number }> {
  const practiceMap = new Map<string, { producers: number; support: number; revenue: number }>();

  people.forEach(p => {
    if (p.status === 'Open Seat') return;
    const pa = p.practiceArea;
    if (pa === 'Central') return;

    if (!practiceMap.has(pa)) practiceMap.set(pa, { producers: 0, support: 0, revenue: 0 });
    const entry = practiceMap.get(pa)!;

    if (p.isRevenueProducer) {
      entry.producers++;
      entry.revenue += p.currentYearOCE || 0;
    } else {
      entry.support++;
    }
  });

  return Array.from(practiceMap.entries()).map(([practiceArea, data]) => ({
    practiceArea,
    producers: data.producers,
    support: data.support,
    ratio: data.producers > 0 ? data.support / data.producers : 0,
    revenue: data.revenue,
    revenuePerSupport: data.support > 0 ? data.revenue / data.support : 0,
  }));
}
