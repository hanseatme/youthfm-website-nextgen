-- Add free text options for duels
ALTER TYPE duel_type ADD VALUE IF NOT EXISTS 'text';

ALTER TABLE duels
  ADD COLUMN IF NOT EXISTS prompt TEXT,
  ADD COLUMN IF NOT EXISTS option_a_text TEXT,
  ADD COLUMN IF NOT EXISTS option_b_text TEXT;

ALTER TABLE duels
  ALTER COLUMN song_a_id DROP NOT NULL,
  ALTER COLUMN song_b_id DROP NOT NULL;

ALTER TABLE duels DROP CONSTRAINT IF EXISTS different_songs;

ALTER TABLE duels
  ADD CONSTRAINT duel_options_check CHECK (
    (
      song_a_id IS NOT NULL
      AND song_b_id IS NOT NULL
      AND song_a_id <> song_b_id
    )
    OR (
      option_a_text IS NOT NULL
      AND option_b_text IS NOT NULL
    )
  );

CREATE OR REPLACE FUNCTION end_duel(p_duel_id UUID)
RETURNS UUID AS $$
DECLARE
    duel_record RECORD;
    winner UUID;
BEGIN
    SELECT * INTO duel_record FROM duels WHERE id = p_duel_id;

    IF duel_record.song_a_id IS NOT NULL AND duel_record.song_b_id IS NOT NULL THEN
        IF duel_record.votes_a > duel_record.votes_b THEN
            winner := duel_record.song_a_id;
        ELSIF duel_record.votes_b > duel_record.votes_a THEN
            winner := duel_record.song_b_id;
        ELSE
            winner := CASE WHEN random() < 0.5 THEN duel_record.song_a_id ELSE duel_record.song_b_id END;
        END IF;
    ELSE
        winner := NULL;
    END IF;

    UPDATE duels
    SET status = 'completed',
        ended_at = NOW(),
        winner_id = winner
    WHERE id = p_duel_id;

    IF winner IS NOT NULL THEN
        UPDATE profiles p
        SET vibes_available = vibes_available + 10,
            vibes_total = vibes_total + 10
        FROM duel_votes dv
        WHERE dv.user_id = p.id
          AND dv.duel_id = p_duel_id
          AND ((dv.voted_for = 'a' AND duel_record.song_a_id = winner)
               OR (dv.voted_for = 'b' AND duel_record.song_b_id = winner));
    END IF;

    RETURN winner;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
