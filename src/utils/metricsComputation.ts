import type { Person } from '../types';
import type {
  PartnerMetricContext,
  PersonMetricContext,
  PracticeMetricContext,
} from '../types/rules';
import { getStaffCategory } from './staffCategory';
import { isActivePerson } from './personFilters';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compensation proxy: totalOTE first, then baseSalary, else 0. */
function compensation(p: Person): number {
  return p.totalOTE ?? p.baseSalary ?? 0;
}

// ---------------------------------------------------------------------------
// computePartnerMetrics
// ---------------------------------------------------------------------------

export function computePartnerMetrics(people: Person[]): PartnerMetricContext[] {
  const producers = people.filter(
    (p) => p.isRevenueProducer && isActivePerson(p),
  );

  return producers.map((producer) => {
    const directReports = people.filter((p) => p.reportsTo === producer.id);

    const directPcCount = directReports.filter(
      (r) => getStaffCategory(r) === 'Project Coordinator',
    ).length;

    const directSupportCount = directReports.filter(
      (r) => !r.isRevenueProducer,
    ).length;

    const directReportCount = directReports.length;

    const peopleCost = directReports.reduce(
      (sum, r) => sum + compensation(r),
      0,
    );

    const expectedBillings = producer.currentYearOCE ?? producer.revenueTarget ?? 0;

    const supportCost = directReports
      .filter((r) => !r.isRevenueProducer)
      .reduce((sum, r) => sum + compensation(r), 0);

    const supportCostRatio =
      expectedBillings > 0 ? (supportCost / expectedBillings) * 100 : 0;

    return {
      personId: producer.id,
      name: `${producer.firstName} ${producer.lastName}`,
      practiceArea: producer.practiceArea,
      expectedBillings,
      directPcCount,
      directSupportCount,
      directReportCount,
      peopleCost,
      supportCostRatio,
    };
  });
}

// ---------------------------------------------------------------------------
// computePersonMetrics
// ---------------------------------------------------------------------------

export function computePersonMetrics(people: Person[]): PersonMetricContext[] {
  const activePeople = people.filter((p) => isActivePerson(p));
  const producers = people.filter(
    (p) => p.isRevenueProducer && isActivePerson(p),
  );

  return activePeople.map((person) => {
    // Count how many producers reference this person in their supportLines
    const activeAssignments = producers.filter((prod) =>
      prod.supportLines.includes(person.id),
    ).length;

    const currentYearOCE = person.currentYearOCE ?? 0;
    const revenueTarget = person.revenueTarget ?? 0;

    let supportAllocatedTotal = 0;
    let supportRequiredTotal = 0;

    if (person.supportRequirements) {
      const sr = person.supportRequirements;
      supportAllocatedTotal =
        sr.engagementManagers.allocated +
        sr.seniorAssociates.allocated +
        sr.associates.allocated +
        sr.analysts.allocated +
        sr.projectCoordinators.allocated;

      supportRequiredTotal =
        sr.engagementManagers.required +
        sr.seniorAssociates.required +
        sr.associates.required +
        sr.analysts.required +
        sr.projectCoordinators.required;
    }

    return {
      personId: person.id,
      name: `${person.firstName} ${person.lastName}`,
      practiceArea: person.practiceArea,
      band: person.band,
      staffCategory: getStaffCategory(person),
      isRevenueProducer: person.isRevenueProducer,
      activeAssignments,
      currentYearOCE,
      revenueTarget,
      supportAllocatedTotal,
      supportRequiredTotal,
    };
  });
}

// ---------------------------------------------------------------------------
// computeExtendedPracticeMetrics
// ---------------------------------------------------------------------------

export function computeExtendedPracticeMetrics(
  people: Person[],
): PracticeMetricContext[] {
  // Active, non-Central people
  const eligible = people.filter(
    (p) => isActivePerson(p) && p.practiceArea !== 'Central',
  );

  // Group by practiceArea
  const grouped = new Map<string, Person[]>();
  for (const p of eligible) {
    const pa = p.practiceArea;
    if (!grouped.has(pa)) grouped.set(pa, []);
    grouped.get(pa)!.push(p);
  }

  const results: PracticeMetricContext[] = [];

  for (const [practiceArea, members] of grouped) {
    const headcount = members.length;
    const practiceProducers = members.filter((p) => p.isRevenueProducer);
    const producerCount = practiceProducers.length;
    const supportCount = headcount - producerCount;

    const totalPeopleCost = members.reduce(
      (sum, p) => sum + compensation(p),
      0,
    );

    const ytdOCE = practiceProducers.reduce(
      (sum, p) => sum + (p.currentYearOCE ?? 0),
      0,
    );

    const revenueTarget = practiceProducers.reduce(
      (sum, p) => sum + (p.revenueTarget ?? 0),
      0,
    );

    const targetAttainment =
      revenueTarget > 0 ? (ytdOCE / revenueTarget) * 100 : 0;

    const impliedMargin =
      ytdOCE > 0 ? ((ytdOCE - totalPeopleCost) / ytdOCE) * 100 : 0;

    // PC FTE: people in practice whose category is Project Coordinator,
    // plus people outside this practice whose manager is in this practice
    // and who are PCs. We count PCs within the practice membership first.
    const practiceIds = new Set(members.map((m) => m.id));
    const pcInPractice = members.filter(
      (p) => getStaffCategory(p) === 'Project Coordinator',
    ).length;
    // Also count PCs from outside whose manager is in this practice
    const pcFromOutside = people.filter(
      (p) =>
        isActivePerson(p) &&
        !practiceIds.has(p.id) &&
        p.reportsTo !== null &&
        practiceIds.has(p.reportsTo) &&
        getStaffCategory(p) === 'Project Coordinator',
    ).length;
    const pcFTE = pcInPractice + pcFromOutside;

    // Support cost: compensation of non-producer members
    const supportCost = members
      .filter((p) => !p.isRevenueProducer)
      .reduce((sum, p) => sum + compensation(p), 0);

    const expectedBillings = practiceProducers.reduce(
      (sum, p) => sum + (p.currentYearOCE ?? p.revenueTarget ?? 0),
      0,
    );

    const supportCostRatio =
      expectedBillings > 0 ? (supportCost / expectedBillings) * 100 : 0;

    const profitability =
      ytdOCE > 0
        ? ((ytdOCE - totalPeopleCost) / ytdOCE) * 100
        : 0;

    results.push({
      practiceArea,
      headcount,
      producerCount,
      supportCount,
      totalPeopleCost,
      ytdOCE,
      revenueTarget,
      targetAttainment,
      impliedMargin,
      pcFTE,
      supportCostRatio,
      expectedBillings,
      profitability,
    });
  }

  return results;
}
