import type { Person } from '../types';

export type StaffCategory = 'Revenue Producer' | 'Search Execution Support' | 'Project Coordinator' | 'Central/Corporate';

const SEARCH_EXECUTION_BANDS = new Set([
  'Engagement Management',
  'Research Leadership',
  'Research & Execution',
  'Research & Analysis',
]);

export function getStaffCategory(person: Person): StaffCategory {
  if (person.isRevenueProducer) return 'Revenue Producer';
  if (SEARCH_EXECUTION_BANDS.has(person.band)) return 'Search Execution Support';
  if (person.band === 'Project Coordination') return 'Project Coordinator';
  return 'Central/Corporate';
}

export function getStaffCategoryOrder(category: StaffCategory): number {
  switch (category) {
    case 'Revenue Producer': return 0;
    case 'Search Execution Support': return 1;
    case 'Project Coordinator': return 2;
    case 'Central/Corporate': return 3;
  }
}

export const STAFF_CATEGORY_COLORS: Record<StaffCategory, string> = {
  'Revenue Producer': '#2563eb',
  'Search Execution Support': '#0891b2',
  'Project Coordinator': '#7c3aed',
  'Central/Corporate': '#6b7280',
};
