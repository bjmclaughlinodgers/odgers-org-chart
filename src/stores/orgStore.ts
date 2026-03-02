import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Person, Candidate } from '../types';
import { PRACTICE_COLORS, DEFAULT_PRACTICE_AREAS } from '../types/enums';
import orgData from '../data/orgData.json';
import { initSearch } from '../utils/search';
import { v4 as uuidv4 } from 'uuid';
import { isActivePerson } from '../utils/personFilters';
import {
  upsertPerson,
  upsertPeople,
  deletePerson as deletePersonRemote,
  upsertCustomPractice,
  deleteCustomPractice,
} from '../lib/supabaseSync';

interface OrgStore {
  people: Person[];
  initialized: boolean;
  customPractices: { name: string; color: string }[];
  /** Whether data was loaded from Supabase (vs localStorage/seed) */
  cloudLoaded: boolean;

  // Actions
  initialize: () => void;
  /** Cloud-aware init: load from Supabase first if available */
  initializeFromCloud: (cloudPeople: Person[], cloudPractices: { name: string; color: string }[]) => void;
  updatePerson: (id: string, updates: Partial<Person>) => void;
  addPerson: (person: Person) => void;
  addDefaultPerson: () => string;
  removePerson: (id: string) => void;
  terminatePerson: (id: string) => void;
  bulkImport: (toAdd: Person[], toUpdate: { id: string; updates: Partial<Person> }[]) => void;
  resetToDefault: () => void;
  addPractice: (name: string, color: string) => void;
  removePractice: (name: string) => void;
  getAllPracticeNames: () => string[];
  getPerson: (id: string) => Person | undefined;
  getDirectReports: (id: string) => Person[];
  getByPractice: (practiceArea: string) => Person[];
  getRevenueProducers: () => Person[];
  getSupportStaff: () => Person[];
  getOpenSeats: () => Person[];
  addCandidate: (personId: string, candidate: Candidate) => void;
  removeCandidate: (personId: string, candidateId: string) => void;
  updateCandidate: (personId: string, candidateId: string, updates: Partial<Candidate>) => void;
  /** Apply a single person change from a realtime event */
  _realtimeUpsert: (person: Person) => void;
  _realtimeDelete: (id: string) => void;
}

