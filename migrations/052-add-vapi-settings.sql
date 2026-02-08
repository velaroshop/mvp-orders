-- Add Vapi.ai credentials to settings table
-- Each organization stores their own Vapi API key, phone number ID, and assistant ID

ALTER TABLE settings ADD COLUMN IF NOT EXISTS vapi_api_key TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS vapi_phone_number_id TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS vapi_assistant_id TEXT;

COMMENT ON COLUMN settings.vapi_api_key IS 'Vapi.ai API key for outbound AI calls';
COMMENT ON COLUMN settings.vapi_phone_number_id IS 'Vapi.ai phone number ID used as the caller ID';
COMMENT ON COLUMN settings.vapi_assistant_id IS 'Vapi.ai assistant ID that handles the call';
