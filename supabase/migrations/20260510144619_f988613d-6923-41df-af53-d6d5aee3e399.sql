
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products (active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_products_category_active ON public.products (category, active);
CREATE INDEX IF NOT EXISTS idx_products_shop ON public.products (shop_id);
CREATE INDEX IF NOT EXISTS idx_products_created ON public.products (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shops_verified ON public.shops (verified);
CREATE INDEX IF NOT EXISTS idx_shops_street ON public.shops (street);
CREATE INDEX IF NOT EXISTS idx_orders_client ON public.orders (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_shop ON public.orders (shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_rider ON public.orders (rider_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.category_counts()
RETURNS TABLE(category text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(NULLIF(trim(category), ''), 'Other') AS category, COUNT(*)::bigint AS count
  FROM public.products
  WHERE active = true
  GROUP BY 1;
$$;

GRANT EXECUTE ON FUNCTION public.category_counts() TO anon, authenticated;
