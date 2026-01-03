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
('duel_duration_minutes', '90', 'Dauer eines Duells in Minuten'),
('duel_frequency_minutes', '60', 'Frequenz neuer Duelle in Minuten'),
('streak_threshold_minutes', '10', 'Mindestminuten für Streak-Erhalt'),
('streak_reset_hour', '4', 'Stunde für Streak-Reset (04:00)'),
('openai_model', '"gpt-5-mini"', 'OpenAI Modell für Content-Generierung'),
('openai_image_model', '"gpt-image-1"', 'OpenAI Modell für Bildgenerierung'),
('theme_generation_hour', '4', 'Stunde für tägliche Theme-Generierung'),
('maintenance_mode', 'false', 'Wartungsmodus aktiv'),
('stream_enabled', 'true', 'Stream aktiv'),
('vibes_enabled', 'true', 'Vibes-System aktiv'),
('vibes_per_feedback', '5', 'Vibes pro Feedback'),
('vibes_per_feedback_extended', '9', 'Bonus fuer erweitertes Feedback'),
('vibes_per_vote', '20', 'Vibes pro Duell-Vote'),
('duels_enabled', 'true', 'Duelle aktiv'),
('streaks_enabled', 'true', 'Streaks aktiv');
