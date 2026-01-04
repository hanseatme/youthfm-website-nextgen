-- Record preview plays by stream track_id
CREATE OR REPLACE FUNCTION increment_song_preview_play_by_track(p_track_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE songs
  SET play_count = play_count + 1
  WHERE track_id = p_track_id;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_song_preview_play_by_track(INTEGER) TO anon, authenticated;

