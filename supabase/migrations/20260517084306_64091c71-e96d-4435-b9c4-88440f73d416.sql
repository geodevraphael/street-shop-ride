
-- Add delivery subsidy & boda payment confirmation columns
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_subsidy_pct integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_negotiated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS boda_paid_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS boda_paid_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS boda_paid_by text;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_subsidy_pct_range CHECK (delivery_subsidy_pct >= 0 AND delivery_subsidy_pct <= 100);

-- Backfill legacy orders: treat existing accepted/later orders as already-negotiated
UPDATE public.orders
   SET delivery_negotiated = true
 WHERE status <> 'placed' AND delivery_negotiated = false;

-- Update status transition validator: block payment_submitted until delivery negotiated
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

  -- Block payment submission until seller has negotiated delivery
  IF NEW.status = 'payment_submitted' AND NEW.delivery_mode = 'boda' AND COALESCE(NEW.delivery_negotiated, false) = false THEN
    RAISE EXCEPTION 'Muuzaji bado hajaweka nauli ya boda. Subiri ajadiliane na boda.';
  END IF;

  -- Block completion until boda payment confirmed (unless seller pays 100%)
  IF NEW.status = 'completed' AND NEW.delivery_mode = 'boda'
     AND COALESCE(NEW.delivery_subsidy_pct, 0) < 100
     AND COALESCE(NEW.boda_paid_confirmed, false) = false THEN
    RAISE EXCEPTION 'Thibitisha kwanza umemkabidhi boda nauli yake.';
  END IF;

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

  IF NEW.status IN ('payment_confirmed','rider_assigned','picked_up') THEN
    IF NOT EXISTS (SELECT 1 FROM shops s WHERE s.id = NEW.shop_id AND s.owner_id = auth.uid())
       AND NOT has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Ni muuzaji tu anayeweza kufanya hatua hii';
    END IF;
  END IF;

  IF NEW.status = 'courier_dropped' THEN
    IF NOT EXISTS (SELECT 1 FROM shops s WHERE s.id = NEW.shop_id AND s.owner_id = auth.uid())
       AND NOT (NEW.courier_vendor_id IS NOT NULL AND public.is_courier_staff(NEW.courier_vendor_id))
       AND NOT has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Ni muuzaji au wakala wa courier tu anayeweza kuthibitisha drop-off';
    END IF;
  END IF;

  IF NEW.status IN ('courier_in_transit','courier_arrived') THEN
    IF NOT (NEW.courier_vendor_id IS NOT NULL AND public.is_courier_staff(NEW.courier_vendor_id))
       AND NOT has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Ni wakala wa courier tu anayeweza ku-update hatua hii';
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
