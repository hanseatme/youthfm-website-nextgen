-- Next Generation Radio - Initial Schema
-- Version: 1.0.0
-- Diese Migration erstellt alle Tabellen für die Radio-Plattform

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE profile_visibility AS ENUM ('public', 'followers', 'private');
CREATE TYPE duel_type AS ENUM ('classic', 'comeback', 'newbie', 'community');
CREATE TYPE duel_status AS ENUM ('scheduled', 'active', 'completed', 'cancelled');
CREATE TYPE duel_vote AS ENUM ('a', 'b');
CREATE TYPE badge_category AS ENUM ('listening', 'feedback', 'duel', 'streak', 'community', 'event');
CREATE TYPE chat_channel AS ENUM ('main', 'duel', 'theme');
CREATE TYPE message_status AS ENUM ('active', 'deleted', 'flagged');
CREATE TYPE challenge_type AS ENUM ('daily', 'weekly');
CREATE TYPE shop_category AS ENUM ('influence', 'personalization', 'status', 'extras');
CREATE TYPE avatar_category AS ENUM ('standard', 'premium', 'exclusive');

-- ============================================
-- TABLES
-- ============================================

-- 1. Profiles (extends auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    display_name TEXT,
    location TEXT,
    avatar_id INTEGER,
    banner_url TEXT,
    username_color TEXT DEFAULT '#ffffff',
    bio TEXT,
    vibes_total INTEGER DEFAULT 0 NOT NULL,
    vibes_available INTEGER DEFAULT 0 NOT NULL,
    streak_current INTEGER DEFAULT 0 NOT NULL,
    streak_longest INTEGER DEFAULT 0 NOT NULL,
    streak_multiplier DECIMAL(3,2) DEFAULT 1.0 NOT NULL,
    streak_freezes INTEGER DEFAULT 1 NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE NOT NULL,
    profile_visibility profile_visibility DEFAULT 'public' NOT NULL,
    online_status_visible BOOLEAN DEFAULT TRUE NOT NULL,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 30),
    CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]+$'),
    CONSTRAINT display_name_length CHECK (char_length(display_name) <= 50),
    CONSTRAINT bio_length CHECK (char_length(bio) <= 500)
);

-- 2. Songs
CREATE TABLE songs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT,
    title TEXT NOT NULL,
    artist TEXT,
    artwork_url TEXT,
    duration_seconds INTEGER,
    play_count INTEGER DEFAULT 0 NOT NULL,
    avg_energy DECIMAL(3,1),
    dominant_mood TEXT,
    community_score DECIMAL(3,2),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_songs_external_id ON songs(external_id);
CREATE INDEX idx_songs_title_artist ON songs(title, artist);

-- 3. Song Feedback
CREATE TABLE song_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    reaction INTEGER NOT NULL CHECK (reaction >= 1 AND reaction <= 5),
    energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),
    mood_tags TEXT[],
    activity_tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_song_feedback_user ON song_feedback(user_id);
CREATE INDEX idx_song_feedback_song ON song_feedback(song_id);
CREATE INDEX idx_song_feedback_created ON song_feedback(created_at DESC);

-- 4. Duels
CREATE TABLE duels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    song_a_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    song_b_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    duel_type duel_type DEFAULT 'classic' NOT NULL,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    votes_a INTEGER DEFAULT 0 NOT NULL,
    votes_b INTEGER DEFAULT 0 NOT NULL,
    winner_id UUID REFERENCES songs(id),
    status duel_status DEFAULT 'scheduled' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT different_songs CHECK (song_a_id != song_b_id)
);

CREATE INDEX idx_duels_status ON duels(status);
CREATE INDEX idx_duels_started ON duels(started_at DESC);

-- 5. Duel Votes
CREATE TABLE duel_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    duel_id UUID NOT NULL REFERENCES duels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    voted_for duel_vote NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(duel_id, user_id)
);

CREATE INDEX idx_duel_votes_duel ON duel_votes(duel_id);
CREATE INDEX idx_duel_votes_user ON duel_votes(user_id);

-- 6. Badges
CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    name_en TEXT,
    description TEXT NOT NULL,
    description_en TEXT,
    icon TEXT NOT NULL,
    category badge_category NOT NULL,
    condition_type TEXT NOT NULL,
    condition_value JSONB,
    vibes_reward INTEGER DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_badges_category ON badges(category);
