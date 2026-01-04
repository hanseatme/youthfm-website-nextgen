-- Fix auth signup "Database error saving new user"
-- Root cause: supabase_auth_admin uses search_path=auth, so unqualified table names
-- in the auth.users trigger function resolve to auth.* and fail.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta_username TEXT;
  meta_display TEXT;
  meta_first_name TEXT;
  meta_terms BOOLEAN;
  meta_privacy BOOLEAN;
BEGIN
  meta_username := NULLIF(NEW.raw_user_meta_data->>'username', '');
  meta_display := NULLIF(NEW.raw_user_meta_data->>'display_name', '');
  meta_first_name := NULLIF(NEW.raw_user_meta_data->>'first_name', '');
  meta_terms := COALESCE((NEW.raw_user_meta_data->>'accepted_terms')::boolean, FALSE);
  meta_privacy := COALESCE((NEW.raw_user_meta_data->>'accepted_privacy')::boolean, FALSE);

  INSERT INTO public.profiles (id, username, display_name, avatar_id)
  VALUES (
    NEW.id,
    meta_username,
    COALESCE(meta_display, split_part(NEW.email, '@', 1)),
    1
  );

  INSERT INTO public.profile_private (user_id, first_name, accepted_terms_at, accepted_privacy_at)
  VALUES (
    NEW.id,
    meta_first_name,
    CASE WHEN meta_terms THEN NOW() ELSE NULL END,
    CASE WHEN meta_privacy THEN NOW() ELSE NULL END
  )
  ON CONFLICT (user_id) DO UPDATE
  SET first_name = EXCLUDED.first_name,
      accepted_terms_at = COALESCE(profile_private.accepted_terms_at, EXCLUDED.accepted_terms_at),
      accepted_privacy_at = COALESCE(profile_private.accepted_privacy_at, EXCLUDED.accepted_privacy_at),
      updated_at = NOW();

  RETURN NEW;
END;
$$;

