-- Asteroids: room limits + auto cleanup
-- - A user can host at most one active room at a time.
-- - Rooms are deleted when everyone leaves.
-- - Rooms are deleted after 15 minutes without activity (best-effort via cleanup RPC calls).

ALTER TABLE asteroids_rooms
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_asteroids_rooms_last_activity_at ON asteroids_rooms(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_asteroids_rooms_host_status ON asteroids_rooms(host_id, status);

-- Touch / heartbeat: keeps a room alive (host or active participant).
DROP FUNCTION IF EXISTS touch_asteroids_room(UUID);
CREATE OR REPLACE FUNCTION touch_asteroids_room(p_room_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  can_touch BOOLEAN := FALSE;
BEGIN
  PERFORM set_config('search_path', 'public', true);

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT TRUE INTO can_touch
  FROM asteroids_rooms r
  WHERE r.id = p_room_id
    AND (r.host_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM asteroids_room_players rp
        WHERE rp.room_id = r.id
          AND rp.user_id = auth.uid()
          AND rp.left_at IS NULL
      ))
  LIMIT 1;

  IF NOT COALESCE(can_touch, FALSE) THEN
    RETURN FALSE;
  END IF;

  UPDATE asteroids_rooms
  SET last_activity_at = now()
  WHERE id = p_room_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION touch_asteroids_room(UUID) TO authenticated;

-- Cleanup: delete rooms that have been inactive for 15 minutes.
DROP FUNCTION IF EXISTS cleanup_stale_asteroids_rooms();
CREATE OR REPLACE FUNCTION cleanup_stale_asteroids_rooms()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  PERFORM set_config('search_path', 'public', true);

  DELETE FROM asteroids_rooms
  WHERE last_activity_at < (now() - interval '15 minutes');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION cleanup_stale_asteroids_rooms() TO authenticated;

-- Update: create_asteroids_room enforces a single hosted active room.
DROP FUNCTION IF EXISTS create_asteroids_room(TEXT);
CREATE OR REPLACE FUNCTION create_asteroids_room(p_color TEXT DEFAULT NULL)
RETURNS asteroids_rooms AS $$
DECLARE
  room_row asteroids_rooms%ROWTYPE;
  code_try TEXT;
  try_count INTEGER := 0;
  name_snapshot TEXT;
  running_exists BOOLEAN := FALSE;
BEGIN
  PERFORM set_config('search_path', 'public', true);

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  PERFORM cleanup_stale_asteroids_rooms();

  SELECT TRUE INTO running_exists
  FROM asteroids_rooms r
  WHERE r.host_id = auth.uid()
    AND r.status IN ('running', 'vote')
    AND r.last_activity_at >= (now() - interval '15 minutes')
  LIMIT 1;

  IF COALESCE(running_exists, FALSE) THEN
    RAISE EXCEPTION 'You are already hosting an active room' USING ERRCODE = 'P0001';
  END IF;

  -- Delete any other open lobby rooms hosted by the user (enforce single lobby room).
  DELETE FROM asteroids_rooms r
  WHERE r.host_id = auth.uid()
    AND r.status = 'lobby';

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

-- Update: join_asteroids_room checks staleness + touches activity.
DROP FUNCTION IF EXISTS join_asteroids_room(TEXT, TEXT);
CREATE OR REPLACE FUNCTION join_asteroids_room(p_code TEXT, p_color TEXT DEFAULT NULL)
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

  PERFORM cleanup_stale_asteroids_rooms();

  SELECT * INTO room_row
  FROM asteroids_rooms
  WHERE code = upper(trim(p_code))
  LIMIT 1;

  IF room_row.id IS NULL THEN
    RAISE EXCEPTION 'Room not found' USING ERRCODE = 'P0001';
  END IF;

  IF room_row.status <> 'lobby' THEN
    RAISE EXCEPTION 'Room already started' USING ERRCODE = 'P0001';
  END IF;

  IF room_row.last_activity_at < (now() - interval '15 minutes') THEN
    DELETE FROM asteroids_rooms WHERE id = room_row.id;
    RAISE EXCEPTION 'Room not found' USING ERRCODE = 'P0001';
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

  UPDATE asteroids_rooms
  SET last_activity_at = now()
  WHERE id = room_row.id;

  SELECT * INTO room_row FROM asteroids_rooms WHERE id = room_row.id LIMIT 1;
  RETURN room_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION join_asteroids_room(TEXT, TEXT) TO authenticated;

-- Update: join_asteroids_room_by_id checks staleness + touches activity.
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

  PERFORM cleanup_stale_asteroids_rooms();

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

  IF room_row.last_activity_at < (now() - interval '15 minutes') THEN
    DELETE FROM asteroids_rooms WHERE id = room_row.id;
    RAISE EXCEPTION 'Room not found' USING ERRCODE = 'P0001';
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

  UPDATE asteroids_rooms
  SET last_activity_at = now()
  WHERE id = room_row.id;

  SELECT * INTO room_row FROM asteroids_rooms WHERE id = room_row.id LIMIT 1;
  RETURN room_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION join_asteroids_room_by_id(UUID, TEXT) TO authenticated;

-- Update: leave_asteroids_room deletes room when empty and reassigns host if needed.
DROP FUNCTION IF EXISTS leave_asteroids_room(UUID);
CREATE OR REPLACE FUNCTION leave_asteroids_room(p_room_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  remaining_count INTEGER := 0;
  room_host UUID;
  new_host UUID;
BEGIN
  PERFORM set_config('search_path', 'public', true);

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT host_id INTO room_host FROM asteroids_rooms WHERE id = p_room_id LIMIT 1;

  UPDATE asteroids_room_players
  SET left_at = now()
  WHERE room_id = p_room_id
    AND user_id = auth.uid()
    AND left_at IS NULL;

  UPDATE asteroids_rooms
  SET last_activity_at = now()
  WHERE id = p_room_id;

  SELECT COUNT(*) INTO remaining_count
  FROM asteroids_room_players
  WHERE room_id = p_room_id
    AND left_at IS NULL;

  IF remaining_count <= 0 THEN
    DELETE FROM asteroids_rooms WHERE id = p_room_id;
    RETURN TRUE;
  END IF;

  -- If the host left, hand over to the earliest remaining player.
  IF room_host = auth.uid() THEN
    SELECT user_id INTO new_host
    FROM asteroids_room_players
    WHERE room_id = p_room_id
      AND left_at IS NULL
    ORDER BY joined_at ASC
    LIMIT 1;

    IF new_host IS NOT NULL THEN
      UPDATE asteroids_rooms
      SET host_id = new_host
      WHERE id = p_room_id;
    END IF;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION leave_asteroids_room(UUID) TO authenticated;

-- Update: start_asteroids_room touches activity.
DROP FUNCTION IF EXISTS start_asteroids_room(UUID);
CREATE OR REPLACE FUNCTION start_asteroids_room(p_room_id UUID)
RETURNS asteroids_rooms AS $$
DECLARE
  room_row asteroids_rooms%ROWTYPE;
  player_count INTEGER := 0;
BEGIN
  PERFORM set_config('search_path', 'public', true);

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO room_row FROM asteroids_rooms WHERE id = p_room_id LIMIT 1;
  IF room_row.id IS NULL THEN
    RAISE EXCEPTION 'Room not found' USING ERRCODE = 'P0001';
  END IF;
  IF room_row.host_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only host can start' USING ERRCODE = 'P0001';
  END IF;
  IF room_row.status <> 'lobby' THEN
    RAISE EXCEPTION 'Room not in lobby' USING ERRCODE = 'P0001';
  END IF;

  SELECT COUNT(*) INTO player_count
  FROM asteroids_room_players
  WHERE room_id = room_row.id
    AND left_at IS NULL;

  IF player_count < 2 THEN
    RAISE EXCEPTION 'Need at least 2 players' USING ERRCODE = 'P0001';
  END IF;

  UPDATE asteroids_rooms
  SET status = 'running', started_at = now(), ended_at = NULL, last_activity_at = now()
  WHERE id = room_row.id
  RETURNING * INTO room_row;

  RETURN room_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION start_asteroids_room(UUID) TO authenticated;

-- Update: submit_asteroids_score touches activity and may finish the room.
DROP FUNCTION IF EXISTS submit_asteroids_score(UUID, INTEGER);
CREATE OR REPLACE FUNCTION submit_asteroids_score(p_room_id UUID, p_score INTEGER)
RETURNS asteroids_rooms AS $$
DECLARE
  room_row asteroids_rooms%ROWTYPE;
  active_count INTEGER := 0;
  finished_count INTEGER := 0;
BEGIN
  PERFORM set_config('search_path', 'public', true);

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_score IS NULL OR p_score < 0 THEN
    RAISE EXCEPTION 'Invalid score' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO room_row FROM asteroids_rooms WHERE id = p_room_id LIMIT 1;
  IF room_row.id IS NULL THEN
    RAISE EXCEPTION 'Room not found' USING ERRCODE = 'P0001';
  END IF;

  UPDATE asteroids_rooms
  SET last_activity_at = now()
  WHERE id = p_room_id;

  UPDATE asteroids_room_players
  SET score = GREATEST(score, p_score), finished_at = COALESCE(finished_at, now())
  WHERE room_id = p_room_id
    AND user_id = auth.uid()
    AND left_at IS NULL;

  -- Store per-player multi score (even if room later gets deleted)
  INSERT INTO asteroids_highscores (user_id, mode, room_id, score)
  VALUES (auth.uid(), 'multi', p_room_id, p_score);

  SELECT COUNT(*) INTO active_count
  FROM asteroids_room_players
  WHERE room_id = p_room_id
    AND left_at IS NULL;

  SELECT COUNT(*) INTO finished_count
  FROM asteroids_room_players
  WHERE room_id = p_room_id
    AND left_at IS NULL
    AND finished_at IS NOT NULL;

  IF room_row.status = 'running' AND active_count > 0 AND finished_count >= active_count THEN
    UPDATE asteroids_rooms
    SET status = 'finished', ended_at = now(), last_activity_at = now()
    WHERE id = p_room_id;
  END IF;

  SELECT * INTO room_row FROM asteroids_rooms WHERE id = p_room_id LIMIT 1;
  RETURN room_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION submit_asteroids_score(UUID, INTEGER) TO authenticated;

-- Update: rematch/vote RPCs touch activity.
DROP FUNCTION IF EXISTS propose_asteroids_rematch(UUID);
CREATE OR REPLACE FUNCTION propose_asteroids_rematch(p_room_id UUID)
RETURNS asteroids_rooms AS $$
DECLARE
  room_row asteroids_rooms%ROWTYPE;
  active_count INTEGER := 0;
BEGIN
  PERFORM set_config('search_path', 'public', true);

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO room_row FROM asteroids_rooms WHERE id = p_room_id LIMIT 1;
  IF room_row.id IS NULL THEN
    RAISE EXCEPTION 'Room not found' USING ERRCODE = 'P0001';
  END IF;
  IF room_row.host_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only host can propose' USING ERRCODE = 'P0001';
  END IF;
  IF room_row.status <> 'finished' THEN
    RAISE EXCEPTION 'Room not finished' USING ERRCODE = 'P0001';
  END IF;

  SELECT COUNT(*) INTO active_count
  FROM asteroids_room_players
  WHERE room_id = p_room_id
    AND left_at IS NULL;

  IF active_count < 2 THEN
    RAISE EXCEPTION 'Need at least 2 players to rematch' USING ERRCODE = 'P0001';
  END IF;

  -- Reset rematch choices
  UPDATE asteroids_room_players
  SET rematch_choice = NULL
  WHERE room_id = p_room_id
    AND left_at IS NULL;

  -- Host is always in by default
  UPDATE asteroids_room_players
  SET rematch_choice = TRUE
  WHERE room_id = p_room_id
    AND user_id = auth.uid()
    AND left_at IS NULL;

  UPDATE asteroids_rooms
  SET status = 'vote',
      vote_action = 'rematch',
      vote_deadline = now() + interval '15 seconds',
      last_activity_at = now()
  WHERE id = p_room_id
  RETURNING * INTO room_row;

  RETURN room_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION propose_asteroids_rematch(UUID) TO authenticated;

DROP FUNCTION IF EXISTS end_asteroids_room(UUID);
CREATE OR REPLACE FUNCTION end_asteroids_room(p_room_id UUID)
RETURNS asteroids_rooms AS $$
DECLARE
  room_row asteroids_rooms%ROWTYPE;
BEGIN
  PERFORM set_config('search_path', 'public', true);

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO room_row FROM asteroids_rooms WHERE id = p_room_id LIMIT 1;
  IF room_row.id IS NULL THEN
    RAISE EXCEPTION 'Room not found' USING ERRCODE = 'P0001';
  END IF;
  IF room_row.host_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only host can end' USING ERRCODE = 'P0001';
  END IF;

  UPDATE asteroids_rooms
  SET status = 'finished',
      ended_at = COALESCE(ended_at, now()),
      vote_action = 'end',
      vote_deadline = NULL,
      last_activity_at = now()
  WHERE id = p_room_id
  RETURNING * INTO room_row;

  RETURN room_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION end_asteroids_room(UUID) TO authenticated;

DROP FUNCTION IF EXISTS respond_asteroids_rematch(UUID, BOOLEAN);
CREATE OR REPLACE FUNCTION respond_asteroids_rematch(p_room_id UUID, p_play BOOLEAN)
RETURNS BOOLEAN AS $$
DECLARE
  room_row asteroids_rooms%ROWTYPE;
BEGIN
  PERFORM set_config('search_path', 'public', true);

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO room_row FROM asteroids_rooms WHERE id = p_room_id LIMIT 1;
  IF room_row.id IS NULL THEN
    RAISE EXCEPTION 'Room not found' USING ERRCODE = 'P0001';
  END IF;
  IF room_row.status <> 'vote' OR room_row.vote_action <> 'rematch' THEN
    RAISE EXCEPTION 'No rematch vote active' USING ERRCODE = 'P0001';
  END IF;
  IF room_row.vote_deadline IS NULL OR now() > room_row.vote_deadline THEN
    RAISE EXCEPTION 'Vote expired' USING ERRCODE = 'P0001';
  END IF;

  UPDATE asteroids_room_players
  SET rematch_choice = p_play,
      left_at = CASE WHEN p_play THEN left_at ELSE now() END
  WHERE room_id = p_room_id
    AND user_id = auth.uid()
    AND left_at IS NULL;

  UPDATE asteroids_rooms
  SET last_activity_at = now()
  WHERE id = p_room_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION respond_asteroids_rematch(UUID, BOOLEAN) TO authenticated;

DROP FUNCTION IF EXISTS finalize_asteroids_rematch(UUID);
CREATE OR REPLACE FUNCTION finalize_asteroids_rematch(p_room_id UUID)
RETURNS asteroids_rooms AS $$
DECLARE
  room_row asteroids_rooms%ROWTYPE;
  in_count INTEGER := 0;
BEGIN
  PERFORM set_config('search_path', 'public', true);

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO room_row FROM asteroids_rooms WHERE id = p_room_id LIMIT 1;
  IF room_row.id IS NULL THEN
    RAISE EXCEPTION 'Room not found' USING ERRCODE = 'P0001';
  END IF;
  IF room_row.host_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only host can finalize' USING ERRCODE = 'P0001';
  END IF;
  IF room_row.status <> 'vote' OR room_row.vote_action <> 'rematch' THEN
    RAISE EXCEPTION 'No rematch vote active' USING ERRCODE = 'P0001';
  END IF;

  -- Treat NULL as false after deadline: remove them
  IF room_row.vote_deadline IS NOT NULL AND now() >= room_row.vote_deadline THEN
    UPDATE asteroids_room_players
    SET left_at = now()
    WHERE room_id = p_room_id
      AND left_at IS NULL
      AND rematch_choice IS DISTINCT FROM TRUE;
  END IF;

  SELECT COUNT(*) INTO in_count
  FROM asteroids_room_players
  WHERE room_id = p_room_id
    AND left_at IS NULL;

  IF in_count < 2 THEN
    UPDATE asteroids_rooms
    SET status = 'finished',
        ended_at = now(),
        vote_action = NULL,
        vote_deadline = NULL,
        last_activity_at = now()
    WHERE id = p_room_id
    RETURNING * INTO room_row;
    RETURN room_row;
  END IF;

  -- Reset scores for remaining players, increment round, start immediately
  UPDATE asteroids_room_players
  SET score = 0,
      finished_at = NULL,
      rematch_choice = NULL
  WHERE room_id = p_room_id
    AND left_at IS NULL;

  UPDATE asteroids_rooms
  SET status = 'running',
      started_at = now(),
      ended_at = NULL,
      vote_action = NULL,
      vote_deadline = NULL,
      round_number = COALESCE(round_number, 1) + 1,
      last_activity_at = now()
  WHERE id = p_room_id
  RETURNING * INTO room_row;

  RETURN room_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION finalize_asteroids_rematch(UUID) TO authenticated;

-- Update public room list to opportunistically cleanup stale rooms.
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

  PERFORM cleanup_stale_asteroids_rooms();

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
    AND r.last_activity_at >= (now() - interval '15 minutes')
    AND COALESCE(p.cnt, 0) < r.max_players
  ORDER BY r.created_at DESC
  LIMIT lim;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION list_public_asteroids_rooms(INTEGER) TO authenticated;

