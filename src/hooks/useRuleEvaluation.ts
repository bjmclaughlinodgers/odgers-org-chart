import { useMemo } from 'react';
import { useOrgData } from './useOrgData';
import { useOrgStore } from '../stores/orgStore';
import { usePlanningStore } from '../stores/planningStore';
import { useRulesStore } from '../stores/rulesStore';
import type { RuleEvaluationResult, FirmMetricContext } from '../types/rules';
import { evaluateAllRules } from '../utils/ruleEngine';
import { computePartnerMetrics, computePersonMetrics, computeExtendedPracticeMetrics } from '../utils/metricsComputation';
import { isActivePerson } from '../utils/personFilters';

export function useRuleEvaluation() {
  const { people, firmMetrics } = useOrgData();
  const rules = useRulesStore(s => s.rules) || [];
  const livePeople = useOrgStore(s => s.people);
  const isPlanningActive = usePlanningStore(s => s.isActive);

  // Build metric contexts for current (active) data
  const { results, resultsByEntity, passCount, warnCount, failCount } = useMemo(() => {
    // Safety: if no people or no rules, skip evaluation
    if (!people || people.length === 0 || !rules || rules.length === 0) {
      return {
        results: [] as RuleEvaluationResult[],
        resultsByEntity: new Map<string, RuleEvaluationResult[]>(),
        passCount: 0,
        warnCount: 0,
        failCount: 0,
      };
    }

    // Build firm context from firmMetrics (useOrgData already computes these)
    const firmCtx: FirmMetricContext = {
      totalHeadcount: firmMetrics.totalHeadcount,
      producerCount: firmMetrics.producerCount,
      supportCount: firmMetrics.supportCount,
      supportRatio: firmMetrics.supportRatio,
      totalOCE: firmMetrics.totalOCE,
      yoyChange: firmMetrics.yoyChange,
      avgTenure: firmMetrics.avgTenure,
      executionSupportRatio: firmMetrics.executionSupportRatio,
      adminSupportRatio: firmMetrics.adminSupportRatio,
    };

    const partnerCtxs = computePartnerMetrics(people);
    const personCtxs = computePersonMetrics(people);
    const practiceCtxs = computeExtendedPracticeMetrics(people);

    const allResults = evaluateAllRules(rules, firmCtx, practiceCtxs, partnerCtxs, personCtxs);

    // Build entity lookup map
    const byEntity = new Map<string, RuleEvaluationResult[]>();
    for (const r of allResults) {
      if (!byEntity.has(r.entityId)) byEntity.set(r.entityId, []);
      byEntity.get(r.entityId)!.push(r);
    }

    const pass = allResults.filter(r => r.status === 'pass').length;
    const warn = allResults.filter(r => r.status === 'warn').length;
    const fail = allResults.filter(r => r.status === 'fail').length;

    return { results: allResults, resultsByEntity: byEntity, passCount: pass, warnCount: warn, failCount: fail };
  }, [people, rules, firmMetrics]);

  // Scenario comparison: when planning mode active, also evaluate against baseline (live) data
  const { baselineResults, newViolations, resolvedViolations } = useMemo(() => {
    if (!isPlanningActive) {
      return { baselineResults: [] as RuleEvaluationResult[], newViolations: [] as RuleEvaluationResult[], resolvedViolations: [] as RuleEvaluationResult[] };
    }

    // Recompute against live data (baseline)
    const active = livePeople.filter(p => isActivePerson(p));
    const producers = active.filter(p => p.isRevenueProducer);
    const support = active.filter(p => !p.isRevenueProducer);
    const totalOCE = producers.reduce((sum, p) => sum + (p.currentYearOCE || 0), 0);
    const priorOCE = producers.reduce((sum, p) => sum + (p.priorYearOCE || 0), 0);

    // Import getStaffCategory inline for computing execution/admin ratios
    // Since we can't import outside this useMemo, just count manually
    const executionBands = new Set(['Engagement Management', 'Research Leadership', 'Research & Execution', 'Research & Analysis']);
    const execSupport = active.filter(p => !p.isRevenueProducer && executionBands.has(p.band));
    const projCoord = active.filter(p => p.band === 'Project Coordination');
    const tenures = active.map(p => {
      const start = new Date(p.startDate);
      return (Date.now() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    });
    const avgTenure = tenures.length > 0 ? tenures.reduce((a, b) => a + b, 0) / tenures.length : 0;

    const baselineFirmCtx: FirmMetricContext = {
      totalHeadcount: active.length,
      producerCount: producers.length,
      supportCount: support.length,
      supportRatio: producers.length > 0 ? support.length / producers.length : 0,
      totalOCE,
      yoyChange: priorOCE > 0 ? ((totalOCE - priorOCE) / priorOCE) * 100 : 0,
      avgTenure,
      executionSupportRatio: producers.length > 0 ? execSupport.length / producers.length : 0,
      adminSupportRatio: producers.length > 0 ? projCoord.length / producers.length : 0,
    };

    const basePartnerCtxs = computePartnerMetrics(livePeople);
    const basePersonCtxs = computePersonMetrics(livePeople);
    const basePracticeCtxs = computeExtendedPracticeMetrics(livePeople);

    const baseResults = evaluateAllRules(rules, baselineFirmCtx, basePracticeCtxs, basePartnerCtxs, basePersonCtxs);

    // Find new violations (in scenario but not baseline)
    const baseViolationKeys = new Set(
      baseResults.filter(r => r.status !== 'pass').map(r => `${r.ruleId}::${r.entityId}`)
    );
    const scenarioViolationKeys = new Set(
      results.filter(r => r.status !== 'pass').map(r => `${r.ruleId}::${r.entityId}`)
    );

    const newViol = results.filter(r => r.status !== 'pass' && !baseViolationKeys.has(`${r.ruleId}::${r.entityId}`));
    const resolvedViol = baseResults.filter(r => r.status !== 'pass' && !scenarioViolationKeys.has(`${r.ruleId}::${r.entityId}`));

    return { baselineResults: baseResults, newViolations: newViol, resolvedViolations: resolvedViol };
  }, [isPlanningActive, livePeople, rules, results]);

  return {
    results,
    resultsByEntity,
    passCount,
    warnCount,
    failCount,
    baselineResults,
    newViolations,
    resolvedViolations,
    isPlanningActive,
  };
}
