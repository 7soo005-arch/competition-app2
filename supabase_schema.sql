-- ==========================================================================
-- COMPETITION MANAGEMENT SYSTEM - UNIVERSAL SUPABASE SCHEMA (TEXT IDs & RLS)
-- ==========================================================================

-- 1. Categories Table (الفئات العمرية)
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Teams Table (الفرق)
CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
    color TEXT DEFAULT '#3b82f6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Participants Table (المشاركون / اللاعبون)
CREATE TABLE IF NOT EXISTS participants (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    team_id TEXT REFERENCES teams(id) ON DELETE CASCADE,
    category_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Competitions Table (المسابقات والفقرات)
CREATE TABLE IF NOT EXISTS competitions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    type TEXT DEFAULT 'sports',
    points_win INT DEFAULT 3,
    points_draw INT DEFAULT 1,
    points_loss INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Weeks Table (الأسابيع والجولات)
CREATE TABLE IF NOT EXISTS weeks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Supervisors Table (المشرفون وحسابات المدراء)
CREATE TABLE IF NOT EXISTS supervisors (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'supervisor')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Match Records Table (سجلات المباريات)
CREATE TABLE IF NOT EXISTS match_records (
    id TEXT PRIMARY KEY,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    competition_id TEXT REFERENCES competitions(id) ON DELETE SET NULL,
    week_id TEXT REFERENCES weeks(id) ON DELETE SET NULL,
    team1_id TEXT REFERENCES teams(id) ON DELETE CASCADE,
    team2_id TEXT REFERENCES teams(id) ON DELETE CASCADE,
    team1_score INT DEFAULT 0,
    team2_score INT DEFAULT 0,
    winner_team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
    is_draw BOOLEAN DEFAULT FALSE,
    supervisor_id TEXT REFERENCES supervisors(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Score Entries Table (النقاط والجوائز الفردية والعقوبات)
CREATE TABLE IF NOT EXISTS score_entries (
    id TEXT PRIMARY KEY,
    match_id TEXT REFERENCES match_records(id) ON DELETE CASCADE,
    participant_id TEXT REFERENCES participants(id) ON DELETE CASCADE,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('best_player', 'top_scorer', 'best_goalkeeper', 'ideal_player', 'penalty', 'custom_bonus')),
    points_change INT DEFAULT 0,
    reason_notes TEXT,
    supervisor_id TEXT REFERENCES supervisors(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Audit Logs Table (سجل التدقيق والتغيرات)
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    supervisor_id TEXT REFERENCES supervisors(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) & Policies for full CRUD access via Anon key
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Grant ALL Access Policies for Anonymous API client
DROP POLICY IF EXISTS "Public Full Categories" ON categories;
CREATE POLICY "Public Full Categories" ON categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Teams" ON teams;
CREATE POLICY "Public Full Teams" ON teams FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Participants" ON participants;
CREATE POLICY "Public Full Participants" ON participants FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Competitions" ON competitions;
CREATE POLICY "Public Full Competitions" ON competitions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Weeks" ON weeks;
CREATE POLICY "Public Full Weeks" ON weeks FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Supervisors" ON supervisors;
CREATE POLICY "Public Full Supervisors" ON supervisors FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Match Records" ON match_records;
CREATE POLICY "Public Full Match Records" ON match_records FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Score Entries" ON score_entries;
CREATE POLICY "Public Full Score Entries" ON score_entries FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Audit Logs" ON audit_logs;
CREATE POLICY "Public Full Audit Logs" ON audit_logs FOR ALL USING (true) WITH CHECK (true);

-- Enable Postgres WAL Publication & Replica Identity for Supabase Realtime Deletes
ALTER TABLE categories REPLICA IDENTITY FULL;
ALTER TABLE teams REPLICA IDENTITY FULL;
ALTER TABLE participants REPLICA IDENTITY FULL;
ALTER TABLE competitions REPLICA IDENTITY FULL;
ALTER TABLE weeks REPLICA IDENTITY FULL;
ALTER TABLE supervisors REPLICA IDENTITY FULL;
ALTER TABLE match_records REPLICA IDENTITY FULL;
ALTER TABLE score_entries REPLICA IDENTITY FULL;
ALTER TABLE audit_logs REPLICA IDENTITY FULL;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE categories, teams, participants, competitions, weeks, supervisors, match_records, score_entries, audit_logs;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- SEED DATA INITIALIZATION
INSERT INTO categories (id, name, description) VALUES 
    ('cat-cubs', 'الأشبال', 'فئة الأشبال (الصفوف الأولى)'),
    ('cat-youths', 'الفتيان', 'فئة الفتيان (الصفوف العليا)')
ON CONFLICT (id) DO NOTHING;

INSERT INTO competitions (id, name, type, points_win, points_draw, points_loss) VALUES 
    ('comp-1', 'حرّيف ( كرة قدم )', 'sports', 3, 1, 0),
    ('comp-2', 'ذهين ( ثقافي )', 'quiz', 3, 1, 0),
    ('comp-3', 'منافس ( كرة يد - كرة طائرة - ألعاب حركية )', 'multi-sports', 3, 1, 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO weeks (id, name, is_active) VALUES 
    ('week-1', 'الأسبوع الأول', false),
    ('week-2', 'الأسبوع الثاني', true),
    ('week-3', 'الأسبوع الثالث', false),
    ('week-4', 'الأسبوع الرابع', false),
    ('week-5', 'الأسبوع الخامس', false),
    ('week-6', 'الأسبوع السادس', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO supervisors (id, name, username, password_hash, role) VALUES 
    ('sup-admin', 'مدير النظام الرئيسي', 'admin', 'admin123', 'admin'),
    ('sup-1', 'المشرف الأول', 'supervisor1', '123456', 'supervisor'),
    ('sup-2', 'المشرف الثاني', 'supervisor2', '123456', 'supervisor')
ON CONFLICT (id) DO NOTHING;
