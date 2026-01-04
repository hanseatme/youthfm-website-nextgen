-- Legal documents, private profile fields, immutable usernames, and direct messages.

-- ============================================
-- LEGAL DOCUMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS legal_documents (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Legal documents are viewable" ON legal_documents;
CREATE POLICY "Legal documents are viewable"
  ON legal_documents FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Admins can manage legal documents" ON legal_documents;
CREATE POLICY "Admins can manage legal documents"
  ON legal_documents FOR ALL
  USING (is_admin());

INSERT INTO legal_documents (slug, title, content)
VALUES
  ('privacy', 'Datenschutz', ''),
  ('terms', 'Nutzungsbedingungen', '')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- PRIVATE PROFILE DATA (NOT PUBLIC)
-- ============================================

CREATE TABLE IF NOT EXISTS profile_private (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  first_name TEXT,
  accepted_terms_at TIMESTAMPTZ,
  accepted_privacy_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE profile_private ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own private profile" ON profile_private;
CREATE POLICY "Users can view own private profile"
  ON profile_private FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Users can upsert own private profile" ON profile_private;
CREATE POLICY "Users can upsert own private profile"
  ON profile_private FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own private profile" ON profile_private;
CREATE POLICY "Users can update own private profile"
  ON profile_private FOR UPDATE
  USING (user_id = auth.uid() OR is_admin())
  WITH CHECK (user_id = auth.uid() OR is_admin());

DROP TRIGGER IF EXISTS profile_private_updated_at ON profile_private;
CREATE TRIGGER profile_private_updated_at
  BEFORE UPDATE ON profile_private
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- IMMUTABLE USERNAMES (ONE-TIME SET)
-- ============================================

CREATE OR REPLACE FUNCTION prevent_username_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.username IS DISTINCT FROM OLD.username THEN
    -- allow first-time set only (null -> non-null)
    IF OLD.username IS NULL AND NEW.username IS NOT NULL THEN
      RETURN NEW;
    END IF;

    IF NOT is_admin() THEN
      RAISE EXCEPTION 'Username cannot be changed';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS profiles_prevent_username_change ON profiles;
CREATE TRIGGER profiles_prevent_username_change
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_username_change();

-- ============================================
-- UPDATE NEW USER HANDLER (USERNAME + PRIVATE DATA)
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  meta_username TEXT;
  meta_display TEXT;
  meta_first_name TEXT;
  meta_terms BOOLEAN;
  meta_privacy BOOLEAN;
BEGIN
  meta_username := NULLIF(NEW.raw_user_meta_data->>'username', '');
  meta_display := NULLIF(NEW.raw_user_meta_data->>'display_name', '');
  meta_first_name := NULLIF(NEW.raw_user_meta_data->>'first_name', '');
  meta_terms := COALESCE((NEW.raw_user_meta_data->>'accepted_terms')::boolean, FALSE);
  meta_privacy := COALESCE((NEW.raw_user_meta_data->>'accepted_privacy')::boolean, FALSE);

  INSERT INTO profiles (id, username, display_name, avatar_id)
  VALUES (
    NEW.id,
    meta_username,
    COALESCE(meta_display, split_part(NEW.email, '@', 1)),
    1
  );

  INSERT INTO profile_private (user_id, first_name, accepted_terms_at, accepted_privacy_at)
  VALUES (
    NEW.id,
    meta_first_name,
    CASE WHEN meta_terms THEN NOW() ELSE NULL END,
    CASE WHEN meta_privacy THEN NOW() ELSE NULL END
  )
  ON CONFLICT (user_id) DO UPDATE
  SET first_name = EXCLUDED.first_name,
      accepted_terms_at = COALESCE(profile_private.accepted_terms_at, EXCLUDED.accepted_terms_at),
      accepted_privacy_at = COALESCE(profile_private.accepted_privacy_at, EXCLUDED.accepted_privacy_at),
      updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- DIRECT MESSAGES
-- ============================================

CREATE TABLE IF NOT EXISTS dm_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS dm_participants (
  conversation_id UUID NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS dm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  status message_status DEFAULT 'active' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dm_participants_user ON dm_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_dm_messages_conversation_created ON dm_messages(conversation_id, created_at DESC);

ALTER TABLE dm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "DM conversations are viewable by participants" ON dm_conversations;
CREATE POLICY "DM conversations are viewable by participants"
  ON dm_conversations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM dm_participants p
    WHERE p.conversation_id = dm_conversations.id AND p.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "DM participants are viewable by participants" ON dm_participants;
CREATE POLICY "DM participants are viewable by participants"
  ON dm_participants FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM dm_participants me
    WHERE me.conversation_id = dm_participants.conversation_id AND me.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "DM messages are viewable by participants" ON dm_messages;
CREATE POLICY "DM messages are viewable by participants"
  ON dm_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM dm_participants p
    WHERE p.conversation_id = dm_messages.conversation_id AND p.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "DM messages can be sent by participants" ON dm_messages;
CREATE POLICY "DM messages can be sent by participants"
  ON dm_messages FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM dm_participants p
      WHERE p.conversation_id = dm_messages.conversation_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "DM messages can be updated by sender/admin" ON dm_messages;
CREATE POLICY "DM messages can be updated by sender/admin"
  ON dm_messages FOR UPDATE
  USING (sender_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "DM messages can be deleted by sender/admin" ON dm_messages;
CREATE POLICY "DM messages can be deleted by sender/admin"
  ON dm_messages FOR DELETE
  USING (sender_id = auth.uid() OR is_admin());

DROP TRIGGER IF EXISTS dm_conversations_updated_at ON dm_conversations;
CREATE TRIGGER dm_conversations_updated_at
  BEFORE UPDATE ON dm_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION touch_dm_conversation()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE dm_conversations SET updated_at = NOW() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS dm_messages_touch_conversation ON dm_messages;
CREATE TRIGGER dm_messages_touch_conversation
  AFTER INSERT ON dm_messages
  FOR EACH ROW
  EXECUTE FUNCTION touch_dm_conversation();

CREATE OR REPLACE FUNCTION get_or_create_dm_conversation(p_other_user_id UUID)
RETURNS UUID AS $$
DECLARE
  my_id UUID := auth.uid();
  existing_id UUID;
  new_id UUID;
BEGIN
  IF my_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF p_other_user_id IS NULL OR p_other_user_id = my_id THEN
    RAISE EXCEPTION 'Invalid other user';
  END IF;

  SELECT c.id INTO existing_id
  FROM dm_conversations c
  JOIN dm_participants a ON a.conversation_id = c.id AND a.user_id = my_id
  JOIN dm_participants b ON b.conversation_id = c.id AND b.user_id = p_other_user_id
  WHERE (
    SELECT COUNT(*) FROM dm_participants p WHERE p.conversation_id = c.id
  ) = 2
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    RETURN existing_id;
  END IF;

  INSERT INTO dm_conversations DEFAULT VALUES RETURNING id INTO new_id;
  INSERT INTO dm_participants (conversation_id, user_id) VALUES (new_id, my_id);
  INSERT INTO dm_participants (conversation_id, user_id) VALUES (new_id, p_other_user_id);

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_my_dm_conversations()
RETURNS TABLE (
  conversation_id UUID,
  other_user_id UUID,
  other_username TEXT,
  other_display_name TEXT,
  other_avatar_id INTEGER,
  last_message TEXT,
  last_message_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id as conversation_id,
    other.id as other_user_id,
    other.username as other_username,
    COALESCE(other.display_name, 'User') as other_display_name,
    other.avatar_id as other_avatar_id,
    lm.content as last_message,
    lm.created_at as last_message_at
  FROM dm_conversations c
  JOIN dm_participants me ON me.conversation_id = c.id AND me.user_id = auth.uid()
  JOIN dm_participants op ON op.conversation_id = c.id AND op.user_id <> auth.uid()
  JOIN profiles other ON other.id = op.user_id
  LEFT JOIN LATERAL (
    SELECT m.content, m.created_at
    FROM dm_messages m
    WHERE m.conversation_id = c.id AND m.status = 'active'
    ORDER BY m.created_at DESC
    LIMIT 1
  ) lm ON TRUE
  ORDER BY COALESCE(lm.created_at, c.updated_at) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

