ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT 'Prefiro não informar';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS looking_for jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age_min integer NOT NULL DEFAULT 18 CHECK(age_min BETWEEN 18 AND 100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age_max integer NOT NULL DEFAULT 100 CHECK(age_max BETWEEN age_min AND 100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS desired_intents jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS prompts jsonb NOT NULL DEFAULT '[]'::jsonb;
CREATE TABLE IF NOT EXISTS profile_photos (
 profile_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 slot integer NOT NULL CHECK(slot BETWEEN 0 AND 3),
 key text NOT NULL UNIQUE,PRIMARY KEY(profile_id,slot)
);
INSERT INTO profile_photos(profile_id,slot,key) SELECT id,0,photo FROM profiles WHERE photo IS NOT NULL ON CONFLICT DO NOTHING;
