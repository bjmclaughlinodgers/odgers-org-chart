import { useCallback } from 'react';
import { useOrgStore } from '../stores/orgStore';
import { usePlanningStore } from '../stores/planningStore';
import { useUIStore } from '../stores/uiStore';
import type { Person } from '../types';
import { v4 as uuidv4 } from 'uuid';

export function usePlanningMode() {
  const orgPeople = useOrgStore(s => s.people);
  const {
    sandboxPeople, changes, isActive, scenarios, activeScenarioId,
    enterPlanningMode, exitPlanningMode, movePerson, addOpenSeat,
    removePerson, updatePerson, reassignSupport, undoLast,
    saveScenario, loadScenario, deleteScenario,
  } = usePlanningStore();
  const { setPlanningMode } = useUIStore();

  const activate = useCallback(() => {
    enterPlanningMode(orgPeople);
    setPlanningMode(true);
  }, [orgPeople, enterPlanningMode, setPlanningMode]);

  const deactivate = useCallback(() => {
    exitPlanningMode();
    setPlanningMode(false);
  }, [exitPlanningMode, setPlanningMode]);

  const createOpenSeat = useCallback((template: {
    title: string; band: Person['band']; practiceArea: Person['practiceArea'];
    office: Person['office']; reportsTo: string | null;
    hiringPriority: Person['hiringPriority']; budgetedCompensation?: string;
    recruitingNotes?: string; targetStartDate?: string;
  }) => {
    const seat: Person = {
      id: uuidv4(), firstName: 'Open', lastName: 'Seat', title: template.title,
      band: template.band, practiceArea: template.practiceArea, subPracticeSpecialties: [],
      office: template.office, employmentType: 'Full-Time', status: 'Open Seat',
      reportsTo: template.reportsTo, supportLines: [], practiceAreaLead: false,
      performanceRating: 'Performer', retentionRisk: 'Low', performanceNotes: '',
      retentionNotes: '', lastReviewDate: null, isRevenueProducer: false,
      currentYearOCE: null, priorYearOCE: null, revenueTarget: null, pipelineValue: null,
      startDate: new Date().toISOString().split('T')[0], lastPayIncreaseDate: null,
      lastPayIncreasePercent: null, birthday: null, compensationType: 'Base Only',
      baseSalary: null, totalOTE: null,
      employeeFileLink: null, skillsTags: [], needsTags: [], supportRequirements: null,
      hiringPriority: template.hiringPriority, targetStartDate: template.targetStartDate,
      budgetedCompensation: template.budgetedCompensation, recruitingNotes: template.recruitingNotes,
      adminNotes: '', lastUpdated: new Date().toISOString(),
    };
    addOpenSeat(seat);
    return seat;
  }, [addOpenSeat]);

  return {
    isActive, sandboxPeople, changes, scenarios, activeScenarioId,
    activate, deactivate, movePerson, removePerson, updatePerson,
    reassignSupport, createOpenSeat, undoLast, saveScenario, loadScenario, deleteScenario,
  };
}
