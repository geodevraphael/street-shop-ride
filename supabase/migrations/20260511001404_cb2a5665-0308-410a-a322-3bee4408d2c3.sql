
-- 1. Global app settings (toggles)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_public_read" ON public.app_settings
  FOR SELECT USING (true);

CREATE POLICY "settings_admin_write" ON public.app_settings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.app_settings (key, value)
VALUES ('referrals_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. Allow admins to read all referrals (in addition to the existing owner policy)
DROP POLICY IF EXISTS "referrals_admin_read" ON public.referrals;
CREATE POLICY "referrals_admin_read" ON public.referrals
  FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'));

-- 3. Helper: is the program enabled?
CREATE OR REPLACE FUNCTION public.referrals_enabled()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE((SELECT (value)::text::boolean FROM public.app_settings WHERE key = 'referrals_enabled'), true);
$$;

-- 4. Update seller-product trigger to respect the toggle
CREATE OR REPLACE FUNCTION public.process_seller_referral_qualification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_referrer uuid;
  v_qualified_count int;
  v_already_rewarded int;
BEGIN
  IF NOT public.referrals_enabled() THEN RETURN NEW; END IF;

  SELECT owner_id INTO v_owner FROM public.shops WHERE id = NEW.shop_id;
  IF v_owner IS NULL THEN RETURN NEW; END IF;

  UPDATE public.referrals
    SET qualified = true, qualified_at = now()
    WHERE referred_user_id = v_owner
      AND referred_role = 'seller'
      AND qualified = false;

  SELECT referrer_id INTO v_referrer FROM public.referrals
    WHERE referred_user_id = v_owner AND referred_role = 'seller' LIMIT 1;
  IF v_referrer IS NULL THEN RETURN NEW; END IF;

  SELECT count(*) INTO v_qualified_count FROM public.referrals
    WHERE referrer_id = v_referrer AND referred_role = 'seller' AND qualified = true;

  SELECT count(*) INTO v_already_rewarded FROM public.referral_rewards
    WHERE user_id = v_referrer AND reward_type = 'cash_payout' AND (details->>'kind') = 'seller_10';
  IF v_qualified_count >= (v_already_rewarded + 1) * 10 THEN
    INSERT INTO public.referral_rewards (user_id, reward_type, amount, details, status)
    VALUES (v_referrer, 'cash_payout', 10000,
      jsonb_build_object('kind','seller_10','milestone', (v_already_rewarded + 1) * 10),
      'pending');
  END IF;

  SELECT count(*) INTO v_already_rewarded FROM public.referral_rewards
    WHERE user_id = v_referrer AND reward_type = 'subscription_discount';
  IF v_qualified_count >= (v_already_rewarded + 1) * 5 THEN
    INSERT INTO public.referral_rewards (user_id, reward_type, amount, details, status)
    VALUES (v_referrer, 'subscription_discount', 50,
      jsonb_build_object('percent', 50, 'months', 2, 'milestone', (v_already_rewarded + 1) * 5),
      'approved');
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Update boda trigger to respect toggle
CREATE OR REPLACE FUNCTION public.process_boda_referral_qualification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer uuid;
  v_qualified_count int;
  v_already_rewarded int;
BEGIN
  IF NOT public.referrals_enabled() THEN RETURN NEW; END IF;

  UPDATE public.referrals
    SET qualified = true, qualified_at = now()
    WHERE referred_user_id = NEW.user_id
      AND referred_role = 'rider'
      AND qualified = false;

  SELECT referrer_id INTO v_referrer FROM public.referrals
    WHERE referred_user_id = NEW.user_id AND referred_role = 'rider' LIMIT 1;
  IF v_referrer IS NULL THEN RETURN NEW; END IF;

  SELECT count(*) INTO v_qualified_count FROM public.referrals
    WHERE referrer_id = v_referrer AND referred_role = 'rider' AND qualified = true;

  SELECT count(*) INTO v_already_rewarded FROM public.referral_rewards
    WHERE user_id = v_referrer AND reward_type = 'boda_discount';
  IF v_qualified_count >= (v_already_rewarded + 1) * 2 THEN
    INSERT INTO public.referral_rewards (user_id, reward_type, amount, details, status)
    VALUES (v_referrer, 'boda_discount', 2,
      jsonb_build_object('percent', 2, 'milestone', (v_already_rewarded + 1) * 2),
      'approved');
  END IF;

  RETURN NEW;
END;
$$;

-- 6. NEW: Client-invite trigger (first order qualifies the client; 100 invites + 30 first purchases = TSh 100,000)
CREATE OR REPLACE FUNCTION public.process_client_referral_qualification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer uuid;
  v_total_clients int;
  v_qualified_clients int;
  v_already_rewarded int;
  v_was_first boolean;
BEGIN
  IF NOT public.referrals_enabled() THEN RETURN NEW; END IF;

  -- Check if this is the client's FIRST order (besides this one)
  SELECT NOT EXISTS (
    SELECT 1 FROM public.orders
    WHERE client_id = NEW.client_id AND id <> NEW.id
  ) INTO v_was_first;

  IF NOT v_was_first THEN RETURN NEW; END IF;

  -- Mark client referral as qualified
  UPDATE public.referrals
    SET qualified = true, qualified_at = now()
    WHERE referred_user_id = NEW.client_id
      AND referred_role = 'client'
      AND qualified = false;

  SELECT referrer_id INTO v_referrer FROM public.referrals
    WHERE referred_user_id = NEW.client_id AND referred_role = 'client' LIMIT 1;
  IF v_referrer IS NULL THEN RETURN NEW; END IF;

  SELECT count(*) INTO v_total_clients FROM public.referrals
    WHERE referrer_id = v_referrer AND referred_role = 'client';
  SELECT count(*) INTO v_qualified_clients FROM public.referrals
    WHERE referrer_id = v_referrer AND referred_role = 'client' AND qualified = true;

  -- Reward: every milestone of (>=100 total invites AND >=30 qualified)
  SELECT count(*) INTO v_already_rewarded FROM public.referral_rewards
    WHERE user_id = v_referrer AND reward_type = 'cash_payout' AND (details->>'kind') = 'client_100';
  IF v_total_clients >= (v_already_rewarded + 1) * 100
     AND v_qualified_clients >= (v_already_rewarded + 1) * 30 THEN
    INSERT INTO public.referral_rewards (user_id, reward_type, amount, details, status)
    VALUES (v_referrer, 'cash_payout', 100000,
      jsonb_build_object('kind','client_100','milestone', (v_already_rewarded + 1) * 100),
      'pending');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_client_referral_qualify ON public.orders;
CREATE TRIGGER trg_client_referral_qualify
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.process_client_referral_qualification();
