-- Asteroids: allow host to always create a new room
-- If the host already has a room (lobby/running/vote/finished), it is removed when creating a new one.

DROP FUNCTION IF EXISTS create_asteroids_room(TEXT);
CREATE OR REPLACE FUNCTION create_asteroids_room(p_color TEXT DEFAULT NULL)
RETURNS asteroids_rooms AS $$
DECLARE
  room_row asteroids_rooms%ROWTYPE;
  code_try TEXT;
  try_count INTEGER := 0;
  name_snapshot TEXT;
BEGIN
  PERFORM set_config('search_path', 'public', true);

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Best-effort cleanup first.
  PERFORM cleanup_stale_asteroids_rooms();

  -- Enforce: a user can host at most one room by replacing any existing hosted room.
  -- This intentionally also removes running/vote rooms (kicks all players) to guarantee "create room" always works.
  DELETE FROM asteroids_rooms
  WHERE host_id = auth.uid();

  SELECT COALESCE(display_name, username, 'Player') INTO name_snapshot
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;

  LOOP
    try_count := try_count + 1;
    IF try_count > 10 THEN
      RAISE EXCEPTION 'Could not generate room code';
    END IF;
    code_try := asteroids_generate_room_code();
    BEGIN
      INSERT INTO asteroids_rooms (code, host_id, status, max_players, last_activity_at)
      VALUES (code_try, auth.uid(), 'lobby', 4, now())
      RETURNING * INTO room_row;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      -- retry
    END;
  END LOOP;

  INSERT INTO asteroids_room_players (room_id, user_id, display_name, color)
  VALUES (room_row.id, auth.uid(), name_snapshot, p_color)
  ON CONFLICT (room_id, user_id) DO UPDATE SET
    left_at = NULL,
    finished_at = NULL,
    score = 0,
    display_name = EXCLUDED.display_name,
    color = COALESCE(EXCLUDED.color, asteroids_room_players.color);

  RETURN room_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_asteroids_room(TEXT) TO authenticated;

