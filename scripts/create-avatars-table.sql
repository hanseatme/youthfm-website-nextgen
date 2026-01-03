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
