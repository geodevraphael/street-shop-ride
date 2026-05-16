-- Dedupe: keep the row with smallest id (oldest)
WITH ranked AS (
  SELECT id,
         row_number() OVER (PARTITION BY level, COALESCE(parent_id::text,''), lower(name) ORDER BY created_at, id) AS rn
  FROM public.regions
)
DELETE FROM public.regions r
USING ranked
WHERE r.id = ranked.id AND ranked.rn > 1;

-- Now any new dupes get blocked
CREATE UNIQUE INDEX IF NOT EXISTS regions_unique_in_parent
  ON public.regions (level, COALESCE(parent_id::text,''), lower(name));