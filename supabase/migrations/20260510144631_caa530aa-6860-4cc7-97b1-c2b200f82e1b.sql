
CREATE OR REPLACE FUNCTION public.category_counts()
RETURNS TABLE(category text, count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(NULLIF(trim(p.category), ''), 'Other') AS category, COUNT(*)::bigint AS count
  FROM public.products p
  WHERE p.active = true
  GROUP BY 1;
$$;
