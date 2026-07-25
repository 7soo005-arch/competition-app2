/* ==========================================================================
   COMPETITION MANAGEMENT SYSTEM - SUPABASE CLOUD DATABASE ENGINE (db.js)
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
        this.cache = {
            [DB_KEYS.CATEGORIES]: [],
            [DB_KEYS.TEAMS]: [],
            [DB_KEYS.PARTICIPANTS]: [],
            [DB_KEYS.COMPETITIONS]: [],
            [DB_KEYS.WEEKS]: [],
            [DB_KEYS.SUPERVISORS]: [],
            [DB_KEYS.MATCH_RECORDS]: [],
            [DB_KEYS.SCORE_ENTRIES]: [],
            [DB_KEYS.AUDIT_LOGS]: []
        };
        this.cloudClient = null;
        this.initDefaultSeed();
        this.initCloudSync();
    }

    // Initialize Supabase Cloud Connection & Realtime Listeners
    initCloudSync() {
        const url = localStorage.getItem('comp_supabase_url') || window.ENV_SUPABASE_URL || '';
        const key = localStorage.getItem('comp_supabase_key') || window.ENV_SUPABASE_KEY || '';

        if (url && key && window.supabase && typeof window.supabase.createClient === 'function') {
            try {
                this.cloudClient = window.supabase.createClient(url, key);
                console.log('⚡ Connected to Supabase Cloud Database:', url);
                this.pullAllTablesFromCloud();
                this.subscribeToRealtimeChanges();
            } catch (e) {
                console.error('Supabase initialization error:', e);
            }
        }
    }

    // Subscribe to Supabase Postgres Realtime Updates across all devices
    subscribeToRealtimeChanges() {
        if (!this.cloudClient) return;

        try {
            this.cloudClient
                .channel('public-db-changes')
                .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
                    console.log('🔄 Realtime Cloud Update Received:', payload);
                    this.pullAllTablesFromCloud();
                })
                .subscribe();
        } catch (e) {
            console.warn('Realtime subscription error:', e);
        }
    }

    // Set Credentials dynamically from Admin panel
    setSupabaseCredentials(url, key) {
        localStorage.setItem('comp_supabase_url', url.trim());
        localStorage.setItem('comp_supabase_key', key.trim());
        window.ENV_SUPABASE_URL = url.trim();
        window.ENV_SUPABASE_KEY = key.trim();
        this.initCloudSync();
    }

    // Pull all tables from Supabase Cloud
    async pullAllTablesFromCloud() {
        if (!this.cloudClient) return;

        const keys = Object.keys(TABLE_MAP);
        for (const key of keys) {
            const tableName = TABLE_MAP[key];
            try {
                const { data, error } = await this.cloudClient.from(tableName).select('*');
                if (!error && data) {
                    this.cache[key] = data;
                }
            } catch (e) {
                console.warn(`Failed to pull table ${tableName} from Supabase:`, e);
            }
        }

        // Trigger UI Refreshes
        this.refreshAllComponents();
    }

    refreshAllComponents() {
        if (window.leaderboardComponent) window.leaderboardComponent.renderAll();
        if (window.scoringComponent) {
            window.scoringComponent.populateDropdowns();
            window.scoringComponent.renderRecentFeed();
        }
        if (window.analyticsComponent) window.analyticsComponent.renderCharts();
        if (window.adminComponent) window.adminComponent.renderCurrentTab();
    }

    // Direct Memory & Supabase Cloud CRUD (No Local Storage data)
    getAll(key) {
        return this.cache[key] || [];
    }

    getById(key, id) {
        const items = this.getAll(key);
        return items.find(item => item.id === id);
    }

    async insert(key, item) {
        if (!item.id) {
            item.id = 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        }
        item.created_at = item.created_at || new Date().toISOString();

        // Add to cache
        this.cache[key] = [...(this.cache[key] || []), item];

        // Push to Supabase Cloud
        if (this.cloudClient) {
            const tableName = TABLE_MAP[key];
            const { data, error } = await this.cloudClient.from(tableName).insert([item]).select();
            if (error) {
                console.error(`Supabase cloud insert error on ${tableName}:`, error);
            } else if (data && data[0]) {
                const idx = this.cache[key].findIndex(i => i.id === item.id);
                if (idx !== -1) this.cache[key][idx] = data[0];
            }
        }

        this.refreshAllComponents();
        return item;
    }

    async update(key, id, updatedFields) {
        const items = this.getAll(key);
        const index = items.findIndex(item => item.id === id);
        if (index !== -1) {
            const updatedItem = { ...items[index], ...updatedFields, updated_at: new Date().toISOString() };
            this.cache[key][index] = updatedItem;

            // Push to Supabase Cloud
            if (this.cloudClient) {
                const tableName = TABLE_MAP[key];
                const { error } = await this.cloudClient.from(tableName).update(updatedFields).eq('id', id);
                if (error) console.error(`Supabase cloud update error on ${tableName}:`, error);
            }

            this.refreshAllComponents();
            return updatedItem;
        }
        return null;
    }

    async delete(key, id) {
        this.cache[key] = (this.cache[key] || []).filter(item => item.id !== id);

        // Delete from Supabase Cloud
        if (this.cloudClient) {
            const tableName = TABLE_MAP[key];
            const { error } = await this.cloudClient.from(tableName).delete().eq('id', id);
            if (error) console.error(`Supabase cloud delete error on ${tableName}:`, error);
        }

        this.refreshAllComponents();
        return true;
    }

    // Initial Memory Seed Setup (Fallback before cloud pull)
    initDefaultSeed() {
        this.cache[DB_KEYS.CATEGORIES] = [
            { id: 'cat-cubs', name: 'الأشبال', description: 'فئة الأشبال (الصفوف الأولى)', created_at: new Date().toISOString() },
            { id: 'cat-youths', name: 'الفتيان', description: 'فئة الفتيان (الصفوف العليا)', created_at: new Date().toISOString() }
        ];

        const defaultTeams = [];
        for (let i = 1; i <= 10; i++) {
            defaultTeams.push({ id: `team-cub-${i}`, name: `أشبال ${i}`, category_id: 'cat-cubs', color: '#3b82f6', created_at: new Date().toISOString() });
        }
        for (let i = 1; i <= 8; i++) {
            defaultTeams.push({ id: `team-youth-${i}`, name: `فتيان ${i}`, category_id: 'cat-youths', color: '#8b5cf6', created_at: new Date().toISOString() });
        }
        this.cache[DB_KEYS.TEAMS] = defaultTeams;

        this.cache[DB_KEYS.COMPETITIONS] = [
            { id: 'comp-1', name: 'حرّيف ( كرة قدم )', type: 'sports', points_win: 3, points_draw: 1, points_loss: 0, created_at: new Date().toISOString() },
            { id: 'comp-2', name: 'ذهين ( ثقافي )', type: 'quiz', points_win: 3, points_draw: 1, points_loss: 0, created_at: new Date().toISOString() },
            { id: 'comp-3', name: 'منافس ( كرة يد - كرة طائرة - ألعاب حركية )', type: 'multi-sports', points_win: 3, points_draw: 1, points_loss: 0, created_at: new Date().toISOString() }
        ];

        this.cache[DB_KEYS.WEEKS] = [
            { id: 'week-1', name: 'الأسبوع الأول', is_active: false },
            { id: 'week-2', name: 'الأسبوع الثاني', is_active: true },
            { id: 'week-3', name: 'الأسبوع الثالث', is_active: false },
            { id: 'week-4', name: 'الأسبوع الرابع', is_active: false },
            { id: 'week-5', name: 'الأسبوع الخامس', is_active: false },
            { id: 'week-6', name: 'الأسبوع السادس', is_active: false }
        ];

        this.cache[DB_KEYS.SUPERVISORS] = [
            { id: 'sup-admin', name: 'مدير النظام الرئيسي', username: 'admin', password_hash: 'admin123', role: 'admin', created_at: new Date().toISOString() },
            { id: 'sup-1', name: 'المشرف أحمد علي', username: 'supervisor1', password_hash: '123456', role: 'supervisor', created_at: new Date().toISOString() },
            { id: 'sup-2', name: 'المشرف محمد العتيبي', username: 'supervisor2', password_hash: '123456', role: 'supervisor', created_at: new Date().toISOString() }
        ];

        this.cache[DB_KEYS.PARTICIPANTS] = [];
        this.cache[DB_KEYS.MATCH_RECORDS] = [];
        this.cache[DB_KEYS.SCORE_ENTRIES] = [];
        this.cache[DB_KEYS.AUDIT_LOGS] = [];
    }
}

// Global db Instance
const db = new DatabaseEngine();
