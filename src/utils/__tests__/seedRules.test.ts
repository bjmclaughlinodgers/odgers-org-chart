import { describe, it, expect } from 'vitest';
import { SEED_RULES } from '../../data/seedRules';
import { evaluateRule } from '../ruleEngine';

describe('Seed Rules', () => {
  it('has 5 seed rules', () => {
    expect(SEED_RULES.length).toBe(5);
  });

  describe('Dedicated PC Rule', () => {
    const rule = SEED_RULES.find(r => r.id === 'seed-dedicated-pc')!;

    it('triggers when billings < 1.5M AND has dedicated PC', () => {
      const result = evaluateRule(rule, 'p1', 'Test Partner', {
        expectedBillings: 1000000,
        directPcCount: 1,
      });
      expect(result.status).toBe('fail');
    });

    it('does not trigger when billings >= 1.5M', () => {
      const result = evaluateRule(rule, 'p1', 'Test Partner', {
        expectedBillings: 2000000,
        directPcCount: 1,
      });
      expect(result.status).toBe('pass');
    });

    it('does not trigger when no dedicated PC', () => {
      const result = evaluateRule(rule, 'p1', 'Test Partner', {
        expectedBillings: 1000000,
        directPcCount: 0,
      });
      expect(result.status).toBe('pass');
    });
  });

  describe('Support Cost Ratio Rule', () => {
    const rule = SEED_RULES.find(r => r.id === 'seed-support-cost-ratio')!;

    it('triggers when support cost ratio > 20%', () => {
      const result = evaluateRule(rule, 'practice1', 'Technology', {
        supportCostRatio: 25,
      });
      expect(result.status).toBe('warn');
    });

    it('does not trigger at exactly 20%', () => {
      const result = evaluateRule(rule, 'practice1', 'Technology', {
        supportCostRatio: 20,
      });
      expect(result.status).toBe('pass');
    });
  });

  describe('Associate Overloaded Rule', () => {
    const rule = SEED_RULES.find(r => r.id === 'seed-associate-overloaded')!;

    it('triggers when active assignments > 8', () => {
      const result = evaluateRule(rule, 'p1', 'Test Associate', {
        activeAssignments: 10,
      });
      expect(result.status).toBe('fail');
    });

    it('does not trigger at 8 assignments', () => {
      const result = evaluateRule(rule, 'p1', 'Test Associate', {
        activeAssignments: 8,
      });
      expect(result.status).toBe('pass');
    });
  });

  describe('Associate Underutilized Rule', () => {
    const rule = SEED_RULES.find(r => r.id === 'seed-associate-underutilized')!;

    it('triggers when active assignments < 4', () => {
      const result = evaluateRule(rule, 'p1', 'Test Associate', {
        activeAssignments: 2,
      });
      expect(result.status).toBe('warn');
    });

    it('does not trigger at 4 assignments', () => {
      const result = evaluateRule(rule, 'p1', 'Test Associate', {
        activeAssignments: 4,
      });
      expect(result.status).toBe('pass');
    });
  });

  describe('Practice Profitability Floor Rule', () => {
    const rule = SEED_RULES.find(r => r.id === 'seed-practice-profitability')!;

    it('triggers when profitability < 30%', () => {
      const result = evaluateRule(rule, 'practice1', 'Technology', {
        profitability: 25,
      });
      expect(result.status).toBe('warn');
    });

    it('does not trigger at 30%', () => {
      const result = evaluateRule(rule, 'practice1', 'Technology', {
        profitability: 30,
      });
      expect(result.status).toBe('pass');
    });
  });
});
