-- Update top songs RPC to include preview fields
DROP FUNCTION IF EXISTS get_top_songs(INTEGER);

CREATE OR REPLACE FUNCTION get_top_songs(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    song_id UUID,
    title TEXT,
    artist TEXT,
    artwork_url TEXT,
    track_id INTEGER,
    preview_url TEXT,
    external_id TEXT,
    total_feedback BIGINT,
    avg_reaction DECIMAL,
    top_reaction INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.title,
        s.artist,
        s.artwork_url,
        s.track_id,
        s.preview_url,
        s.external_id,
        COUNT(sf.id)::BIGINT as total_feedback,
        ROUND(AVG(sf.reaction)::DECIMAL, 2) as avg_reaction,
        (
            SELECT sf2.reaction
            FROM song_feedback sf2
            WHERE sf2.song_id = s.id
            GROUP BY sf2.reaction
            ORDER BY COUNT(*) DESC, sf2.reaction ASC
            LIMIT 1
        ) as top_reaction
    FROM song_feedback sf
    JOIN songs s ON s.id = sf.song_id
    GROUP BY s.id, s.title, s.artist, s.artwork_url, s.track_id, s.preview_url, s.external_id
    ORDER BY total_feedback DESC, avg_reaction ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_top_songs(INTEGER) TO anon, authenticated;

