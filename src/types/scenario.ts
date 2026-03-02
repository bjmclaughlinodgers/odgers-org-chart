import type { Person } from './person';

export interface ScenarioChange {
  id: string;
  timestamp: string;
  type: 'move' | 'add' | 'remove' | 'edit' | 'reassign';
  description: string;
  personId?: string;
  previousValue?: any;
  newValue?: any;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  lastModified: string;
  people: Person[];
  changes: ScenarioChange[];
}
