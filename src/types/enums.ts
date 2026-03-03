export type Band =
  | 'Senior Leadership'
  | 'Revenue Producer'
  | 'Engagement Management'
  | 'Research & Execution'
  | 'Research & Analysis'
  | 'Research Leadership'
  | 'Project Coordination'
  | 'Operations Leadership'
  | 'Finance'
  | 'IT'
  | 'Marketing'
  | 'Knowledge Management'
  | 'Operations & Admin';

export type PracticeArea = string;

export const DEFAULT_PRACTICE_AREAS: string[] = [
  'Financial Services',
  'Industrial',
  'Technology',
  'Aerospace & Defense',
  'Not for Profit',
  'US Associations & Corporate Affairs',
  'Life Sciences',
];

export type PerformanceRating = 'Star Performer' | 'Performer' | 'Performance Improvement';
export type RetentionRisk = 'Low' | 'Watch' | 'Elevated' | 'Critical';
export type EmploymentType = 'Full-Time' | 'Part-Time' | 'Contract';
export type PersonStatus = 'Active' | 'On Leave' | 'Notice Period' | 'Open Seat' | 'Terminated';
export type Office = 'New York' | 'Washington DC' | 'Boston' | 'Austin' | 'Atlanta' | 'Remote';
export type CompensationType = 'Base + Bonus' | 'Base + Commission' | 'Base Only';
export type HiringPriority = 'Critical' | 'High' | 'Medium' | 'Low';
export type RecruitingStatus = 'Not Started' | 'Sourcing' | 'Screening' | 'Interviewing' | 'Offer' | 'Closed';
export type RecruiterType = 'Internal' | 'Retained Search' | 'Contingency' | 'Direct Sourcing';
export type CandidateStage = 'Identified' | 'Screening' | 'First Interview' | 'Final Interview' | 'Offer Extended' | 'Offer Accepted' | 'Placed' | 'Declined' | 'Withdrawn';

export type ViewType = 'executive' | 'orgChart' | 'grid' | 'practiceArea' | 'revenue' | 'teamComposition' | 'supportBoard' | 'practiceScorecard' | 'gapAnalysis' | 'retentionMatrix' | 'businessLogic' | 'hiringConsole';
export type ColorCoding = 'practiceArea' | 'performance' | 'band' | 'office';

export const PRACTICE_COLORS: Record<string, string> = {
  'Financial Services': '#00857C',
  'Industrial': '#2C5F2D',
  'Technology': '#2F3C7E',
  'Aerospace & Defense': '#B85042',
  'Not for Profit': '#6D2E46',
  'US Associations & Corporate Affairs': '#065A82',
  'Life Sciences': '#028090',
  'Central': '#36454F',
};

export const BAND_ORDER: Band[] = [
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
