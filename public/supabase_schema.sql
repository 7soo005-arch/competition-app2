-- ==========================================================================
-- COMPETITION MANAGEMENT SYSTEM - SUPABASE DATABASE SCHEMA (supabase_schema.sql)
-- ==========================================================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Categories Table (الفئات العمرية)
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Teams Table (الفرق)
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    color TEXT DEFAULT '#3b82f6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Participants Table (المشاركون / اللاعبون)
CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Competitions Table (المسابقات والفقرات)
CREATE TABLE IF NOT EXISTS competitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    type TEXT DEFAULT 'sports',
    points_win INT DEFAULT 3,
    points_draw INT DEFAULT 1,
    points_loss INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Weeks Table (الأسابيع والجولات)
CREATE TABLE IF NOT EXISTS weeks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Supervisors Table (المشرفون وحسابات المدراء)
CREATE TABLE IF NOT EXISTS supervisors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE, -- Connects to auth.users if using Supabase Auth
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'supervisor')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Match Records Table (سجلات المباريات)
CREATE TABLE IF NOT EXISTS match_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    competition_id UUID REFERENCES competitions(id) ON DELETE SET NULL,
    week_id UUID REFERENCES weeks(id) ON DELETE SET NULL,
    team1_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    team2_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    team1_score INT DEFAULT 0,
    team2_score INT DEFAULT 0,
    winner_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    is_draw BOOLEAN DEFAULT FALSE,
    supervisor_id UUID REFERENCES supervisors(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Score Entries Table (النقاط والجوائز الفردية والعقوبات)
CREATE TABLE IF NOT EXISTS score_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID REFERENCES match_records(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('best_player', 'ideal_player', 'penalty', 'custom_bonus')),
    points_change INT DEFAULT 0,
    reason_notes TEXT,
    supervisor_id UUID REFERENCES supervisors(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Audit Logs Table (سجل التدقيق والتغيرات)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supervisor_id UUID REFERENCES supervisors(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow Public Read Access for Standings & Display
CREATE POLICY "Public Read Categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Public Read Teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Public Read Participants" ON participants FOR SELECT USING (true);
CREATE POLICY "Public Read Competitions" ON competitions FOR SELECT USING (true);
CREATE POLICY "Public Read Weeks" ON weeks FOR SELECT USING (true);
CREATE POLICY "Public Read Match Records" ON match_records FOR SELECT USING (true);
CREATE POLICY "Public Read Score Entries" ON score_entries FOR SELECT USING (true);

-- Allow Full Access for Authenticated Supervisors & Admins
CREATE POLICY "Supervisor Full Match Access" ON match_records FOR ALL USING (true);
CREATE POLICY "Supervisor Full Score Access" ON score_entries FOR ALL USING (true);
CREATE POLICY "Admin Full Management" ON supervisors FOR ALL USING (true);
CREATE POLICY "Admin Full Audit" ON audit_logs FOR ALL USING (true);

-- SEED DATA INITIALIZATION
INSERT INTO categories (name, description) VALUES 
    ('الأشبال', 'فئة الأشبال (الصفوف الأولى)'),
    ('الفتيان', 'فئة الفتيان (الصفوف العليا)')
ON CONFLICT (name) DO NOTHING;

INSERT INTO competitions (name, type, points_win, points_draw, points_loss) VALUES 
    ('حرّيف ( كرة قدم )', 'sports', 3, 1, 0),
    ('ذهين ( ثقافي )', 'quiz', 3, 1, 0),
    ('منافس ( كرة يد - كرة طائرة - ألعاب حركية )', 'multi-sports', 3, 1, 0)
ON CONFLICT (name) DO NOTHING;

INSERT INTO weeks (name, is_active) VALUES 
    ('الأسبوع الأول', false),
    ('الأسبوع الثاني', true),
    ('الأسبوع الثالث', false),
    ('الأسبوع الرابع', false),
    ('الأسبوع الخامس', false),
    ('الأسبوع السادس', false)
ON CONFLICT (name) DO NOTHING;

INSERT INTO supervisors (name, username, password_hash, role) VALUES 
    ('مدير النظام الرئيسي', 'admin', 'admin123', 'admin'),
    ('المشرف الأول', 'supervisor1', '123456', 'supervisor'),
    ('المشرف الثاني', 'supervisor2', '123456', 'supervisor')
ON CONFLICT (username) DO NOTHING;
