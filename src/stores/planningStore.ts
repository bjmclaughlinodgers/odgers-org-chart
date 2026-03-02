import { create } from 'zustand';
import type { Person, Scenario, ScenarioChange } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface PlanningStore {
  // Sandbox state
  sandboxPeople: Person[];
  changes: ScenarioChange[];
  isActive: boolean;

  // Saved scenarios
  scenarios: Scenario[];
  activeScenarioId: string | null;

  // Actions
  enterPlanningMode: (currentPeople: Person[]) => void;
  exitPlanningMode: () => void;

  // Sandbox mutations
  movePerson: (personId: string, newReportsTo: string | null) => void;
  addOpenSeat: (seat: Person) => void;
  removePerson: (personId: string) => void;
  updatePerson: (personId: string, updates: Partial<Person>) => void;
  reassignSupport: (personId: string, newSupportLines: string[]) => void;

  // Undo
  undoLast: () => void;

  // Scenario management
  saveScenario: (name: string, description: string) => void;
  loadScenario: (scenarioId: string) => void;
  deleteScenario: (scenarioId: string) => void;

  // Getters
  getSandboxPerson: (id: string) => Person | undefined;
}

export const usePlanningStore = create<PlanningStore>((set, get) => ({
  sandboxPeople: [],
  changes: [],
  isActive: false,
  scenarios: [],
  activeScenarioId: null,

  enterPlanningMode: (currentPeople) => {
    set({
      sandboxPeople: JSON.parse(JSON.stringify(currentPeople)),
      changes: [],
      isActive: true,
      activeScenarioId: null,
    });
  },

  exitPlanningMode: () => {
    set({
      sandboxPeople: [],
      changes: [],
      isActive: false,
      activeScenarioId: null,
    });
  },

  movePerson: (personId, newReportsTo) => {
    const person = get().sandboxPeople.find(p => p.id === personId);
    if (!person) return;

    const oldReportsTo = person.reportsTo;
    const change: ScenarioChange = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type: 'move',
      description: `Moved ${person.firstName} ${person.lastName} reporting line`,
      personId,
      previousValue: oldReportsTo,
      newValue: newReportsTo,
    };

    set(state => ({
      sandboxPeople: state.sandboxPeople.map(p =>
        p.id === personId ? { ...p, reportsTo: newReportsTo } : p
      ),
      changes: [...state.changes, change],
    }));
  },

  addOpenSeat: (seat) => {
    const change: ScenarioChange = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type: 'add',
      description: `Added open seat: ${seat.title} in ${seat.practiceArea}`,
      personId: seat.id,
    };

    set(state => ({
      sandboxPeople: [...state.sandboxPeople, seat],
      changes: [...state.changes, change],
    }));
  },

  removePerson: (personId) => {
    const person = get().sandboxPeople.find(p => p.id === personId);
    if (!person) return;

    const change: ScenarioChange = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type: 'remove',
      description: `Removed ${person.firstName} ${person.lastName} (${person.title})`,
      personId,
      previousValue: person,
    };

    set(state => ({
      sandboxPeople: state.sandboxPeople.filter(p => p.id !== personId),
      changes: [...state.changes, change],
    }));
  },

  updatePerson: (personId, updates) => {
    set(state => ({
      sandboxPeople: state.sandboxPeople.map(p =>
        p.id === personId ? { ...p, ...updates } : p
      ),
      changes: [...state.changes, {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        type: 'edit',
        description: `Edited ${get().sandboxPeople.find(p => p.id === personId)?.firstName} ${get().sandboxPeople.find(p => p.id === personId)?.lastName}`,
        personId,
        newValue: updates,
      }],
    }));
  },

  reassignSupport: (personId, newSupportLines) => {
    const person = get().sandboxPeople.find(p => p.id === personId);
    if (!person) return;

    const change: ScenarioChange = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type: 'reassign',
      description: `Reassigned support lines for ${person.firstName} ${person.lastName}`,
      personId,
      previousValue: person.supportLines,
      newValue: newSupportLines,
    };

    set(state => ({
      sandboxPeople: state.sandboxPeople.map(p =>
        p.id === personId ? { ...p, supportLines: newSupportLines } : p
      ),
      changes: [...state.changes, change],
    }));
  },

  undoLast: () => {
    const { changes, sandboxPeople } = get();
    if (changes.length === 0) return;

    const lastChange = changes[changes.length - 1];
    let newPeople = [...sandboxPeople];

    switch (lastChange.type) {
      case 'move':
        newPeople = newPeople.map(p =>
          p.id === lastChange.personId
            ? { ...p, reportsTo: lastChange.previousValue }
            : p
        );
        break;
      case 'add':
        newPeople = newPeople.filter(p => p.id !== lastChange.personId);
        break;
      case 'remove':
        if (lastChange.previousValue) {
          newPeople.push(lastChange.previousValue as Person);
        }
        break;
      case 'reassign':
        newPeople = newPeople.map(p =>
          p.id === lastChange.personId
            ? { ...p, supportLines: lastChange.previousValue as string[] }
            : p
        );
        break;
    }

    set({
      sandboxPeople: newPeople,
      changes: changes.slice(0, -1),
    });
  },

  saveScenario: (name, description) => {
    const scenario: Scenario = {
      id: uuidv4(),
      name,
      description,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      people: JSON.parse(JSON.stringify(get().sandboxPeople)),
      changes: [...get().changes],
    };

    set(state => ({
      scenarios: [...state.scenarios, scenario],
      activeScenarioId: scenario.id,
    }));
  },

  loadScenario: (scenarioId) => {
    const scenario = get().scenarios.find(s => s.id === scenarioId);
    if (!scenario) return;

    set({
      sandboxPeople: JSON.parse(JSON.stringify(scenario.people)),
      changes: [...scenario.changes],
      isActive: true,
      activeScenarioId: scenarioId,
    });
  },

  deleteScenario: (scenarioId) => {
    set(state => ({
      scenarios: state.scenarios.filter(s => s.id !== scenarioId),
      activeScenarioId: state.activeScenarioId === scenarioId ? null : state.activeScenarioId,
    }));
  },

  getSandboxPerson: (id) => get().sandboxPeople.find(p => p.id === id),
}));
