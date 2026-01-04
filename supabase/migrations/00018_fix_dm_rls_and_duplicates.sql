-- Fix DM RLS recursion and deduplicate conversation listing.

-- ============================================
-- RLS POLICY FIXES (avoid self-recursion)
-- ============================================

-- dm_participants: only allow selecting own row (admins can see all).
DROP POLICY IF EXISTS "DM participants are viewable by participants" ON dm_participants;
CREATE POLICY "DM participants are viewable by participants"
  ON dm_participants FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

-- dm_conversations: can be selected if user has a participant row.
DROP POLICY IF EXISTS "DM conversations are viewable by participants" ON dm_conversations;
CREATE POLICY "DM conversations are viewable by participants"
  ON dm_conversations FOR SELECT
  USING (EXISTS (
    SELECT 1
    FROM dm_participants p
    WHERE p.conversation_id = dm_conversations.id
      AND p.user_id = auth.uid()
  ));

-- dm_messages: same membership check; dm_participants policy allows selecting own row so this won't recurse.
DROP POLICY IF EXISTS "DM messages are viewable by participants" ON dm_messages;
CREATE POLICY "DM messages are viewable by participants"
  ON dm_messages FOR SELECT
  USING (EXISTS (
    SELECT 1
    FROM dm_participants p
    WHERE p.conversation_id = dm_messages.conversation_id
      AND p.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "DM messages can be sent by participants" ON dm_messages;
CREATE POLICY "DM messages can be sent by participants"
  ON dm_messages FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND sender_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM dm_participants p
      WHERE p.conversation_id = dm_messages.conversation_id
        AND p.user_id = auth.uid()
    )
  );

-- ============================================
-- RPC FIX: dedupe by other user
-- ============================================

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
  SELECT DISTINCT ON (op.user_id)
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
  ORDER BY op.user_id, COALESCE(lm.created_at, c.updated_at) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_my_dm_conversations() TO authenticated;

