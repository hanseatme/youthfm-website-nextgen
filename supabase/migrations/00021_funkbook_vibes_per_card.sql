-- Funkbuch: reward vibes per created card (admin-controlled)

-- 1) Setting (default: 5)
INSERT INTO app_settings (key, value, description)
VALUES ('funkbook_vibes_per_card', '5'::jsonb, 'Vibes rewarded per Funkbuch card')
ON CONFLICT (key) DO NOTHING;

-- 2) Update RPC: read setting + reward per created card (capped by daily max)
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
  vibes_per_card INTEGER := 5;
  rewarded_count INTEGER := 0;
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

  -- Read vibes per card from app_settings (fallback: 5)
  SELECT COALESCE((
    SELECT CASE
      WHEN jsonb_typeof(value) = 'number' THEN (value::text)::int
      WHEN jsonb_typeof(value) = 'string' THEN NULLIF(trim(both '"' from value::text), '')::int
      ELSE NULL
    END
    FROM app_settings
    WHERE key = 'funkbook_vibes_per_card'
    LIMIT 1
  ), 5) INTO vibes_per_card;

  IF vibes_per_card < 0 THEN
    vibes_per_card := 0;
  END IF;

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

  -- Reward per postcard (capped by daily max, so deleting/recreating can't farm)
  IF vibes_per_card > 0 THEN
    SELECT COUNT(*) INTO rewarded_count
    FROM vibes_transactions
    WHERE user_id = auth.uid()
      AND reference_type = 'vibe_postcard'
      AND created_at::date = p_date
      AND amount > 0;

    IF rewarded_count < max_cards THEN
      PERFORM add_vibes(auth.uid(), vibes_per_card, 'Funkbuch: Postkarte', 'vibe_postcard', row_record.id);
    END IF;
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
