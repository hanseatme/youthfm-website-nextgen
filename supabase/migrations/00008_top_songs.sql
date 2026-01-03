-- Top songs based on total feedback count
CREATE OR REPLACE FUNCTION get_top_songs(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    song_id UUID,
    title TEXT,
    artist TEXT,
    artwork_url TEXT,
    total_feedback BIGINT,
    avg_reaction DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.title,
        s.artist,
        s.artwork_url,
        COUNT(sf.id)::BIGINT as total_feedback,
        ROUND(AVG(sf.reaction)::DECIMAL, 2) as avg_reaction
    FROM song_feedback sf
    JOIN songs s ON s.id = sf.song_id
    GROUP BY s.id, s.title, s.artist, s.artwork_url
    ORDER BY total_feedback DESC, avg_reaction ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
