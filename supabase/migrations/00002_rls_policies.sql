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
