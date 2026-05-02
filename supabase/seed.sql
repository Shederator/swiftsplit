-- ═══════════════════════════════════════════════════════════════
--  HisabX — Seed Data (Optional — run after schema.sql)
--  Creates a demo user "rahul" with sample groups & expenses
-- ═══════════════════════════════════════════════════════════════

-- Demo user (username: rahul, password: rahul123)
INSERT INTO users (id, username, password, name, upi_id) VALUES
  ('user_self', 'rahul', 'rahul123', 'Rahul', 'rahul@okaxis')
ON CONFLICT (id) DO NOTHING;

-- Members
INSERT INTO members (id, name, avatar_pref, upi_id) VALUES
  ('user_self', 'Rahul', NULL, 'rahul@okaxis'),
  ('m1', 'Aakash S', '{"type":"animated","paletteIdx":1}', 'aakash@ybl'),
  ('m2', 'Priya M', '{"type":"animated","paletteIdx":2}', 'priya@ibl'),
  ('m3', 'Neha S', '{"type":"animated","paletteIdx":3}', 'neha@okicici'),
  ('m4', 'Vikram R', '{"type":"animated","paletteIdx":4}', 'vikram@okaxis'),
  ('m5', 'Sneha K', '{"type":"animated","paletteIdx":5}', 'sneha@ybl')
ON CONFLICT (id) DO NOTHING;

-- Groups
INSERT INTO groups (id, name, icon, created_at, last_active) VALUES
  ('g1', 'Goa Trip',        'flight_takeoff', '2026-04-25T10:00:00Z', '2026-05-01T13:30:00Z'),
  ('g2', 'Flatmates',       'home',           '2026-03-01T10:00:00Z', '2026-05-01T08:00:00Z'),
  ('g3', 'Weekend Dinner',  'restaurant',     '2026-04-28T19:00:00Z', '2026-04-28T22:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- Group Members
INSERT INTO group_members (group_id, member_id) VALUES
  ('g1','user_self'), ('g1','m1'), ('g1','m2'), ('g1','m3'), ('g1','m4'),
  ('g2','user_self'), ('g2','m2'), ('g2','m5'),
  ('g3','user_self'), ('g3','m1')
ON CONFLICT DO NOTHING;

-- Expenses
INSERT INTO expenses (id, group_id, amount, description, category, paid_by, split_method, split_data, date) VALUES
  ('e1',  'g1', 8500,  'Flight tickets',           'travel',        'user_self', 'equal', '{}', '2026-04-25T09:00:00Z'),
  ('e2',  'g1', 600,   'Uber from Airport',         'transport',     'm1',        'equal', '{}', '2026-04-26T10:45:00Z'),
  ('e3',  'g1', 1200,  'Dinner at Fishermans Wharf', 'food',          'user_self', 'equal', '{}', '2026-04-26T20:30:00Z'),
  ('e4',  'g1', 3500,  'Hotel stay - 2 nights',     'rent',          'm3',        'equal', '{}', '2026-04-26T14:00:00Z'),
  ('e5',  'g1', 900,   'Water sports',              'entertainment', 'm4',        'equal', '{}', '2026-04-27T11:00:00Z'),
  ('e6',  'g2', 15000, 'May Rent',                  'rent',          'm2',        'equal', '{}', '2026-05-01T08:00:00Z'),
  ('e7',  'g2', 2400,  'Electricity Bill',          'other',         'user_self', 'equal', '{}', '2026-04-28T15:00:00Z'),
  ('e8',  'g2', 800,   'WiFi Recharge',             'other',         'm5',        'equal', '{}', '2026-04-27T12:00:00Z'),
  ('e9',  'g3', 2800,  'Dinner at Taj',             'food',          'm1',        'equal', '{}', '2026-04-28T20:00:00Z'),
  ('e10', 'g3', 500,   'Desserts',                  'food',          'user_self', 'equal', '{}', '2026-04-28T21:30:00Z')
ON CONFLICT (id) DO NOTHING;

-- Expense Splits
INSERT INTO expense_splits (expense_id, member_id) VALUES
  ('e1','user_self'), ('e1','m1'), ('e1','m2'), ('e1','m3'), ('e1','m4'),
  ('e2','user_self'), ('e2','m1'), ('e2','m2'),
  ('e3','user_self'), ('e3','m1'), ('e3','m2'),
  ('e4','user_self'), ('e4','m1'), ('e4','m2'), ('e4','m3'), ('e4','m4'),
  ('e5','user_self'), ('e5','m1'), ('e5','m4'),
  ('e6','user_self'), ('e6','m2'), ('e6','m5'),
  ('e7','user_self'), ('e7','m2'), ('e7','m5'),
  ('e8','user_self'), ('e8','m2'), ('e8','m5'),
  ('e9','user_self'), ('e9','m1'),
  ('e10','user_self'), ('e10','m1')
ON CONFLICT DO NOTHING;

-- Settlements
INSERT INTO settlements (id, from_member, to_member, amount, group_id, date) VALUES
  ('s1', 'm1', 'user_self', 500, 'g1', '2026-04-28T10:00:00Z')
ON CONFLICT (id) DO NOTHING;
