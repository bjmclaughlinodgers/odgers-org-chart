import { useMemo } from 'react';
import { useUIStore } from '../stores/uiStore';
import { useOrgData } from './useOrgData';
import { filterPeople } from '../utils/search';
import type { Person } from '../types';
import { isActivePerson } from '../utils/personFilters';

export function useFilters(): { filteredPeople: Person[]; hasActiveFilters: boolean } {
  const { people } = useOrgData();
  const { searchQuery, practiceAreaFilter, bandFilter, officeFilter, performanceFilter, statusFilter, showOpenSeats } = useUIStore();

  const hasActiveFilters = Boolean(searchQuery || practiceAreaFilter.length || bandFilter.length || officeFilter.length || performanceFilter.length || statusFilter.length);

  const filteredPeople = useMemo(() => {
    let result = people;
    if (!showOpenSeats) result = result.filter(p => isActivePerson(p));
    if (!hasActiveFilters) return result;
    return filterPeople(result, {
      practiceArea: practiceAreaFilter.length ? practiceAreaFilter : undefined,
      band: bandFilter.length ? bandFilter : undefined,
      office: officeFilter.length ? officeFilter : undefined,
      performanceRating: performanceFilter.length ? performanceFilter : undefined,
      status: statusFilter.length ? statusFilter : undefined,
      searchQuery: searchQuery || undefined,
    });
  }, [people, searchQuery, practiceAreaFilter, bandFilter, officeFilter, performanceFilter, statusFilter, showOpenSeats, hasActiveFilters]);

  return { filteredPeople, hasActiveFilters };
}
