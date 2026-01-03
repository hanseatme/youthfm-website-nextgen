DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'studio'
      AND enumtypid = 'chat_channel'::regtype
  ) THEN
    ALTER TYPE chat_channel ADD VALUE 'studio';
  END IF;
END $$;
