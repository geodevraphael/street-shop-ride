-- =========================
-- 1) Extend orders for courier + negotiation
-- =========================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_mode text NOT NULL DEFAULT 'boda',
  ADD COLUMN IF NOT EXISTS delivery_fee_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accepted_offer_id uuid,
  ADD COLUMN IF NOT EXISTS courier_vendor_id uuid,
  ADD COLUMN IF NOT EXISTS courier_tracking_ref text,
  ADD COLUMN IF NOT EXISTS courier_office_pickup text,
  ADD COLUMN IF NOT EXISTS courier_office_drop text;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_delivery_mode_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_delivery_mode_check CHECK (delivery_mode IN ('boda','courier'));

-- =========================
-- 2) Extend order_status enum with courier stages
-- =========================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'courier_dropped' AND enumtypid = 'public.order_status'::regtype) THEN
    ALTER TYPE public.order_status ADD VALUE 'courier_dropped';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'courier_in_transit' AND enumtypid = 'public.order_status'::regtype) THEN
    ALTER TYPE public.order_status ADD VALUE 'courier_in_transit';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'courier_arrived' AND enumtypid = 'public.order_status'::regtype) THEN
    ALTER TYPE public.order_status ADD VALUE 'courier_arrived';
  END IF;
END $$;

-- =========================
-- 3) courier_vendors
-- =========================
CREATE TABLE IF NOT EXISTS public.courier_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  contact_phone text,
  contact_whatsapp text,
  pricing_notes text,
  regions_served text[] NOT NULL DEFAULT '{}'::text[],
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.courier_vendors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS couriers_public_read ON public.courier_vendors;
CREATE POLICY couriers_public_read ON public.courier_vendors FOR SELECT USING (true);

DROP POLICY IF EXISTS couriers_admin_write ON public.courier_vendors;
CREATE POLICY couriers_admin_write ON public.courier_vendors FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed common Tanzania couriers (only if table empty)
INSERT INTO public.courier_vendors (name, contact_phone, pricing_notes, regions_served)
SELECT * FROM (VALUES
  ('USIRI Express',    '+255 22 218 4000', 'Bei kulingana na uzito na umbali. Inafika ofisi za mikoa mingi.', ARRAY['Dar es Salaam','Mwanza','Arusha','Dodoma','Mbeya','Tanga','Morogoro']),
  ('SuperLink',        '+255 754 000 000', 'Huduma ya haraka ya parcel kati ya mikoa.', ARRAY['Dar es Salaam','Mwanza','Arusha','Dodoma','Mbeya']),
  ('Royal Sumry',      '+255 755 000 000', 'Mabasi ya kawaida + parcel.', ARRAY['Dar es Salaam','Arusha','Moshi','Mwanza','Bukoba']),
  ('Tahmeed Coach',    '+255 753 000 000', 'Parcel kwenye mabasi ya safari ndefu.', ARRAY['Dar es Salaam','Arusha','Mwanza','Tanga','Mbeya'])
) AS v(name, contact_phone, pricing_notes, regions_served)
WHERE NOT EXISTS (SELECT 1 FROM public.courier_vendors);

-- =========================
-- 4) delivery_offers (boda <-> seller negotiation)
-- =========================
CREATE TABLE IF NOT EXISTS public.delivery_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  rider_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','withdrawn')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz
);

CREATE INDEX IF NOT EXISTS delivery_offers_order_idx ON public.delivery_offers(order_id);
CREATE INDEX IF NOT EXISTS delivery_offers_rider_idx ON public.delivery_offers(rider_id);
CREATE UNIQUE INDEX IF NOT EXISTS delivery_offers_one_pending_per_rider
  ON public.delivery_offers(order_id, rider_id) WHERE status = 'pending';

ALTER TABLE public.delivery_offers ENABLE ROW LEVEL SECURITY;

-- Rider can read own offers; seller of the order can read all offers on their order; admin all
DROP POLICY IF EXISTS offers_select ON public.delivery_offers;
CREATE POLICY offers_select ON public.delivery_offers FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.riders r WHERE r.id = delivery_offers.rider_id AND r.user_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.orders o JOIN public.shops s ON s.id = o.shop_id
    WHERE o.id = delivery_offers.order_id AND s.owner_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Rider creates own offers; only on orders that are payment_confirmed and boda mode
DROP POLICY IF EXISTS offers_insert_rider ON public.delivery_offers;
CREATE POLICY offers_insert_rider ON public.delivery_offers FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.riders r WHERE r.id = delivery_offers.rider_id AND r.user_id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = delivery_offers.order_id
      AND o.status = 'payment_confirmed'
      AND o.delivery_mode = 'boda'
  )
  AND status = 'pending'
);

-- Rider withdraws own offer; seller/admin can reject/accept
DROP POLICY IF EXISTS offers_update ON public.delivery_offers;
CREATE POLICY offers_update ON public.delivery_offers FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.riders r WHERE r.id = delivery_offers.rider_id AND r.user_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.orders o JOIN public.shops s ON s.id = o.shop_id
    WHERE o.id = delivery_offers.order_id AND s.owner_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- =========================
