import type { Person } from '../types';
import { isActivePerson } from './personFilters';

export interface SkillCoverage {
  need: string;
  producersRequiring: number;
  staffCovering: number;
  gap: number;
  coveragePercent: number;
  producerNames: string[];
  staffNames: string[];
}

export interface UnderutilizedSkill {
  skill: string;
  staffWithSkill: number;
  producersNeeding: number;
  staffNames: string[];
}

export function analyzeSkillsCoverage(
  people: Person[],
  practiceFilter?: string
): { coverage: SkillCoverage[]; underutilized: UnderutilizedSkill[] } {
  const filtered = practiceFilter
    ? people.filter(p => p.practiceArea === practiceFilter && isActivePerson(p))
    : people.filter(p => isActivePerson(p));

  const producers = filtered.filter(p => p.isRevenueProducer);
  const support = filtered.filter(p => !p.isRevenueProducer);

  // Collect all unique needs from producers
  const needsMap = new Map<string, { producerNames: string[]; staffNames: string[] }>();

  producers.forEach(p => {
    p.needsTags.forEach(need => {
      if (!needsMap.has(need)) needsMap.set(need, { producerNames: [], staffNames: [] });
      needsMap.get(need)!.producerNames.push(`${p.firstName} ${p.lastName}`);
    });
  });

  // Check which support staff cover those needs
  support.forEach(s => {
    s.skillsTags.forEach(skill => {
      if (needsMap.has(skill)) {
        needsMap.get(skill)!.staffNames.push(`${s.firstName} ${s.lastName}`);
      }
    });
  });

  const coverage: SkillCoverage[] = Array.from(needsMap.entries())
    .map(([need, data]) => ({
      need,
      producersRequiring: data.producerNames.length,
      staffCovering: data.staffNames.length,
      gap: Math.max(0, data.producerNames.length - data.staffNames.length),
      coveragePercent: data.producerNames.length > 0
        ? Math.round((Math.min(data.staffNames.length, data.producerNames.length) / data.producerNames.length) * 100)
        : 100,
      producerNames: data.producerNames,
      staffNames: [...new Set(data.staffNames)],
    }))
    .sort((a, b) => a.coveragePercent - b.coveragePercent);

  // Find underutilized skills
  const allSkills = new Map<string, string[]>();
  support.forEach(s => {
    s.skillsTags.forEach(skill => {
      if (!allSkills.has(skill)) allSkills.set(skill, []);
      allSkills.get(skill)!.push(`${s.firstName} ${s.lastName}`);
    });
  });

  const allNeeds = new Set<string>();
  producers.forEach(p => p.needsTags.forEach(n => allNeeds.add(n)));

  const underutilized: UnderutilizedSkill[] = Array.from(allSkills.entries())
    .filter(([skill]) => !allNeeds.has(skill))
    .map(([skill, names]) => ({
      skill,
      staffWithSkill: names.length,
      producersNeeding: 0,
      staffNames: [...new Set(names)],
    }))
    .sort((a, b) => b.staffWithSkill - a.staffWithSkill);

  return { coverage, underutilized };
}

export function getSkillsCoverageScore(people: Person[], practiceArea: string): number {
  const practiceProducers = people.filter(
    p => p.practiceArea === practiceArea && p.isRevenueProducer && isActivePerson(p)
  );
  const practiceSupport = people.filter(
    p => p.practiceArea === practiceArea && !p.isRevenueProducer && isActivePerson(p)
  );

  const allNeeds = new Set<string>();
  practiceProducers.forEach(p => p.needsTags.forEach(n => allNeeds.add(n)));

  if (allNeeds.size === 0) return 100;

  const supportSkills = new Set<string>();
  practiceSupport.forEach(s => s.skillsTags.forEach(sk => supportSkills.add(sk)));

  let covered = 0;
  allNeeds.forEach(need => {
    if (supportSkills.has(need)) covered++;
  });

  return Math.round((covered / allNeeds.size) * 100);
}
