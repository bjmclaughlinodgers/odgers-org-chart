/**
 * Supabase Sync Layer
 *
 * Handles reading/writing people and rules data to Supabase,
 * plus real-time subscriptions for live sync across clients.
 */

import { supabase, isSupabaseEnabled } from './supabase';
import type { Person } from '../types';
import type { Rule } from '../types/rules';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// People CRUD
// ---------------------------------------------------------------------------

export async function fetchAllPeople(): Promise<Person[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('people')
    .select('data')
    .order('id');

  if (error) {
    console.error('Failed to fetch people:', error);
    return [];
  }

  return (data ?? []).map(row => row.data as Person);
}

export async function upsertPerson(person: Person): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('people')
    .upsert({ id: person.id, data: person }, { onConflict: 'id' });

  if (error) console.error('Failed to upsert person:', error);
}

export async function upsertPeople(people: Person[]): Promise<void> {
  if (!supabase || people.length === 0) return;

  const rows = people.map(p => ({ id: p.id, data: p }));

  // Supabase has a row limit per request; batch in chunks of 500
  const BATCH_SIZE = 500;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('people')
      .upsert(batch, { onConflict: 'id' });

    if (error) console.error('Failed to upsert people batch:', error);
  }
}

export async function deletePerson(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('people')
    .delete()
    .eq('id', id);

  if (error) console.error('Failed to delete person:', error);
}

// ---------------------------------------------------------------------------
// Rules CRUD
// ---------------------------------------------------------------------------

export async function fetchAllRules(): Promise<Rule[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('rules')
    .select('data')
    .order('id');

  if (error) {
    console.error('Failed to fetch rules:', error);
    return [];
  }

  return (data ?? []).map(row => row.data as Rule);
}

export async function upsertRule(rule: Rule): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('rules')
    .upsert({ id: rule.id, data: rule }, { onConflict: 'id' });

  if (error) console.error('Failed to upsert rule:', error);
}

export async function upsertRules(rules: Rule[]): Promise<void> {
  if (!supabase || rules.length === 0) return;
  const rows = rules.map(r => ({ id: r.id, data: r }));
  const { error } = await supabase
    .from('rules')
    .upsert(rows, { onConflict: 'id' });

  if (error) console.error('Failed to upsert rules:', error);
}

export async function deleteRule(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('rules')
    .delete()
    .eq('id', id);

  if (error) console.error('Failed to delete rule:', error);
}

// ---------------------------------------------------------------------------
// Custom Practices
// ---------------------------------------------------------------------------

export async function fetchCustomPractices(): Promise<{ name: string; color: string }[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('custom_practices')
    .select('name, color')
    .order('name');

  if (error) {
    console.error('Failed to fetch custom practices:', error);
    return [];
  }

  return data ?? [];
}

export async function upsertCustomPractice(name: string, color: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('custom_practices')
    .upsert({ name, color }, { onConflict: 'name' });

  if (error) console.error('Failed to upsert custom practice:', error);
}

export async function deleteCustomPractice(name: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('custom_practices')
    .delete()
    .eq('name', name);

  if (error) console.error('Failed to delete custom practice:', error);
}

// ---------------------------------------------------------------------------
// Seed data to Supabase (first-time setup)
// ---------------------------------------------------------------------------

export async function seedIfEmpty(people: Person[], rules: Rule[]): Promise<boolean> {
  if (!supabase) return false;

  // Check if people table has any rows
  const { count } = await supabase
    .from('people')
    .select('id', { count: 'exact', head: true });

  if (count && count > 0) {
    // Already has data — don't overwrite
    return false;
  }

  console.log('Seeding Supabase with initial data...');
  await upsertPeople(people);
  await upsertRules(rules);
  return true;
}

// ---------------------------------------------------------------------------
// Real-time Subscriptions
// ---------------------------------------------------------------------------

let peopleChannel: RealtimeChannel | null = null;
let rulesChannel: RealtimeChannel | null = null;

export function subscribeToPeople(
  onInsert: (person: Person) => void,
  onUpdate: (person: Person) => void,
  onDelete: (id: string) => void,
): () => void {
  if (!supabase) return () => {};

  peopleChannel = supabase
    .channel('people-changes')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'people' },
      (payload) => onInsert(payload.new.data as Person)
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'people' },
      (payload) => onUpdate(payload.new.data as Person)
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'people' },
      (payload) => onDelete(payload.old.id as string)
    )
    .subscribe();

  return () => {
    if (peopleChannel && supabase) {
      supabase.removeChannel(peopleChannel);
      peopleChannel = null;
    }
  };
}

export function subscribeToRules(
  onInsert: (rule: Rule) => void,
  onUpdate: (rule: Rule) => void,
  onDelete: (id: string) => void,
): () => void {
  if (!supabase) return () => {};

  rulesChannel = supabase
    .channel('rules-changes')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'rules' },
      (payload) => onInsert(payload.new.data as Rule)
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'rules' },
      (payload) => onUpdate(payload.new.data as Rule)
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'rules' },
      (payload) => onDelete(payload.old.id as string)
    )
    .subscribe();

  return () => {
    if (rulesChannel && supabase) {
      supabase.removeChannel(rulesChannel);
      rulesChannel = null;
    }
  };
}
