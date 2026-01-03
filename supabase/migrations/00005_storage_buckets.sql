-- Create storage buckets for avatars and theme images

-- Avatars bucket (256x256px profile pictures)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Theme images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'theme-images',
  'theme-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars bucket
-- Allow authenticated users to read
CREATE POLICY "Avatars are publicly readable"
ON storage.objects FOR SELECT
TO authenticated, anon
USING (bucket_id = 'avatars');

-- Allow admins to upload/delete avatars
CREATE POLICY "Admins can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Admins can delete avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Storage policies for theme-images bucket
-- Allow everyone to read
CREATE POLICY "Theme images are publicly readable"
ON storage.objects FOR SELECT
TO authenticated, anon
USING (bucket_id = 'theme-images');

-- Allow admins to upload/delete theme images
CREATE POLICY "Admins can upload theme images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'theme-images'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Admins can delete theme images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'theme-images'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Create avatars table to track available profile pictures
CREATE TABLE IF NOT EXISTS avatars (
  id SERIAL PRIMARY KEY,
  file_path TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on avatars table
ALTER TABLE avatars ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read avatars
CREATE POLICY "Avatars are readable by everyone"
ON avatars FOR SELECT
TO authenticated, anon
USING (true);

-- Allow admins to insert/delete avatars
CREATE POLICY "Admins can manage avatars"
ON avatars FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Modify profiles to use avatar_id (which references the avatars table)
-- The avatar_id column should already exist from previous migrations
-- If users don't have an avatar_id, they will use a default avatar

COMMENT ON TABLE avatars IS 'Available profile pictures that users can choose from';
COMMENT ON COLUMN avatars.file_path IS 'Full path in storage bucket (e.g., avatars/1.png)';