CREATE INDEX idx_badges_active ON badges(is_active) WHERE is_active = TRUE;

-- 7. User Badges
CREATE TABLE user_badges (
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (user_id, badge_id)
);

CREATE INDEX idx_user_badges_user ON user_badges(user_id);

-- 8. Streak History
CREATE TABLE streak_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    minutes_listened INTEGER DEFAULT 0 NOT NULL,
    streak_maintained BOOLEAN DEFAULT FALSE NOT NULL,
    freeze_used BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, date)
);

CREATE INDEX idx_streak_history_user_date ON streak_history(user_id, date DESC);

-- 9. Daily Themes
CREATE TABLE daily_themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE UNIQUE NOT NULL,
    title TEXT NOT NULL,
    title_en TEXT,
    teaser TEXT,
    teaser_en TEXT,
    image_url TEXT,
    mood_tags TEXT[],
    activity_tags TEXT[],
    community_question TEXT,
    community_question_en TEXT,
    fun_fact TEXT,
    fun_fact_en TEXT,
    weather_condition TEXT,
    is_community_suggested BOOLEAN DEFAULT FALSE NOT NULL,
    is_generated BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_daily_themes_date ON daily_themes(date DESC);

-- 10. Chat Messages
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    channel chat_channel DEFAULT 'main' NOT NULL,
    content TEXT NOT NULL CHECK (char_length(content) <= 500),
    reply_to_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
    status message_status DEFAULT 'active' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_chat_messages_channel ON chat_messages(channel, created_at DESC);
CREATE INDEX idx_chat_messages_user ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_status ON chat_messages(status) WHERE status = 'active';

-- 11. Activity Feed
CREATE TABLE activity_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_data JSONB,
    is_public BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_activity_feed_created ON activity_feed(created_at DESC);
CREATE INDEX idx_activity_feed_user ON activity_feed(user_id, created_at DESC);
CREATE INDEX idx_activity_feed_public ON activity_feed(created_at DESC) WHERE is_public = TRUE;

-- 12. Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content JSONB,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- 13. Vibes Transactions
CREATE TABLE vibes_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,
    reference_type TEXT,
    reference_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_vibes_transactions_user ON vibes_transactions(user_id, created_at DESC);

-- 14. Challenges
CREATE TABLE challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type challenge_type NOT NULL,
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    name_en TEXT,
    description TEXT NOT NULL,
    description_en TEXT,
    condition_type TEXT NOT NULL,
    condition_value JSONB,
    vibes_reward INTEGER DEFAULT 50 NOT NULL,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(slug, valid_from)
);

CREATE INDEX idx_challenges_active ON challenges(is_active, valid_from, valid_until);
CREATE INDEX idx_challenges_type ON challenges(type);

-- 15. User Challenges
CREATE TABLE user_challenges (
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    progress INTEGER DEFAULT 0 NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (user_id, challenge_id)
);

CREATE INDEX idx_user_challenges_user ON user_challenges(user_id);

