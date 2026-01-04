-- Funkbuch upgrades: multi-cards per day + postcard styling + mood properties

-- 1) Table changes
ALTER TABLE vibe_postcards
  ADD COLUMN IF NOT EXISTS slot SMALLINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS energy_level INTEGER NULL,
  ADD COLUMN IF NOT EXISTS situation TEXT NULL,
  ADD COLUMN IF NOT EXISTS style JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Relax reaction: Funkbuch is not a rating system anymore (keep column for compatibility)
ALTER TABLE vibe_postcards ALTER COLUMN reaction DROP NOT NULL;
ALTER TABLE vibe_postcards DROP CONSTRAINT IF EXISTS vibe_postcards_reaction_check;
ALTER TABLE vibe_postcards
  ADD CONSTRAINT vibe_postcards_reaction_check CHECK (reaction IS NULL OR reaction BETWEEN 1 AND 5);

ALTER TABLE vibe_postcards DROP CONSTRAINT IF EXISTS vibe_postcards_slot_check;
ALTER TABLE vibe_postcards
  ADD CONSTRAINT vibe_postcards_slot_check CHECK (slot BETWEEN 1 AND 10);

ALTER TABLE vibe_postcards DROP CONSTRAINT IF EXISTS vibe_postcards_energy_level_check;
ALTER TABLE vibe_postcards
  ADD CONSTRAINT vibe_postcards_energy_level_check CHECK (energy_level IS NULL OR energy_level BETWEEN 1 AND 10);

ALTER TABLE vibe_postcards DROP CONSTRAINT IF EXISTS vibe_postcards_situation_check;
ALTER TABLE vibe_postcards
  ADD CONSTRAINT vibe_postcards_situation_check CHECK (situation IS NULL OR char_length(situation) <= 60);

-- Replace old uniqueness (1/day) with slot-based uniqueness (ignore deleted rows so slots can be reused)
ALTER TABLE vibe_postcards DROP CONSTRAINT IF EXISTS vibe_postcards_user_id_date_key;

DROP INDEX IF EXISTS vibe_postcards_unique_user_date_slot;
CREATE UNIQUE INDEX vibe_postcards_unique_user_date_slot
  ON vibe_postcards(user_id, date, slot)
  WHERE status <> 'deleted';

CREATE INDEX IF NOT EXISTS idx_vibe_postcards_date_slot ON vibe_postcards(date DESC, slot, created_at DESC);

-- 2) App setting (used by RPC)
INSERT INTO app_settings (key, value, description)
VALUES ('funkbook_max_cards_per_day', '2'::jsonb, 'Max Funkbuch cards a user can create per day')
ON CONFLICT (key) DO NOTHING;

-- 3) RPC: create/update postcard with daily limit
DROP FUNCTION IF EXISTS create_vibe_postcard(INTEGER, DATE, TEXT, TEXT[], TEXT[], TEXT, UUID, INTEGER);

