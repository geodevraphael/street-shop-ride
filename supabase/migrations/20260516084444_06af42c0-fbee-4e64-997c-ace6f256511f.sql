-- Enforce correct order lifecycle in the database
CREATE OR REPLACE FUNCTION public.validate_order_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed_next text[];
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  -- Allow cancellation only from early stages
  IF NEW.status = 'cancelled' THEN
    IF OLD.status IN ('placed','accepted') THEN
      RETURN NEW;
    ELSE
      RAISE EXCEPTION 'Oda haiwezi kughairiwa baada ya hatua ya %', OLD.status;
    END IF;
  END IF;

  CASE OLD.status
    WHEN 'placed'             THEN allowed_next := ARRAY['accepted'];
    WHEN 'accepted'           THEN allowed_next := ARRAY['payment_submitted'];
    WHEN 'payment_submitted'  THEN allowed_next := ARRAY['payment_confirmed','accepted']; -- accepted = reject proof, retry
    WHEN 'payment_confirmed'  THEN allowed_next := ARRAY['rider_assigned'];
    WHEN 'rider_assigned'     THEN allowed_next := ARRAY['picked_up'];
    WHEN 'picked_up'          THEN allowed_next := ARRAY['delivered'];
    WHEN 'delivered'          THEN allowed_next := ARRAY['completed'];
    ELSE allowed_next := ARRAY[]::text[];
  END CASE;

  IF NOT (NEW.status::text = ANY(allowed_next)) THEN
    RAISE EXCEPTION 'Mpito haramu: % -> %. Hatua zinazoruhusiwa: %', OLD.status, NEW.status, allowed_next;
  END IF;

  -- Role gating per transition
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

  IF NEW.status = 'delivered' THEN
    IF NOT EXISTS (SELECT 1 FROM riders r WHERE r.id = NEW.rider_id AND r.user_id = auth.uid())
       AND NOT has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Ni boda aliyekabidhiwa tu anayeweza kuthibitisha delivery';
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

DROP TRIGGER IF EXISTS trg_validate_order_status_transition ON public.orders;
CREATE TRIGGER trg_validate_order_status_transition
BEFORE UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.validate_order_status_transition();

-- Ensure new orders always start at 'placed'
CREATE OR REPLACE FUNCTION public.enforce_initial_order_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.status := 'placed';
  NEW.payment_submitted_at := NULL;
  NEW.payment_confirmed_at := NULL;
  NEW.payment_proof_url := NULL;
  NEW.payment_ref := NULL;
  NEW.rider_id := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_initial_order_status ON public.orders;
CREATE TRIGGER trg_enforce_initial_order_status
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.enforce_initial_order_status();