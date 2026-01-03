-- ============================================
-- Streamserver music API + previews
-- ============================================

-- Public setting: base URL of the streamserver (used for music list + previews)
INSERT INTO app_settings (key, value, description)
VALUES ('streamserver_base_url', '"https://yfm.hanseat.me"', 'Base URL des Streamservers (Music API + Preview)')
ON CONFLICT (key) DO NOTHING;

-- Private settings (admin-only) for secrets like API keys
CREATE TABLE IF NOT EXISTS private_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE private_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'private_settings'
      AND policyname = 'Admins can manage private settings'
  ) THEN
    CREATE POLICY "Admins can manage private settings"
      ON private_settings FOR ALL
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END $$;

INSERT INTO private_settings (key, value, description)
VALUES ('streamserver_api_key', '""', 'API Key fuer /api/files/music auf dem Streamserver')
ON CONFLICT (key) DO NOTHING;

-- Songs: store streamserver track id + preview endpoint URL
ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS track_id INTEGER,
  ADD COLUMN IF NOT EXISTS preview_url TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_songs_track_id_unique
  ON songs(track_id)
  WHERE track_id IS NOT NULL;

-- Public RPC: increment preview play counter for charts/stats
CREATE OR REPLACE FUNCTION increment_song_preview_play(p_song_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE songs
  SET play_count = play_count + 1
  WHERE id = p_song_id;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_song_preview_play(UUID) TO anon, authenticated;

