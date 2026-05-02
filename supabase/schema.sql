-- ═══════════════════════════════════════════════════════════════
--  HisabX — Supabase Database Schema
--  Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ═══════════════════════════════════════════════════════════════

-- 1. Users table (basic auth — username/password)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  upi_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Members table (all people in the app)
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  avatar_pref JSONB DEFAULT NULL,
  upi_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Groups table
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'group',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Group ↔ Member junction
CREATE TABLE IF NOT EXISTS group_members (
  group_id TEXT REFERENCES groups(id) ON DELETE CASCADE,
  member_id TEXT REFERENCES members(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, member_id)
);

-- 5. Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  group_id TEXT REFERENCES groups(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL,
  category TEXT DEFAULT 'other',
  paid_by TEXT REFERENCES members(id),
  split_method TEXT DEFAULT 'equal',
  split_data JSONB DEFAULT '{}',
  date TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Expense ↔ Member split junction
CREATE TABLE IF NOT EXISTS expense_splits (
  expense_id TEXT REFERENCES expenses(id) ON DELETE CASCADE,
  member_id TEXT REFERENCES members(id) ON DELETE CASCADE,
  PRIMARY KEY (expense_id, member_id)
);

-- 7. Settlements table
CREATE TABLE IF NOT EXISTS settlements (
  id TEXT PRIMARY KEY,
  from_member TEXT REFERENCES members(id),
  to_member TEXT REFERENCES members(id),
  amount NUMERIC NOT NULL,
  group_id TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'confirmed',
  confirmed_at TIMESTAMPTZ
);

-- ═══════════════════════════════════════════════════════════════
--  Row Level Security — Allow all (no Supabase Auth)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on users" ON users FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on members" ON members FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on groups" ON groups FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on group_members" ON group_members FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on expenses" ON expenses FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on expense_splits" ON expense_splits FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on settlements" ON settlements FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
--  Enable Realtime on all tables
-- ═══════════════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE members;
ALTER PUBLICATION supabase_realtime ADD TABLE groups;
ALTER PUBLICATION supabase_realtime ADD TABLE group_members;
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE expense_splits;
ALTER PUBLICATION supabase_realtime ADD TABLE settlements;
