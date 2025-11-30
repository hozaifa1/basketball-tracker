-- Courtside Basketball Tracker - Supabase Schema
-- Run this SQL in your Supabase SQL Editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Players Table
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'Member' CHECK (role IN ('Member', 'Leader', 'Treasurer')),
  group_id INTEGER,
  balance DECIMAL(10, 2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Practice Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  is_online BOOLEAN DEFAULT FALSE,
  is_settled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attendance Table
CREATE TABLE IF NOT EXISTS attendances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL CHECK (status IN ('On Time', 'Late', 'Absent Informed', 'Absent Uninformed')),
  UNIQUE(session_id, player_id)
);

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_players_group ON players(group_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date DESC);
CREATE INDEX IF NOT EXISTS idx_attendances_session ON attendances(session_id);
CREATE INDEX IF NOT EXISTS idx_attendances_player ON attendances(player_id);
CREATE INDEX IF NOT EXISTS idx_payments_player ON payments(player_id);

-- Row Level Security (RLS) - Enable for production
-- For now, we'll allow all operations (public access with anon key)
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policies to allow public access (using anon key)
CREATE POLICY "Allow public read on players" ON players FOR SELECT USING (true);
CREATE POLICY "Allow public insert on players" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on players" ON players FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on players" ON players FOR DELETE USING (true);

CREATE POLICY "Allow public read on sessions" ON sessions FOR SELECT USING (true);
CREATE POLICY "Allow public insert on sessions" ON sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on sessions" ON sessions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on sessions" ON sessions FOR DELETE USING (true);

CREATE POLICY "Allow public read on attendances" ON attendances FOR SELECT USING (true);
CREATE POLICY "Allow public insert on attendances" ON attendances FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on attendances" ON attendances FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on attendances" ON attendances FOR DELETE USING (true);

CREATE POLICY "Allow public read on payments" ON payments FOR SELECT USING (true);
CREATE POLICY "Allow public insert on payments" ON payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on payments" ON payments FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on payments" ON payments FOR DELETE USING (true);

-- Sample data (optional - uncomment to add test players)
/*
INSERT INTO players (name, role, group_id) VALUES
  ('Akib', 'Treasurer', 1),
  ('Hozaifa', 'Leader', 1),
  ('Player 1', 'Member', 1),
  ('Player 2', 'Member', 1),
  ('Leader 2', 'Leader', 2),
  ('Player 3', 'Member', 2),
  ('Player 4', 'Member', 2);
*/
