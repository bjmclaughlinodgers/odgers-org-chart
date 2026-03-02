import type {
  Rule,
  RuleCondition,
  ConditionOperator,
  RuleEvaluationResult,
  RuleScope,
  FirmMetricContext,
  PracticeMetricContext,
  PartnerMetricContext,
  PersonMetricContext,
} from '../types/rules';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function contextToMetrics(ctx: Record<string, unknown>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(ctx)) {
    if (typeof value === 'number') result[key] = value;
  }
  return result;
}

/**
 * Format a numeric value for display inside an interpolated message.
 *  - Values > 10 000 are treated as currency  -> $1,234,567
 *  - Values that "look like" percentages (key hint) get 1 decimal + %
 *  - Everything else is returned as-is via toString()
 */
function formatNumber(value: number, key: string): string {
  // Heuristic: if key name hints at a percentage, format accordingly
  const pctHint = /percent|ratio|attainment|margin|profitability/i;
  if (pctHint.test(key)) {
    return `${value.toFixed(1)}%`;
  }
  if (Math.abs(value) > 10_000) {
    return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }
  return String(value);
}

// ---------------------------------------------------------------------------
// evaluateCondition
// ---------------------------------------------------------------------------

export function evaluateCondition(
  operator: ConditionOperator,
  metricValue: number,
  threshold: number,
  upperValue?: number,
): boolean {
  if (Number.isNaN(metricValue)) return false;

  switch (operator) {
    case 'gt':
      return metricValue > threshold;
    case 'gte':
      return metricValue >= threshold;
    case 'lt':
      return metricValue < threshold;
    case 'lte':
      return metricValue <= threshold;
    case 'eq':
      return metricValue === threshold;
    case 'neq':
      return metricValue !== threshold;
    case 'between':
      return metricValue >= threshold && metricValue <= upperValue!;
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// interpolateMessage
// ---------------------------------------------------------------------------

export function interpolateMessage(
  template: string,
  values: Record<string, number | string | boolean>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    if (!(key in values)) return `{{${key}}}`;

    const val = values[key];
    if (typeof val === 'number') {
      return formatNumber(val, key);
    }
    return String(val);
  });
}

// ---------------------------------------------------------------------------
// evaluateRule
// ---------------------------------------------------------------------------

export function evaluateRule(
  rule: Rule,
  entityId: string,
  entityLabel: string,
  metricsData: Record<string, number>,
): RuleEvaluationResult {
  // Disabled rules always pass
  if (!rule.enabled) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      status: 'pass',
      severity: rule.severity,
      scope: rule.scope,
      entityId,
      entityLabel,
      message: '',
      computedValues: metricsData,
      category: rule.category,
    };
  }

  // Evaluate every condition
  const conditionResults = rule.conditions.map((cond: RuleCondition) => {
    const metricValue = metricsData[cond.metric] ?? NaN;
    return evaluateCondition(cond.operator, metricValue, cond.value, cond.upperValue);
  });

  // Combine via AND / OR
  const triggered =
    rule.conditionOperator === 'AND'
      ? conditionResults.every(Boolean)
      : conditionResults.some(Boolean);

  if (triggered) {
    const messageValues: Record<string, number | string | boolean> = {
      ...metricsData,
      entityLabel,
      entityId,
    };

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      status: rule.severity, // 'warn' | 'fail'
      severity: rule.severity,
      scope: rule.scope,
      entityId,
      entityLabel,
      message: interpolateMessage(rule.messageTemplate, messageValues),
      computedValues: metricsData,
      category: rule.category,
    };
  }

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    status: 'pass',
    severity: rule.severity,
    scope: rule.scope,
    entityId,
    entityLabel,
    message: '',
    computedValues: metricsData,
    category: rule.category,
  };
}

// ---------------------------------------------------------------------------
// evaluateAllRules
// ---------------------------------------------------------------------------

export function evaluateAllRules(
  rules: Rule[],
  firmCtx: FirmMetricContext | null,
  practiceCtxs: PracticeMetricContext[],
  partnerCtxs: PartnerMetricContext[],
  personCtxs: PersonMetricContext[],
): RuleEvaluationResult[] {
  const results: RuleEvaluationResult[] = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;

    switch (rule.scope as RuleScope) {
      case 'firm': {
        if (firmCtx) {
          const metrics = contextToMetrics(firmCtx as unknown as Record<string, unknown>);
          results.push(evaluateRule(rule, 'firm', 'Firm', metrics));
        }
        break;
      }

      case 'practice': {
        for (const pCtx of practiceCtxs) {
          const metrics = contextToMetrics(pCtx as unknown as Record<string, unknown>);
          results.push(evaluateRule(rule, pCtx.practiceArea, pCtx.practiceArea, metrics));
        }
        break;
      }

      case 'partner': {
        for (const partCtx of partnerCtxs) {
          const metrics = contextToMetrics(partCtx as unknown as Record<string, unknown>);
          results.push(evaluateRule(rule, partCtx.personId, partCtx.name, metrics));
        }
        break;
      }

      case 'person': {
        let filteredPersons = personCtxs;
        if (rule.scopeFilter) {
          filteredPersons = personCtxs.filter(
            (p) => p.staffCategory === rule.scopeFilter,
          );
        }
        for (const perCtx of filteredPersons) {
          const metrics = contextToMetrics(perCtx as unknown as Record<string, unknown>);
          results.push(evaluateRule(rule, perCtx.personId, perCtx.name, metrics));
        }
        break;
      }
    }
  }

  return results;
}
