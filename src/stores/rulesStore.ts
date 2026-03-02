import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Rule } from '../types/rules';
import { SEED_RULES } from '../data/seedRules';
import {
  upsertRule,
  upsertRules,
  deleteRule as deleteRuleRemote,
} from '../lib/supabaseSync';

interface RulesStore {
  rules: Rule[];
  initialized: boolean;

  // Actions
  initialize: () => void;
  /** Cloud-aware init: load from Supabase */
  initializeFromCloud: (cloudRules: Rule[]) => void;
  addRule: (rule: Rule) => void;
  updateRule: (id: string, updates: Partial<Rule>) => void;
  removeRule: (id: string) => void;
  toggleRule: (id: string) => void;
  duplicateRule: (id: string) => Rule | null;
  resetToDefaults: () => void;
  /** Realtime handlers */
  _realtimeUpsert: (rule: Rule) => void;
  _realtimeDelete: (id: string) => void;
}

export const useRulesStore = create<RulesStore>()(
  persist(
    (set, get) => ({
      rules: [],
      initialized: false,

      initialize: () => {
        const existing = get().rules;
        if (existing && existing.length > 0) {
          set({ initialized: true });
        } else {
          set({ rules: [...SEED_RULES], initialized: true });
        }
      },

      initializeFromCloud: (cloudRules) => {
        set({ rules: cloudRules, initialized: true });
      },

      addRule: (rule) => {
        set((state) => ({ rules: [...state.rules, rule] }));
        upsertRule(rule);
      },

      updateRule: (id, updates) => {
        set((state) => ({
          rules: state.rules.map((r) =>
            r.id === id
              ? { ...r, ...updates, updatedAt: new Date().toISOString() }
              : r
          ),
        }));
        const updated = get().rules.find(r => r.id === id);
        if (updated) upsertRule(updated);
      },

      removeRule: (id) => {
        set((state) => ({
          rules: state.rules.filter((r) => r.id !== id),
        }));
        deleteRuleRemote(id);
      },

      toggleRule: (id) => {
        set((state) => ({
          rules: state.rules.map((r) =>
            r.id === id
              ? { ...r, enabled: !r.enabled, updatedAt: new Date().toISOString() }
              : r
          ),
        }));
        const updated = get().rules.find(r => r.id === id);
        if (updated) upsertRule(updated);
      },

      duplicateRule: (id) => {
        const rule = get().rules.find((r) => r.id === id);
        if (!rule) return null;

        const now = new Date().toISOString();
        const newRule: Rule = {
          ...rule,
          id: `${rule.id}-copy-${Date.now()}`,
          name: `${rule.name} (Copy)`,
          createdAt: now,
          updatedAt: now,
          enabled: false,
        };

        set((state) => ({ rules: [...state.rules, newRule] }));
        upsertRule(newRule);
        return newRule;
      },

      resetToDefaults: () => {
        set({ rules: [...SEED_RULES] });
        upsertRules([...SEED_RULES]);
      },

      // Realtime handlers
      _realtimeUpsert: (rule) => {
        set(state => {
          const exists = state.rules.some(r => r.id === rule.id);
          if (exists) {
            return { rules: state.rules.map(r => r.id === rule.id ? rule : r) };
          }
          return { rules: [...state.rules, rule] };
        });
      },

      _realtimeDelete: (id) => {
        set(state => ({
          rules: state.rules.filter(r => r.id !== id),
        }));
      },
    }),
    {
      name: 'odgers-rules-data',
      partialize: (state) => ({ rules: state.rules }),
    }
  )
);
