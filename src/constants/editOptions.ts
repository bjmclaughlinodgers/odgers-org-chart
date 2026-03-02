import type { Band, PerformanceRating, RetentionRisk, Office, EmploymentType, PersonStatus, CompensationType, HiringPriority, RecruitingStatus, RecruiterType, CandidateStage } from '../types/enums';
import { DEFAULT_PRACTICE_AREAS } from '../types/enums';
import { useOrgStore } from '../stores/orgStore';

export const BAND_OPTIONS: Band[] = [
  'Senior Leadership',
  'Revenue Producer',
  'Engagement Management',
  'Research Leadership',
  'Research & Execution',
  'Research & Analysis',
  'Project Coordination',
  'Operations Leadership',
  'Finance',
  'IT',
  'Marketing',
  'Knowledge Management',
  'Operations & Admin',
];

export const PRACTICE_OPTIONS: string[] = [
  ...DEFAULT_PRACTICE_AREAS,
  'Central',
];

export function getDynamicPracticeOptions(): string[] {
  try {
    const customPractices = useOrgStore.getState().customPractices;
    return [...DEFAULT_PRACTICE_AREAS, ...customPractices.map(p => p.name), 'Central'];
  } catch {
    return PRACTICE_OPTIONS;
  }
}

export const PERFORMANCE_OPTIONS: PerformanceRating[] = [
  'Star Performer',
  'Performer',
  'Performance Improvement',
];

export const RISK_OPTIONS: RetentionRisk[] = [
  'Low',
  'Watch',
  'Elevated',
  'Critical',
];

export const OFFICE_OPTIONS: Office[] = [
  'New York',
  'Washington DC',
  'Boston',
  'Austin',
  'Atlanta',
  'Remote',
];

export const EMPLOYMENT_OPTIONS: EmploymentType[] = [
  'Full-Time',
  'Part-Time',
  'Contract',
];

export const STATUS_OPTIONS: PersonStatus[] = [
  'Active',
  'On Leave',
  'Notice Period',
  'Open Seat',
  'Terminated',
];

export const COMPENSATION_OPTIONS: CompensationType[] = [
  'Base + Bonus',
  'Base + Commission',
  'Base Only',
];

export const HIRING_PRIORITY_OPTIONS: HiringPriority[] = [
  'Critical',
  'High',
  'Medium',
  'Low',
];

export const RECRUITING_STATUS_OPTIONS: RecruitingStatus[] = [
  'Not Started',
  'Sourcing',
  'Screening',
  'Interviewing',
  'Offer',
  'Closed',
];

export const RECRUITER_TYPE_OPTIONS: RecruiterType[] = [
  'Internal',
  'Retained Search',
  'Contingency',
  'Direct Sourcing',
];

export const CANDIDATE_STAGE_OPTIONS: CandidateStage[] = [
  'Identified',
  'Screening',
  'First Interview',
  'Final Interview',
  'Offer Extended',
  'Offer Accepted',
  'Declined',
  'Withdrawn',
];
