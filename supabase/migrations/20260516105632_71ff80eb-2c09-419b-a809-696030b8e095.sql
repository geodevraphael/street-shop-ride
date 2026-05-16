-- =========================
-- REVIEWS
-- =========================
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  reviewer_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('shop','product','rider')),
  target_id uuid NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, reviewer_id, target_type, target_id)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY reviews_public_read ON public.reviews FOR SELECT USING (true);

CREATE POLICY reviews_buyer_insert ON public.reviews FOR INSERT
WITH CHECK (
  auth.uid() = reviewer_id
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id
      AND o.client_id = auth.uid()
      AND o.status IN ('delivered','completed')
  )
);

CREATE INDEX IF NOT EXISTS reviews_target_idx ON public.reviews (target_type, target_id);

-- Recalculate ratings on insert
CREATE OR REPLACE FUNCTION public.recalc_review_rating()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_avg numeric;
BEGIN
  SELECT round(avg(rating)::numeric, 2) INTO v_avg
  FROM public.reviews WHERE target_type = NEW.target_type AND target_id = NEW.target_id;

  IF NEW.target_type = 'shop' THEN
    UPDATE public.shops SET rating = COALESCE(v_avg, 5.0) WHERE id = NEW.target_id;
  ELSIF NEW.target_type = 'rider' THEN
    UPDATE public.riders SET rating = COALESCE(v_avg, 5.0) WHERE id = NEW.target_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_review_rating ON public.reviews;
CREATE TRIGGER trg_recalc_review_rating
AFTER INSERT ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.recalc_review_rating();

-- =========================
-- NOTIFICATIONS
-- =========================
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  order_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications (user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS notifications_user_idx
  ON public.notifications (user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notif_owner_read ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY notif_owner_update ON public.notifications FOR UPDATE
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- =========================
-- AUTO-NOTIFY ON ORDER STATUS CHANGE
-- =========================
CREATE OR REPLACE FUNCTION public.notify_order_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_seller_id uuid;
  v_rider_user uuid;
  v_short text := substr(NEW.id::text, 1, 6);
  v_link text := '/orders/' || NEW.id;
BEGIN
  SELECT owner_id INTO v_seller_id FROM public.shops WHERE id = NEW.shop_id;
  IF NEW.rider_id IS NOT NULL THEN
    SELECT user_id INTO v_rider_user FROM public.riders WHERE id = NEW.rider_id;
  END IF;

  -- New order placed -> seller
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications(user_id, type, title, body, link, order_id)
    VALUES (v_seller_id, 'order_placed', 'Oda mpya #' || v_short, 'Mteja amewasilisha oda mpya', v_link, NEW.id);
    RETURN NEW;
  END IF;

  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  CASE NEW.status
    WHEN 'accepted' THEN
      INSERT INTO public.notifications(user_id, type, title, body, link, order_id)
      VALUES (NEW.client_id, 'order_accepted', 'Oda imekubaliwa', 'Muuzaji amekubali oda yako #' || v_short, v_link, NEW.id);
    WHEN 'payment_submitted' THEN
      INSERT INTO public.notifications(user_id, type, title, body, link, order_id)
      VALUES (v_seller_id, 'payment_submitted', 'Malipo yamewasilishwa', 'Hakiki malipo ya oda #' || v_short, v_link, NEW.id);
    WHEN 'payment_confirmed' THEN
      INSERT INTO public.notifications(user_id, type, title, body, link, order_id)
      VALUES (NEW.client_id, 'payment_confirmed', 'Malipo yamethibitishwa', 'Muuzaji amethibitisha malipo #' || v_short, v_link, NEW.id);
    WHEN 'rider_assigned' THEN
      IF v_rider_user IS NOT NULL THEN
        INSERT INTO public.notifications(user_id, type, title, body, link, order_id)
        VALUES (v_rider_user, 'rider_assigned', 'Umepewa kazi', 'Nenda kuchukua oda #' || v_short, v_link, NEW.id);
      END IF;
      INSERT INTO public.notifications(user_id, type, title, body, link, order_id)
      VALUES (NEW.client_id, 'rider_assigned', 'Boda amepatikana', 'Boda anakuja kwa muuzaji', v_link, NEW.id);
    WHEN 'picked_up' THEN
      INSERT INTO public.notifications(user_id, type, title, body, link, order_id)
      VALUES (NEW.client_id, 'picked_up', 'Boda safarini', 'Boda amechukua oda #' || v_short, v_link, NEW.id);
    WHEN 'delivered' THEN
      INSERT INTO public.notifications(user_id, type, title, body, link, order_id)
      VALUES (NEW.client_id, 'delivered', 'Oda imefika', 'Tafadhali toa rating', v_link, NEW.id);
      INSERT INTO public.notifications(user_id, type, title, body, link, order_id)
      VALUES (v_seller_id, 'delivered', 'Oda imefikishwa', 'Oda #' || v_short || ' imekamilika', v_link, NEW.id);
    WHEN 'cancelled' THEN
      INSERT INTO public.notifications(user_id, type, title, body, link, order_id)
      VALUES (NEW.client_id, 'cancelled', 'Oda imeghairiwa', 'Oda #' || v_short, v_link, NEW.id);
      INSERT INTO public.notifications(user_id, type, title, body, link, order_id)
      VALUES (v_seller_id, 'cancelled', 'Oda imeghairiwa', 'Oda #' || v_short, v_link, NEW.id);
    ELSE NULL;
  END CASE;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_order_insert ON public.orders;
CREATE TRIGGER trg_notify_order_insert
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_order_event();

DROP TRIGGER IF EXISTS trg_notify_order_update ON public.orders;
CREATE TRIGGER trg_notify_order_update
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_order_event();

-- =========================
-- AUTO-NOTIFY ON NEW BODA OFFER -> seller
-- =========================
CREATE OR REPLACE FUNCTION public.notify_offer_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_seller_id uuid;
  v_client_id uuid;
  v_short text;
  v_link text;
  v_rider_user uuid;
BEGIN
  SELECT o.client_id, s.owner_id, substr(o.id::text,1,6), '/orders/'||o.id
    INTO v_client_id, v_seller_id, v_short, v_link
  FROM public.orders o JOIN public.shops s ON s.id = o.shop_id
  WHERE o.id = NEW.order_id;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications(user_id, type, title, body, link, order_id)
    VALUES (v_seller_id, 'offer_new', 'Ofa mpya ya boda', 'Boda amepiga bei kwa oda #' || v_short, v_link, NEW.order_id);
  ELSIF NEW.status = 'accepted' AND OLD.status <> 'accepted' THEN
    SELECT user_id INTO v_rider_user FROM public.riders WHERE id = NEW.rider_id;
    IF v_rider_user IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, type, title, body, link, order_id)
      VALUES (v_rider_user, 'offer_accepted', 'Ofa yako imekubaliwa', 'Nenda kuchukua oda #' || v_short, v_link, NEW.order_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_offer_insert ON public.delivery_offers;
CREATE TRIGGER trg_notify_offer_insert
AFTER INSERT ON public.delivery_offers
FOR EACH ROW EXECUTE FUNCTION public.notify_offer_event();

DROP TRIGGER IF EXISTS trg_notify_offer_update ON public.delivery_offers;
CREATE TRIGGER trg_notify_offer_update
AFTER UPDATE OF status ON public.delivery_offers
FOR EACH ROW EXECUTE FUNCTION public.notify_offer_event();