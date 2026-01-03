-- Fix upsert conflict target for songs.track_id
-- PostgREST upsert uses `on_conflict=track_id` (no WHERE clause),
-- so we need a non-partial unique constraint/index on track_id.

DROP INDEX IF EXISTS idx_songs_track_id_unique;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'songs_track_id_unique'
  ) THEN
    ALTER TABLE songs
      ADD CONSTRAINT songs_track_id_unique UNIQUE (track_id);
  END IF;
END $$;

