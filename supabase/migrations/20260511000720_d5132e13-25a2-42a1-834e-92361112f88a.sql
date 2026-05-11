
-- 1. Profiles: add referral fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payout_phone text;

-- Generate referral code function
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  code text;
  exists_count int;
BEGIN
  LOOP
    code := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8));
    SELECT count(*) INTO exists_count FROM public.profiles WHERE referral_code = code;
    EXIT WHEN exists_count = 0;
  END LOOP;
  RETURN code;
END;
$$;

-- Backfill existing profiles
UPDATE public.profiles SET referral_code = public.generate_referral_code() WHERE referral_code IS NULL;

-- Update handle_new_user to generate referral_code and capture referred_by from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.app_role;
  v_ref_code text;
  v_referrer uuid;
  v_incoming_code text;
BEGIN
  v_ref_code := public.generate_referral_code();
  v_incoming_code := NULLIF(NEW.raw_user_meta_data->>'ref_code', '');
  IF v_incoming_code IS NOT NULL THEN
    SELECT id INTO v_referrer FROM public.profiles WHERE referral_code = upper(v_incoming_code) LIMIT 1;
  END IF;

  INSERT INTO public.profiles (id, full_name, phone, referral_code, referred_by)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    COALESCE(NEW.raw_user_meta_data->>'phone',''),
    v_ref_code,
    v_referrer
  )
  ON CONFLICT (id) DO NOTHING;

  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'client');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role)
  ON CONFLICT DO NOTHING;

  -- create a pending referral record if applicable
  IF v_referrer IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_id, referred_user_id, referred_role, qualified)
    VALUES (v_referrer, NEW.id, v_role, false)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Referrals tracking table
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_role public.app_role NOT NULL,
  qualified boolean NOT NULL DEFAULT false,
  qualified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referrer_id, referred_user_id)
);
CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON public.referrals(referrer_id);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referrals_owner_read" ON public.referrals
  FOR SELECT USING (
    auth.uid() = referrer_id
    OR auth.uid() = referred_user_id
    OR public.has_role(auth.uid(), 'admin')
  );

-- 3. Referral rewards
CREATE TYPE public.reward_type AS ENUM ('cash_payout', 'subscription_discount', 'boda_discount');
CREATE TYPE public.reward_status AS ENUM ('pending', 'approved', 'paid', 'applied');

CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_type public.reward_type NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  details jsonb DEFAULT '{}'::jsonb,
  status public.reward_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  paid_phone text,
  notes text
);
CREATE INDEX IF NOT EXISTS rewards_user_idx ON public.referral_rewards(user_id);

ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rewards_owner_read" ON public.referral_rewards
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "rewards_admin_write" ON public.referral_rewards
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Qualification triggers

-- When a seller publishes a product (active=true), mark referral qualified and process rewards
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
  SELECT owner_id INTO v_owner FROM public.shops WHERE id = NEW.shop_id;
  IF v_owner IS NULL THEN RETURN NEW; END IF;

  -- Mark seller's referral as qualified (first product listed)
  UPDATE public.referrals
    SET qualified = true, qualified_at = now()
    WHERE referred_user_id = v_owner
      AND referred_role = 'seller'
      AND qualified = false;

  -- Find the referrer
  SELECT referrer_id INTO v_referrer FROM public.referrals
    WHERE referred_user_id = v_owner AND referred_role = 'seller' LIMIT 1;
  IF v_referrer IS NULL THEN RETURN NEW; END IF;

  -- Count qualified seller referrals for this referrer
  SELECT count(*) INTO v_qualified_count FROM public.referrals
    WHERE referrer_id = v_referrer AND referred_role = 'seller' AND qualified = true;

  -- Cash reward: every 10 qualified sellers => 10,000 TSh
  SELECT count(*) INTO v_already_rewarded FROM public.referral_rewards
    WHERE user_id = v_referrer AND reward_type = 'cash_payout';
  IF v_qualified_count >= (v_already_rewarded + 1) * 10 THEN
    INSERT INTO public.referral_rewards (user_id, reward_type, amount, details, status)
    VALUES (v_referrer, 'cash_payout', 10000, jsonb_build_object('milestone', (v_already_rewarded + 1) * 10), 'pending');
  END IF;

  -- Subscription discount: every 5 qualified sellers => 50% off for 2 months
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

DROP TRIGGER IF EXISTS trg_seller_referral_qualify ON public.products;
CREATE TRIGGER trg_seller_referral_qualify
AFTER INSERT ON public.products
FOR EACH ROW
WHEN (NEW.active = true)
EXECUTE FUNCTION public.process_seller_referral_qualification();

-- When a boda registers (riders row inserted), credit the inviting seller
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
  -- Mark referral qualified
  UPDATE public.referrals
    SET qualified = true, qualified_at = now()
    WHERE referred_user_id = NEW.user_id
      AND referred_role = 'rider'
      AND qualified = false;

  SELECT referrer_id INTO v_referrer FROM public.referrals
    WHERE referred_user_id = NEW.user_id AND referred_role = 'rider' LIMIT 1;
  IF v_referrer IS NULL THEN RETURN NEW; END IF;

  -- Count qualified boda referrals
  SELECT count(*) INTO v_qualified_count FROM public.referrals
    WHERE referrer_id = v_referrer AND referred_role = 'rider' AND qualified = true;

  -- 2% discount per every 2 bodas
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

DROP TRIGGER IF EXISTS trg_boda_referral_qualify ON public.riders;
CREATE TRIGGER trg_boda_referral_qualify
AFTER INSERT ON public.riders
FOR EACH ROW
EXECUTE FUNCTION public.process_boda_referral_qualification();
