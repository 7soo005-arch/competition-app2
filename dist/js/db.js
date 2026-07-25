/* ==========================================================================
   COMPETITION MANAGEMENT SYSTEM - RELATIONAL DATABASE ENGINE (db.js)
   ========================================================================== */

const DB_KEYS = {
    CATEGORIES: 'comp_categories',
    TEAMS: 'comp_teams',
    PARTICIPANTS: 'comp_participants',
    COMPETITIONS: 'comp_competitions',
    WEEKS: 'comp_weeks',
    SUPERVISORS: 'comp_supervisors',
    MATCH_RECORDS: 'comp_match_records',
    SCORE_ENTRIES: 'comp_score_entries',
    AUDIT_LOGS: 'comp_audit_logs'
};

class DatabaseEngine {
    constructor() {
        this.initDefaultSeed();
    }

    // Storage helper
    getCollection(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error(`Error reading key ${key} from storage:`, e);
            return [];
        }
    }

    saveCollection(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error(`Error saving key ${key} to storage:`, e);
        }
    }

    // Generic CRUD
    getAll(key) {
        return this.getCollection(key);
    }

    getById(key, id) {
        const items = this.getCollection(key);
        return items.find(item => item.id === id);
    }

    insert(key, item) {
        const items = this.getCollection(key);
        if (!item.id) {
            item.id = 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        }
        item.created_at = item.created_at || new Date().toISOString();
        items.push(item);
        this.saveCollection(key, items);
        return item;
    }

    update(key, id, updatedFields) {
        const items = this.getCollection(key);
        const index = items.findIndex(item => item.id === id);
        if (index !== -1) {
            items[index] = { ...items[index], ...updatedFields, updated_at: new Date().toISOString() };
            this.saveCollection(key, items);
            return items[index];
        }
        return null;
    }

    delete(key, id) {
        let items = this.getCollection(key);
        items = items.filter(item => item.id !== id);
        this.saveCollection(key, items);
        return true;
    }

    // Default Seed Initialization
    initDefaultSeed() {
        // Seed Categories
        if (!localStorage.getItem(DB_KEYS.CATEGORIES)) {
            const defaultCategories = [
                { id: 'cat-cubs', name: 'الأشبال', description: 'فئة الأشبال (الصفوف الأولى)', created_at: new Date().toISOString() },
                { id: 'cat-youths', name: 'الفتيان', description: 'فئة الفتيان (الصفوف العليا)', created_at: new Date().toISOString() }
            ];
            this.saveCollection(DB_KEYS.CATEGORIES, defaultCategories);
        }

        // Seed Teams
        if (!localStorage.getItem(DB_KEYS.TEAMS)) {
            const defaultTeams = [];
            // 10 Cubs teams
            for (let i = 1; i <= 10; i++) {
                defaultTeams.push({
                    id: `team-cub-${i}`,
                    name: `أشبال ${i}`,
                    category_id: 'cat-cubs',
                    color: '#3b82f6',
                    created_at: new Date().toISOString()
                });
            }
            // 8 Youths teams
            for (let i = 1; i <= 8; i++) {
                defaultTeams.push({
                    id: `team-youth-${i}`,
                    name: `فتيان ${i}`,
                    category_id: 'cat-youths',
                    color: '#8b5cf6',
                    created_at: new Date().toISOString()
                });
            }
            this.saveCollection(DB_KEYS.TEAMS, defaultTeams);
        }

        // Seed Competitions (Matching Form Reference)
        if (!localStorage.getItem(DB_KEYS.COMPETITIONS)) {
            const defaultCompetitions = [
                { id: 'comp-1', name: 'حرّيف ( كرة قدم )', type: 'sports', points_win: 3, points_draw: 1, points_loss: 0, created_at: new Date().toISOString() },
                { id: 'comp-2', name: 'ذهين ( ثقافي )', type: 'quiz', points_win: 3, points_draw: 1, points_loss: 0, created_at: new Date().toISOString() },
                { id: 'comp-3', name: 'منافس ( كرة يد - كرة طائرة - ألعاب حركية )', type: 'multi-sports', points_win: 3, points_draw: 1, points_loss: 0, created_at: new Date().toISOString() }
            ];
            this.saveCollection(DB_KEYS.COMPETITIONS, defaultCompetitions);
        }

        // Seed Weeks
        if (!localStorage.getItem(DB_KEYS.WEEKS)) {
            const defaultWeeks = [
                { id: 'week-1', name: 'الأسبوع الأول', is_active: false },
                { id: 'week-2', name: 'الأسبوع الثاني', is_active: true },
                { id: 'week-3', name: 'الأسبوع الثالث', is_active: false },
                { id: 'week-4', name: 'الأسبوع الرابع', is_active: false },
                { id: 'week-5', name: 'الأسبوع الخامس', is_active: false },
                { id: 'week-6', name: 'الأسبوع السادس', is_active: false }
            ];
            this.saveCollection(DB_KEYS.WEEKS, defaultWeeks);
        }

        // Seed Default Supervisors & Admin
        if (!localStorage.getItem(DB_KEYS.SUPERVISORS)) {
            const defaultSupervisors = [
                { id: 'sup-admin', name: 'مدير النظام الرئيسي', username: 'admin', password_hash: 'admin123', role: 'admin', created_at: new Date().toISOString() },
                { id: 'sup-1', name: 'المشرف أحمد علي', username: 'supervisor1', password_hash: '123456', role: 'supervisor', created_at: new Date().toISOString() },
                { id: 'sup-2', name: 'المشرف محمد العتيبي', username: 'supervisor2', password_hash: '123456', role: 'supervisor', created_at: new Date().toISOString() }
            ];
            this.saveCollection(DB_KEYS.SUPERVISORS, defaultSupervisors);
        }

        // Initialize Participants (Empty by default - Admin managed)
        if (!localStorage.getItem(DB_KEYS.PARTICIPANTS)) {
            this.saveCollection(DB_KEYS.PARTICIPANTS, []);
        }

        // Seed Match Records & Scores if empty
        if (!localStorage.getItem(DB_KEYS.MATCH_RECORDS)) {
            this.saveCollection(DB_KEYS.MATCH_RECORDS, []);
        }
        if (!localStorage.getItem(DB_KEYS.SCORE_ENTRIES)) {
            this.saveCollection(DB_KEYS.SCORE_ENTRIES, []);
        }
        if (!localStorage.getItem(DB_KEYS.AUDIT_LOGS)) {
            this.saveCollection(DB_KEYS.AUDIT_LOGS, []);
        }
    }
}

// Global db Instance
const db = new DatabaseEngine();
