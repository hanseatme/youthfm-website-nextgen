-- Update functions for settings-aware vibes and duel voting

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
    vibes_enabled BOOLEAN := TRUE;
BEGIN
    SELECT COALESCE(value::text::boolean, TRUE)
    INTO vibes_enabled
    FROM app_settings
    WHERE key = 'vibes_enabled'
    LIMIT 1;

    IF NOT vibes_enabled THEN
        SELECT vibes_available INTO new_total FROM profiles WHERE id = p_user_id;
        RETURN COALESCE(new_total, 0);
    END IF;

    SELECT streak_multiplier INTO multiplier FROM profiles WHERE id = p_user_id;
    IF multiplier IS NULL THEN multiplier := 1.0; END IF;

    p_amount := FLOOR(p_amount * multiplier);

    UPDATE profiles
    SET vibes_total = vibes_total + p_amount,
        vibes_available = vibes_available + p_amount
    WHERE id = p_user_id
    RETURNING vibes_available INTO new_total;

    INSERT INTO vibes_transactions (user_id, amount, reason, reference_type, reference_id)
    VALUES (p_user_id, p_amount, p_reason, p_reference_type, p_reference_id);

    RETURN new_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
    vibes_enabled BOOLEAN := TRUE;
BEGIN
    SELECT COALESCE(value::text::boolean, TRUE)
    INTO vibes_enabled
    FROM app_settings
    WHERE key = 'vibes_enabled'
    LIMIT 1;

    IF NOT vibes_enabled THEN
        RETURN FALSE;
    END IF;

    SELECT vibes_available INTO current_vibes FROM profiles WHERE id = p_user_id FOR UPDATE;

    IF current_vibes < p_amount THEN
        RETURN FALSE;
    END IF;

    UPDATE profiles
    SET vibes_available = vibes_available - p_amount
    WHERE id = p_user_id;

    INSERT INTO vibes_transactions (user_id, amount, reason, reference_type, reference_id)
    VALUES (p_user_id, -p_amount, p_reason, p_reference_type, p_reference_id);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cast_duel_vote(p_duel_id UUID, p_vote duel_vote)
RETURNS INTEGER AS $$
DECLARE
    duel_current_status duel_status;
    vote_count INTEGER;
    vibes_reward INTEGER := 0;
    vibes_enabled BOOLEAN := TRUE;
    streak_multiplier DECIMAL := 1.0;
    earned_amount INTEGER := 0;
BEGIN
    SELECT status INTO duel_current_status FROM duels WHERE id = p_duel_id;
    IF duel_current_status != 'active' THEN
        RAISE EXCEPTION 'Duel is not active';
    END IF;

    SELECT COUNT(*) INTO vote_count FROM duel_votes
    WHERE duel_id = p_duel_id AND user_id = auth.uid();

    IF vote_count > 0 THEN
        RAISE EXCEPTION 'Already voted in this duel';
    END IF;

    INSERT INTO duel_votes (duel_id, user_id, voted_for)
    VALUES (p_duel_id, auth.uid(), p_vote);

    IF p_vote = 'a' THEN
        UPDATE duels SET votes_a = votes_a + 1 WHERE id = p_duel_id;
    ELSE
        UPDATE duels SET votes_b = votes_b + 1 WHERE id = p_duel_id;
    END IF;

    SELECT COALESCE(value::text::boolean, TRUE)
    INTO vibes_enabled
    FROM app_settings
    WHERE key = 'vibes_enabled'
    LIMIT 1;

    IF vibes_enabled THEN
        SELECT COALESCE(value::text::int, 20)
        INTO vibes_reward
        FROM app_settings
        WHERE key = 'vibes_per_vote'
        LIMIT 1;

        SELECT COALESCE(streak_multiplier, 1.0)
        INTO streak_multiplier
        FROM profiles
        WHERE id = auth.uid();

        earned_amount := FLOOR(vibes_reward * streak_multiplier);

        PERFORM add_vibes(auth.uid(), vibes_reward, 'Duel participation', 'duel', p_duel_id);
    END IF;

    RETURN earned_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
