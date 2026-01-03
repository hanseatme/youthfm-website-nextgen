export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ProfileVisibility = 'public' | 'followers' | 'private'
export type DuelType = 'classic' | 'comeback' | 'newbie' | 'community' | 'text'
export type DuelStatus = 'scheduled' | 'active' | 'completed' | 'cancelled'
export type DuelVote = 'a' | 'b'
export type BadgeCategory = 'listening' | 'feedback' | 'duel' | 'streak' | 'community' | 'event'
export type ChatChannel = 'main' | 'duel' | 'theme' | 'studio'
export type MessageStatus = 'active' | 'deleted' | 'flagged'
export type ChallengeType = 'daily' | 'weekly'
export type ShopCategory = 'influence' | 'personalization' | 'status' | 'extras'
export type AvatarCategory = 'standard' | 'premium' | 'exclusive'

export interface Database {
  public: {
    Tables: {
        profiles: {
          Row: {
            id: string
            username: string | null
            display_name: string | null
            location: string | null
            avatar_id: number | null
            banner_url: string | null
            username_color: string | null
            bio: string | null
            vibes_total: number
            vibes_available: number
            streak_current: number
            streak_longest: number
            streak_multiplier: number
            streak_freezes: number
            skip_credits: number
            song_request_pool_credits: number
            dedication_credits: number
            badge_showcase_slots: number
            avatar_tier: string
            banner_unlocked: boolean
            badges_showcase: string[]
            is_admin: boolean
            profile_visibility: ProfileVisibility
            online_status_visible: boolean
            listening_minutes_visible: boolean
            last_seen_at: string | null
            created_at: string
            updated_at: string
          }
          Insert: {
            id: string
            username?: string | null
            display_name?: string | null
            location?: string | null
            avatar_id?: number | null
            banner_url?: string | null
            username_color?: string | null
            bio?: string | null
            vibes_total?: number
            vibes_available?: number
            streak_current?: number
            streak_longest?: number
            streak_multiplier?: number
            streak_freezes?: number
            skip_credits?: number
            song_request_pool_credits?: number
            dedication_credits?: number
            badge_showcase_slots?: number
            avatar_tier?: string
            banner_unlocked?: boolean
            badges_showcase?: string[]
            is_admin?: boolean
            profile_visibility?: ProfileVisibility
            online_status_visible?: boolean
            listening_minutes_visible?: boolean
            last_seen_at?: string | null
            created_at?: string
            updated_at?: string
          }
          Update: {
            id?: string
            username?: string | null
            display_name?: string | null
            location?: string | null
            avatar_id?: number | null
            banner_url?: string | null
            username_color?: string | null
            bio?: string | null
            vibes_total?: number
            vibes_available?: number
            streak_current?: number
            streak_longest?: number
            streak_multiplier?: number
            streak_freezes?: number
            skip_credits?: number
            song_request_pool_credits?: number
            dedication_credits?: number
            badge_showcase_slots?: number
            avatar_tier?: string
            banner_unlocked?: boolean
            badges_showcase?: string[]
            is_admin?: boolean
            profile_visibility?: ProfileVisibility
            online_status_visible?: boolean
            listening_minutes_visible?: boolean
            last_seen_at?: string | null
            created_at?: string
            updated_at?: string
          }
        }
      songs: {
        Row: {
          id: string
          external_id: string | null
          title: string
          artist: string | null
          artwork_url: string | null
          duration_seconds: number | null
          play_count: number
          avg_energy: number | null
          dominant_mood: string | null
          community_score: number | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          external_id?: string | null
          title: string
          artist?: string | null
          artwork_url?: string | null
          duration_seconds?: number | null
          play_count?: number
          avg_energy?: number | null
          dominant_mood?: string | null
          community_score?: number | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          external_id?: string | null
          title?: string
          artist?: string | null
          artwork_url?: string | null
          duration_seconds?: number | null
          play_count?: number
          avg_energy?: number | null
          dominant_mood?: string | null
          community_score?: number | null
          is_active?: boolean
          created_at?: string
        }
      }
      song_feedback: {
        Row: {
          id: string
          user_id: string
          song_id: string
          reaction: number
          energy_level: number | null
          mood_tags: string[] | null
          activity_tags: string[] | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          song_id: string
          reaction: number
          energy_level?: number | null
          mood_tags?: string[] | null
          activity_tags?: string[] | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          song_id?: string
          reaction?: number
          energy_level?: number | null
          mood_tags?: string[] | null
          activity_tags?: string[] | null
          created_at?: string
        }
      }
      duels: {
        Row: {
          id: string
          song_a_id: string | null
          song_b_id: string | null
          duel_type: DuelType
          prompt: string | null
          option_a_text: string | null
          option_b_text: string | null
          started_at: string | null
          ended_at: string | null
          votes_a: number
          votes_b: number
          winner_id: string | null
          status: DuelStatus
          created_at: string
        }
        Insert: {
          id?: string
          song_a_id?: string | null
          song_b_id?: string | null
          duel_type?: DuelType
          prompt?: string | null
          option_a_text?: string | null
          option_b_text?: string | null
          started_at?: string | null
          ended_at?: string | null
          votes_a?: number
          votes_b?: number
          winner_id?: string | null
          status?: DuelStatus
          created_at?: string
        }
        Update: {
          id?: string
          song_a_id?: string | null
          song_b_id?: string | null
          duel_type?: DuelType
          prompt?: string | null
          option_a_text?: string | null
          option_b_text?: string | null
          started_at?: string | null
          ended_at?: string | null
          votes_a?: number
          votes_b?: number
          winner_id?: string | null
          status?: DuelStatus
          created_at?: string
        }
      }
      duel_votes: {
        Row: {
          id: string
          duel_id: string
          user_id: string
          voted_for: DuelVote
          created_at: string
        }
        Insert: {
          id?: string
          duel_id: string
          user_id: string
          voted_for: DuelVote
          created_at?: string
        }
        Update: {
          id?: string
          duel_id?: string
          user_id?: string
          voted_for?: DuelVote
          created_at?: string
        }
      }
      badges: {
        Row: {
          id: string
          slug: string
          name: string
          name_en: string | null
          description: string
          description_en: string | null
          icon: string
          category: BadgeCategory
          condition_type: string
          condition_value: Json | null
          vibes_reward: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          name_en?: string | null
          description: string
          description_en?: string | null
          icon: string
          category: BadgeCategory
          condition_type: string
          condition_value?: Json | null
          vibes_reward?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          name_en?: string | null
          description?: string
          description_en?: string | null
          icon?: string
          category?: BadgeCategory
          condition_type?: string
          condition_value?: Json | null
          vibes_reward?: number
          is_active?: boolean
          created_at?: string
        }
      }
      user_badges: {
        Row: {
          user_id: string
          badge_id: string
          unlocked_at: string
        }
        Insert: {
          user_id: string
          badge_id: string
          unlocked_at?: string
        }
        Update: {
          user_id?: string
          badge_id?: string
          unlocked_at?: string
        }
      }
      streak_history: {
        Row: {
          id: string
          user_id: string
          date: string
          minutes_listened: number
          streak_maintained: boolean
          freeze_used: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          minutes_listened?: number
          streak_maintained?: boolean
          freeze_used?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          minutes_listened?: number
          streak_maintained?: boolean
          freeze_used?: boolean
          created_at?: string
        }
      }
      daily_themes: {
        Row: {
          id: string
          date: string
          title: string
          title_en: string | null
          teaser: string | null
          teaser_en: string | null
          image_url: string | null
          mood_tags: string[] | null
          activity_tags: string[] | null
          community_question: string | null
          community_question_en: string | null
          fun_fact: string | null
          fun_fact_en: string | null
          weather_condition: string | null
          is_community_suggested: boolean
          is_generated: boolean
          created_at: string
        }
        Insert: {
          id?: string
          date: string
          title: string
          title_en?: string | null
          teaser?: string | null
          teaser_en?: string | null
          image_url?: string | null
          mood_tags?: string[] | null
          activity_tags?: string[] | null
          community_question?: string | null
          community_question_en?: string | null
          fun_fact?: string | null
          fun_fact_en?: string | null
          weather_condition?: string | null
          is_community_suggested?: boolean
          is_generated?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          date?: string
          title?: string
          title_en?: string | null
          teaser?: string | null
          teaser_en?: string | null
          image_url?: string | null
          mood_tags?: string[] | null
          activity_tags?: string[] | null
          community_question?: string | null
          community_question_en?: string | null
          fun_fact?: string | null
          fun_fact_en?: string | null
          weather_condition?: string | null
          is_community_suggested?: boolean
          is_generated?: boolean
          created_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          user_id: string
          channel: ChatChannel
          content: string
          reply_to_id: string | null
          status: MessageStatus
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          channel?: ChatChannel
          content: string
          reply_to_id?: string | null
          status?: MessageStatus
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          channel?: ChatChannel
          content?: string
          reply_to_id?: string | null
          status?: MessageStatus
          created_at?: string
        }
      }
      activity_feed: {
        Row: {
          id: string
          user_id: string
          event_type: string
          event_data: Json | null
          is_public: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_type: string
          event_data?: Json | null
          is_public?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_type?: string
          event_data?: Json | null
          is_public?: boolean
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          content: Json | null
          is_read: boolean
          created_at: string
          expires_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          content?: Json | null
          is_read?: boolean
          created_at?: string
          expires_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          content?: Json | null
          is_read?: boolean
          created_at?: string
          expires_at?: string | null
        }
      }
      vibes_transactions: {
        Row: {
          id: string
          user_id: string
          amount: number
          reason: string
          reference_type: string | null
          reference_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          reason: string
          reference_type?: string | null
          reference_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          reason?: string
          reference_type?: string | null
          reference_id?: string | null
          created_at?: string
        }
      }
      challenges: {
        Row: {
          id: string
          type: ChallengeType
          slug: string
          name: string
          name_en: string | null
          description: string
          description_en: string | null
          condition_type: string
          condition_value: Json | null
          vibes_reward: number
          valid_from: string
          valid_until: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          type: ChallengeType
          slug: string
          name: string
          name_en?: string | null
          description: string
          description_en?: string | null
          condition_type: string
          condition_value?: Json | null
          vibes_reward?: number
          valid_from: string
          valid_until: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          type?: ChallengeType
          slug?: string
          name?: string
          name_en?: string | null
          description?: string
          description_en?: string | null
          condition_type?: string
          condition_value?: Json | null
          vibes_reward?: number
          valid_from?: string
          valid_until?: string
          is_active?: boolean
          created_at?: string
        }
      }
      user_challenges: {
        Row: {
          user_id: string
          challenge_id: string
          progress: number
          completed_at: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          challenge_id: string
          progress?: number
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          user_id?: string
          challenge_id?: string
          progress?: number
          completed_at?: string | null
          created_at?: string
        }
      }
      followers: {
        Row: {
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          follower_id?: string
          following_id?: string
          created_at?: string
        }
      }
      shop_items: {
        Row: {
          id: string
          slug: string
          name: string
          name_en: string | null
          description: string
          description_en: string | null
          category: ShopCategory
          cost_vibes: number
          metadata: Json | null
          is_available: boolean
          stock_limit: number | null
          created_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          name_en?: string | null
          description: string
          description_en?: string | null
          category: ShopCategory
          cost_vibes: number
          metadata?: Json | null
          is_available?: boolean
          stock_limit?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          name_en?: string | null
          description?: string
          description_en?: string | null
          category?: ShopCategory
          cost_vibes?: number
          metadata?: Json | null
          is_available?: boolean
          stock_limit?: number | null
          created_at?: string
        }
      }
      user_purchases: {
        Row: {
          id: string
          user_id: string
          item_id: string
          cost_vibes: number
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          item_id: string
          cost_vibes: number
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          item_id?: string
          cost_vibes?: number
          metadata?: Json | null
          created_at?: string
        }
      }
        avatars: {
          Row: {
            id: number
            file_path: string
            file_name: string
            tier: string
            created_at: string
            created_by: string | null
          }
          Insert: {
            id?: number
            file_path: string
            file_name: string
            tier?: string
            created_at?: string
            created_by?: string | null
          }
          Update: {
            id?: number
            file_path?: string
            file_name?: string
            tier?: string
            created_at?: string
            created_by?: string | null
          }
        }
      predefined_avatars: {
        Row: {
          id: number
          name: string
          image_url: string
          category: AvatarCategory
          unlock_condition: Json | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          image_url: string
          category?: AvatarCategory
          unlock_condition?: Json | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          image_url?: string
          category?: AvatarCategory
          unlock_condition?: Json | null
          sort_order?: number
          created_at?: string
        }
      }
      listening_sessions: {
        Row: {
          id: string
          user_id: string
          started_at: string
          ended_at: string | null
          duration_minutes: number | null
          songs_heard: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          started_at?: string
          ended_at?: string | null
          duration_minutes?: number | null
          songs_heard?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          started_at?: string
          ended_at?: string | null
          duration_minutes?: number | null
          songs_heard?: number
          created_at?: string
        }
      }
      app_settings: {
        Row: {
          id: string
          key: string
          value: Json
          description: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: Json
          description?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: Json
          description?: string | null
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_vibes: {
        Args: {
          p_user_id: string
          p_amount: number
          p_reason: string
          p_reference_type?: string
          p_reference_id?: string
        }
        Returns: number
      }
      cast_duel_vote: {
        Args: {
          p_duel_id: string
          p_vote: DuelVote
        }
        Returns: number
      }
      spend_vibes: {
        Args: {
          p_user_id: string
          p_amount: number
          p_reason: string
          p_reference_type?: string
          p_reference_id?: string
        }
        Returns: boolean
      }
    }
    Enums: {
      profile_visibility: ProfileVisibility
      duel_type: DuelType
      duel_status: DuelStatus
      duel_vote: DuelVote
      badge_category: BadgeCategory
      chat_channel: ChatChannel
      message_status: MessageStatus
      challenge_type: ChallengeType
      shop_category: ShopCategory
      avatar_category: AvatarCategory
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