-- 5) Accept offer: trigger updates order when offer.status -> accepted
-- =========================
CREATE OR REPLACE FUNCTION public.handle_offer_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status <> 'accepted' THEN
    -- Only seller of the shop OR admin may accept
    IF NOT EXISTS (
      SELECT 1 FROM orders o JOIN shops s ON s.id = o.shop_id
      WHERE o.id = NEW.order_id AND s.owner_id = auth.uid()
    ) AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Ni muuzaji tu anayeweza kukubali ofa ya boda';
    END IF;

    -- Set this rider on the order and update fee, then transition to rider_assigned
    UPDATE orders
       SET rider_id = NEW.rider_id,
           delivery_fee = NEW.amount,
           delivery_fee_locked = true,
           accepted_offer_id = NEW.id,
           status = 'rider_assigned'
     WHERE id = NEW.order_id AND status = 'payment_confirmed';

    -- Auto-reject other pending offers for the same order
    UPDATE delivery_offers
       SET status = 'rejected', responded_at = now()
     WHERE order_id = NEW.order_id AND id <> NEW.id AND status = 'pending';

    NEW.responded_at := now();
  ELSIF NEW.status IN ('rejected','withdrawn') AND OLD.status = 'pending' THEN
    NEW.responded_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_offer_accepted ON public.delivery_offers;
CREATE TRIGGER trg_handle_offer_accepted
BEFORE UPDATE ON public.delivery_offers
FOR EACH ROW EXECUTE FUNCTION public.handle_offer_accepted();

-- =========================
-- 6) Update status transition validator to support courier branch
-- =========================
CREATE OR REPLACE FUNCTION public.validate_order_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  allowed_next text[];
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  IF NEW.status = 'cancelled' THEN
    IF OLD.status IN ('placed','accepted') THEN RETURN NEW;
    ELSE RAISE EXCEPTION 'Oda haiwezi kughairiwa baada ya hatua ya %', OLD.status; END IF;
  END IF;

  IF NEW.delivery_mode = 'courier' THEN
    CASE OLD.status
      WHEN 'placed'                  THEN allowed_next := ARRAY['accepted'];
      WHEN 'accepted'                THEN allowed_next := ARRAY['payment_submitted'];
      WHEN 'payment_submitted'       THEN allowed_next := ARRAY['payment_confirmed','accepted'];
      WHEN 'payment_confirmed'       THEN allowed_next := ARRAY['courier_dropped'];
      WHEN 'courier_dropped'         THEN allowed_next := ARRAY['courier_in_transit'];
      WHEN 'courier_in_transit'      THEN allowed_next := ARRAY['courier_arrived'];
      WHEN 'courier_arrived'         THEN allowed_next := ARRAY['delivered'];
      WHEN 'delivered'               THEN allowed_next := ARRAY['completed'];
      ELSE allowed_next := ARRAY[]::text[];
    END CASE;
  ELSE
    CASE OLD.status
      WHEN 'placed'             THEN allowed_next := ARRAY['accepted'];
      WHEN 'accepted'           THEN allowed_next := ARRAY['payment_submitted'];
      WHEN 'payment_submitted'  THEN allowed_next := ARRAY['payment_confirmed','accepted'];
      WHEN 'payment_confirmed'  THEN allowed_next := ARRAY['rider_assigned'];
      WHEN 'rider_assigned'     THEN allowed_next := ARRAY['picked_up'];
      WHEN 'picked_up'          THEN allowed_next := ARRAY['delivered'];
      WHEN 'delivered'          THEN allowed_next := ARRAY['completed'];
      ELSE allowed_next := ARRAY[]::text[];
    END CASE;
  END IF;

  IF NOT (NEW.status::text = ANY(allowed_next)) THEN
    RAISE EXCEPTION 'Mpito haramu: % -> %. Hatua zinazoruhusiwa: %', OLD.status, NEW.status, allowed_next;
  END IF;

  -- role gating
  IF NEW.status = 'accepted' AND OLD.status = 'placed' THEN
    IF NOT EXISTS (SELECT 1 FROM shops s WHERE s.id = NEW.shop_id AND s.owner_id = auth.uid())
       AND NOT has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Ni muuzaji tu anayeweza kukubali oda';
    END IF;
  END IF;

  IF NEW.status = 'payment_submitted' THEN
    IF NEW.client_id <> auth.uid() AND NOT has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Ni mteja tu anayeweza kutuma uthibitisho wa malipo';
    END IF;
  END IF;

  IF NEW.status IN ('payment_confirmed','rider_assigned','picked_up','courier_dropped','courier_in_transit','courier_arrived') THEN
    IF NOT EXISTS (SELECT 1 FROM shops s WHERE s.id = NEW.shop_id AND s.owner_id = auth.uid())
       AND NOT has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Ni muuzaji tu anayeweza kufanya hatua hii';
    END IF;
  END IF;

  IF NEW.status = 'delivered' AND NEW.delivery_mode = 'boda' THEN
    IF NOT EXISTS (SELECT 1 FROM riders r WHERE r.id = NEW.rider_id AND r.user_id = auth.uid())
       AND NOT has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Ni boda aliyekabidhiwa tu anayeweza kuthibitisha delivery';
    END IF;
  END IF;

  IF NEW.status = 'delivered' AND NEW.delivery_mode = 'courier' THEN
    IF NEW.client_id <> auth.uid()
       AND NOT EXISTS (SELECT 1 FROM shops s WHERE s.id = NEW.shop_id AND s.owner_id = auth.uid())
       AND NOT has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Mteja au muuzaji tu wanaweza kuthibitisha kupokelewa';
    END IF;
  END IF;

  IF NEW.status = 'completed' THEN
    IF NEW.client_id <> auth.uid() AND NOT has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Ni mteja tu anayeweza kukamilisha oda';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Ensure trigger exists on orders (was missing per <db-triggers/>)
DROP TRIGGER IF EXISTS trg_validate_order_status_transition ON public.orders;
CREATE TRIGGER trg_validate_order_status_transition
BEFORE UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.validate_order_status_transition();

DROP TRIGGER IF EXISTS trg_enforce_initial_order_status ON public.orders;
CREATE TRIGGER trg_enforce_initial_order_status
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.enforce_initial_order_status();