CREATE OR REPLACE FUNCTION create_vibe_postcard(
  p_postcard_id UUID DEFAULT NULL,
  p_date DATE DEFAULT CURRENT_DATE,
  p_note TEXT DEFAULT '',
  p_mood_tags TEXT[] DEFAULT NULL,
  p_activity_tags TEXT[] DEFAULT NULL,
  p_energy_level INTEGER DEFAULT NULL,
  p_situation TEXT DEFAULT NULL,
  p_visibility TEXT DEFAULT 'public',
  p_song_id UUID DEFAULT NULL,
  p_track_id INTEGER DEFAULT NULL,
  p_style JSONB DEFAULT '{}'::jsonb
)
RETURNS vibe_postcards AS $$
DECLARE
  row_record vibe_postcards%ROWTYPE;
  resolved_song_id UUID;
  max_cards INTEGER := 2;
  existing_count INTEGER := 0;
  next_slot SMALLINT := 1;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Read per-day limit from app_settings (fallback: 2)
  SELECT COALESCE((
    SELECT CASE
      WHEN jsonb_typeof(value) = 'number' THEN (value::text)::int
      WHEN jsonb_typeof(value) = 'string' THEN NULLIF(trim(both '"' from value::text), '')::int
      ELSE NULL
    END
    FROM app_settings
    WHERE key = 'funkbook_max_cards_per_day'
    LIMIT 1
  ), 2) INTO max_cards;

  resolved_song_id := p_song_id;
  IF resolved_song_id IS NULL AND p_track_id IS NOT NULL THEN
    SELECT s.id INTO resolved_song_id FROM songs s WHERE s.track_id = p_track_id LIMIT 1;
  END IF;

  -- Update existing postcard
  IF p_postcard_id IS NOT NULL THEN
    SELECT * INTO row_record
    FROM vibe_postcards
    WHERE id = p_postcard_id AND user_id = auth.uid()
    LIMIT 1;

    IF row_record.id IS NULL OR row_record.status = 'deleted' THEN
      RAISE EXCEPTION 'Postcard not found';
    END IF;

    UPDATE vibe_postcards
    SET
      song_id = resolved_song_id,
      mood_tags = p_mood_tags,
      activity_tags = p_activity_tags,
      energy_level = p_energy_level,
      situation = p_situation,
      note = LEFT(COALESCE(p_note, ''), 120),
      visibility = COALESCE(p_visibility, visibility),
      style = COALESCE(p_style, style),
      status = 'active'
    WHERE id = row_record.id
    RETURNING * INTO row_record;

    RETURN row_record;
  END IF;

  -- Create new postcard (find free slot)
  SELECT COUNT(*) INTO existing_count
  FROM vibe_postcards
  WHERE user_id = auth.uid() AND date = p_date AND status <> 'deleted';

  IF existing_count >= max_cards THEN
    RAISE EXCEPTION 'Daily postcard limit reached (% cards)', max_cards USING ERRCODE = 'P0001';
  END IF;

  SELECT gs::smallint INTO next_slot
  FROM generate_series(1, max_cards) gs
  LEFT JOIN vibe_postcards vp
    ON vp.user_id = auth.uid()
    AND vp.date = p_date
    AND vp.status <> 'deleted'
    AND vp.slot = gs
  WHERE vp.id IS NULL
  ORDER BY gs ASC
  LIMIT 1;

  IF next_slot IS NULL THEN
    next_slot := 1;
  END IF;

  INSERT INTO vibe_postcards (
    user_id,
    date,
    slot,
    song_id,
    reaction,
    mood_tags,
    activity_tags,
    energy_level,
    situation,
    note,
    visibility,
    style,
    status
  )
  VALUES (
    auth.uid(),
    p_date,
    next_slot,
    resolved_song_id,
    NULL,
    p_mood_tags,
    p_activity_tags,
    p_energy_level,
    p_situation,
    LEFT(COALESCE(p_note, ''), 120),
    COALESCE(p_visibility, 'public'),
    COALESCE(p_style, '{}'::jsonb),
    'active'
  )
  RETURNING * INTO row_record;

  -- Reward only on the first postcard of the day
  IF existing_count = 0 THEN
    PERFORM add_vibes(auth.uid(), 5, 'Funkbuch: Postkarte', 'vibe_postcard', row_record.id);
  END IF;

  -- Activity feed: one entry per card (public only if the card is public)
  INSERT INTO activity_feed (user_id, event_type, event_data, is_public)
  VALUES (
    auth.uid(),
    'vibe_postcard',
    jsonb_build_object(
      'postcard_id', row_record.id,
      'date', row_record.date,
      'slot', row_record.slot,
      'note', LEFT(row_record.note, 120),
      'mood_tags', row_record.mood_tags,
      'activity_tags', row_record.activity_tags,
      'energy_level', row_record.energy_level,
      'situation', row_record.situation,
      'song_id', row_record.song_id
    ),
    row_record.visibility = 'public'
  );

  RETURN row_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_vibe_postcard(
  UUID, DATE, TEXT, TEXT[], TEXT[], INTEGER, TEXT, TEXT, UUID, INTEGER, JSONB
) TO authenticated;

