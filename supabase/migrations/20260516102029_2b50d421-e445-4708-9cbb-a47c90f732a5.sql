-- Staff membership for courier vendors
CREATE TABLE public.courier_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.courier_vendors(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  office text,
  role text NOT NULL DEFAULT 'agent',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, user_id)
);

CREATE INDEX idx_courier_staff_user ON public.courier_staff(user_id);
CREATE INDEX idx_courier_staff_vendor ON public.courier_staff(vendor_id);

ALTER TABLE public.courier_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY courier_staff_self_read ON public.courier_staff
FOR SELECT USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY courier_staff_admin_write ON public.courier_staff
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Helper: is current user staff of a given vendor?
CREATE OR REPLACE FUNCTION public.is_courier_staff(_vendor_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.courier_staff
    WHERE vendor_id = _vendor_id AND user_id = auth.uid()
  );
$$;

-- Extend orders RLS so courier staff can see + update their vendor's orders
CREATE POLICY orders_courier_staff_select ON public.orders
FOR SELECT USING (
  courier_vendor_id IS NOT NULL AND public.is_courier_staff(courier_vendor_id)
);

CREATE POLICY orders_courier_staff_update ON public.orders
FOR UPDATE USING (
  courier_vendor_id IS NOT NULL AND public.is_courier_staff(courier_vendor_id)
)
WITH CHECK (
  courier_vendor_id IS NOT NULL AND public.is_courier_staff(courier_vendor_id)
);

-- Allow courier staff to perform the courier-leg transitions
CREATE OR REPLACE FUNCTION public.validate_order_status_transition()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  -- Seller-only: accept order
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

  -- payment_confirmed + rider_assigned + picked_up = seller only
  IF NEW.status IN ('payment_confirmed','rider_assigned','picked_up') THEN
    IF NOT EXISTS (SELECT 1 FROM shops s WHERE s.id = NEW.shop_id AND s.owner_id = auth.uid())
       AND NOT has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Ni muuzaji tu anayeweza kufanya hatua hii';
    END IF;
  END IF;

  -- Courier leg transitions: seller (drop-off) or courier staff (in-transit/arrived)
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
$$;
