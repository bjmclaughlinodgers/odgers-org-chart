import { create } from 'zustand';
import type { ViewType, ColorCoding } from '../types';

interface UIStore {
  // View state
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;

  // Sidebar
  selectedPersonId: string | null;
  sidebarOpen: boolean;
  selectPerson: (id: string | null) => void;
  closeSidebar: () => void;

  // Filters
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  practiceAreaFilter: string[];
  setPracticeAreaFilter: (areas: string[]) => void;
  bandFilter: string[];
  setBandFilter: (bands: string[]) => void;
  officeFilter: string[];
  setOfficeFilter: (offices: string[]) => void;
  performanceFilter: string[];
  setPerformanceFilter: (ratings: string[]) => void;
  statusFilter: string[];
  setStatusFilter: (statuses: string[]) => void;
  clearFilters: () => void;

  // Color coding
  colorCoding: ColorCoding;
  setColorCoding: (coding: ColorCoding) => void;

  // Toggles
  showOpenSeats: boolean;
  toggleOpenSeats: () => void;
  showSupportLines: boolean;
  toggleSupportLines: () => void;
  showRevenueLabels: boolean;
  toggleRevenueLabels: () => void;

  // Events sidebar
  eventsSidebarOpen: boolean;
  toggleEventsSidebar: () => void;

  // Search modal
  searchModalOpen: boolean;
  setSearchModalOpen: (open: boolean) => void;

  // Planning mode
  isPlanningMode: boolean;
  setPlanningMode: (mode: boolean) => void;

  // Org chart collapse
  collapsedPractices: string[];
  toggleCollapsedPractice: (practice: string) => void;
  collapsedBandLevel: number;
  setCollapsedBandLevel: (level: number) => void;

  // Import modal
  importModalOpen: boolean;
  setImportModalOpen: (open: boolean) => void;

  // Dark mode
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  activeView: 'executive',
  setActiveView: (view) => set({ activeView: view }),

  selectedPersonId: null,
  sidebarOpen: false,
  selectPerson: (id) => set({ selectedPersonId: id, sidebarOpen: id !== null }),
  closeSidebar: () => set({ selectedPersonId: null, sidebarOpen: false }),

  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  practiceAreaFilter: [],
  setPracticeAreaFilter: (areas) => set({ practiceAreaFilter: areas }),
  bandFilter: [],
  setBandFilter: (bands) => set({ bandFilter: bands }),
  officeFilter: [],
  setOfficeFilter: (offices) => set({ officeFilter: offices }),
  performanceFilter: [],
  setPerformanceFilter: (ratings) => set({ performanceFilter: ratings }),
  statusFilter: [],
  setStatusFilter: (statuses) => set({ statusFilter: statuses }),
  clearFilters: () => set({
    searchQuery: '',
    practiceAreaFilter: [],
    bandFilter: [],
    officeFilter: [],
    performanceFilter: [],
    statusFilter: [],
  }),

  colorCoding: 'practiceArea',
  setColorCoding: (coding) => set({ colorCoding: coding }),

  showOpenSeats: true,
  toggleOpenSeats: () => set(s => ({ showOpenSeats: !s.showOpenSeats })),
  showSupportLines: true,
  toggleSupportLines: () => set(s => ({ showSupportLines: !s.showSupportLines })),
  showRevenueLabels: true,
  toggleRevenueLabels: () => set(s => ({ showRevenueLabels: !s.showRevenueLabels })),

  eventsSidebarOpen: false,
  toggleEventsSidebar: () => set(s => ({ eventsSidebarOpen: !s.eventsSidebarOpen })),

  searchModalOpen: false,
  setSearchModalOpen: (open) => set({ searchModalOpen: open }),

  isPlanningMode: false,
  setPlanningMode: (mode) => set({ isPlanningMode: mode }),

  collapsedPractices: [],
  toggleCollapsedPractice: (practice) => set(s => ({
    collapsedPractices: s.collapsedPractices.includes(practice)
      ? s.collapsedPractices.filter(p => p !== practice)
      : [...s.collapsedPractices, practice],
  })),
  collapsedBandLevel: 0,
  setCollapsedBandLevel: (level) => set({ collapsedBandLevel: level }),

  importModalOpen: false,
  setImportModalOpen: (open) => set({ importModalOpen: open }),

  darkMode: typeof window !== 'undefined' && localStorage.getItem('odgers-dark-mode') === 'true',
  toggleDarkMode: () => set(s => {
    const next = !s.darkMode;
    if (typeof window !== 'undefined') localStorage.setItem('odgers-dark-mode', String(next));
    return { darkMode: next };
  }),
}));
