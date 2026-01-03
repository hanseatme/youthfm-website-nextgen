-- Profile setting for listening minutes visibility
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS listening_minutes_visible BOOLEAN DEFAULT TRUE NOT NULL;

-- Remove duplicate feedback before adding unique constraint
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY user_id, song_id ORDER BY created_at DESC) AS rn
  FROM song_feedback
)
DELETE FROM song_feedback
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Ensure a user can rate a song only once
ALTER TABLE song_feedback
  ADD CONSTRAINT song_feedback_unique_user_song UNIQUE (user_id, song_id);
