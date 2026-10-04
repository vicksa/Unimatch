CREATE TABLE IF NOT EXISTS chat_keys (
 user_id text PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
 key_id text NOT NULL UNIQUE,
 encryption_public_key text NOT NULL,
 signing_public_key text NOT NULL,
 backup jsonb NOT NULL,
 created_at text NOT NULL
);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS encryption_version integer NOT NULL DEFAULT 0;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS envelope jsonb;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS legacy_migrated integer NOT NULL DEFAULT 0;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_encryption_payload;
ALTER TABLE messages ADD CONSTRAINT messages_encryption_payload CHECK ((encryption_version=0 AND envelope IS NULL) OR (encryption_version=1 AND body='' AND envelope IS NOT NULL));
ALTER TABLE matches ADD COLUMN IF NOT EXISTS crypto_context text NOT NULL DEFAULT gen_random_uuid()::text;
