export type RuleScope = 'firm' | 'practice' | 'partner' | 'person';
export type RuleSeverity = 'warn' | 'fail';
export type RuleCategory = 'staffing' | 'economics' | 'capacity' | 'custom';
export type RuleStatus = 'pass' | 'warn' | 'fail';
export type ConditionOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq' | 'between';

export interface RuleCondition {
  metric: string;
  operator: ConditionOperator;
  value: number;
  upperValue?: number;
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  scope: RuleScope;
  scopeFilter?: string;
  conditions: RuleCondition[];
  conditionOperator: 'AND' | 'OR';
  severity: RuleSeverity;
  messageTemplate: string;
  category: RuleCategory;
  createdAt: string;
  updatedAt: string;
}

export interface RuleEvaluationResult {
  ruleId: string;
  ruleName: string;
  status: RuleStatus;
  severity: RuleSeverity;
  scope: RuleScope;
  entityId: string;
  entityLabel: string;
  message: string;
  computedValues: Record<string, number>;
  category: RuleCategory;
}

export interface FirmMetricContext {
  totalHeadcount: number;
  producerCount: number;
  supportCount: number;
  supportRatio: number;
  totalOCE: number;
  yoyChange: number;
  avgTenure: number;
  executionSupportRatio: number;
  adminSupportRatio: number;
}

export interface PracticeMetricContext {
  practiceArea: string;
  headcount: number;
  producerCount: number;
  supportCount: number;
  totalPeopleCost: number;
  ytdOCE: number;
  revenueTarget: number;
  targetAttainment: number;
  impliedMargin: number;
  pcFTE: number;
  supportCostRatio: number;
  expectedBillings: number;
  profitability: number;
}

export interface PartnerMetricContext {
  personId: string;
  name: string;
  practiceArea: string;
  expectedBillings: number;
  directPcCount: number;
  directSupportCount: number;
  directReportCount: number;
  peopleCost: number;
  supportCostRatio: number;
}

export interface PersonMetricContext {
  personId: string;
  name: string;
  practiceArea: string;
  band: string;
  staffCategory: string;
  activeAssignments: number;
  isRevenueProducer: boolean;
  currentYearOCE: number;
  revenueTarget: number;
  supportAllocatedTotal: number;
  supportRequiredTotal: number;
}

export interface MetricDefinition {
  key: string;
  label: string;
  scope: RuleScope[];
  unit: 'number' | 'currency' | 'percent' | 'ratio';
  description: string;
}
