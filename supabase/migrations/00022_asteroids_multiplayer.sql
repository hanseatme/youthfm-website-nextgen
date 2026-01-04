-- Asteroids: singleplayer highscores + multiplayer rooms (up to 4 players) + secure RPCs

-- 1) Tables
CREATE TABLE IF NOT EXISTS asteroids_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  host_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'running', 'finished')),
  max_players INTEGER NOT NULL DEFAULT 4 CHECK (max_players BETWEEN 2 AND 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ NULL,
  ended_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS asteroids_room_players (
  room_id UUID NOT NULL REFERENCES asteroids_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  display_name TEXT NULL,
  color TEXT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ NULL,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0),
  finished_at TIMESTAMPTZ NULL,
  PRIMARY KEY (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_asteroids_room_players_room ON asteroids_room_players(room_id);
CREATE INDEX IF NOT EXISTS idx_asteroids_room_players_score ON asteroids_room_players(room_id, score DESC);

CREATE TABLE IF NOT EXISTS asteroids_highscores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('single', 'multi')),
  room_id UUID NULL REFERENCES asteroids_rooms(id) ON DELETE SET NULL,
  score INTEGER NOT NULL CHECK (score >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asteroids_highscores_mode_score ON asteroids_highscores(mode, score DESC);

-- 2) RLS (read-only for authenticated; writes via RPC)
ALTER TABLE asteroids_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE asteroids_room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE asteroids_highscores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "asteroids_rooms_select_auth" ON asteroids_rooms;
CREATE POLICY "asteroids_rooms_select_auth"
  ON asteroids_rooms
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "asteroids_room_players_select_auth" ON asteroids_room_players;
CREATE POLICY "asteroids_room_players_select_auth"
  ON asteroids_room_players
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "asteroids_highscores_select_auth" ON asteroids_highscores;
CREATE POLICY "asteroids_highscores_select_auth"
  ON asteroids_highscores
  FOR SELECT
  TO authenticated
  USING (true);

-- Disallow direct writes for authenticated (RPC only)
REVOKE INSERT, UPDATE, DELETE ON asteroids_rooms FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON asteroids_room_players FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON asteroids_highscores FROM authenticated;

-- 3) Helpers
CREATE OR REPLACE FUNCTION asteroids_generate_room_code()
RETURNS TEXT AS $$
DECLARE
  c TEXT;
BEGIN
  -- 6 chars, uppercase + digits, reasonably collision-resistant
  c := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  RETURN c;
END;
$$ LANGUAGE plpgsql;

-- 4) RPCs
DROP FUNCTION IF EXISTS create_asteroids_room(TEXT);
CREATE OR REPLACE FUNCTION create_asteroids_room(p_color TEXT DEFAULT NULL)
RETURNS asteroids_rooms AS $$
DECLARE
  room_row asteroids_rooms%ROWTYPE;
  code_try TEXT;
  try_count INTEGER := 0;
  name_snapshot TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

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
      INSERT INTO asteroids_rooms (code, host_id, status, max_players)
      VALUES (code_try, auth.uid(), 'lobby', 4)
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

DROP FUNCTION IF EXISTS join_asteroids_room(TEXT, TEXT);
CREATE OR REPLACE FUNCTION join_asteroids_room(p_code TEXT, p_color TEXT DEFAULT NULL)
RETURNS asteroids_rooms AS $$
DECLARE
  room_row asteroids_rooms%ROWTYPE;
  current_count INTEGER := 0;
  name_snapshot TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

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

DROP FUNCTION IF EXISTS leave_asteroids_room(UUID);
CREATE OR REPLACE FUNCTION leave_asteroids_room(p_room_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE asteroids_room_players
  SET left_at = now()
  WHERE room_id = p_room_id
    AND user_id = auth.uid()
    AND left_at IS NULL;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS start_asteroids_room(UUID);
CREATE OR REPLACE FUNCTION start_asteroids_room(p_room_id UUID)
RETURNS asteroids_rooms AS $$
DECLARE
  room_row asteroids_rooms%ROWTYPE;
  player_count INTEGER := 0;
BEGIN
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
  SET status = 'running', started_at = now(), ended_at = NULL
  WHERE id = room_row.id
  RETURNING * INTO room_row;

  RETURN room_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS submit_asteroids_highscore(INTEGER);
CREATE OR REPLACE FUNCTION submit_asteroids_highscore(p_score INTEGER)
RETURNS asteroids_highscores AS $$
DECLARE
  row_record asteroids_highscores%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_score IS NULL OR p_score < 0 THEN
    RAISE EXCEPTION 'Invalid score' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO asteroids_highscores (user_id, mode, score)
  VALUES (auth.uid(), 'single', p_score)
  RETURNING * INTO row_record;

  RETURN row_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS submit_asteroids_score(UUID, INTEGER);
CREATE OR REPLACE FUNCTION submit_asteroids_score(p_room_id UUID, p_score INTEGER)
RETURNS asteroids_rooms AS $$
DECLARE
  room_row asteroids_rooms%ROWTYPE;
  active_count INTEGER := 0;
  finished_count INTEGER := 0;
BEGIN
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
    SET status = 'finished', ended_at = now()
    WHERE id = p_room_id;
  END IF;

  SELECT * INTO room_row FROM asteroids_rooms WHERE id = p_room_id LIMIT 1;
  RETURN room_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_asteroids_room(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION join_asteroids_room(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION leave_asteroids_room(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION start_asteroids_room(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION submit_asteroids_highscore(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION submit_asteroids_score(UUID, INTEGER) TO authenticated;

