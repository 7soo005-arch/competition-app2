/* ==========================================================================
   COMPETITION MANAGEMENT SYSTEM - RELATIONAL & SUPABASE CLOUD DATABASE (db.js)
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

const TABLE_MAP = {
    [DB_KEYS.CATEGORIES]: 'categories',
    [DB_KEYS.TEAMS]: 'teams',
    [DB_KEYS.PARTICIPANTS]: 'participants',
    [DB_KEYS.COMPETITIONS]: 'competitions',
    [DB_KEYS.WEEKS]: 'weeks',
    [DB_KEYS.SUPERVISORS]: 'supervisors',
    [DB_KEYS.MATCH_RECORDS]: 'match_records',
    [DB_KEYS.SCORE_ENTRIES]: 'score_entries',
    [DB_KEYS.AUDIT_LOGS]: 'audit_logs'
};

class DatabaseEngine {
    constructor() {
        this.cloudClient = null;
        this.initDefaultSeed();
        this.initCloudSync();
    }

    // Initialize Cloud Sync with Supabase
    initCloudSync() {
        const url = localStorage.getItem('comp_supabase_url') || window.ENV_SUPABASE_URL || '';
        const key = localStorage.getItem('comp_supabase_key') || window.ENV_SUPABASE_KEY || '';

        if (url && key && window.supabase && typeof window.supabase.createClient === 'function') {
            try {
                this.cloudClient = window.supabase.createClient(url, key);
                console.log('⚡ Connected to Supabase Cloud Database:', url);
                this.pullAllTablesFromCloud();
            } catch (e) {
                console.error('Supabase initialization failed:', e);
            }
        }
    }

    // Set & Save Supabase Credentials
    setSupabaseCredentials(url, key) {
        localStorage.setItem('comp_supabase_url', url.trim());
        localStorage.setItem('comp_supabase_key', key.trim());
        window.ENV_SUPABASE_URL = url.trim();
        window.ENV_SUPABASE_KEY = key.trim();
        this.initCloudSync();
    }

    // Sync all tables from Supabase Cloud
    async pullAllTablesFromCloud() {
        if (!this.cloudClient) return;

        const keys = Object.keys(TABLE_MAP);
        for (const key of keys) {
            const tableName = TABLE_MAP[key];
            try {
                const { data, error } = await this.cloudClient.from(tableName).select('*');
                if (!error && data && data.length > 0) {
                    this.saveCollection(key, data);
                }
            } catch (e) {
                console.warn(`Failed to pull table ${tableName} from Supabase:`, e);
            }
        }

        // Trigger UI refreshes after cloud pull
        if (window.leaderboardComponent) window.leaderboardComponent.renderAll();
        if (window.scoringComponent) {
            window.scoringComponent.populateDropdowns();
            window.scoringComponent.renderRecentFeed();
        }
        if (window.analyticsComponent) window.analyticsComponent.renderCharts();
        if (window.adminComponent) window.adminComponent.renderCurrentTab();
    }

    // Storage helpers
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

    // Generic CRUD with Async Cloud Sync
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

        // Async Push to Supabase Cloud
        if (this.cloudClient) {
            const tableName = TABLE_MAP[key];
            this.cloudClient.from(tableName).insert([item]).then(({ error }) => {
                if (error) console.error(`Supabase cloud insert error on ${tableName}:`, error);
            });
        }

        return item;
    }

    update(key, id, updatedFields) {
        const items = this.getCollection(key);
        const index = items.findIndex(item => item.id === id);
        if (index !== -1) {
            items[index] = { ...items[index], ...updatedFields, updated_at: new Date().toISOString() };
            this.saveCollection(key, items);

            // Async Update on Supabase Cloud
            if (this.cloudClient) {
                const tableName = TABLE_MAP[key];
                this.cloudClient.from(tableName).update(updatedFields).eq('id', id).then(({ error }) => {
                    if (error) console.error(`Supabase cloud update error on ${tableName}:`, error);
                });
            }

            return items[index];
        }
        return null;
    }

    delete(key, id) {
        let items = this.getCollection(key);
        items = items.filter(item => item.id !== id);
        this.saveCollection(key, items);

        // Async Delete on Supabase Cloud
        if (this.cloudClient) {
            const tableName = TABLE_MAP[key];
            this.cloudClient.from(tableName).delete().eq('id', id).then(({ error }) => {
                if (error) console.error(`Supabase cloud delete error on ${tableName}:`, error);
            });
        }

        return true;
    }

    // Default Seed Initialization
    initDefaultSeed() {
        if (!localStorage.getItem(DB_KEYS.CATEGORIES)) {
            const defaultCategories = [
                { id: 'cat-cubs', name: 'الأشبال', description: 'فئة الأشبال (الصفوف الأولى)', created_at: new Date().toISOString() },
                { id: 'cat-youths', name: 'الفتيان', description: 'فئة الفتيان (الصفوف العليا)', created_at: new Date().toISOString() }
            ];
            this.saveCollection(DB_KEYS.CATEGORIES, defaultCategories);
        }

        if (!localStorage.getItem(DB_KEYS.TEAMS)) {
            const defaultTeams = [];
            for (let i = 1; i <= 10; i++) {
                defaultTeams.push({
                    id: `team-cub-${i}`,
                    name: `أشبال ${i}`,
                    category_id: 'cat-cubs',
                    color: '#3b82f6',
                    created_at: new Date().toISOString()
                });
            }
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

        if (!localStorage.getItem(DB_KEYS.COMPETITIONS)) {
            const defaultCompetitions = [
                { id: 'comp-1', name: 'حرّيف ( كرة قدم )', type: 'sports', points_win: 3, points_draw: 1, points_loss: 0, created_at: new Date().toISOString() },
                { id: 'comp-2', name: 'ذهين ( ثقافي )', type: 'quiz', points_win: 3, points_draw: 1, points_loss: 0, created_at: new Date().toISOString() },
                { id: 'comp-3', name: 'منافس ( كرة يد - كرة طائرة - ألعاب حركية )', type: 'multi-sports', points_win: 3, points_draw: 1, points_loss: 0, created_at: new Date().toISOString() }
            ];
            this.saveCollection(DB_KEYS.COMPETITIONS, defaultCompetitions);
        }

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

        if (!localStorage.getItem(DB_KEYS.SUPERVISORS)) {
            const defaultSupervisors = [
                { id: 'sup-admin', name: 'مدير النظام الرئيسي', username: 'admin', password_hash: 'admin123', role: 'admin', created_at: new Date().toISOString() },
                { id: 'sup-1', name: 'المشرف أحمد علي', username: 'supervisor1', password_hash: '123456', role: 'supervisor', created_at: new Date().toISOString() },
                { id: 'sup-2', name: 'المشرف محمد العتيبي', username: 'supervisor2', password_hash: '123456', role: 'supervisor', created_at: new Date().toISOString() }
            ];
            this.saveCollection(DB_KEYS.SUPERVISORS, defaultSupervisors);
        }

        if (!localStorage.getItem(DB_KEYS.PARTICIPANTS)) {
            this.saveCollection(DB_KEYS.PARTICIPANTS, []);
        }

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
