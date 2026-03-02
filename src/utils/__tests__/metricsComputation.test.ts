import { describe, it, expect } from 'vitest';
import { computePartnerMetrics, computePersonMetrics, computeExtendedPracticeMetrics } from '../metricsComputation';
import type { Person } from '../../types';

// Helper to create test people
function makePerson(overrides: Partial<Person>): Person {
  return {
    id: 'test-id',
    firstName: 'Test',
    lastName: 'Person',
    title: 'Tester',
    band: 'Operations & Admin',
    practiceArea: 'Central',
    subPracticeSpecialties: [],
    office: 'New York',
    employmentType: 'Full-Time',
    status: 'Active',
    reportsTo: null,
    supportLines: [],
    practiceAreaLead: false,
    performanceRating: 'Performer',
    retentionRisk: 'Low',
    performanceNotes: '',
    retentionNotes: '',
    lastReviewDate: null,
    isRevenueProducer: false,
    currentYearOCE: null,
    priorYearOCE: null,
    revenueTarget: null,
    pipelineValue: null,
    startDate: '2023-01-01',
    lastPayIncreaseDate: null,
    lastPayIncreasePercent: null,
    birthday: null,
    compensationType: 'Base + Bonus',
    baseSalary: null,
    totalOTE: null,
    employeeFileLink: null,
    skillsTags: [],
    needsTags: [],
    supportRequirements: null,
    adminNotes: '',
    lastUpdated: '2026-01-01',
    ...overrides,
  } as Person;
}

describe('computePartnerMetrics', () => {
  it('computes metrics for a producer with direct reports', () => {
    const people: Person[] = [
      makePerson({ id: 'partner1', firstName: 'Alice', lastName: 'Smith', isRevenueProducer: true, currentYearOCE: 2000000, revenueTarget: 2500000, band: 'Revenue Producer', practiceArea: 'Technology' }),
      makePerson({ id: 'support1', firstName: 'Bob', lastName: 'Jones', reportsTo: 'partner1', totalOTE: 80000, band: 'Research & Execution', practiceArea: 'Technology' }),
      makePerson({ id: 'pc1', firstName: 'Carol', lastName: 'White', reportsTo: 'partner1', totalOTE: 60000, band: 'Project Coordination', practiceArea: 'Technology' }),
    ];

    const results = computePartnerMetrics(people);
    expect(results.length).toBe(1);

    const partner = results[0];
    expect(partner.personId).toBe('partner1');
    expect(partner.name).toBe('Alice Smith');
    expect(partner.directReportCount).toBe(2);
    expect(partner.directSupportCount).toBe(2); // Both non-producers
    expect(partner.directPcCount).toBe(1);
    expect(partner.expectedBillings).toBe(2000000);
    expect(partner.peopleCost).toBe(140000); // 80k + 60k
  });

  it('skips open seats', () => {
    const people: Person[] = [
      makePerson({ id: 'partner1', isRevenueProducer: true, status: 'Open Seat', band: 'Revenue Producer', practiceArea: 'Technology' }),
    ];
    const results = computePartnerMetrics(people);
    expect(results.length).toBe(0);
  });

  it('returns empty array when no producers', () => {
    const people: Person[] = [
      makePerson({ id: 'p1', isRevenueProducer: false }),
    ];
    const results = computePartnerMetrics(people);
    expect(results.length).toBe(0);
  });

  it('handles producer with no direct reports', () => {
    const people: Person[] = [
      makePerson({ id: 'partner1', firstName: 'Solo', lastName: 'Partner', isRevenueProducer: true, currentYearOCE: 1000000, band: 'Revenue Producer', practiceArea: 'Technology' }),
    ];
    const results = computePartnerMetrics(people);
    expect(results[0].directReportCount).toBe(0);
    expect(results[0].peopleCost).toBe(0);
    expect(results[0].supportCostRatio).toBe(0);
  });
});

