import { useMemo } from 'react';
import { useOrgData } from './useOrgData';
import { analyzePersonGaps, analyzePracticeGaps, analyzeExcess } from '../utils/gapAnalysis';
import { analyzeSkillsCoverage, getSkillsCoverageScore } from '../utils/skillsMatrix';
import { isActivePerson } from '../utils/personFilters';

export function useGapAnalysis(practiceFilter?: string) {
  const { people } = useOrgData();

  const personGaps = useMemo(() => {
    const filtered = practiceFilter ? people.filter(p => p.practiceArea === practiceFilter) : people;
    return filtered.map(p => analyzePersonGaps(p)).filter((g): g is NonNullable<typeof g> => g !== null);
  }, [people, practiceFilter]);

  const practiceGaps = useMemo(() => analyzePracticeGaps(people), [people]);
  const excessAnalysis = useMemo(() => analyzeExcess(people), [people]);
  const skillsAnalysis = useMemo(() => analyzeSkillsCoverage(people, practiceFilter), [people, practiceFilter]);

  const practiceHealthScores = useMemo(() => {
    const practices = ['Financial Services','Industrial','Technology','Aerospace & Defense','Not for Profit','US Associations & Corporate Affairs','Life Sciences'];
    return practices.map(pa => {
      const pp = people.filter(p => p.practiceArea === pa && isActivePerson(p));
      const producers = pp.filter(p => p.isRevenueProducer);
      const support = pp.filter(p => !p.isRevenueProducer);
      const openSeats = people.filter(p => p.practiceArea === pa && p.status === 'Open Seat');
      const totalOCE = producers.reduce((s, p) => s + (p.currentYearOCE || 0), 0);
      const priorOCE = producers.reduce((s, p) => s + (p.priorYearOCE || 0), 0);
      const revChange = priorOCE > 0 ? ((totalOCE - priorOCE) / priorOCE) * 100 : 0;
      const supportRatio = producers.length > 0 ? support.length / producers.length : 0;
      const riskPeople = pp.filter(p => p.retentionRisk !== 'Low');
      const tenures = pp.map(p => {
        const s = new Date(p.startDate); const n = new Date();
        return (n.getTime() - s.getTime()) / (365.25*24*60*60*1000);
      });
      const avgTenure = tenures.length > 0 ? tenures.reduce((a,b) => a+b, 0) / tenures.length : 0;
      const skillsCoverage = getSkillsCoverageScore(people, pa);
      const totalPeopleCost = pp.reduce((sum, p) => sum + (p.totalOTE || p.baseSalary || 0), 0);
      const profitMarginPct = totalOCE > 0 ? ((totalOCE - totalPeopleCost) / totalOCE) * 100 : 0;
      return {
        practiceArea: pa, headcount: pp.length, producerCount: producers.length,
        supportCount: support.length, totalOCE, priorOCE, revChange, supportRatio,
        openSeatCount: openSeats.length, riskCount: riskPeople.length,
        hasElevatedOrCritical: riskPeople.some(p => p.retentionRisk === 'Elevated' || p.retentionRisk === 'Critical'),
        avgTenure, skillsCoverage, profitMarginPct,
      };
    });
  }, [people]);

  return { personGaps, practiceGaps, excessAnalysis, skillsAnalysis, practiceHealthScores };
}
