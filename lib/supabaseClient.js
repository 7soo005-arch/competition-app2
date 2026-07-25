/* ==========================================================================
   COMPETITION MANAGEMENT SYSTEM - SUPABASE CLIENT ADAPTER (lib/supabaseClient.js)
   ========================================================================== */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Initialize official Supabase JS Client if credentials exist
export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Unified Supabase Data Layer Service
export class SupabaseDataService {
  constructor() {
    this.isUsingRealSupabase = !!supabase;
  }

  // Categories
  async getCategories() {
    if (this.isUsingRealSupabase) {
      const { data, error } = await supabase.from('categories').select('*').order('created_at', { ascending: true });
      if (!error && data) return data;
    }
    return db.getAll(DB_KEYS.CATEGORIES);
  }

  // Teams
  async getTeams() {
    if (this.isUsingRealSupabase) {
      const { data, error } = await supabase.from('teams').select('*').order('created_at', { ascending: true });
      if (!error && data) return data;
    }
    return db.getAll(DB_KEYS.TEAMS);
  }

  // Participants
  async getParticipants() {
    if (this.isUsingRealSupabase) {
      const { data, error } = await supabase.from('participants').select('*').order('created_at', { ascending: true });
      if (!error && data) return data;
    }
    return db.getAll(DB_KEYS.PARTICIPANTS);
  }

  // Competitions
  async getCompetitions() {
    if (this.isUsingRealSupabase) {
      const { data, error } = await supabase.from('competitions').select('*').order('created_at', { ascending: true });
      if (!error && data) return data;
    }
    return db.getAll(DB_KEYS.COMPETITIONS);
  }

  // Weeks
  async getWeeks() {
    if (this.isUsingRealSupabase) {
      const { data, error } = await supabase.from('weeks').select('*').order('created_at', { ascending: true });
      if (!error && data) return data;
    }
    return db.getAll(DB_KEYS.WEEKS);
  }

  // Supervisors
  async getSupervisors() {
    if (this.isUsingRealSupabase) {
      const { data, error } = await supabase.from('supervisors').select('*').order('created_at', { ascending: true });
      if (!error && data) return data;
    }
    return db.getAll(DB_KEYS.SUPERVISORS);
  }

  // Match Records
  async getMatchRecords() {
    if (this.isUsingRealSupabase) {
      const { data, error } = await supabase.from('match_records').select('*').order('created_at', { ascending: false });
      if (!error && data) return data;
    }
    return db.getAll(DB_KEYS.MATCH_RECORDS);
  }

  // Score Entries
  async getScoreEntries() {
    if (this.isUsingRealSupabase) {
      const { data, error } = await supabase.from('score_entries').select('*').order('created_at', { ascending: false });
      if (!error && data) return data;
    }
    return db.getAll(DB_KEYS.SCORE_ENTRIES);
  }

  // Insert Match Record
  async createMatchRecord(matchRecord) {
    if (this.isUsingRealSupabase) {
      const { data, error } = await supabase.from('match_records').insert([matchRecord]).select();
      if (!error && data) return data[0];
    }
    return db.insert(DB_KEYS.MATCH_RECORDS, matchRecord);
  }

  // Insert Score Entry
  async createScoreEntry(entry) {
    if (this.isUsingRealSupabase) {
      const { data, error } = await supabase.from('score_entries').insert([entry]).select();
      if (!error && data) return data[0];
    }
    return db.insert(DB_KEYS.SCORE_ENTRIES, entry);
  }

  // Insert Audit Log
  async createAuditLog(log) {
    if (this.isUsingRealSupabase) {
      await supabase.from('audit_logs').insert([log]);
    }
    return db.insert(DB_KEYS.AUDIT_LOGS, log);
  }

  // Update Match Record
  async updateMatchRecord(id, matchRecord) {
    if (this.isUsingRealSupabase) {
      const { data, error } = await supabase.from('match_records').update(matchRecord).eq('id', id).select();
      if (!error && data) return data[0];
    }
    return db.update(DB_KEYS.MATCH_RECORDS, id, matchRecord);
  }

  // Delete Match Record
  async deleteMatchRecord(id) {
    if (this.isUsingRealSupabase) {
      await supabase.from('match_records').delete().eq('id', id);
    }
    return db.delete(DB_KEYS.MATCH_RECORDS, id);
  }

  // Delete Score Entries for Match
  async deleteScoreEntriesForMatch(matchId) {
    if (this.isUsingRealSupabase) {
      await supabase.from('score_entries').delete().eq('match_id', matchId);
    }
    let entries = db.getAll(DB_KEYS.SCORE_ENTRIES);
    entries = entries.filter(e => e.match_id !== matchId);
    db.saveCollection(DB_KEYS.SCORE_ENTRIES, entries);
    return true;
  }
}

export const supabaseDataService = new SupabaseDataService();
