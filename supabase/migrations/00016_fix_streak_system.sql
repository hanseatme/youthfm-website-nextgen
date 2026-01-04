-- Fix streak counting across multiple sessions and make freeze handling robust.
-- - Uses app_settings: streak_threshold_minutes, streak_reset_hour, streaks_enabled
-- - Uses "streak day" based on reset hour: (now() - reset_hour)::date
-- - Updates profiles when threshold is reached later in the day (multi-session)
-- - Uses freezes at most once per missed day and only for a 1-day gap

CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID, p_minutes_listened INTEGER)
RETURNS VOID AS $$
DECLARE
    streaks_enabled BOOLEAN := TRUE;
    threshold_minutes INTEGER := 10;
    reset_hour INTEGER := 4;

    raw_setting TEXT;

    streak_date DATE;
    yesterday DATE;
    two_days_ago DATE;

    new_minutes INTEGER;
    new_maintained BOOLEAN;
    added_minutes INTEGER;

    current_freezes INTEGER;
    current_streak INTEGER;

    yesterday_maintained BOOLEAN;
    yesterday_freeze_used BOOLEAN;
    two_days_ago_maintained BOOLEAN;

    new_streak INTEGER;
BEGIN
    SELECT value #>> '{}'
    INTO raw_setting
    FROM app_settings
    WHERE key = 'streaks_enabled'
    LIMIT 1;

    IF raw_setting IS NOT NULL THEN
        BEGIN
            streaks_enabled := raw_setting::boolean;
        EXCEPTION
            WHEN invalid_text_representation THEN
                streaks_enabled := TRUE;
        END;
    END IF;

    IF NOT streaks_enabled THEN
        RETURN;
    END IF;

    SELECT value #>> '{}'
    INTO raw_setting
    FROM app_settings
    WHERE key = 'streak_threshold_minutes'
    LIMIT 1;

    IF raw_setting IS NOT NULL THEN
        BEGIN
            threshold_minutes := raw_setting::int;
        EXCEPTION
            WHEN invalid_text_representation THEN
                threshold_minutes := 10;
        END;
    END IF;

    SELECT value #>> '{}'
    INTO raw_setting
    FROM app_settings
    WHERE key = 'streak_reset_hour'
    LIMIT 1;

    IF raw_setting IS NOT NULL THEN
        BEGIN
            reset_hour := raw_setting::int;
        EXCEPTION
            WHEN invalid_text_representation THEN
                reset_hour := 4;
        END;
    END IF;

    threshold_minutes := GREATEST(1, threshold_minutes);
    reset_hour := GREATEST(0, LEAST(23, reset_hour));

    -- Define "streak day" by reset hour in DB timezone
    streak_date := (now() - make_interval(hours => reset_hour))::date;
    yesterday := streak_date - 1;
    two_days_ago := streak_date - 2;

    -- Lock profile row for consistent updates
    SELECT COALESCE(streak_current, 0), COALESCE(streak_freezes, 0)
    INTO current_streak, current_freezes
    FROM profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found for user_id %', p_user_id;
    END IF;

    added_minutes := GREATEST(0, COALESCE(p_minutes_listened, 0));

    -- Upsert today's streak history and compute maintained state (robust for multi-session updates).
    WITH upserted AS (
        INSERT INTO streak_history (user_id, date, minutes_listened, streak_maintained, freeze_used)
        VALUES (p_user_id, streak_date, added_minutes, added_minutes >= threshold_minutes, FALSE)
        ON CONFLICT (user_id, date) DO UPDATE
        SET minutes_listened = streak_history.minutes_listened + EXCLUDED.minutes_listened,
            streak_maintained = (streak_history.minutes_listened + EXCLUDED.minutes_listened) >= threshold_minutes
        RETURNING minutes_listened, streak_maintained
    )
    SELECT minutes_listened, streak_maintained
    INTO new_minutes, new_maintained
    FROM upserted;

    -- If today is not maintained yet:
    -- break the streak immediately only when yesterday was missed and there are no freezes left.
    IF NOT new_maintained THEN
        SELECT COALESCE(
            (SELECT streak_maintained FROM streak_history WHERE user_id = p_user_id AND date = yesterday),
            FALSE
        ) INTO yesterday_maintained;

        IF current_streak > 0 AND NOT yesterday_maintained AND current_freezes <= 0 THEN
            UPDATE profiles
            SET streak_current = 0,
                streak_multiplier = calculate_streak_multiplier(0)
            WHERE id = p_user_id;
        END IF;

        RETURN;
    END IF;

    -- Today is maintained: optionally apply a freeze for a 1-day gap (yesterday missed).
    yesterday_maintained := COALESCE(
        (SELECT streak_maintained FROM streak_history WHERE user_id = p_user_id AND date = yesterday),
        FALSE
    );
    yesterday_freeze_used := COALESCE(
        (SELECT freeze_used FROM streak_history WHERE user_id = p_user_id AND date = yesterday),
        FALSE
    );
    two_days_ago_maintained := COALESCE(
        (SELECT streak_maintained FROM streak_history WHERE user_id = p_user_id AND date = two_days_ago),
        FALSE
    );

    IF NOT yesterday_maintained AND current_freezes > 0 AND two_days_ago_maintained AND NOT yesterday_freeze_used THEN
        INSERT INTO streak_history (user_id, date, minutes_listened, streak_maintained, freeze_used)
        VALUES (p_user_id, yesterday, 0, TRUE, TRUE)
        ON CONFLICT (user_id, date) DO UPDATE
        SET streak_maintained = TRUE,
            freeze_used = TRUE;

        UPDATE profiles
        SET streak_freezes = GREATEST(streak_freezes - 1, 0)
        WHERE id = p_user_id;
    END IF;

    -- Recalculate streak_current from history ending at streak_date (self-healing).
    WITH days AS (
        SELECT
            gs::date AS day,
            COALESCE(sh.streak_maintained, FALSE) AS maintained
        FROM generate_series((streak_date - 365)::timestamp, streak_date::timestamp, interval '1 day') gs
        LEFT JOIN streak_history sh
            ON sh.user_id = p_user_id AND sh.date = gs::date
        ORDER BY day DESC
    ),
    breakpoint AS (
        SELECT day AS break_day FROM days WHERE maintained = FALSE LIMIT 1
    )
    SELECT COUNT(*)
    INTO new_streak
    FROM days
    WHERE maintained = TRUE
      AND day > COALESCE(
          (SELECT break_day FROM breakpoint),
          (streak_date - 366)
      );

    UPDATE profiles
    SET streak_current = new_streak,
        streak_longest = GREATEST(streak_longest, new_streak),
        streak_multiplier = calculate_streak_multiplier(new_streak)
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
