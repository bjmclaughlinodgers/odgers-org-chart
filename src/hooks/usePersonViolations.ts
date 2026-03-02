import type { RuleEvaluationResult } from '../types/rules';
import { useRuleResults } from '../components/BusinessLogic/RuleResultsContext';

export function usePersonViolations(personId: string): RuleEvaluationResult[] {
  const { resultsByEntity } = useRuleResults();
  const results = resultsByEntity.get(personId) || [];
  // Return only violations (warn or fail), not passes
  return results.filter(r => r.status !== 'pass');
}
