import type { Band, PracticeArea, PerformanceRating, RetentionRisk, EmploymentType, PersonStatus, Office, CompensationType, HiringPriority, RecruitingStatus, RecruiterType, CandidateStage } from './enums';

export interface SupportRequirements {
  engagementManagers: { required: number; allocated: number };
  seniorAssociates: { required: number; allocated: number };
  associates: { required: number; allocated: number };
  analysts: { required: number; allocated: number };
  projectCoordinators: { required: number; allocated: number };
}

export interface Candidate {
  id: string;
  name: string;
  currentCompany?: string;
  currentTitle?: string;
  stage: CandidateStage;
  source?: string;
  notes?: string;
  addedDate: string;
  isFinalist: boolean;
  linkedinUrl?: string;
}

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  title: string;
  band: Band;
  practiceArea: PracticeArea | 'Central';
  subPracticeSpecialties: string[];
  office: Office;
  employmentType: EmploymentType;
  status: PersonStatus;
  photoUrl?: string;

  // Reporting Structure
  reportsTo: string | null;
  supportLines: string[];
  practiceAreaLead: boolean;

  // Performance
  performanceRating: PerformanceRating;
  retentionRisk: RetentionRisk;
  performanceNotes: string;
  retentionNotes: string;
  lastReviewDate: string | null;

  // Revenue
  isRevenueProducer: boolean;
  currentYearOCE: number | null;
  priorYearOCE: number | null;
  revenueTarget: number | null;
  pipelineValue: number | null;

  // HR Metadata
  startDate: string;
  terminationDate?: string;
  lastPayIncreaseDate: string | null;
  lastPayIncreasePercent: number | null;
  birthday: string | null;
  compensationType: CompensationType;
  baseSalary: number | null;
  totalOTE: number | null;
  employeeFileLink: string | null;

  // Skills & Needs
  skillsTags: string[];
  needsTags: string[];

  // Capacity
  supportRequirements: SupportRequirements | null;

  // Open Seat Fields
  hiringPriority?: HiringPriority;
  targetStartDate?: string;
  recruitingNotes?: string;
  budgetedCompensation?: string;
  recruitingStatus?: RecruitingStatus;
  recruiterType?: RecruiterType;
  recruiterName?: string;
  candidates?: Candidate[];
  jobSpec?: string;
  recruitingSpendActual?: number;
  recruitingSpendCommitted?: number;
  recruitingSpendProjected?: number;
  recruitingFeeStructure?: string;

  // Notes
  adminNotes: string;
  lastUpdated: string;
}
