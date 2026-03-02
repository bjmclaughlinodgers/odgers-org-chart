import type { MetricDefinition, RuleScope } from '../types/rules';

export const METRIC_REGISTRY: MetricDefinition[] = [
  // Firm-level
  { key: 'totalHeadcount', label: 'Total Headcount', scope: ['firm'], unit: 'number', description: 'Total active employees' },
  { key: 'producerCount', label: 'Producer Count', scope: ['firm', 'practice'], unit: 'number', description: 'Number of revenue producers' },
  { key: 'supportCount', label: 'Support Count', scope: ['firm', 'practice'], unit: 'number', description: 'Number of support staff' },
  { key: 'supportRatio', label: 'Support Ratio', scope: ['firm', 'practice'], unit: 'ratio', description: 'Support staff per producer' },
  { key: 'totalOCE', label: 'Total OCE', scope: ['firm'], unit: 'currency', description: 'Total current year OCE' },
  { key: 'yoyChange', label: 'YoY Change', scope: ['firm'], unit: 'percent', description: 'Year-over-year OCE change' },
  { key: 'avgTenure', label: 'Average Tenure', scope: ['firm'], unit: 'number', description: 'Average employee tenure in years' },
  { key: 'executionSupportRatio', label: 'Execution Support Ratio', scope: ['firm'], unit: 'ratio', description: 'Execution support staff per producer' },
  { key: 'adminSupportRatio', label: 'Admin Support Ratio', scope: ['firm'], unit: 'ratio', description: 'Project coordinators per producer' },
  // Practice-level
  { key: 'headcount', label: 'Headcount', scope: ['practice'], unit: 'number', description: 'Practice headcount' },
  { key: 'totalPeopleCost', label: 'Total People Cost', scope: ['practice'], unit: 'currency', description: 'Total compensation cost' },
  { key: 'ytdOCE', label: 'YTD OCE', scope: ['practice'], unit: 'currency', description: 'Year-to-date OCE for practice' },
  { key: 'revenueTarget', label: 'Revenue Target', scope: ['practice'], unit: 'currency', description: 'Combined revenue target' },
  { key: 'targetAttainment', label: 'Target Attainment', scope: ['practice'], unit: 'percent', description: 'OCE / Revenue Target %' },
  { key: 'impliedMargin', label: 'Implied Margin', scope: ['practice'], unit: 'percent', description: '(Revenue - People Cost) / Revenue %' },
  { key: 'supportCostRatio', label: 'Support Cost Ratio', scope: ['practice', 'partner'], unit: 'percent', description: 'Support cost / expected billings' },
  { key: 'expectedBillings', label: 'Expected Billings', scope: ['practice', 'partner'], unit: 'currency', description: 'Sum of revenue targets or OCE' },
  { key: 'profitability', label: 'Profitability', scope: ['practice'], unit: 'percent', description: '(Revenue - People Cost) / Revenue %' },
  { key: 'pcFTE', label: 'PC FTE Count', scope: ['practice'], unit: 'number', description: 'Project coordinator headcount' },
  // Partner-level
  { key: 'directPcCount', label: 'Dedicated PC Count', scope: ['partner'], unit: 'number', description: 'Direct report PCs' },
  { key: 'directSupportCount', label: 'Direct Support Count', scope: ['partner'], unit: 'number', description: 'Direct report support staff' },
  { key: 'directReportCount', label: 'Direct Report Count', scope: ['partner'], unit: 'number', description: 'Total direct reports' },
  { key: 'peopleCost', label: 'People Cost (Partner)', scope: ['partner'], unit: 'currency', description: 'Total cost of partner direct reports' },
  // Person-level
  { key: 'activeAssignments', label: 'Active Assignments', scope: ['person'], unit: 'number', description: 'Number of active support assignments' },
  { key: 'currentYearOCE', label: 'Current Year OCE', scope: ['person'], unit: 'currency', description: 'Individual OCE' },
  { key: 'supportAllocatedTotal', label: 'Support Allocated', scope: ['person'], unit: 'number', description: 'Total support FTEs allocated' },
  { key: 'supportRequiredTotal', label: 'Support Required', scope: ['person'], unit: 'number', description: 'Total support FTEs required' },
];

export function getMetricsForScope(scope: RuleScope): MetricDefinition[] {
  return METRIC_REGISTRY.filter(m => m.scope.includes(scope));
}

export function getMetricDefinition(key: string): MetricDefinition | undefined {
  return METRIC_REGISTRY.find(m => m.key === key);
}
