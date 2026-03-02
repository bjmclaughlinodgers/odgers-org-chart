import Fuse, { type IFuseOptions } from 'fuse.js';
import type { Person } from '../types';

let fuseInstance: Fuse<Person> | null = null;

const fuseOptions: IFuseOptions<Person> = {
  keys: [
    { name: 'firstName', weight: 2 },
    { name: 'lastName', weight: 2 },
    { name: 'preferredName', weight: 1.5 },
    { name: 'title', weight: 1.5 },
    { name: 'practiceArea', weight: 1 },
    { name: 'band', weight: 0.8 },
    { name: 'office', weight: 0.8 },
    { name: 'skillsTags', weight: 0.6 },
    { name: 'needsTags', weight: 0.6 },
    { name: 'subPracticeSpecialties', weight: 0.7 },
    { name: 'adminNotes', weight: 0.3 },
    { name: 'performanceNotes', weight: 0.3 },
  ],
  threshold: 0.3,
  includeScore: true,
  minMatchCharLength: 2,
};

export function initSearch(people: Person[]): void {
  fuseInstance = new Fuse(people, fuseOptions);
}

export function searchPeople(query: string): Person[] {
  if (!fuseInstance || !query.trim()) return [];
  return fuseInstance.search(query).map(result => result.item);
}

export function filterPeople(
  people: Person[],
  filters: {
    practiceArea?: string[];
    band?: string[];
    office?: string[];
    performanceRating?: string[];
    status?: string[];
    retentionRisk?: string[];
    isRevenueProducer?: boolean;
    searchQuery?: string;
  }
): Person[] {
  let result = people;

  if (filters.practiceArea?.length) {
    result = result.filter(p => filters.practiceArea!.includes(p.practiceArea));
  }
  if (filters.band?.length) {
    result = result.filter(p => filters.band!.includes(p.band));
  }
  if (filters.office?.length) {
    result = result.filter(p => filters.office!.includes(p.office));
  }
  if (filters.performanceRating?.length) {
    result = result.filter(p => filters.performanceRating!.includes(p.performanceRating));
  }
  if (filters.status?.length) {
    result = result.filter(p => filters.status!.includes(p.status));
  }
  if (filters.retentionRisk?.length) {
    result = result.filter(p => filters.retentionRisk!.includes(p.retentionRisk));
  }
  if (filters.isRevenueProducer !== undefined) {
    result = result.filter(p => p.isRevenueProducer === filters.isRevenueProducer);
  }
  if (filters.searchQuery) {
    const searchResults = searchPeople(filters.searchQuery);
    const searchIds = new Set(searchResults.map(p => p.id));
    result = result.filter(p => searchIds.has(p.id));
  }

  return result;
}
