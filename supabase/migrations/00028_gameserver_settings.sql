-- Migration: Add game server settings
-- This adds configuration options for the dedicated game server

-- Insert default game server settings into app_settings
INSERT INTO public.app_settings (key, value, description)
VALUES
  ('gameserver_enabled', 'false', 'Enable dedicated game server for multiplayer'),
  ('gameserver_url', '', 'WebSocket URL of the game server (e.g., wss://game.youthfm.de)'),
  ('gameserver_tick_rate', '30', 'Game server tick rate in Hz')
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description;

-- Insert game server API key into private_settings
INSERT INTO public.private_settings (key, value)
VALUES
  ('gameserver_api_key', '')
ON CONFLICT (key) DO NOTHING;
