import { useMemo } from 'react';
import { useOrgStore } from '../stores/orgStore';
import { usePlanningStore } from '../stores/planningStore';
import type { Person } from '../types';
import { getStaffCategory } from '../utils/staffCategory';
import { isActivePerson } from '../utils/personFilters';

export function useOrgData() {
  const { people, getPerson, getDirectReports } = useOrgStore();
  const { sandboxPeople, isActive: isPlanningActive } = usePlanningStore();

  const activePeople = isPlanningActive ? sandboxPeople : people;

  const practiceGroups = useMemo(() => {
    const groups = new Map<string, Person[]>();
    activePeople.forEach(p => {
      const key = p.practiceArea;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    });
    return groups;
  }, [activePeople]);

  const firmMetrics = useMemo(() => {
    const active = activePeople.filter(p => isActivePerson(p));
    const producers = active.filter(p => p.isRevenueProducer);
    const support = active.filter(p => !p.isRevenueProducer);
    const executionSupport = active.filter(p => getStaffCategory(p) === 'Search Execution Support');
    const projectCoordinators = active.filter(p => getStaffCategory(p) === 'Project Coordinator');
    const totalOCE = producers.reduce((sum, p) => sum + (p.currentYearOCE || 0), 0);
    const priorOCE = producers.reduce((sum, p) => sum + (p.priorYearOCE || 0), 0);
    const tenures = active.map(p => {
      const start = new Date(p.startDate);
      const now = new Date();
      return (now.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    });
    const avgTenure = tenures.length > 0 ? tenures.reduce((a, b) => a + b, 0) / tenures.length : 0;

    const executionSupportRatio = producers.length > 0 ? executionSupport.length / producers.length : 0;
    const adminSupportRatio = producers.length > 0 ? projectCoordinators.length / producers.length : 0;

    return {
      totalHeadcount: active.length,
      producerCount: producers.length,
      supportCount: support.length,
      supportRatio: producers.length > 0 ? support.length / producers.length : 0,
      totalOCE,
      priorOCE,
      yoyChange: priorOCE > 0 ? ((totalOCE - priorOCE) / priorOCE) * 100 : 0,
      openSeats: activePeople.filter(p => p.status === 'Open Seat').length,
      avgTenure,
      executionSupportCount: executionSupport.length,
      executionSupportRatio,
      projectCoordinatorCount: projectCoordinators.length,
      adminSupportRatio,
    };
  }, [activePeople]);

  const practiceFinancials = useMemo(() => {
    const active = activePeople.filter(p => isActivePerson(p));
    const projectCoordinators = active.filter(p => getStaffCategory(p) === 'Project Coordinator');

    const practices = new Map<string, {
      practiceArea: string;
      headcount: number;
      producerCount: number;
      supportCount: number;
      totalPeopleCost: number;
      priorYearOCE: number;
      ytdOCE: number;
      revenueTarget: number;
      targetAttainment: number;
      impliedMargin: number;
      pcFTE: number;
    }>();

    activePeople.forEach(p => {
      if (p.status === 'Open Seat' || p.practiceArea === 'Central') return;
      const pa = p.practiceArea;
      if (!practices.has(pa)) {
        practices.set(pa, {
          practiceArea: pa,
          headcount: 0,
          producerCount: 0,
          supportCount: 0,
          totalPeopleCost: 0,
          priorYearOCE: 0,
          ytdOCE: 0,
          revenueTarget: 0,
          targetAttainment: 0,
          impliedMargin: 0,
          pcFTE: 0,
        });
      }
      const entry = practices.get(pa)!;
      entry.headcount++;
      if (p.isRevenueProducer) {
        entry.producerCount++;
        entry.ytdOCE += p.currentYearOCE || 0;
        entry.priorYearOCE += p.priorYearOCE || 0;
        entry.revenueTarget += p.revenueTarget || 0;
      } else {
        entry.supportCount++;
      }
      // People cost = totalOTE if available, else baseSalary
      entry.totalPeopleCost += p.totalOTE || p.baseSalary || 0;
    });

    // Second pass: allocate PCs fractionally to their manager's practice
    projectCoordinators.forEach(pc => {
      const manager = active.find(p => p.id === pc.reportsTo);
      if (manager && practices.has(manager.practiceArea)) {
        const entry = practices.get(manager.practiceArea)!;
        entry.pcFTE = (entry.pcFTE || 0) + 1;
      }
    });

    // Compute derived metrics
    const result = Array.from(practices.values()).map(p => ({
      ...p,
      targetAttainment: p.revenueTarget > 0 ? (p.ytdOCE / p.revenueTarget) * 100 : 0,
      impliedMargin: p.ytdOCE > 0 ? ((p.ytdOCE - p.totalPeopleCost) / p.ytdOCE) * 100 : 0,
    }));

    return result.sort((a, b) => b.ytdOCE - a.ytdOCE);
  }, [activePeople]);

  return {
    people: activePeople,
    practiceGroups,
    firmMetrics,
    practiceFinancials,
    getPerson: isPlanningActive ? (id: string) => sandboxPeople.find(p => p.id === id) : getPerson,
    getDirectReports: isPlanningActive
      ? (id: string) => sandboxPeople.filter(p => p.reportsTo === id)
      : getDirectReports,
    getByPractice: (pa: string) => activePeople.filter(p => p.practiceArea === pa),
    getRevenueProducers: () => activePeople.filter(p => p.isRevenueProducer && isActivePerson(p)),
    getSupportStaff: () => activePeople.filter(p => !p.isRevenueProducer && isActivePerson(p)),
    getOpenSeats: () => activePeople.filter(p => p.status === 'Open Seat'),
  };
}
