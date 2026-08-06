/* ==========================================================================
   COMPETITION MANAGEMENT SYSTEM - REALTIME SUPABASE ENGINE (db.js)
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

const REVERSE_TABLE_MAP = {
    'categories': DB_KEYS.CATEGORIES,
    'teams': DB_KEYS.TEAMS,
    'participants': DB_KEYS.PARTICIPANTS,
    'competitions': DB_KEYS.COMPETITIONS,
    'weeks': DB_KEYS.WEEKS,
    'supervisors': DB_KEYS.SUPERVISORS,
    'match_records': DB_KEYS.MATCH_RECORDS,
    'score_entries': DB_KEYS.SCORE_ENTRIES,
    'audit_logs': DB_KEYS.AUDIT_LOGS
};

class DatabaseEngine {
    constructor() {
        this.cache = {};
        this.cloudClient = null;
        this.realtimeChannel = null;
        this.syncInterval = null;
        this.isInitialized = false;
        
        // Initialize empty cache keys
        const keys = Object.keys(TABLE_MAP);
        for (const key of keys) {
            this.cache[key] = [];
        }

        this.setupAutoSyncHooks();
    }

    // Explicit Async Database Initialization Sequence (Waits for Supabase Fetch Before UI Render)
    async initDatabase() {
        const url = localStorage.getItem('comp_supabase_url') || window.ENV_SUPABASE_URL || '';
        const key = localStorage.getItem('comp_supabase_key') || window.ENV_SUPABASE_KEY || '';

        if (url && key && window.supabase && typeof window.supabase.createClient === 'function') {
            try {
                this.cloudClient = window.supabase.createClient(url, key);
                console.log('⚡ Connected to Supabase Cloud Database:', url);
                
                // 1. Fetch latest state from Supabase BEFORE rendering UI & BEFORE Realtime!
                await this.pullAllTablesFromCloud();
                
                // 2. Start Realtime AFTER initial fetch completes
                this.subscribeToRealtimeChanges();
                
                this.isInitialized = true;
                return true;
            } catch (e) {
                console.error('Supabase initialization error:', e);
            }
        }

        // Fallback to local collections if no Supabase connection
        this.initLocalCollections();
        this.isInitialized = true;
        return false;
    }

    // Initialize Local Memory Cache
    initLocalCollections() {
        this.initDefaultSeed();
        const keys = Object.keys(TABLE_MAP);
        for (const key of keys) {
            this.cache[key] = this.getCollection(key);
        }
    }

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

    // Initialize Supabase Cloud Client & Connections
    initCloudSync() {
        this.initDatabase();
    }

    // Setup Resilient Hooks: 30s background sync, Visibility tab change, Online reconnect
    setupAutoSyncHooks() {
        // 30-Second Background Synchronization Check (Fallback Sync)
        if (this.syncInterval) clearInterval(this.syncInterval);
        this.syncInterval = setInterval(() => {
            console.log('⏰ 30s Fallback Sync Check triggered...');
            this.pullAllTablesFromCloud();
        }, 30000);

        // Tab Active / Visibility Change Hook
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                console.log('👁️ Tab became visible -> Syncing latest Supabase data...');
                this.pullAllTablesFromCloud();
            }
        });

        // Window Focus Hook
        window.addEventListener('focus', () => {
            console.log('🔍 Window focused -> Refreshing data from Supabase...');
            this.pullAllTablesFromCloud();
        });

        // Network Reconnection Hook
        window.addEventListener('online', () => {
            console.log('🌐 Network Connection restored -> Reconnecting Realtime & Syncing...');
            if (window.app) window.app.showToast('تم استعادة الاتصال بالإنترنت - جاري المزامنة...', 'info');
            this.initCloudSync();
        });

        window.addEventListener('offline', () => {
            console.warn('⚠️ Network Connection Lost!');
            if (window.app) window.app.showToast('انقطع الاتصال بالإنترنت - يتم العمل في الوضع المؤقت...', 'warning');
        });
    }

    // Subscribe to Realtime Updates (INSERT, UPDATE, DELETE)
    subscribeToRealtimeChanges() {
        if (!this.cloudClient) return;

        if (this.realtimeChannel) {
            try { this.cloudClient.removeChannel(this.realtimeChannel); } catch(e){}
        }

        try {
            this.realtimeChannel = this.cloudClient
                .channel('public-db-changes-' + Date.now())
                .on('postgres_changes', { event: '*', schema: 'public' }, async (payload) => {
                    console.log('🔄 Realtime Event Received:', payload.eventType, payload.table, payload);
                    
                    const key = REVERSE_TABLE_MAP[payload.table];
                    if (key) {
                        if (payload.eventType === 'INSERT' && payload.new) {
                            const items = this.cache[key] || [];
                            const idx = items.findIndex(i => i.id === payload.new.id);
                            if (idx !== -1) items[idx] = payload.new;
                            else items.push(payload.new);
                            this.cache[key] = items;
                            this.saveCollection(key, items);
                        } else if (payload.eventType === 'UPDATE' && payload.new) {
                            const items = this.cache[key] || [];
                            const idx = items.findIndex(i => i.id === payload.new.id);
                            if (idx !== -1) items[idx] = payload.new;
                            else items.push(payload.new);
                            this.cache[key] = items;
                            this.saveCollection(key, items);
                        } else if (payload.eventType === 'DELETE' && payload.old && payload.old.id) {
                            const deletedId = payload.old.id;
                            if (this.cache[key]) {
                                this.cache[key] = this.cache[key].filter(item => item.id !== deletedId);
                                this.saveCollection(key, this.cache[key]);
                            }
                        }
                    }

                    // Perform complete pull & refresh to guarantee absolute state consistency
                    await this.pullAllTablesFromCloud();
                })
                .subscribe((status) => {
                    console.log('⚡ Supabase Realtime Channel Status:', status);
                    if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                        console.warn('⚠️ Realtime Channel disconnected. Scheduling auto-reconnect...');
                        setTimeout(() => this.initCloudSync(), 5000);
                    }
                });
        } catch (e) {
            console.warn('Realtime subscription error:', e);
        }
    }

    setSupabaseCredentials(url, key) {
        localStorage.setItem('comp_supabase_url', url.trim());
        localStorage.setItem('comp_supabase_key', key.trim());
        window.ENV_SUPABASE_URL = url.trim();
        window.ENV_SUPABASE_KEY = key.trim();
        this.initCloudSync();
    }

    async testCloudConnection() {
        if (!this.cloudClient) {
            return { success: false, message: 'لم يتم تفعيل الربط بقواعد بيانات Supabase بعد (يرجى إدخال الرابط والمفتاح).' };
        }

        try {
            const testId = 'test_' + Date.now();
            const testLog = {
                id: testId,
                supervisor_id: 'test',
                action: 'اختبار الاتصال',
                details: 'فحص الإدخال والاستعلام المباشر من قاعدة بيانات Supabase',
                timestamp: new Date().toISOString()
            };

            const { error: insertErr } = await this.cloudClient.from('audit_logs').insert([testLog]);
            if (insertErr) {
                return { success: false, message: 'فشل الإدخال المباشر في Supabase: ' + insertErr.message };
            }

            const { data, error: selectErr } = await this.cloudClient.from('audit_logs').select('*').eq('id', testId);
            if (selectErr || !data || data.length === 0) {
                return { success: false, message: 'فشل الاستعلام المباشر من Supabase بعد الإدخال.' };
            }

            await this.cloudClient.from('audit_logs').delete().eq('id', testId);

            return { success: true, message: '⚡ تم الإدخال والاستعلام والحذف المباشر في قاعدة بيانات Supabase السحابية بنجاح بنسبة 100%!' };
        } catch (e) {
            return { success: false, message: 'خطأ أثناء الاتصال بـ Supabase: ' + e.message };
        }
    }

    // Pull all tables from Supabase Cloud concurrently
    async pullAllTablesFromCloud() {
        if (!this.cloudClient) return;

        const keys = Object.keys(TABLE_MAP);
        let hasData = false;

        await Promise.all(keys.map(async (key) => {
            const tableName = TABLE_MAP[key];
            try {
                const { data, error } = await this.cloudClient.from(tableName).select('*');
                if (!error && data) {
                    this.cache[key] = data;
                    this.saveCollection(key, data);
                    if (data.length > 0) hasData = true;
                }
            } catch (e) {
                console.warn(`Failed to pull table ${tableName} from Supabase:`, e);
            }
        }));

        if (!hasData || !this.cache[DB_KEYS.CATEGORIES] || this.cache[DB_KEYS.CATEGORIES].length === 0) {
            await this.seedSupabaseCloud();
        }

        this.refreshAllComponents();
    }

    async seedSupabaseCloud() {
        if (!this.cloudClient) return;
        console.log('🌱 Database is empty. Seeding initial records to Supabase Cloud...');

        try {
            const categories = [
                { id: 'cat-cubs', name: 'الأشبال', description: 'فئة الأشبال (الصفوف الأولى)', created_at: new Date().toISOString() },
                { id: 'cat-youths', name: 'الفتيان', description: 'فئة الفتيان (الصفوف العليا)', created_at: new Date().toISOString() }
            ];
            await this.cloudClient.from('categories').upsert(categories);

            const defaultTeams = [];
            for (let i = 1; i <= 10; i++) {
                defaultTeams.push({ id: `team-cub-${i}`, name: `أشبال ${i}`, category_id: 'cat-cubs', color: '#3b82f6', created_at: new Date().toISOString() });
            }
            for (let i = 1; i <= 8; i++) {
                defaultTeams.push({ id: `team-youth-${i}`, name: `فتيان ${i}`, category_id: 'cat-youths', color: '#8b5cf6', created_at: new Date().toISOString() });
            }
            await this.cloudClient.from('teams').upsert(defaultTeams);

            const defaultCompetitions = [
                { id: 'comp-1', name: 'حرّيف ( كرة قدم )', type: 'sports', points_win: 3, points_draw: 1, points_loss: 0, created_at: new Date().toISOString() },
                { id: 'comp-2', name: 'ذهين ( ثقافي )', type: 'quiz', points_win: 3, points_draw: 1, points_loss: 0, created_at: new Date().toISOString() },
                { id: 'comp-3', name: 'منافس ( كرة يد - كرة طائرة - ألعاب حركية )', type: 'multi-sports', points_win: 3, points_draw: 1, points_loss: 0, created_at: new Date().toISOString() }
            ];
            await this.cloudClient.from('competitions').upsert(defaultCompetitions);

            const defaultWeeks = [
                { id: 'week-1', name: 'الأسبوع الأول', is_active: false },
                { id: 'week-2', name: 'الأسبوع الثاني', is_active: true },
                { id: 'week-3', name: 'الأسبوع الثالث', is_active: false },
                { id: 'week-4', name: 'الأسبوع الرابع', is_active: false },
                { id: 'week-5', name: 'الأسبوع الخامس', is_active: false },
                { id: 'week-6', name: 'الأسبوع السادس', is_active: false }
            ];
            await this.cloudClient.from('weeks').upsert(defaultWeeks);

            const defaultSupervisors = [
                { id: 'sup-admin', name: 'مدير النظام الرئيسي', username: 'admin', password_hash: 'admin123', role: 'admin', created_at: new Date().toISOString() },
                { id: 'sup-1', name: 'المشرف أحمد علي', username: 'supervisor1', password_hash: '123456', role: 'supervisor', created_at: new Date().toISOString() },
                { id: 'sup-2', name: 'المشرف محمد العتيبي', username: 'supervisor2', password_hash: '123456', role: 'supervisor', created_at: new Date().toISOString() }
            ];
            await this.cloudClient.from('supervisors').upsert(defaultSupervisors);

            const keys = Object.keys(TABLE_MAP);
            for (const key of keys) {
                const tableName = TABLE_MAP[key];
                const { data } = await this.cloudClient.from(tableName).select('*');
                if (data && data.length > 0) {
                    this.cache[key] = data;
                    this.saveCollection(key, data);
                }
            }
        } catch (err) {
            console.error('Error auto-seeding Supabase Cloud:', err);
        }
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

    getAll(key) {
        if (!this.cache[key] || this.cache[key].length === 0) {
            this.cache[key] = this.getCollection(key);
        }
        return this.cache[key] || [];
    }

    getById(key, id) {
        const items = this.getAll(key);
        return items.find(item => item.id === id);
    }

    checkWritePermission(key, action) {
        if (typeof authService !== 'undefined' && authService.isLoggedIn()) {
            if (authService.isSupervisor()) {
                if (action !== 'insert' || (key !== DB_KEYS.MATCH_RECORDS && key !== DB_KEYS.SCORE_ENTRIES && key !== DB_KEYS.AUDIT_LOGS)) {
                    if (window.app) window.app.showToast('هذا الإجراء متاح فقط لمدير النظام.', 'error');
                    return false;
                }
            }
        }
        return true;
    }

    // Guaranteed Cloud INSERT
    async insert(key, item) {
        if (!this.checkWritePermission(key, 'insert')) {
            return { success: false, error: 'هذا الإجراء متاح فقط لمدير النظام.' };
        }

        if (!item.id) {
            item.id = 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        }
        item.created_at = item.created_at || new Date().toISOString();

        if (this.cloudClient) {
            const tableName = TABLE_MAP[key];
            try {
                const { data, error } = await this.cloudClient.from(tableName).insert([item]).select();
                if (error) {
                    console.error(`❌ Supabase Cloud insert error on ${tableName}:`, error);
                    return { success: false, error: error.message || 'فشل الإدخال في Supabase' };
                }
                if (data && data[0]) {
                    item = data[0];
                }
            } catch (e) {
                console.error(`❌ Supabase Cloud insert exception on ${tableName}:`, e);
                return { success: false, error: e.message || 'خطأ أثناء الاتصال بقاعدة بيانات Supabase' };
            }
        }

        const currentItems = this.getAll(key);
        const existingIdx = currentItems.findIndex(i => i.id === item.id);
        if (existingIdx !== -1) {
            currentItems[existingIdx] = item;
        } else {
            currentItems.push(item);
        }
        this.cache[key] = currentItems;
        this.saveCollection(key, currentItems);

        this.refreshAllComponents();
        return { success: true, data: item };
    }

    // Guaranteed Cloud UPDATE
    async update(key, id, updatedFields) {
        if (!this.checkWritePermission(key, 'update')) {
            return { success: false, error: 'هذا الإجراء متاح فقط لمدير النظام.' };
        }

        const items = this.getAll(key);
        const index = items.findIndex(item => item.id === id);

        if (this.cloudClient) {
            const tableName = TABLE_MAP[key];
            try {
                const { error } = await this.cloudClient.from(tableName).update(updatedFields).eq('id', id);
                if (error) {
                    console.error(`❌ Supabase Cloud update error on ${tableName}:`, error);
                    return { success: false, error: error.message || 'فشل التعديل في Supabase' };
                }
            } catch (e) {
                console.error(`❌ Supabase Cloud update exception on ${tableName}:`, e);
                return { success: false, error: e.message || 'خطأ أثناء الاتصال بقاعدة بيانات Supabase' };
            }
        }

        if (index !== -1) {
            const updatedItem = { ...items[index], ...updatedFields, updated_at: new Date().toISOString() };
            items[index] = updatedItem;
            this.cache[key] = items;
            this.saveCollection(key, items);
        }

        this.refreshAllComponents();
        return { success: true };
    }

    // Guaranteed Cloud DELETE
    async delete(key, id) {
        if (!this.checkWritePermission(key, 'delete')) {
            return { success: false, error: 'هذا الإجراء متاح فقط لمدير النظام.' };
        }

        if (this.cloudClient) {
            const tableName = TABLE_MAP[key];
            try {
                const { error } = await this.cloudClient.from(tableName).delete().eq('id', id);
                if (error) {
                    console.error(`❌ Supabase Cloud delete error on ${tableName}:`, error);
                    return { success: false, error: error.message || 'فشل الحذف من Supabase' };
                }
            } catch (e) {
                console.error(`❌ Supabase Cloud delete exception on ${tableName}:`, e);
                return { success: false, error: e.message || 'خطأ أثناء الاتصال بقاعدة بيانات Supabase' };
            }
        }

        const items = this.getAll(key).filter(item => item.id !== id);
        this.cache[key] = items;
        this.saveCollection(key, items);

        this.refreshAllComponents();
        return { success: true };
    }

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
                defaultTeams.push({ id: `team-cub-${i}`, name: `أشبال ${i}`, category_id: 'cat-cubs', color: '#3b82f6', created_at: new Date().toISOString() });
            }
            for (let i = 1; i <= 8; i++) {
                defaultTeams.push({ id: `team-youth-${i}`, name: `فتيان ${i}`, category_id: 'cat-youths', color: '#8b5cf6', created_at: new Date().toISOString() });
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

        if (!localStorage.getItem(DB_KEYS.PARTICIPANTS)) this.saveCollection(DB_KEYS.PARTICIPANTS, []);
        if (!localStorage.getItem(DB_KEYS.MATCH_RECORDS)) this.saveCollection(DB_KEYS.MATCH_RECORDS, []);
        if (!localStorage.getItem(DB_KEYS.SCORE_ENTRIES)) this.saveCollection(DB_KEYS.SCORE_ENTRIES, []);
        if (!localStorage.getItem(DB_KEYS.AUDIT_LOGS)) this.saveCollection(DB_KEYS.AUDIT_LOGS, []);
    }
}

// Global db Instance
const db = new DatabaseEngine();
