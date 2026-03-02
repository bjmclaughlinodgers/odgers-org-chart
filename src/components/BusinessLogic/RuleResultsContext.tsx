import React, { createContext, useContext } from 'react';
import { useRuleEvaluation } from '../../hooks/useRuleEvaluation';
import type { RuleEvaluationResult } from '../../types/rules';

interface RuleResultsContextType {
  results: RuleEvaluationResult[];
  resultsByEntity: Map<string, RuleEvaluationResult[]>;
  passCount: number;
  warnCount: number;
  failCount: number;
  baselineResults: RuleEvaluationResult[];
  newViolations: RuleEvaluationResult[];
  resolvedViolations: RuleEvaluationResult[];
  isPlanningActive: boolean;
}

const EMPTY_RESULTS: RuleResultsContextType = {
  results: [],
  resultsByEntity: new Map(),
  passCount: 0,
  warnCount: 0,
  failCount: 0,
  baselineResults: [],
  newViolations: [],
  resolvedViolations: [],
  isPlanningActive: false,
};

const RuleResultsCtx = createContext<RuleResultsContextType>(EMPTY_RESULTS);

export function RuleResultsProvider({ children }: { children: React.ReactNode }) {
  const evaluation = useRuleEvaluation();
  return (
    <RuleResultsCtx.Provider value={evaluation}>
      {children}
    </RuleResultsCtx.Provider>
  );
}

export function useRuleResults(): RuleResultsContextType {
  return useContext(RuleResultsCtx);
}