-- 16. Followers
CREATE TABLE followers (
    follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (follower_id, following_id),
    CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

CREATE INDEX idx_followers_following ON followers(following_id);
CREATE INDEX idx_followers_follower ON followers(follower_id);

-- 17. Shop Items
CREATE TABLE shop_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    name_en TEXT,
    description TEXT NOT NULL,
    description_en TEXT,
    category shop_category NOT NULL,
    cost_vibes INTEGER NOT NULL CHECK (cost_vibes > 0),
    metadata JSONB,
    is_available BOOLEAN DEFAULT TRUE NOT NULL,
    stock_limit INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_shop_items_category ON shop_items(category);
CREATE INDEX idx_shop_items_available ON shop_items(is_available) WHERE is_available = TRUE;

-- 18. User Purchases
CREATE TABLE user_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
    cost_vibes INTEGER NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_user_purchases_user ON user_purchases(user_id, created_at DESC);

-- 19. Predefined Avatars
CREATE TABLE predefined_avatars (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    image_url TEXT NOT NULL,
    category avatar_category DEFAULT 'standard' NOT NULL,
    unlock_condition JSONB,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_predefined_avatars_category ON predefined_avatars(category);

-- 20. Listening Sessions
CREATE TABLE listening_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    ended_at TIMESTAMPTZ,
    duration_minutes INTEGER,
    songs_heard INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_listening_sessions_user ON listening_sessions(user_id, started_at DESC);

-- 21. App Settings
CREATE TABLE app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER app_settings_updated_at
    BEFORE UPDATE ON app_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
-- Next Generation Radio - Row Level Security Policies
-- Version: 1.0.0

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE duels ENABLE ROW LEVEL SECURITY;
ALTER TABLE duel_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE streak_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE vibes_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE predefined_avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE listening_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND is_admin = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if profile is visible to current user
CREATE OR REPLACE FUNCTION can_view_profile(profile_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    visibility profile_visibility;
    is_following BOOLEAN;
BEGIN
    SELECT profile_visibility INTO visibility FROM profiles WHERE id = profile_id;

    IF visibility = 'public' THEN
        RETURN TRUE;
    ELSIF visibility = 'followers' THEN
        RETURN EXISTS (
            SELECT 1 FROM followers
            WHERE follower_id = auth.uid() AND following_id = profile_id
        ) OR profile_id = auth.uid();
    ELSE
        RETURN profile_id = auth.uid();
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Anyone can view public profiles
CREATE POLICY "Public profiles are viewable by everyone"
    ON profiles FOR SELECT
    USING (
        profile_visibility = 'public'
        OR id = auth.uid()
        OR (profile_visibility = 'followers' AND EXISTS (
            SELECT 1 FROM followers WHERE follower_id = auth.uid() AND following_id = profiles.id
        ))
    );

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (id = auth.uid());

-- Users can update their own profile (except is_admin)
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- ============================================
-- SONGS POLICIES
-- ============================================

-- Everyone can view active songs
CREATE POLICY "Active songs are viewable by everyone"
    ON songs FOR SELECT
    USING (is_active = TRUE OR is_admin());

-- Only admins can manage songs
CREATE POLICY "Admins can manage songs"
    ON songs FOR ALL
    USING (is_admin());

-- ============================================
-- SONG FEEDBACK POLICIES
-- ============================================

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback"
    ON song_feedback FOR SELECT
    USING (user_id = auth.uid());

-- Aggregated feedback is public (via functions)
CREATE POLICY "Authenticated users can insert feedback"
    ON song_feedback FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Users can update their own feedback
CREATE POLICY "Users can update own feedback"
    ON song_feedback FOR UPDATE
    USING (user_id = auth.uid());

-- Users can delete their own feedback
CREATE POLICY "Users can delete own feedback"
    ON song_feedback FOR DELETE
    USING (user_id = auth.uid());

-- ============================================
-- DUELS POLICIES
-- ============================================

-- Everyone can view duels
CREATE POLICY "Duels are viewable by everyone"
    ON duels FOR SELECT
    USING (TRUE);

-- Only admins/system can manage duels
CREATE POLICY "Admins can manage duels"
    ON duels FOR ALL
    USING (is_admin());

-- ============================================
-- DUEL VOTES POLICIES
-- ============================================

-- Everyone can view votes
CREATE POLICY "Duel votes are viewable by everyone"
    ON duel_votes FOR SELECT
    USING (TRUE);

-- Authenticated users can vote once per duel
CREATE POLICY "Authenticated users can vote"
    ON duel_votes FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND user_id = auth.uid()
        AND NOT EXISTS (
            SELECT 1 FROM duel_votes WHERE duel_id = duel_votes.duel_id AND user_id = auth.uid()
        )
    );

-- ============================================
-- BADGES POLICIES
-- ============================================

-- Everyone can view active badges
CREATE POLICY "Active badges are viewable by everyone"
    ON badges FOR SELECT
    USING (is_active = TRUE OR is_admin());

-- Only admins can manage badges
CREATE POLICY "Admins can manage badges"
    ON badges FOR ALL
    USING (is_admin());

-- ============================================
-- USER BADGES POLICIES
-- ============================================

-- Everyone can view user badges (for public profiles)
CREATE POLICY "User badges are viewable"
    ON user_badges FOR SELECT
    USING (can_view_profile(user_id));

-- System inserts badges (via functions)
CREATE POLICY "System can insert user badges"
    ON user_badges FOR INSERT
    WITH CHECK (is_admin() OR auth.uid() = user_id);

-- ============================================
-- STREAK HISTORY POLICIES
-- ============================================

-- Users can view their own streak history
CREATE POLICY "Users can view own streak history"
    ON streak_history FOR SELECT
    USING (user_id = auth.uid());

-- System manages streak history
CREATE POLICY "Users can insert own streak history"
    ON streak_history FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own streak history"
    ON streak_history FOR UPDATE
    USING (user_id = auth.uid());

-- ============================================
-- DAILY THEMES POLICIES
-- ============================================

-- Everyone can view themes
CREATE POLICY "Daily themes are viewable by everyone"
    ON daily_themes FOR SELECT
    USING (TRUE);

-- Only admins can manage themes
CREATE POLICY "Admins can manage themes"
    ON daily_themes FOR ALL
    USING (is_admin());

-- ============================================
-- CHAT MESSAGES POLICIES
-- ============================================

-- Everyone can view active messages
CREATE POLICY "Active chat messages are viewable"
    ON chat_messages FOR SELECT
    USING (status = 'active' OR user_id = auth.uid() OR is_admin());

-- Authenticated users can send messages
CREATE POLICY "Authenticated users can send messages"
    ON chat_messages FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Users can update own messages, admins can update all
CREATE POLICY "Users can update own messages"
    ON chat_messages FOR UPDATE
    USING (user_id = auth.uid() OR is_admin());

-- Users can delete own messages, admins can delete all
CREATE POLICY "Users can delete own messages"
    ON chat_messages FOR DELETE
    USING (user_id = auth.uid() OR is_admin());

-- ============================================
-- ACTIVITY FEED POLICIES
-- ============================================

-- Public activities are viewable
CREATE POLICY "Public activities are viewable"
    ON activity_feed FOR SELECT
    USING (is_public = TRUE OR user_id = auth.uid());

-- Users can create own activities
CREATE POLICY "Users can create own activities"
    ON activity_feed FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- ============================================
-- NOTIFICATIONS POLICIES
-- ============================================

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    USING (user_id = auth.uid());

-- System creates notifications
CREATE POLICY "System can create notifications"
    ON notifications FOR INSERT
    WITH CHECK (is_admin() OR user_id = auth.uid());

-- Users can update own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (user_id = auth.uid());

-- Users can delete own notifications
CREATE POLICY "Users can delete own notifications"
    ON notifications FOR DELETE
    USING (user_id = auth.uid());

-- ============================================
-- VIBES TRANSACTIONS POLICIES
-- ============================================

-- Users can view their own transactions
CREATE POLICY "Users can view own vibes transactions"
    ON vibes_transactions FOR SELECT
    USING (user_id = auth.uid());

-- System manages transactions (via functions)
CREATE POLICY "System can insert vibes transactions"
    ON vibes_transactions FOR INSERT
    WITH CHECK (is_admin() OR user_id = auth.uid());

-- ============================================
-- CHALLENGES POLICIES
-- ============================================

-- Everyone can view active challenges
CREATE POLICY "Active challenges are viewable"
    ON challenges FOR SELECT
    USING (is_active = TRUE OR is_admin());

-- Only admins can manage challenges
CREATE POLICY "Admins can manage challenges"
    ON challenges FOR ALL
    USING (is_admin());

-- ============================================
-- USER CHALLENGES POLICIES
-- ============================================

-- Users can view their own challenges
CREATE POLICY "Users can view own challenges"
    ON user_challenges FOR SELECT
    USING (user_id = auth.uid());

-- Users can join challenges
CREATE POLICY "Users can join challenges"
    ON user_challenges FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- System updates challenge progress
CREATE POLICY "Users can update own challenge progress"
    ON user_challenges FOR UPDATE
    USING (user_id = auth.uid());

-- ============================================
-- FOLLOWERS POLICIES
-- ============================================

-- Everyone can see follower relationships (for public profiles)
CREATE POLICY "Follower relationships are viewable"
    ON followers FOR SELECT
    USING (TRUE);

-- Users can follow others
CREATE POLICY "Users can follow"
    ON followers FOR INSERT
    WITH CHECK (follower_id = auth.uid());

-- Users can unfollow
CREATE POLICY "Users can unfollow"
    ON followers FOR DELETE
    USING (follower_id = auth.uid());

-- ============================================
-- SHOP ITEMS POLICIES
-- ============================================

-- Everyone can view available items
CREATE POLICY "Available shop items are viewable"
    ON shop_items FOR SELECT
    USING (is_available = TRUE OR is_admin());

-- Only admins can manage shop items
CREATE POLICY "Admins can manage shop items"
    ON shop_items FOR ALL
    USING (is_admin());

-- ============================================
-- USER PURCHASES POLICIES
-- ============================================

-- Users can view their own purchases
CREATE POLICY "Users can view own purchases"
    ON user_purchases FOR SELECT
    USING (user_id = auth.uid());

-- Users can make purchases
CREATE POLICY "Users can make purchases"
    ON user_purchases FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- ============================================
-- PREDEFINED AVATARS POLICIES
-- ============================================

-- Everyone can view avatars
CREATE POLICY "Avatars are viewable by everyone"
    ON predefined_avatars FOR SELECT
    USING (TRUE);

-- Only admins can manage avatars
CREATE POLICY "Admins can manage avatars"
    ON predefined_avatars FOR ALL
    USING (is_admin());

-- ============================================
-- LISTENING SESSIONS POLICIES
-- ============================================

-- Users can view their own sessions
CREATE POLICY "Users can view own listening sessions"
    ON listening_sessions FOR SELECT
    USING (user_id = auth.uid());

-- Users can create sessions
CREATE POLICY "Users can create listening sessions"
    ON listening_sessions FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Users can update their own sessions
CREATE POLICY "Users can update own listening sessions"
    ON listening_sessions FOR UPDATE
    USING (user_id = auth.uid());

-- ============================================
-- APP SETTINGS POLICIES
-- ============================================

-- Everyone can read settings
CREATE POLICY "App settings are viewable"
    ON app_settings FOR SELECT
    USING (TRUE);

-- Only admins can manage settings
CREATE POLICY "Admins can manage settings"
    ON app_settings FOR ALL
    USING (is_admin());
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
-- Next Generation Radio - Seed Data
-- Version: 1.0.0

-- ============================================
-- PREDEFINED AVATARS
-- ============================================

INSERT INTO predefined_avatars (name, image_url, category, sort_order) VALUES
-- Standard Avatars (always available)
('Cosmic Cat', '/avatars/cosmic-cat.png', 'standard', 1),
('Neon Wolf', '/avatars/neon-wolf.png', 'standard', 2),
('Sunset Fox', '/avatars/sunset-fox.png', 'standard', 3),
('Ocean Owl', '/avatars/ocean-owl.png', 'standard', 4),
('Electric Bear', '/avatars/electric-bear.png', 'standard', 5),
('Midnight Rabbit', '/avatars/midnight-rabbit.png', 'standard', 6),
('Aurora Deer', '/avatars/aurora-deer.png', 'standard', 7),
('Crystal Lion', '/avatars/crystal-lion.png', 'standard', 8),
('Vapor Penguin', '/avatars/vapor-penguin.png', 'standard', 9),
('Retro Panda', '/avatars/retro-panda.png', 'standard', 10),
('Synthwave Tiger', '/avatars/synthwave-tiger.png', 'standard', 11),
('Lofi Koala', '/avatars/lofi-koala.png', 'standard', 12),
('Chill Sloth', '/avatars/chill-sloth.png', 'standard', 13),
('Groove Gorilla', '/avatars/groove-gorilla.png', 'standard', 14),
('Beat Bunny', '/avatars/beat-bunny.png', 'standard', 15),

-- Premium Avatars (unlockable via vibes)
('Golden Phoenix', '/avatars/golden-phoenix.png', 'premium', 16),
('Diamond Dragon', '/avatars/diamond-dragon.png', 'premium', 17),
('Plasma Unicorn', '/avatars/plasma-unicorn.png', 'premium', 18),
('Nebula Whale', '/avatars/nebula-whale.png', 'premium', 19),
('Galaxy Dolphin', '/avatars/galaxy-dolphin.png', 'premium', 20),

-- Exclusive Avatars (special achievements)
('Legendary DJ', '/avatars/legendary-dj.png', 'exclusive', 21),
('Founder Badge', '/avatars/founder.png', 'exclusive', 22),
('Century Club', '/avatars/century-club.png', 'exclusive', 23);

-- ============================================
-- BADGES
-- ============================================

-- Listening Badges
INSERT INTO badges (slug, name, name_en, description, description_en, icon, category, condition_type, condition_value, vibes_reward) VALUES
('first-listen', 'Erster Ton', 'First Listen', 'Du hast deinen ersten Song gehört', 'You listened to your first song', '🎧', 'listening', 'songs_heard', '{"count": 1}', 10),
('early-bird', 'Frühaufsteher', 'Early Bird', '10x vor 7:00 Uhr gehört', 'Listened 10 times before 7:00 AM', '🌅', 'listening', 'early_listens', '{"count": 10}', 50),
('night-owl', 'Nachteule', 'Night Owl', '10x nach Mitternacht gehört', 'Listened 10 times after midnight', '🌙', 'listening', 'late_listens', '{"count": 10}', 50),
('day-person', 'Tagesmensch', 'Day Person', '50x zwischen 9-17 Uhr gehört', 'Listened 50 times between 9 AM - 5 PM', '☀️', 'listening', 'day_listens', '{"count": 50}', 75),
('marathon', 'Marathon', 'Marathon', '4 Stunden am Stück gehört', 'Listened for 4 hours straight', '📻', 'listening', 'session_duration', '{"minutes": 240}', 100),
('around-the-clock', 'Rund um die Uhr', 'Around the Clock', 'Zu jeder Stunde mindestens 1x gehört', 'Listened at least once during every hour', '⏰', 'listening', 'all_hours', '{"count": 24}', 150),

-- Feedback Badges
('first-opinion', 'Erste Meinung', 'First Opinion', 'Erstes Feedback abgegeben', 'Gave your first feedback', '👍', 'feedback', 'feedback_count', '{"count": 1}', 10),
('enthusiast', 'Enthusiast', 'Enthusiast', '50x "Liebe es" gevotet', 'Voted "Love it" 50 times', '🔥', 'feedback', 'love_votes', '{"count": 50}', 75),
('balanced', 'Ausgewogen', 'Balanced', 'Alle 5 Grundreaktionen mind. 10x genutzt', 'Used all 5 basic reactions at least 10 times', '⚖️', 'feedback', 'all_reactions', '{"min_each": 10}', 100),
('mood-master', 'Mood-Meister', 'Mood Master', '100x Stimmungs-Tags vergeben', 'Gave mood tags 100 times', '🎭', 'feedback', 'mood_tags', '{"count": 100}', 75),
('data-friend', 'Datenfreund', 'Data Friend', '50x vollständiges Feedback gegeben', 'Gave complete feedback 50 times', '📊', 'feedback', 'complete_feedback', '{"count": 50}', 100),
('feedback-machine', 'Feedback-Maschine', 'Feedback Machine', '1.000 Feedbacks insgesamt', 'Gave 1,000 total feedbacks', '💯', 'feedback', 'feedback_count', '{"count": 1000}', 250),

-- Duel Badges
('voter', 'Wähler', 'Voter', 'Erstes Duell mitgemacht', 'Participated in your first duel', '🗳️', 'duel', 'duel_votes', '{"count": 1}', 10),
('accurate', 'Treffsicher', 'Accurate', '10x den Gewinner gewählt', 'Picked the winner 10 times', '✅', 'duel', 'winner_picks', '{"count": 10}', 50),
('seer', 'Seher', 'Seer', '25x den Gewinner gewählt', 'Picked the winner 25 times', '🎯', 'duel', 'winner_picks', '{"count": 25}', 100),
('oracle', 'Orakel', 'Oracle', '50x den Gewinner gewählt', 'Picked the winner 50 times', '🔮', 'duel', 'winner_picks', '{"count": 50}', 150),
('duel-veteran', 'Duell-Veteran', 'Duel Veteran', '100 Duelle teilgenommen', 'Participated in 100 duels', '⚔️', 'duel', 'duel_votes', '{"count": 100}', 150),
('duel-master', 'Duell-Meister', 'Duel Master', '250 Duelle teilgenommen', 'Participated in 250 duels', '🏆', 'duel', 'duel_votes', '{"count": 250}', 300),
('underdog-fan', 'Underdog-Fan', 'Underdog Fan', '10x den Außenseiter gewählt (der gewann)', 'Picked the underdog 10 times (who won)', '🥊', 'duel', 'underdog_wins', '{"count": 10}', 100),
('fastest-finger', 'Schnellster Finger', 'Fastest Finger', '10x als Erster abgestimmt', 'Voted first 10 times', '⚡', 'duel', 'first_votes', '{"count": 10}', 75),

-- Streak Badges
('week-streak', 'Eine Woche dabei', 'One Week Strong', '7-Tage-Streak erreicht', 'Achieved a 7-day streak', '🔥', 'streak', 'streak_days', '{"days": 7}', 100),
('two-weeks', 'Zwei Wochen stark', 'Two Weeks Strong', '14-Tage-Streak erreicht', 'Achieved a 14-day streak', '📻', 'streak', 'streak_days', '{"days": 14}', 200),
('monthly', 'Monatshörer', 'Monthly Listener', '30-Tage-Streak erreicht', 'Achieved a 30-day streak', '🌙', 'streak', 'streak_days', '{"days": 30}', 500),
('two-months', 'Zwei Monate Treue', 'Two Months Strong', '60-Tage-Streak erreicht', 'Achieved a 60-day streak', '⭐', 'streak', 'streak_days', '{"days": 60}', 1000),
('century-club', 'Century Club', 'Century Club', '100-Tage-Streak erreicht', 'Achieved a 100-day streak', '💎', 'streak', 'streak_days', '{"days": 100}', 2500),
('legend', 'Legende', 'Legend', '200-Tage-Streak erreicht', 'Achieved a 200-day streak', '👑', 'streak', 'streak_days', '{"days": 200}', 5000),
('founder-gen', 'Gründergeneration', 'Founder Generation', '365-Tage-Streak erreicht', 'Achieved a 365-day streak', '🏆', 'streak', 'streak_days', '{"days": 365}', 10000),
('wise-pause', 'Weise Pause', 'Wise Pause', 'Streak Freeze erfolgreich eingesetzt', 'Successfully used a streak freeze', '❄️', 'streak', 'freeze_used', '{"count": 1}', 25),

-- Community Badges
('personality', 'Persönlichkeit', 'Personality', 'Profil vollständig ausgefüllt', 'Completed your profile', '👤', 'community', 'profile_complete', '{}', 100),
('chatty', 'Gesprächig', 'Chatty', '25 Chat-Nachrichten gesendet', 'Sent 25 chat messages', '💬', 'community', 'chat_messages', '{"count": 25}', 50),
('regular', 'Stammgast', 'Regular', '100 Chat-Nachrichten gesendet', 'Sent 100 chat messages', '🗣️', 'community', 'chat_messages', '{"count": 100}', 100),
('networker', 'Netzwerker', 'Networker', '3 Freunde eingeladen', 'Invited 3 friends', '👥', 'community', 'referrals', '{"count": 3}', 150),
('influencer', 'Influencer', 'Influencer', '10 Freunde eingeladen', 'Invited 10 friends', '🌟', 'community', 'referrals', '{"count": 10}', 500),
('community-pillar', 'Community-Säule', 'Community Pillar', '30+ Tage aktiv + 50+ Chats + 100+ Feedbacks', 'Active 30+ days with 50+ chats and 100+ feedbacks', '🤝', 'community', 'community_pillar', '{}', 300),
('idea-giver', 'Ideengeber', 'Idea Giver', 'Feature-Vorschlag wurde umgesetzt', 'Your feature suggestion was implemented', '💡', 'community', 'feature_implemented', '{}', 500),

-- Event Badges
('day-one', 'Tag-1-Hörer', 'Day One Listener', 'Am Launch-Tag dabei', 'Joined on launch day', '🚀', 'event', 'launch_day', '{}', 200),
('anniversary', 'Jubiläum', 'Anniversary', 'Am 1-Jahres-Jubiläum aktiv', 'Active on the 1-year anniversary', '🎂', 'event', 'anniversary', '{}', 500);

-- ============================================
-- SHOP ITEMS
-- ============================================

INSERT INTO shop_items (slug, name, name_en, description, description_en, category, cost_vibes, metadata) VALUES
-- Influence
('song-request-pool', 'Song-Wunsch (Pool)', 'Song Request (Pool)', 'Dein Song landet im Kandidaten-Pool für Duelle', 'Your song enters the duel candidate pool', 'influence', 100, '{"type": "song_request"}'),
('song-request-priority', 'Song-Wunsch (Priority)', 'Song Request (Priority)', 'Dein Song ist garantiert im nächsten Duell', 'Your song is guaranteed in the next duel', 'influence', 250, '{"type": "song_request_priority"}'),
('mood-hour', 'Mood-Stunde', 'Mood Hour', '1 Stunde Musik passend zu deiner Wunsch-Stimmung', '1 hour of music matching your desired mood', 'influence', 400, '{"type": "mood_hour"}'),
('dedication', 'Widmung', 'Dedication', 'KI-Moderator erwähnt deinen Namen mit kurzer Nachricht', 'AI moderator mentions your name with a short message', 'influence', 300, '{"type": "dedication"}'),

-- Personalization
('avatar-standard', 'Avatar (Standard-Set)', 'Avatar (Standard Set)', 'Auswahl aus 20 vorgefertigten Avataren', 'Choose from 20 pre-made avatars', 'personalization', 75, '{"type": "avatar", "tier": "standard"}'),
('avatar-premium', 'Avatar (Premium-Set)', 'Avatar (Premium Set)', 'Auswahl aus 50 besonderen Avataren', 'Choose from 50 special avatars', 'personalization', 150, '{"type": "avatar", "tier": "premium"}'),
('avatar-custom', 'Avatar (Custom)', 'Avatar (Custom)', 'KI generiert Avatar nach deiner Beschreibung', 'AI generates an avatar based on your description', 'personalization', 300, '{"type": "avatar", "tier": "custom"}'),
('username-color', 'Username-Farbe', 'Username Color', 'Aus 12 Farben wählbar', 'Choose from 12 colors', 'personalization', 100, '{"type": "color", "tier": "standard"}'),
('username-color-premium', 'Username-Farbe (Premium)', 'Username Color (Premium)', 'Aus 30 Farben + Gradient-Optionen', 'Choose from 30 colors + gradient options', 'personalization', 200, '{"type": "color", "tier": "premium"}'),
('profile-banner', 'Profil-Banner', 'Profile Banner', 'Hintergrundbild für dein Profil', 'Background image for your profile', 'personalization', 150, '{"type": "banner"}'),
('badge-showcase', 'Badge-Showcase', 'Badge Showcase', 'Wähle 3 Badges für prominente Anzeige', 'Choose 3 badges for prominent display', 'personalization', 100, '{"type": "showcase"}'),

-- Status
('founders-wall', 'Founders Wall Eintrag', 'Founders Wall Entry', 'Permanenter Name auf der Unterstützer-Seite', 'Permanent name on the supporters page', 'status', 1000, '{"type": "founders_wall"}'),
('chat-emote', 'Chat-Emote freischalten', 'Unlock Chat Emote', 'Exklusives Emote nur für dich', 'Exclusive emote just for you', 'status', 200, '{"type": "emote"}'),
('verified-badge', 'Verified-Badge', 'Verified Badge', '✓ neben dem Namen (begrenzt verfügbar)', '✓ next to your name (limited availability)', 'status', 2000, '{"type": "verified"}'),

-- Extras
('merch-discount-10', 'Merch-Rabatt 10%', 'Merch Discount 10%', 'Rabattcode per E-Mail', 'Discount code via email', 'extras', 300, '{"type": "merch_discount", "discount": 10}'),
('merch-discount-25', 'Merch-Rabatt 25%', 'Merch Discount 25%', 'Rabattcode per E-Mail', 'Discount code via email', 'extras', 700, '{"type": "merch_discount", "discount": 25}'),
('early-access', 'Early Access', 'Early Access', 'Neue Features 1 Woche früher testen', 'Test new features 1 week early', 'extras', 500, '{"type": "early_access"}'),
('stats-export', 'Statistik-Export', 'Stats Export', 'Deine komplette Hör-Historie als CSV', 'Your complete listening history as CSV', 'extras', 150, '{"type": "export"}');

-- ============================================
-- DEFAULT APP SETTINGS
-- ============================================

INSERT INTO app_settings (key, value, description) VALUES
('stream_url', '"https://stream.hanseat.me/stream"', 'URL des Radio-Streams'),
('now_playing_api', '"https://yfm.hanseat.me/api/nowplaying.json"', 'URL der Now Playing API'),
('poll_interval', '5000', 'Polling-Intervall für Now Playing in ms'),
('duel_duration_minutes', '90', 'Dauer eines Duells in Sekunden'),
('duel_frequency_minutes', '60', 'Frequenz neuer Duelle in Minuten'),
('streak_threshold_minutes', '10', 'Mindestminuten für Streak-Erhalt'),
('streak_reset_hour', '4', 'Stunde für Streak-Reset (04:00)'),
('openai_model', '"gpt-5-mini"', 'OpenAI Modell für Content-Generierung'),
('openai_image_model', '"gpt-image-1"', 'OpenAI Modell für Bildgenerierung'),
('theme_generation_hour', '4', 'Stunde für tägliche Theme-Generierung'),
('maintenance_mode', 'false', 'Wartungsmodus aktiv');
