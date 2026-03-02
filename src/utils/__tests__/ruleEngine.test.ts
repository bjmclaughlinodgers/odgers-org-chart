import { describe, it, expect } from 'vitest';
import { evaluateCondition, interpolateMessage, evaluateRule, evaluateAllRules } from '../ruleEngine';
import type { Rule, FirmMetricContext, PracticeMetricContext, PartnerMetricContext, PersonMetricContext } from '../../types/rules';

describe('evaluateCondition', () => {
  it('gt: returns true when metricValue > threshold', () => {
    expect(evaluateCondition('gt', 10, 5)).toBe(true);
    expect(evaluateCondition('gt', 5, 5)).toBe(false);
    expect(evaluateCondition('gt', 3, 5)).toBe(false);
  });

  it('gte: returns true when metricValue >= threshold', () => {
    expect(evaluateCondition('gte', 10, 5)).toBe(true);
    expect(evaluateCondition('gte', 5, 5)).toBe(true);
    expect(evaluateCondition('gte', 3, 5)).toBe(false);
  });

  it('lt: returns true when metricValue < threshold', () => {
    expect(evaluateCondition('lt', 3, 5)).toBe(true);
    expect(evaluateCondition('lt', 5, 5)).toBe(false);
    expect(evaluateCondition('lt', 10, 5)).toBe(false);
  });

  it('lte: returns true when metricValue <= threshold', () => {
    expect(evaluateCondition('lte', 3, 5)).toBe(true);
    expect(evaluateCondition('lte', 5, 5)).toBe(true);
    expect(evaluateCondition('lte', 10, 5)).toBe(false);
  });

  it('eq: returns true when values are equal', () => {
    expect(evaluateCondition('eq', 5, 5)).toBe(true);
    expect(evaluateCondition('eq', 5, 6)).toBe(false);
  });

  it('neq: returns true when values are not equal', () => {
    expect(evaluateCondition('neq', 5, 6)).toBe(true);
    expect(evaluateCondition('neq', 5, 5)).toBe(false);
  });

  it('between: returns true when value is in range', () => {
    expect(evaluateCondition('between', 5, 1, 10)).toBe(true);
    expect(evaluateCondition('between', 1, 1, 10)).toBe(true);
    expect(evaluateCondition('between', 10, 1, 10)).toBe(true);
    expect(evaluateCondition('between', 0, 1, 10)).toBe(false);
    expect(evaluateCondition('between', 11, 1, 10)).toBe(false);
  });

  it('returns false for NaN metricValue', () => {
    expect(evaluateCondition('gt', NaN, 5)).toBe(false);
    expect(evaluateCondition('eq', NaN, NaN)).toBe(false);
    expect(evaluateCondition('between', NaN, 1, 10)).toBe(false);
  });

  it('handles boundary values correctly', () => {
    expect(evaluateCondition('gt', 5.0001, 5)).toBe(true);
    expect(evaluateCondition('lt', 4.9999, 5)).toBe(true);
    expect(evaluateCondition('eq', 0, 0)).toBe(true);
    expect(evaluateCondition('gte', -1, -1)).toBe(true);
  });
});

describe('interpolateMessage', () => {
  it('replaces placeholders with values', () => {
    const result = interpolateMessage('Hello {{name}}, you have {{count}} items', {
      name: 'Alice',
      count: 3,
    });
    expect(result).toContain('Alice');
    expect(result).toContain('3');
  });

  it('formats large numbers as currency', () => {
    const result = interpolateMessage('Billings: {{expectedBillings}}', {
      expectedBillings: 1500000,
    });
    expect(result).toContain('$');
    expect(result).toContain('1,500,000');
  });

  it('leaves missing keys as-is', () => {
    const result = interpolateMessage('Value is {{missing}}', {});
    expect(result).toBe('Value is {{missing}}');
  });

  it('handles boolean values', () => {
    const result = interpolateMessage('Active: {{isActive}}', { isActive: true });
    expect(result).toContain('true');
  });
});

describe('evaluateRule', () => {
  const makeRule = (overrides: Partial<Rule> = {}): Rule => ({
    id: 'test-rule',
    name: 'Test Rule',
    description: 'A test rule',
    enabled: true,
    scope: 'person',
    conditions: [{ metric: 'activeAssignments', operator: 'gt', value: 8 }],
    conditionOperator: 'AND',
    severity: 'fail',
    messageTemplate: '{{name}} has {{activeAssignments}} assignments',
    category: 'capacity',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  });

  it('returns pass for disabled rules', () => {
    const rule = makeRule({ enabled: false });
    const result = evaluateRule(rule, 'p1', 'John Doe', { activeAssignments: 20 });
    expect(result.status).toBe('pass');
  });

  it('returns fail when condition triggers', () => {
    const rule = makeRule();
    const result = evaluateRule(rule, 'p1', 'John Doe', { activeAssignments: 10 });
    expect(result.status).toBe('fail');
    expect(result.message).toContain('10');
  });

  it('returns pass when condition does not trigger', () => {
    const rule = makeRule();
    const result = evaluateRule(rule, 'p1', 'John Doe', { activeAssignments: 5 });
    expect(result.status).toBe('pass');
    expect(result.message).toBe('');
  });

  it('handles AND logic: all conditions must trigger', () => {
    const rule = makeRule({
      conditions: [
        { metric: 'expectedBillings', operator: 'lt', value: 1500000 },
        { metric: 'directPcCount', operator: 'gte', value: 1 },
      ],
      conditionOperator: 'AND',
    });

    // Both conditions true
    expect(evaluateRule(rule, 'p1', 'Test', { expectedBillings: 1000000, directPcCount: 2 }).status).toBe('fail');
    // Only one true
    expect(evaluateRule(rule, 'p1', 'Test', { expectedBillings: 2000000, directPcCount: 2 }).status).toBe('pass');
    // Neither true
    expect(evaluateRule(rule, 'p1', 'Test', { expectedBillings: 2000000, directPcCount: 0 }).status).toBe('pass');
  });

  it('handles OR logic: any condition can trigger', () => {
    const rule = makeRule({
      conditions: [
        { metric: 'activeAssignments', operator: 'gt', value: 8 },
        { metric: 'supportAllocatedTotal', operator: 'eq', value: 0 },
      ],
      conditionOperator: 'OR',
    });

    // First condition true
    expect(evaluateRule(rule, 'p1', 'Test', { activeAssignments: 10, supportAllocatedTotal: 5 }).status).toBe('fail');
    // Second condition true
    expect(evaluateRule(rule, 'p1', 'Test', { activeAssignments: 3, supportAllocatedTotal: 0 }).status).toBe('fail');
    // Neither true
    expect(evaluateRule(rule, 'p1', 'Test', { activeAssignments: 3, supportAllocatedTotal: 5 }).status).toBe('pass');
  });

  it('handles missing metric values (NaN) gracefully', () => {
    const rule = makeRule();
    const result = evaluateRule(rule, 'p1', 'Test', {});
    // NaN should not trigger
    expect(result.status).toBe('pass');
  });
});

