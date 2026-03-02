import type { Person } from '../types';

/** Returns true if the person is an active headcount (not an Open Seat or Terminated). */
export function isActivePerson(p: Person): boolean {
  return p.status !== 'Open Seat' && p.status !== 'Terminated';
}
