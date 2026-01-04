-- Funkbuch / Vibe Postcards (MVP)

CREATE TABLE IF NOT EXISTS vibe_postcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  song_id UUID REFERENCES songs(id) ON DELETE SET NULL,
  reaction INTEGER NOT NULL CHECK (reaction BETWEEN 1 AND 5),
  mood_tags TEXT[] NULL,
  activity_tags TEXT[] NULL,
  note TEXT NOT NULL DEFAULT '' CHECK (char_length(note) <= 120),
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'followers', 'private')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'flagged', 'hidden', 'deleted')),
  reactions_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_vibe_postcards_date ON vibe_postcards(date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vibe_postcards_user ON vibe_postcards(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_vibe_postcards_public ON vibe_postcards(date DESC, created_at DESC) WHERE status = 'active' AND visibility = 'public';

DROP TRIGGER IF EXISTS vibe_postcards_updated_at ON vibe_postcards;
CREATE TRIGGER vibe_postcards_updated_at
  BEFORE UPDATE ON vibe_postcards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS postcard_reactions (
  postcard_id UUID NOT NULL REFERENCES vibe_postcards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL DEFAULT 'spark' CHECK (reaction_type IN ('spark')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (postcard_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_postcard_reactions_postcard ON postcard_reactions(postcard_id);
CREATE INDEX IF NOT EXISTS idx_postcard_reactions_user ON postcard_reactions(user_id);

CREATE OR REPLACE FUNCTION update_postcard_reactions_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE vibe_postcards SET reactions_count = reactions_count + 1 WHERE id = NEW.postcard_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE vibe_postcards SET reactions_count = GREATEST(reactions_count - 1, 0) WHERE id = OLD.postcard_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS postcard_reactions_count_insert ON postcard_reactions;
CREATE TRIGGER postcard_reactions_count_insert
  AFTER INSERT ON postcard_reactions
  FOR EACH ROW
  EXECUTE FUNCTION update_postcard_reactions_count();

DROP TRIGGER IF EXISTS postcard_reactions_count_delete ON postcard_reactions;
CREATE TRIGGER postcard_reactions_count_delete
  AFTER DELETE ON postcard_reactions
  FOR EACH ROW
  EXECUTE FUNCTION update_postcard_reactions_count();

CREATE TABLE IF NOT EXISTS postcard_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  postcard_id UUID NOT NULL REFERENCES vibe_postcards(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL DEFAULT '' CHECK (char_length(reason) <= 200),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(postcard_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS idx_postcard_reports_created ON postcard_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_postcard_reports_postcard ON postcard_reports(postcard_id);

ALTER TABLE vibe_postcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE postcard_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE postcard_reports ENABLE ROW LEVEL SECURITY;

-- vibe_postcards SELECT
DROP POLICY IF EXISTS "Vibe postcards are viewable by owner" ON vibe_postcards;
CREATE POLICY "Vibe postcards are viewable by owner"
  ON vibe_postcards FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public vibe postcards are viewable" ON vibe_postcards;
CREATE POLICY "Public vibe postcards are viewable"
  ON vibe_postcards FOR SELECT
  USING (status = 'active' AND visibility = 'public');

DROP POLICY IF EXISTS "Follower vibe postcards are viewable" ON vibe_postcards;
CREATE POLICY "Follower vibe postcards are viewable"
  ON vibe_postcards FOR SELECT
  USING (
    status = 'active'
    AND visibility = 'followers'
    AND EXISTS (
      SELECT 1 FROM followers f
      WHERE f.follower_id = auth.uid() AND f.following_id = vibe_postcards.user_id
    )
  );

DROP POLICY IF EXISTS "Admins can view all vibe postcards" ON vibe_postcards;
CREATE POLICY "Admins can view all vibe postcards"
  ON vibe_postcards FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE));

-- vibe_postcards write
DROP POLICY IF EXISTS "Users can create their vibe postcard" ON vibe_postcards;
CREATE POLICY "Users can create their vibe postcard"
  ON vibe_postcards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their vibe postcard" ON vibe_postcards;
CREATE POLICY "Users can update their vibe postcard"
  ON vibe_postcards FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their vibe postcard" ON vibe_postcards;
CREATE POLICY "Users can delete their vibe postcard"
  ON vibe_postcards FOR DELETE
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE));

-- postcard_reactions
DROP POLICY IF EXISTS "Postcard reactions are viewable for viewable postcards" ON postcard_reactions;
CREATE POLICY "Postcard reactions are viewable for viewable postcards"
  ON postcard_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM vibe_postcards vp
      WHERE vp.id = postcard_reactions.postcard_id
        AND (
          vp.user_id = auth.uid()
          OR (vp.status = 'active' AND vp.visibility = 'public')
          OR (
            vp.status = 'active'
            AND vp.visibility = 'followers'
            AND EXISTS (
              SELECT 1 FROM followers f
              WHERE f.follower_id = auth.uid() AND f.following_id = vp.user_id
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "Users can react to postcards" ON postcard_reactions;
CREATE POLICY "Users can react to postcards"
  ON postcard_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove their postcard reaction" ON postcard_reactions;
CREATE POLICY "Users can remove their postcard reaction"
  ON postcard_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- postcard_reports
DROP POLICY IF EXISTS "Users can report postcards" ON postcard_reports;
CREATE POLICY "Users can report postcards"
  ON postcard_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Reporters can view own reports" ON postcard_reports;
CREATE POLICY "Reporters can view own reports"
  ON postcard_reports FOR SELECT
  USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Admins can view all postcard reports" ON postcard_reports;
CREATE POLICY "Admins can view all postcard reports"
  ON postcard_reports FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE));

-- RPC: create/update today's postcard (reward only on first create)
CREATE OR REPLACE FUNCTION create_vibe_postcard(
  p_reaction INTEGER,
  p_date DATE DEFAULT CURRENT_DATE,
  p_note TEXT DEFAULT '',
  p_mood_tags TEXT[] DEFAULT NULL,
  p_activity_tags TEXT[] DEFAULT NULL,
  p_visibility TEXT DEFAULT 'public',
  p_song_id UUID DEFAULT NULL,
  p_track_id INTEGER DEFAULT NULL
)
RETURNS vibe_postcards AS $$
DECLARE
  row_record vibe_postcards%ROWTYPE;
  resolved_song_id UUID;
  is_new BOOLEAN := FALSE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  resolved_song_id := p_song_id;
  IF resolved_song_id IS NULL AND p_track_id IS NOT NULL THEN
    SELECT s.id INTO resolved_song_id FROM songs s WHERE s.track_id = p_track_id LIMIT 1;
  END IF;

  SELECT * INTO row_record
  FROM vibe_postcards
  WHERE user_id = auth.uid() AND date = p_date
  LIMIT 1;

  IF row_record.id IS NULL THEN
    is_new := TRUE;
    INSERT INTO vibe_postcards (
      user_id, date, song_id, reaction, mood_tags, activity_tags, note, visibility, status
    )
    VALUES (
      auth.uid(), p_date, resolved_song_id, p_reaction, p_mood_tags, p_activity_tags, COALESCE(p_note, ''), COALESCE(p_visibility, 'public'), 'active'
    )
    RETURNING * INTO row_record;
  ELSE
    UPDATE vibe_postcards
    SET
      song_id = resolved_song_id,
      reaction = p_reaction,
      mood_tags = p_mood_tags,
      activity_tags = p_activity_tags,
      note = COALESCE(p_note, ''),
      visibility = COALESCE(p_visibility, visibility),
      status = 'active'
    WHERE id = row_record.id
    RETURNING * INTO row_record;
  END IF;

  IF is_new THEN
    PERFORM add_vibes(auth.uid(), 5, 'Funkbuch: Postkarte', 'vibe_postcard', row_record.id);
    INSERT INTO activity_feed (user_id, event_type, event_data, is_public)
    VALUES (
      auth.uid(),
      'vibe_postcard',
      jsonb_build_object(
        'postcard_id', row_record.id,
        'reaction', row_record.reaction,
        'note', LEFT(row_record.note, 120),
        'date', row_record.date
      ),
      row_record.visibility = 'public'
    );
  END IF;

  RETURN row_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_vibe_postcard(
  INTEGER, DATE, TEXT, TEXT[], TEXT[], TEXT, UUID, INTEGER
) TO authenticated;

CREATE OR REPLACE FUNCTION toggle_postcard_reaction(p_postcard_id UUID)
RETURNS INTEGER AS $$
DECLARE
  exists_now BOOLEAN;
  next_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM postcard_reactions pr
    WHERE pr.postcard_id = p_postcard_id AND pr.user_id = auth.uid()
  ) INTO exists_now;

  IF exists_now THEN
    DELETE FROM postcard_reactions
    WHERE postcard_id = p_postcard_id AND user_id = auth.uid();
  ELSE
    INSERT INTO postcard_reactions (postcard_id, user_id, reaction_type)
    VALUES (p_postcard_id, auth.uid(), 'spark')
    ON CONFLICT (postcard_id, user_id) DO NOTHING;
  END IF;

  SELECT reactions_count INTO next_count FROM vibe_postcards WHERE id = p_postcard_id;
  RETURN COALESCE(next_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION toggle_postcard_reaction(UUID) TO authenticated;
