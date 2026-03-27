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
  setCollapsedPractices: (practices: string[]) => void;
  collapsedBandLevel: number;
  setCollapsedBandLevel: (level: number) => void;

  // Pursuit targets visibility (opportunistic senior hires)
  showPursuitTargets: boolean;
  togglePursuitTargets: () => void;

  // Saved chart views (persisted to localStorage)
  savedChartViews: Array<{
    id: string;
    name: string;
    collapsedPractices: string[];
    collapsedBandLevel: number;
    officeFilter: string[];
    showOpenSeats: boolean;
    showPursuitTargets: boolean;
  }>;
  saveChartView: (name: string) => void;
  loadChartView: (id: string) => void;
  deleteChartView: (id: string) => void;

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
  setCollapsedPractices: (practices) => set({ collapsedPractices: practices }),
  collapsedBandLevel: 0,
  setCollapsedBandLevel: (level) => set({ collapsedBandLevel: level }),

  showPursuitTargets: true,
  togglePursuitTargets: () => set(s => ({ showPursuitTargets: !s.showPursuitTargets })),

  savedChartViews: (() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('odgers-chart-views') : null;
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  })(),
  saveChartView: (name) => set(s => {
    const view = {
      id: `view-${Date.now()}`,
      name,
      collapsedPractices: [...s.collapsedPractices],
      collapsedBandLevel: s.collapsedBandLevel,
      officeFilter: [...s.officeFilter],
      showOpenSeats: s.showOpenSeats,
      showPursuitTargets: s.showPursuitTargets,
    };
    const updated = [...s.savedChartViews, view];
    try { localStorage.setItem('odgers-chart-views', JSON.stringify(updated)); } catch {}
    return { savedChartViews: updated };
  }),
  loadChartView: (id) => set(s => {
    const view = s.savedChartViews.find(v => v.id === id);
    if (!view) return s;
    return {
      collapsedPractices: view.collapsedPractices,
      collapsedBandLevel: view.collapsedBandLevel,
      officeFilter: view.officeFilter,
      showOpenSeats: view.showOpenSeats,
      showPursuitTargets: view.showPursuitTargets,
    };
  }),
  deleteChartView: (id) => set(s => {
    const updated = s.savedChartViews.filter(v => v.id !== id);
    try { localStorage.setItem('odgers-chart-views', JSON.stringify(updated)); } catch {}
    return { savedChartViews: updated };
  }),

  importModalOpen: false,
  setImportModalOpen: (open) => set({ importModalOpen: open }),

  darkMode: typeof window !== 'undefined' && localStorage.getItem('odgers-dark-mode') === 'true',
  toggleDarkMode: () => set(s => {
    const next = !s.darkMode;
    if (typeof window !== 'undefined') localStorage.setItem('odgers-dark-mode', String(next));
    return { darkMode: next };
  }),
}));
