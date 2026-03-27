import type { Person } from '../types';

/** Returns true if the person is an active headcount (not an Open Seat, Pursuit target, or Terminated). */
export function isActivePerson(p: Person): boolean {
  return p.status !== 'Open Seat' && p.status !== 'Pursuit' && p.status !== 'Terminated';
}
