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
