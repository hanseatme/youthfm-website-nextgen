-- Next Generation Radio - Database Functions
-- Version: 1.0.0

-- ============================================
-- VIBES FUNCTIONS
-- ============================================

-- Add vibes to a user (with transaction logging)
CREATE OR REPLACE FUNCTION add_vibes(
    p_user_id UUID,
    p_amount INTEGER,
    p_reason TEXT,
    p_reference_type TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    new_total INTEGER;
    multiplier DECIMAL;
BEGIN
    -- Get current streak multiplier
    SELECT streak_multiplier INTO multiplier FROM profiles WHERE id = p_user_id;
    IF multiplier IS NULL THEN multiplier := 1.0; END IF;

    -- Apply multiplier to amount
    p_amount := FLOOR(p_amount * multiplier);

    -- Update vibes
    UPDATE profiles
    SET vibes_total = vibes_total + p_amount,
        vibes_available = vibes_available + p_amount
    WHERE id = p_user_id
    RETURNING vibes_available INTO new_total;

    -- Log transaction
    INSERT INTO vibes_transactions (user_id, amount, reason, reference_type, reference_id)
    VALUES (p_user_id, p_amount, p_reason, p_reference_type, p_reference_id);

    RETURN new_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Spend vibes (returns FALSE if insufficient)
CREATE OR REPLACE FUNCTION spend_vibes(
    p_user_id UUID,
    p_amount INTEGER,
    p_reason TEXT,
    p_reference_type TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_vibes INTEGER;
BEGIN
    -- Check current vibes
    SELECT vibes_available INTO current_vibes FROM profiles WHERE id = p_user_id FOR UPDATE;

    IF current_vibes < p_amount THEN
        RETURN FALSE;
    END IF;

    -- Deduct vibes
    UPDATE profiles
    SET vibes_available = vibes_available - p_amount
    WHERE id = p_user_id;

    -- Log transaction (negative amount)
    INSERT INTO vibes_transactions (user_id, amount, reason, reference_type, reference_id)
    VALUES (p_user_id, -p_amount, p_reason, p_reference_type, p_reference_id);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STREAK FUNCTIONS
-- ============================================

-- Update streak multiplier based on current streak
CREATE OR REPLACE FUNCTION calculate_streak_multiplier(streak_days INTEGER)
RETURNS DECIMAL AS $$
BEGIN
    RETURN CASE
        WHEN streak_days <= 7 THEN 1.0
        WHEN streak_days <= 14 THEN 1.5
        WHEN streak_days <= 30 THEN 2.0
        WHEN streak_days <= 60 THEN 2.5
        WHEN streak_days <= 100 THEN 3.0
        ELSE 3.5
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update user streak (called daily or on listen)
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID, p_minutes_listened INTEGER)
RETURNS VOID AS $$
DECLARE
    today DATE := CURRENT_DATE;
    yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
    has_today BOOLEAN;
    had_yesterday BOOLEAN;
    current_streak INTEGER;
    freeze_count INTEGER;
    use_freeze BOOLEAN := FALSE;
BEGIN
    -- Check if already logged today
    SELECT EXISTS (
        SELECT 1 FROM streak_history
        WHERE user_id = p_user_id AND date = today
    ) INTO has_today;

    IF has_today THEN
        -- Update minutes if already exists
        UPDATE streak_history
        SET minutes_listened = minutes_listened + p_minutes_listened,
            streak_maintained = (minutes_listened + p_minutes_listened) >= 10
        WHERE user_id = p_user_id AND date = today;
    ELSE
        -- Check yesterday
        SELECT EXISTS (
            SELECT 1 FROM streak_history
            WHERE user_id = p_user_id AND date = yesterday AND streak_maintained = TRUE
        ) INTO had_yesterday;

        -- Get current streak and freezes
        SELECT streak_current, streak_freezes INTO current_streak, freeze_count
        FROM profiles WHERE id = p_user_id;

        -- If no yesterday and streak > 0, check if we should use freeze
        IF NOT had_yesterday AND current_streak > 0 AND freeze_count > 0 THEN
            -- Use freeze for yesterday
            INSERT INTO streak_history (user_id, date, minutes_listened, streak_maintained, freeze_used)
            VALUES (p_user_id, yesterday, 0, TRUE, TRUE)
            ON CONFLICT (user_id, date) DO NOTHING;

            UPDATE profiles SET streak_freezes = streak_freezes - 1 WHERE id = p_user_id;
            use_freeze := TRUE;
        ELSIF NOT had_yesterday THEN
            -- Reset streak
            current_streak := 0;
        END IF;

        -- Insert today's record
        INSERT INTO streak_history (user_id, date, minutes_listened, streak_maintained)
        VALUES (p_user_id, today, p_minutes_listened, p_minutes_listened >= 10);

        -- Update streak if maintained
        IF p_minutes_listened >= 10 THEN
            current_streak := current_streak + 1;

            UPDATE profiles
            SET streak_current = current_streak,
                streak_longest = GREATEST(streak_longest, current_streak),
                streak_multiplier = calculate_streak_multiplier(current_streak)
            WHERE id = p_user_id;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- DUEL FUNCTIONS
-- ============================================

-- Cast a vote in a duel
CREATE OR REPLACE FUNCTION cast_duel_vote(p_duel_id UUID, p_vote duel_vote)
RETURNS BOOLEAN AS $$
DECLARE
    duel_current_status duel_status;
    vote_count INTEGER;
BEGIN
    -- Check duel status
    SELECT status INTO duel_current_status FROM duels WHERE id = p_duel_id;
    IF duel_current_status != 'active' THEN
        RAISE EXCEPTION 'Duel is not active';
    END IF;

    -- Check if already voted
    SELECT COUNT(*) INTO vote_count FROM duel_votes
    WHERE duel_id = p_duel_id AND user_id = auth.uid();

    IF vote_count > 0 THEN
        RAISE EXCEPTION 'Already voted in this duel';
    END IF;

    -- Insert vote
    INSERT INTO duel_votes (duel_id, user_id, voted_for)
    VALUES (p_duel_id, auth.uid(), p_vote);

    -- Update vote count
    IF p_vote = 'a' THEN
        UPDATE duels SET votes_a = votes_a + 1 WHERE id = p_duel_id;
    ELSE
        UPDATE duels SET votes_b = votes_b + 1 WHERE id = p_duel_id;
    END IF;

    -- Award vibes for voting
    PERFORM add_vibes(auth.uid(), 20, 'Duel participation', 'duel', p_duel_id);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- End a duel and determine winner
CREATE OR REPLACE FUNCTION end_duel(p_duel_id UUID)
RETURNS UUID AS $$
DECLARE
    duel_record RECORD;
    winner UUID;
BEGIN
    SELECT * INTO duel_record FROM duels WHERE id = p_duel_id;

    IF duel_record.votes_a > duel_record.votes_b THEN
        winner := duel_record.song_a_id;
    ELSIF duel_record.votes_b > duel_record.votes_a THEN
        winner := duel_record.song_b_id;
    ELSE
        -- Tie - random winner
        winner := CASE WHEN random() < 0.5 THEN duel_record.song_a_id ELSE duel_record.song_b_id END;
    END IF;

    UPDATE duels
    SET status = 'completed',
        ended_at = NOW(),
        winner_id = winner
    WHERE id = p_duel_id;

    -- Award bonus vibes to users who picked the winner
    UPDATE profiles p
    SET vibes_available = vibes_available + 10,
        vibes_total = vibes_total + 10
    FROM duel_votes dv
    WHERE dv.user_id = p.id
      AND dv.duel_id = p_duel_id
      AND ((dv.voted_for = 'a' AND duel_record.song_a_id = winner)
           OR (dv.voted_for = 'b' AND duel_record.song_b_id = winner));

    RETURN winner;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- BADGE FUNCTIONS
-- ============================================

-- Award a badge to a user
CREATE OR REPLACE FUNCTION award_badge(p_user_id UUID, p_badge_slug TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    badge_record RECORD;
    already_has BOOLEAN;
BEGIN
    -- Get badge
    SELECT * INTO badge_record FROM badges WHERE slug = p_badge_slug AND is_active = TRUE;
    IF badge_record IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Check if already has badge
    SELECT EXISTS (
        SELECT 1 FROM user_badges WHERE user_id = p_user_id AND badge_id = badge_record.id
    ) INTO already_has;

    IF already_has THEN
        RETURN FALSE;
    END IF;

    -- Award badge
    INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, badge_record.id);

    -- Award vibes
    IF badge_record.vibes_reward > 0 THEN
        PERFORM add_vibes(p_user_id, badge_record.vibes_reward, 'Badge: ' || badge_record.name, 'badge', badge_record.id);
    END IF;

    -- Create notification
    INSERT INTO notifications (user_id, type, title, content)
    VALUES (p_user_id, 'badge_unlocked', 'Neues Badge freigeschaltet!',
            jsonb_build_object('badge_id', badge_record.id, 'badge_name', badge_record.name, 'badge_icon', badge_record.icon));

    -- Create activity
    INSERT INTO activity_feed (user_id, event_type, event_data, is_public)
    VALUES (p_user_id, 'badge_unlocked',
            jsonb_build_object('badge_id', badge_record.id, 'badge_name', badge_record.name, 'badge_icon', badge_record.icon),
            TRUE);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PROFILE FUNCTIONS
-- ============================================

-- Handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, username, display_name, avatar_id)
    VALUES (
        NEW.id,
        NULL,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        1
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ============================================
-- SONG FEEDBACK AGGREGATION
-- ============================================

-- Get aggregated feedback for a song
CREATE OR REPLACE FUNCTION get_song_stats(p_song_id UUID)
RETURNS TABLE (
    total_feedback BIGINT,
    avg_reaction DECIMAL,
    avg_energy DECIMAL,
    love_count BIGINT,
    like_count BIGINT,
    neutral_count BIGINT,
    dislike_count BIGINT,
    skip_count BIGINT,
    top_moods TEXT[],
    top_activities TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_feedback,
        ROUND(AVG(reaction)::DECIMAL, 2) as avg_reaction,
        ROUND(AVG(energy_level)::DECIMAL, 1) as avg_energy,
        COUNT(*) FILTER (WHERE reaction = 1)::BIGINT as love_count,
        COUNT(*) FILTER (WHERE reaction = 2)::BIGINT as like_count,
        COUNT(*) FILTER (WHERE reaction = 3)::BIGINT as neutral_count,
        COUNT(*) FILTER (WHERE reaction = 4)::BIGINT as dislike_count,
        COUNT(*) FILTER (WHERE reaction = 5)::BIGINT as skip_count,
        (SELECT ARRAY_AGG(mood ORDER BY cnt DESC)
         FROM (
             SELECT UNNEST(mood_tags) as mood, COUNT(*) as cnt
             FROM song_feedback WHERE song_id = p_song_id AND mood_tags IS NOT NULL
             GROUP BY UNNEST(mood_tags)
             LIMIT 3
         ) m) as top_moods,
        (SELECT ARRAY_AGG(activity ORDER BY cnt DESC)
         FROM (
             SELECT UNNEST(activity_tags) as activity, COUNT(*) as cnt
             FROM song_feedback WHERE song_id = p_song_id AND activity_tags IS NOT NULL
             GROUP BY UNNEST(activity_tags)
             LIMIT 3
         ) a) as top_activities
    FROM song_feedback
    WHERE song_id = p_song_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- LEADERBOARD FUNCTIONS
-- ============================================

-- Get weekly leaderboard
CREATE OR REPLACE FUNCTION get_weekly_leaderboard(p_limit INTEGER DEFAULT 100)
RETURNS TABLE (
    rank BIGINT,
    user_id UUID,
    username TEXT,
    display_name TEXT,
    avatar_id INTEGER,
    vibes_this_week BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ROW_NUMBER() OVER (ORDER BY SUM(vt.amount) DESC)::BIGINT as rank,
        p.id as user_id,
        p.username,
        p.display_name,
        p.avatar_id,
        COALESCE(SUM(vt.amount) FILTER (WHERE vt.amount > 0), 0)::BIGINT as vibes_this_week
    FROM profiles p
    LEFT JOIN vibes_transactions vt ON vt.user_id = p.id
        AND vt.created_at >= date_trunc('week', CURRENT_DATE)
    WHERE p.profile_visibility = 'public'
    GROUP BY p.id
    ORDER BY vibes_this_week DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get streak leaderboard
CREATE OR REPLACE FUNCTION get_streak_leaderboard(p_limit INTEGER DEFAULT 100)
RETURNS TABLE (
    rank BIGINT,
    user_id UUID,
    username TEXT,
    display_name TEXT,
    avatar_id INTEGER,
    streak_current INTEGER,
    streak_multiplier DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ROW_NUMBER() OVER (ORDER BY p.streak_current DESC)::BIGINT as rank,
        p.id as user_id,
        p.username,
        p.display_name,
        p.avatar_id,
        p.streak_current,
        p.streak_multiplier
    FROM profiles p
    WHERE p.profile_visibility = 'public'
      AND p.streak_current > 0
    ORDER BY p.streak_current DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