describe('computePersonMetrics', () => {
  it('counts active assignments from producer supportLines', () => {
    const people: Person[] = [
      makePerson({ id: 'prod1', isRevenueProducer: true, supportLines: ['assoc1', 'assoc2'], band: 'Revenue Producer', practiceArea: 'Technology' }),
      makePerson({ id: 'prod2', isRevenueProducer: true, supportLines: ['assoc1'], band: 'Revenue Producer', practiceArea: 'Technology' }),
      makePerson({ id: 'assoc1', firstName: 'Associate', lastName: 'One', band: 'Research & Execution', practiceArea: 'Technology' }),
      makePerson({ id: 'assoc2', firstName: 'Associate', lastName: 'Two', band: 'Research & Analysis', practiceArea: 'Technology' }),
    ];

    const results = computePersonMetrics(people);
    const assoc1 = results.find(r => r.personId === 'assoc1');
    const assoc2 = results.find(r => r.personId === 'assoc2');

    expect(assoc1?.activeAssignments).toBe(2); // Listed by prod1 and prod2
    expect(assoc2?.activeAssignments).toBe(1); // Listed by prod1 only
  });

  it('computes support allocated/required totals', () => {
    const people: Person[] = [
      makePerson({
        id: 'prod1',
        isRevenueProducer: true,
        band: 'Revenue Producer',
        practiceArea: 'Technology',
        supportRequirements: {
          engagementManagers: { required: 1, allocated: 1 },
          seniorAssociates: { required: 2, allocated: 1 },
          associates: { required: 3, allocated: 2 },
          analysts: { required: 1, allocated: 0 },
          projectCoordinators: { required: 1, allocated: 1 },
        },
      }),
    ];

    const results = computePersonMetrics(people);
    const prod = results[0];
    expect(prod.supportRequiredTotal).toBe(8); // 1+2+3+1+1
    expect(prod.supportAllocatedTotal).toBe(5); // 1+1+2+0+1
  });

  it('skips open seats', () => {
    const people: Person[] = [
      makePerson({ id: 'p1', status: 'Open Seat' }),
      makePerson({ id: 'p2', status: 'Active', band: 'Research & Execution', practiceArea: 'Technology' }),
    ];
    const results = computePersonMetrics(people);
    expect(results.length).toBe(1);
    expect(results[0].personId).toBe('p2');
  });

  it('handles empty people array', () => {
    const results = computePersonMetrics([]);
    expect(results.length).toBe(0);
  });
});

describe('computeExtendedPracticeMetrics', () => {
  it('computes practice-level metrics', () => {
    const people: Person[] = [
      makePerson({ id: 'p1', isRevenueProducer: true, currentYearOCE: 500000, revenueTarget: 600000, totalOTE: 200000, band: 'Revenue Producer', practiceArea: 'Technology' }),
      makePerson({ id: 'p2', isRevenueProducer: true, currentYearOCE: 400000, revenueTarget: 500000, totalOTE: 180000, band: 'Revenue Producer', practiceArea: 'Technology' }),
      makePerson({ id: 'p3', isRevenueProducer: false, totalOTE: 70000, band: 'Research & Execution', practiceArea: 'Technology' }),
    ];

    const results = computeExtendedPracticeMetrics(people);
    expect(results.length).toBe(1);

    const tech = results[0];
    expect(tech.practiceArea).toBe('Technology');
    expect(tech.headcount).toBe(3);
    expect(tech.producerCount).toBe(2);
    expect(tech.supportCount).toBe(1);
    expect(tech.totalPeopleCost).toBe(450000); // 200k + 180k + 70k
    expect(tech.ytdOCE).toBe(900000); // 500k + 400k
    expect(tech.revenueTarget).toBe(1100000); // 600k + 500k
  });

  it('excludes Central practice', () => {
    const people: Person[] = [
      makePerson({ id: 'p1', practiceArea: 'Central', isRevenueProducer: false }),
      makePerson({ id: 'p2', practiceArea: 'Technology', isRevenueProducer: true, currentYearOCE: 100000, band: 'Revenue Producer' }),
    ];

    const results = computeExtendedPracticeMetrics(people);
    expect(results.length).toBe(1);
    expect(results[0].practiceArea).toBe('Technology');
  });

  it('handles empty array', () => {
    const results = computeExtendedPracticeMetrics([]);
    expect(results.length).toBe(0);
  });
});
