-- Asteroids: rematch / end flow with 15s opt-in window

-- 1) Extend room status enum-like check
ALTER TABLE asteroids_rooms DROP CONSTRAINT IF EXISTS asteroids_rooms_status_check;
ALTER TABLE asteroids_rooms
  ADD CONSTRAINT asteroids_rooms_status_check CHECK (status IN ('lobby', 'running', 'vote', 'finished'));

-- 2) Room vote metadata + round counter
ALTER TABLE asteroids_rooms
  ADD COLUMN IF NOT EXISTS round_number INTEGER NOT NULL DEFAULT 1 CHECK (round_number >= 1),
  ADD COLUMN IF NOT EXISTS vote_action TEXT NULL CHECK (vote_action IN ('rematch', 'end')),
  ADD COLUMN IF NOT EXISTS vote_deadline TIMESTAMPTZ NULL;

-- 3) Per-player rematch choice
ALTER TABLE asteroids_room_players
  ADD COLUMN IF NOT EXISTS rematch_choice BOOLEAN NULL;

-- 4) RPCs
DROP FUNCTION IF EXISTS propose_asteroids_rematch(UUID);
CREATE OR REPLACE FUNCTION propose_asteroids_rematch(p_room_id UUID)
RETURNS asteroids_rooms AS $$
DECLARE
  room_row asteroids_rooms%ROWTYPE;
  active_count INTEGER := 0;
BEGIN
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
      vote_deadline = now() + interval '15 seconds'
  WHERE id = p_room_id
  RETURNING * INTO room_row;

  RETURN room_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS end_asteroids_room(UUID);
CREATE OR REPLACE FUNCTION end_asteroids_room(p_room_id UUID)
RETURNS asteroids_rooms AS $$
DECLARE
  room_row asteroids_rooms%ROWTYPE;
BEGIN
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
      vote_deadline = NULL
  WHERE id = p_room_id
  RETURNING * INTO room_row;

  RETURN room_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS respond_asteroids_rematch(UUID, BOOLEAN);
CREATE OR REPLACE FUNCTION respond_asteroids_rematch(p_room_id UUID, p_play BOOLEAN)
RETURNS BOOLEAN AS $$
DECLARE
  room_row asteroids_rooms%ROWTYPE;
BEGIN
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

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS finalize_asteroids_rematch(UUID);
CREATE OR REPLACE FUNCTION finalize_asteroids_rematch(p_room_id UUID)
RETURNS asteroids_rooms AS $$
DECLARE
  room_row asteroids_rooms%ROWTYPE;
  active_count INTEGER := 0;
  in_count INTEGER := 0;
BEGIN
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

  -- Enforce deadline (host may finalize early, but still respects current choices)
  IF room_row.vote_deadline IS NOT NULL AND now() < room_row.vote_deadline THEN
    -- ok
  END IF;

  SELECT COUNT(*) INTO active_count
  FROM asteroids_room_players
  WHERE room_id = p_room_id
    AND left_at IS NULL;

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
        vote_deadline = NULL
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
      round_number = round_number + 1,
      started_at = now(),
      ended_at = NULL,
      vote_action = NULL,
      vote_deadline = NULL
  WHERE id = p_room_id
  RETURNING * INTO room_row;

  RETURN room_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION propose_asteroids_rematch(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION end_asteroids_room(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION respond_asteroids_rematch(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION finalize_asteroids_rematch(UUID) TO authenticated;

