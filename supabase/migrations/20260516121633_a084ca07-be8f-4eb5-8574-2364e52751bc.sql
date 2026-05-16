
CREATE TABLE IF NOT EXISTS public.shop_lipa_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  provider text NOT NULL,
  account_type text NOT NULL DEFAULT 'wallet',
  number text NOT NULL,
  account_name text,
  instructions text,
  qr_code_url text,
  is_default boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shop_lipa_numbers_shop_idx ON public.shop_lipa_numbers(shop_id);
ALTER TABLE public.shop_lipa_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lipa_public_read" ON public.shop_lipa_numbers FOR SELECT USING (true);
CREATE POLICY "lipa_owner_write" ON public.shop_lipa_numbers FOR ALL
  USING (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND (s.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND (s.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))));

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_lipa_touch
  BEFORE UPDATE ON public.shop_lipa_numbers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.enforce_single_default_lipa()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE public.shop_lipa_numbers SET is_default = false
     WHERE shop_id = NEW.shop_id AND id <> NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_single_default_lipa
  AFTER INSERT OR UPDATE OF is_default ON public.shop_lipa_numbers
  FOR EACH ROW WHEN (NEW.is_default = true)
  EXECUTE FUNCTION public.enforce_single_default_lipa();

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS lipa_number_id uuid;
