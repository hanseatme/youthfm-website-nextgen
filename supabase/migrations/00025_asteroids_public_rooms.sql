-- Asteroids: public room listing + one-click join

-- List lobby rooms with player counts and host name (for discovery UI)
DROP FUNCTION IF EXISTS list_public_asteroids_rooms(INTEGER);
CREATE OR REPLACE FUNCTION list_public_asteroids_rooms(p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  code TEXT,
  host_id UUID,
  host_name TEXT,
  status TEXT,
  round_number INTEGER,
  max_players INTEGER,
  player_count INTEGER,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  lim INTEGER := 20;
BEGIN
  PERFORM set_config('search_path', 'public', true);

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  lim := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);

  RETURN QUERY
  SELECT
    r.id,
    r.code,
    r.host_id,
    COALESCE(h.display_name, h.username, 'Host') AS host_name,
    r.status,
    r.round_number,
    r.max_players,
    COALESCE(p.cnt, 0)::INT AS player_count,
    r.created_at
  FROM asteroids_rooms r
  LEFT JOIN profiles h ON h.id = r.host_id
  LEFT JOIN (
    SELECT room_id, COUNT(*) AS cnt
    FROM asteroids_room_players
    WHERE left_at IS NULL
    GROUP BY room_id
  ) p ON p.room_id = r.id
  WHERE r.status = 'lobby'
  ORDER BY r.created_at DESC
  LIMIT lim;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION list_public_asteroids_rooms(INTEGER) TO authenticated;

-- Join by room_id (so users can join from the public room list without typing a code)
DROP FUNCTION IF EXISTS join_asteroids_room_by_id(UUID, TEXT);
CREATE OR REPLACE FUNCTION join_asteroids_room_by_id(p_room_id UUID, p_color TEXT DEFAULT NULL)
RETURNS asteroids_rooms AS $$
DECLARE
  room_row asteroids_rooms%ROWTYPE;
  current_count INTEGER := 0;
  name_snapshot TEXT;
BEGIN
  PERFORM set_config('search_path', 'public', true);

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO room_row
  FROM asteroids_rooms
  WHERE id = p_room_id
  LIMIT 1;

  IF room_row.id IS NULL THEN
    RAISE EXCEPTION 'Room not found' USING ERRCODE = 'P0001';
  END IF;

  IF room_row.status <> 'lobby' THEN
    RAISE EXCEPTION 'Room already started' USING ERRCODE = 'P0001';
  END IF;

  SELECT COUNT(*) INTO current_count
  FROM asteroids_room_players
  WHERE room_id = room_row.id
    AND left_at IS NULL;

  IF current_count >= room_row.max_players THEN
    RAISE EXCEPTION 'Room full' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(display_name, username, 'Player') INTO name_snapshot
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;

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

GRANT EXECUTE ON FUNCTION join_asteroids_room_by_id(UUID, TEXT) TO authenticated;

