import {interestAliases} from '@/lib/interests';

// Normalize existing free-text interests too, so older profiles need no migration.
// SQL fragments here use only constants; every user value is a bound parameter.
const normalized="lower(translate(regexp_replace(trim(value), '\\s+', ' ', 'g'), 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç', 'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'))";
const keySql=`CASE ${normalized} ${Object.entries(interestAliases).map(([alias,key])=>`WHEN '${alias}' THEN '${key}'`).join(' ')} ELSE ${normalized} END`;

export const discoverySql=`
WITH mine AS (SELECT ARRAY(SELECT value FROM jsonb_array_elements_text(?::jsonb) AS own(value)) AS keys)
SELECT p.id,p.name,p.course,p.semester,p.age,p.bio,p.interests,p.intent,p.photo
FROM profiles p CROSS JOIN mine
CROSS JOIN LATERAL (SELECT ARRAY(SELECT DISTINCT ${keySql} FROM jsonb_array_elements_text(p.interests::jsonb) AS tags(value)) AS keys) peer
CROSS JOIN LATERAL (SELECT ARRAY(SELECT unnest(mine.keys) INTERSECT SELECT unnest(peer.keys)) AS keys) shared
WHERE p.approved=1 AND p.paused=0 AND p.id<>?
AND NOT EXISTS(SELECT 1 FROM reactions WHERE sender=? AND target=p.id)
AND NOT EXISTS(SELECT 1 FROM blocks WHERE (sender=? AND target=p.id) OR (target=? AND sender=p.id))
ORDER BY cardinality(shared.keys) DESC,
COALESCE(cardinality(shared.keys)::double precision/NULLIF(cardinality(mine.keys)+cardinality(peer.keys)-cardinality(shared.keys),0),0) DESC,
p.created_at DESC,p.id ASC LIMIT 100`;