export const useOrgStore = create<OrgStore>()(
  persist(
    (set, get) => ({
      people: [],
      initialized: false,
      customPractices: [],
      cloudLoaded: false,

      initialize: () => {
        const existing = get().people;
        if (existing && existing.length > 0) {
          // Already hydrated from localStorage
          initSearch(existing);
          set({ initialized: true });
        } else {
          const data = orgData as Person[];
          initSearch(data);
          set({ people: data, initialized: true });
        }
      },

      initializeFromCloud: (cloudPeople, cloudPractices) => {
        // Register custom practice colors
        cloudPractices.forEach(cp => {
          PRACTICE_COLORS[cp.name] = cp.color;
        });

        initSearch(cloudPeople);
        set({
          people: cloudPeople,
          customPractices: cloudPractices,
          initialized: true,
          cloudLoaded: true,
        });
      },

      updatePerson: (id, updates) => {
        set(state => ({
          people: state.people.map(p =>
            p.id === id ? { ...p, ...updates, lastUpdated: new Date().toISOString() } : p
          ),
        }));
        initSearch(get().people);

        // Sync to Supabase (fire-and-forget)
        const updated = get().people.find(p => p.id === id);
        if (updated) upsertPerson(updated);
      },

      addPerson: (person) => {
        set(state => ({ people: [...state.people, person] }));
        initSearch(get().people);
        upsertPerson(person);
      },

      addDefaultPerson: () => {
        const id = uuidv4();
        const newPerson: Person = {
          id,
          firstName: 'New',
          lastName: 'Person',
          title: 'Title',
          band: 'Operations & Admin',
          practiceArea: 'Central',
          subPracticeSpecialties: [],
          office: 'New York',
          employmentType: 'Full-Time',
          status: 'Active',
          reportsTo: null,
          supportLines: [],
          practiceAreaLead: false,
          performanceRating: 'Performer',
          retentionRisk: 'Low',
          performanceNotes: '',
          retentionNotes: '',
          lastReviewDate: null,
          isRevenueProducer: false,
          currentYearOCE: null,
          priorYearOCE: null,
          revenueTarget: null,
          pipelineValue: null,
          startDate: new Date().toISOString().split('T')[0],
          lastPayIncreaseDate: null,
          lastPayIncreasePercent: null,
          birthday: null,
          compensationType: 'Base + Bonus',
          baseSalary: null,
          totalOTE: null,
          employeeFileLink: null,
          skillsTags: [],
          needsTags: [],
          supportRequirements: null,
          adminNotes: '',
          lastUpdated: new Date().toISOString(),
        };
        set(state => ({ people: [...state.people, newPerson] }));
        initSearch(get().people);
        upsertPerson(newPerson);
        return id;
      },

      removePerson: (id) => {
        // Also clean up any references to this person
        set(state => ({
          people: state.people
            .filter(p => p.id !== id)
            .map(p => ({
              ...p,
              reportsTo: p.reportsTo === id ? null : p.reportsTo,
              supportLines: p.supportLines.filter(sl => sl !== id),
            })),
        }));
        initSearch(get().people);

        // Sync: delete the person and update affected people
        deletePersonRemote(id);
        const affected = get().people.filter(p =>
          p.reportsTo === null || p.supportLines.length >= 0
        );
        // Re-upsert affected people whose references changed
        const toSync = get().people.filter(p => {
          const original = get().people.find(o => o.id === p.id);
          return original !== undefined;
        });
        upsertPeople(toSync);
      },

      terminatePerson: (id) => {
        set(state => ({
          people: state.people.map(p => {
            if (p.id === id) {
              return {
                ...p,
                status: 'Terminated' as const,
                terminationDate: new Date().toISOString().split('T')[0],
                reportsTo: null,
                supportLines: [],
                lastUpdated: new Date().toISOString(),
              };
            }
            return {
              ...p,
              reportsTo: p.reportsTo === id ? null : p.reportsTo,
              supportLines: p.supportLines.filter(sl => sl !== id),
            };
          }),
        }));
        initSearch(get().people);

        // Sync all affected people to Supabase
        upsertPeople(get().people);
      },

      bulkImport: (toAdd, toUpdate) => {
        set(state => {
          let updatedPeople = [...state.people];
          toUpdate.forEach(({ id, updates }) => {
            updatedPeople = updatedPeople.map(p =>
              p.id === id ? { ...p, ...updates, lastUpdated: new Date().toISOString() } : p
            );
          });
          updatedPeople = [...updatedPeople, ...toAdd];
          return { people: updatedPeople };
        });
        initSearch(get().people);

        // Sync entire dataset after bulk import
        upsertPeople(get().people);
      },

      resetToDefault: () => {
        const data = orgData as Person[];
        initSearch(data);
        set({ people: data });
        upsertPeople(data);
      },

      addPractice: (name, color) => {
        const existing = get().customPractices;
        if (!existing.some(p => p.name === name) && !DEFAULT_PRACTICE_AREAS.includes(name)) {
          PRACTICE_COLORS[name] = color;
          set({ customPractices: [...existing, { name, color }] });
          upsertCustomPractice(name, color);
        }
      },

      removePractice: (name) => {
        set(state => ({
          customPractices: state.customPractices.filter(p => p.name !== name),
        }));
        deleteCustomPractice(name);
      },

      getAllPracticeNames: () => {
        const custom = get().customPractices.map(p => p.name);
        return [...DEFAULT_PRACTICE_AREAS, ...custom, 'Central'];
      },

      getPerson: (id) => get().people.find(p => p.id === id),
      getDirectReports: (id) => get().people.filter(p => p.reportsTo === id),
      getByPractice: (practiceArea) => get().people.filter(p => p.practiceArea === practiceArea),
      getRevenueProducers: () => get().people.filter(p => p.isRevenueProducer && isActivePerson(p)),
      getSupportStaff: () => get().people.filter(p => !p.isRevenueProducer && isActivePerson(p)),
      getOpenSeats: () => get().people.filter(p => p.status === 'Open Seat'),

      addCandidate: (personId, candidate) => {
        set(state => ({
          people: state.people.map(p =>
            p.id === personId
              ? { ...p, candidates: [...(p.candidates ?? []), candidate], lastUpdated: new Date().toISOString() }
              : p
          ),
        }));
        initSearch(get().people);
        const updated = get().people.find(p => p.id === personId);
        if (updated) upsertPerson(updated);
      },

      removeCandidate: (personId, candidateId) => {
        set(state => ({
          people: state.people.map(p =>
            p.id === personId
              ? { ...p, candidates: (p.candidates ?? []).filter(c => c.id !== candidateId), lastUpdated: new Date().toISOString() }
              : p
          ),
        }));
        initSearch(get().people);
        const updated = get().people.find(p => p.id === personId);
        if (updated) upsertPerson(updated);
      },

      updateCandidate: (personId, candidateId, updates) => {
        set(state => ({
          people: state.people.map(p =>
            p.id === personId
              ? {
                  ...p,
                  candidates: (p.candidates ?? []).map(c =>
                    c.id === candidateId ? { ...c, ...updates } : c
                  ),
                  lastUpdated: new Date().toISOString(),
                }
              : p
          ),
        }));
        initSearch(get().people);
        const updated = get().people.find(p => p.id === personId);
        if (updated) upsertPerson(updated);
      },

      // Realtime handlers — update local state without re-syncing to Supabase
      _realtimeUpsert: (person) => {
        set(state => {
          const exists = state.people.some(p => p.id === person.id);
          if (exists) {
            return { people: state.people.map(p => p.id === person.id ? person : p) };
          }
          return { people: [...state.people, person] };
        });
        initSearch(get().people);
      },

      _realtimeDelete: (id) => {
        set(state => ({
          people: state.people.filter(p => p.id !== id),
        }));
        initSearch(get().people);
      },
    }),
    {
      name: 'odgers-org-data',
      partialize: (state) => ({ people: state.people, customPractices: state.customPractices }),
    }
  )
);