describe('evaluateAllRules', () => {
  const personRule: Rule = {
    id: 'person-rule',
    name: 'Person Rule',
    description: 'Test person rule',
    enabled: true,
    scope: 'person',
    scopeFilter: 'Search Execution Support',
    conditions: [{ metric: 'activeAssignments', operator: 'gt', value: 5 }],
    conditionOperator: 'AND',
    severity: 'warn',
    messageTemplate: '{{name}} overloaded with {{activeAssignments}} assignments',
    category: 'capacity',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const practiceRule: Rule = {
    id: 'practice-rule',
    name: 'Practice Rule',
    description: 'Test practice rule',
    enabled: true,
    scope: 'practice',
    conditions: [{ metric: 'profitability', operator: 'lt', value: 30 }],
    conditionOperator: 'AND',
    severity: 'warn',
    messageTemplate: '{{practiceArea}} profitability at {{profitability}}%',
    category: 'economics',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  it('evaluates person-scoped rules with scope filter', () => {
    const personCtxs: PersonMetricContext[] = [
      { personId: 'p1', name: 'Alice', practiceArea: 'Tech', band: 'Research & Execution', staffCategory: 'Search Execution Support', activeAssignments: 10, isRevenueProducer: false, currentYearOCE: 0, revenueTarget: 0, supportAllocatedTotal: 0, supportRequiredTotal: 0 },
      { personId: 'p2', name: 'Bob', practiceArea: 'Tech', band: 'Revenue Producer', staffCategory: 'Revenue Producer', activeAssignments: 10, isRevenueProducer: true, currentYearOCE: 500000, revenueTarget: 600000, supportAllocatedTotal: 0, supportRequiredTotal: 0 },
    ];

    const results = evaluateAllRules([personRule], null, [], [], personCtxs);
    // Only Alice should be evaluated (scope filter = Search Execution Support)
    expect(results.length).toBe(1);
    expect(results[0].entityId).toBe('p1');
    expect(results[0].status).toBe('warn');
  });

  it('evaluates practice-scoped rules', () => {
    const practiceCtxs: PracticeMetricContext[] = [
      { practiceArea: 'Tech', headcount: 10, producerCount: 3, supportCount: 7, totalPeopleCost: 800000, ytdOCE: 1000000, revenueTarget: 1200000, targetAttainment: 83.3, impliedMargin: 20, pcFTE: 1, supportCostRatio: 15, expectedBillings: 1000000, profitability: 20 },
      { practiceArea: 'Finance', headcount: 8, producerCount: 3, supportCount: 5, totalPeopleCost: 500000, ytdOCE: 900000, revenueTarget: 900000, targetAttainment: 100, impliedMargin: 44, pcFTE: 1, supportCostRatio: 10, expectedBillings: 900000, profitability: 44 },
    ];

    const results = evaluateAllRules([practiceRule], null, practiceCtxs, [], []);
    // Tech profitability 20 < 30 → warn; Finance profitability 44 > 30 → pass
    const violations = results.filter(r => r.status !== 'pass');
    expect(violations.length).toBe(1);
    expect(violations[0].entityId).toBe('Tech');
  });

  it('returns empty array when no rules enabled', () => {
    const disabledRule = { ...personRule, enabled: false };
    const results = evaluateAllRules([disabledRule], null, [], [], []);
    expect(results.length).toBe(0);
  });

  it('handles multi-scope rules together', () => {
    const firmCtx: FirmMetricContext = {
      totalHeadcount: 50, producerCount: 15, supportCount: 35, supportRatio: 2.33,
      totalOCE: 5000000, yoyChange: 10, avgTenure: 3.5, executionSupportRatio: 1.5, adminSupportRatio: 0.3,
    };

    const firmRule: Rule = {
      id: 'firm-rule', name: 'Firm Rule', description: 'Test', enabled: true,
      scope: 'firm', conditions: [{ metric: 'supportRatio', operator: 'gt', value: 2 }],
      conditionOperator: 'AND', severity: 'warn',
      messageTemplate: 'Firm support ratio {{supportRatio}} exceeds 2.0',
      category: 'staffing', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    };

    const results = evaluateAllRules([firmRule], firmCtx, [], [], []);
    expect(results.length).toBe(1);
    expect(results[0].status).toBe('warn');
    expect(results[0].entityId).toBe('firm');
  });
});
