-- ============================================================
-- Odgers Org Chart — Supabase Migration
-- Run this in your Supabase SQL Editor (one time)
-- ============================================================

-- 1. People table (stores full Person JSON in a JSONB column)
CREATE TABLE IF NOT EXISTS people (
  id   TEXT PRIMARY KEY,
  data JSONB NOT NULL
);

-- 2. Rules table (stores business logic rules as JSONB)
CREATE TABLE IF NOT EXISTS rules (
  id   TEXT PRIMARY KEY,
  data JSONB NOT NULL
);

-- 3. Custom practice areas
CREATE TABLE IF NOT EXISTS custom_practices (
  name  TEXT PRIMARY KEY,
  color TEXT NOT NULL DEFAULT '#6B7280'
);

-- 4. Enable Row Level Security
ALTER TABLE people            ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules             ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_practices  ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies — allow all operations for authenticated users
-- People
CREATE POLICY "Authenticated users can read people"
  ON people FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert people"
  ON people FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update people"
  ON people FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete people"
  ON people FOR DELETE
  TO authenticated
  USING (true);

-- Rules
CREATE POLICY "Authenticated users can read rules"
  ON rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert rules"
  ON rules FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update rules"
  ON rules FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete rules"
  ON rules FOR DELETE
  TO authenticated
  USING (true);

-- Custom Practices
CREATE POLICY "Authenticated users can read custom_practices"
  ON custom_practices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert custom_practices"
  ON custom_practices FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update custom_practices"
  ON custom_practices FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete custom_practices"
  ON custom_practices FOR DELETE
  TO authenticated
  USING (true);

-- 6. Enable Realtime for live sync across clients
ALTER PUBLICATION supabase_realtime ADD TABLE people;
ALTER PUBLICATION supabase_realtime ADD TABLE rules;
ALTER PUBLICATION supabase_realtime ADD TABLE custom_practices;
