CREATE TABLE IF NOT EXISTS profiles (
 id text PRIMARY KEY, name text NOT NULL, course text NOT NULL,
 semester integer NOT NULL CHECK (semester BETWEEN 1 AND 12),
 age integer NOT NULL CHECK (age BETWEEN 18 AND 100),
 bio text NOT NULL, interests text NOT NULL, intent text NOT NULL, photo text,
 approved integer NOT NULL DEFAULT 1 CHECK (approved IN (0,1)),
 paused integer NOT NULL DEFAULT 0 CHECK (paused IN (0,1)),
 consent_at text NOT NULL, created_at text NOT NULL
);
CREATE INDEX IF NOT EXISTS profile_discovery ON profiles(approved,paused,course);
CREATE TABLE IF NOT EXISTS reactions (
 sender text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 target text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('like','pass')), PRIMARY KEY(sender,target),CHECK(sender<>target)
);
CREATE TABLE IF NOT EXISTS matches (
 id text PRIMARY KEY,a text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 b text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,created_at text NOT NULL,CHECK(a<>b)
);
CREATE TABLE IF NOT EXISTS messages (
 id text PRIMARY KEY,match_id text NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
 sender text NOT NULL,body text NOT NULL,created_at text NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_match ON messages(match_id,created_at);
CREATE TABLE IF NOT EXISTS blocks (
 sender text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 target text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,PRIMARY KEY(sender,target)
);
CREATE TABLE IF NOT EXISTS reports (
 id text PRIMARY KEY,sender text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 target text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,reason text NOT NULL,
 created_at text NOT NULL,resolved integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS limits (key text PRIMARY KEY,count integer NOT NULL,expires bigint NOT NULL);
CREATE TABLE IF NOT EXISTS audit (id text PRIMARY KEY,actor text NOT NULL,action text NOT NULL,target text NOT NULL,created_at text NOT NULL);
