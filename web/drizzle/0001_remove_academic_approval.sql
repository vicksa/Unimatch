-- Release profiles awaiting academic review, while retaining moderation suspensions.
UPDATE profiles
SET approved = 1
WHERE approved = 0
  AND COALESCE((
    SELECT action FROM audit
    WHERE target = profiles.id AND action IN ('approve', 'suspend')
    ORDER BY created_at DESC, rowid DESC
    LIMIT 1
  ), '') <> 'suspend';
