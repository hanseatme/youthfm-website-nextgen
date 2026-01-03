-- Shop entitlements and avatar tiers

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS skip_credits INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS song_request_pool_credits INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS dedication_credits INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS badge_showcase_slots INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS avatar_tier TEXT DEFAULT 'standard' NOT NULL,
  ADD COLUMN IF NOT EXISTS banner_unlocked BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS badges_showcase UUID[] DEFAULT '{}'::UUID[] NOT NULL;

ALTER TABLE avatars
  ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'standard' NOT NULL;

-- VIP badge (awarded via shop purchase)
INSERT INTO badges (slug, name, name_en, description, description_en, icon, category, condition_type, condition_value, vibes_reward, is_active)
VALUES (
  'vip-badge',
  'VIP',
  'VIP',
  'VIP-Status durch Shop-Kauf',
  'VIP status via shop purchase',
  '⭐',
  'community',
  'manual',
  '{}'::jsonb,
  0,
  TRUE
)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    name_en = EXCLUDED.name_en,
    description = EXCLUDED.description,
    description_en = EXCLUDED.description_en,
    icon = EXCLUDED.icon,
    category = EXCLUDED.category,
    condition_type = EXCLUDED.condition_type,
    condition_value = EXCLUDED.condition_value,
    vibes_reward = EXCLUDED.vibes_reward,
    is_active = EXCLUDED.is_active;

-- Disable all shop items except the allowed set
UPDATE shop_items
SET is_available = FALSE
WHERE slug NOT IN (
  'song-skip',
  'streak-freeze',
  'avatar-set',
  'song-request-pool',
  'badge-showcase',
  'avatar-premium-set',
  'profile-banner',
  'daily-dedication',
  'vip-badge'
);

-- Upsert allowed shop items with metadata for entitlements
INSERT INTO shop_items (slug, name, name_en, description, description_en, category, cost_vibes, metadata, is_available, stock_limit)
VALUES
  ('song-skip', 'Song-Skip', 'Song Skip', 'Einmaliger Skip des aktuellen Songs', 'Skip the current song once', 'influence', 80, '{"type":"song_skip","repeatable":true,"amount":1}', TRUE, NULL),
  ('streak-freeze', 'Streak-Freeze', 'Streak Freeze', 'Ein Freeze fuer deine Streak', 'One freeze for your streak', 'status', 120, '{"type":"streak_freeze","repeatable":true,"amount":1}', TRUE, NULL),
  ('avatar-set', 'Avatar-Set', 'Avatar Set', 'Standard-Avatar-Set freischalten', 'Unlock standard avatar set', 'personalization', 75, '{"type":"avatar_set","repeatable":false,"tier":"standard"}', TRUE, NULL),
  ('song-request-pool', 'Song-Wunsch (Pool)', 'Song Request (Pool)', 'Dein Song landet im Kandidaten-Pool', 'Your song enters the candidate pool', 'influence', 100, '{"type":"song_request_pool","repeatable":true,"amount":1}', TRUE, NULL),
  ('badge-showcase', 'Badge-Showcase', 'Badge Showcase', 'Waehle 3 Badges fuer prominente Anzeige', 'Choose 3 badges for prominent display', 'personalization', 100, '{"type":"badge_showcase","repeatable":false,"slots":3}', TRUE, NULL),
  ('avatar-premium-set', 'Avatar Premium-Set', 'Avatar Premium Set', 'Premium-Avatare freischalten', 'Unlock premium avatars', 'personalization', 150, '{"type":"avatar_set","repeatable":false,"tier":"premium"}', TRUE, NULL),
  ('profile-banner', 'Profil-Banner', 'Profile Banner', 'Erlaube ein Profilbanner', 'Enable a profile banner', 'personalization', 150, '{"type":"profile_banner","repeatable":false}', TRUE, NULL),
  ('daily-dedication', 'Tages-Widmung', 'Daily Dedication', 'Eine persoenliche Widmung fuer heute', 'A personal dedication for today', 'extras', 250, '{"type":"daily_dedication","repeatable":true,"amount":1}', TRUE, NULL),
  ('vip-badge', 'VIP-Badge', 'VIP Badge', 'Exklusiver VIP-Status', 'Exclusive VIP status', 'status', 2000, '{"type":"vip_badge","repeatable":false}', TRUE, NULL)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    name_en = EXCLUDED.name_en,
    description = EXCLUDED.description,
    description_en = EXCLUDED.description_en,
    category = EXCLUDED.category,
    cost_vibes = EXCLUDED.cost_vibes,
    metadata = EXCLUDED.metadata,
    is_available = TRUE,
    stock_limit = EXCLUDED.stock_limit;
