
-- ===== ENUMS =====
CREATE TYPE public.app_role AS ENUM ('client','seller','rider','admin','support');
CREATE TYPE public.id_doc_type AS ENUM ('national_id','passport','driving_licence','business_permit');
CREATE TYPE public.order_status AS ENUM ('placed','accepted','rider_assigned','picked_up','delivered','completed','cancelled');
CREATE TYPE public.report_target AS ENUM ('seller','rider');
CREATE TYPE public.region_level AS ENUM ('region','county','subcounty','ward','village');

-- ===== PROFILES =====
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ===== USER_ROLES =====
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- ===== REGIONS (GeoJSON) =====
CREATE TABLE public.regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level public.region_level NOT NULL,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.regions(id) ON DELETE CASCADE,
  geojson JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;

-- ===== SHOPS =====
CREATE TABLE public.shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  lipa_number TEXT,
  qr_code_url TEXT,
  cover_url TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  street TEXT,
  ward_id UUID REFERENCES public.regions(id),
  verified BOOLEAN NOT NULL DEFAULT false,
  sales_count INT NOT NULL DEFAULT 0,
  subscription_active BOOLEAN NOT NULL DEFAULT false,
  rating NUMERIC(3,2) DEFAULT 5.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

-- ===== SELLER DOCUMENTS =====
CREATE TABLE public.seller_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops ON DELETE CASCADE,
  id_type public.id_doc_type NOT NULL,
  id_photo_url TEXT,
  selfie_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.seller_documents ENABLE ROW LEVEL SECURITY;

-- ===== RIDERS =====
CREATE TABLE public.riders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  plate TEXT,
  vehicle_photo_url TEXT,
  id_type public.id_doc_type,
  id_photo_url TEXT,
  selfie_url TEXT,
  license_verified BOOLEAN NOT NULL DEFAULT false,
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  available BOOLEAN NOT NULL DEFAULT true,
  deliveries_count INT NOT NULL DEFAULT 0,
  subscription_active BOOLEAN NOT NULL DEFAULT false,
  rating NUMERIC(3,2) DEFAULT 5.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;

-- ===== PRODUCTS =====
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  category TEXT,
  stock INT NOT NULL DEFAULT 0,
  is_food BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- ===== ADDRESSES =====
CREATE TABLE public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  label TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  street TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- ===== ORDERS =====
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES public.shops ON DELETE CASCADE,
  address_id UUID REFERENCES public.addresses(id),
  status public.order_status NOT NULL DEFAULT 'placed',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  distance_km NUMERIC(8,2),
  eta_min INT,
  rider_id UUID REFERENCES public.riders(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  qty INT NOT NULL DEFAULT 1,
  price NUMERIC(12,2) NOT NULL DEFAULT 0
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- ===== REPORTS =====
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  target_type public.report_target NOT NULL,
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- ===== SUBSCRIPTIONS / INVOICES =====
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role public.app_role NOT NULL,
  monthly_amount NUMERIC(12,2) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_invoice_at TIMESTAMPTZ
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- ===== NEW USER TRIGGER =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), COALESCE(NEW.raw_user_meta_data->>'phone',''))
  ON CONFLICT (id) DO NOTHING;

  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'client');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== RLS POLICIES =====

-- profiles
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'support'));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- user_roles
CREATE POLICY "roles_select_own" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "roles_admin_all" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- regions: public read; admin write
CREATE POLICY "regions_public_read" ON public.regions FOR SELECT USING (true);
CREATE POLICY "regions_admin_write" ON public.regions FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- shops: public read; owner CRUD
CREATE POLICY "shops_public_read" ON public.shops FOR SELECT USING (true);
CREATE POLICY "shops_owner_insert" ON public.shops FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "shops_owner_update" ON public.shops FOR UPDATE USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "shops_owner_delete" ON public.shops FOR DELETE USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'));

-- seller_documents: only owner + admin
CREATE POLICY "seller_docs_owner_select" ON public.seller_documents FOR SELECT USING (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "seller_docs_owner_write" ON public.seller_documents FOR ALL USING (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()));

-- riders: public can see basic info (handled by SELECT all); owner manages
CREATE POLICY "riders_public_read" ON public.riders FOR SELECT USING (true);
CREATE POLICY "riders_owner_insert" ON public.riders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "riders_owner_update" ON public.riders FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "riders_owner_delete" ON public.riders FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- products: public read; owner write
CREATE POLICY "products_public_read" ON public.products FOR SELECT USING (true);
CREATE POLICY "products_owner_write" ON public.products FOR ALL USING (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()));

-- addresses: owner only
CREATE POLICY "addresses_owner_all" ON public.addresses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- orders: client, shop owner, assigned rider, admin
CREATE POLICY "orders_select" ON public.orders FOR SELECT USING (
  auth.uid() = client_id
  OR EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.riders r WHERE r.id = rider_id AND r.user_id = auth.uid())
  OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'support')
);
CREATE POLICY "orders_insert_client" ON public.orders FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "orders_update" ON public.orders FOR UPDATE USING (
  auth.uid() = client_id
  OR EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.riders r WHERE r.id = rider_id AND r.user_id = auth.uid())
  OR public.has_role(auth.uid(),'admin')
);

-- order_items: same visibility as parent order
CREATE POLICY "order_items_select" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (
    o.client_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.shops s WHERE s.id = o.shop_id AND s.owner_id = auth.uid())
    OR public.has_role(auth.uid(),'admin')
  ))
);
CREATE POLICY "order_items_insert_client" ON public.order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.client_id = auth.uid())
);

-- reports: any authenticated may insert; reporter + admin may read
CREATE POLICY "reports_insert_auth" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "reports_select" ON public.reports FOR SELECT USING (auth.uid() = reporter_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'support'));
CREATE POLICY "reports_admin_update" ON public.reports FOR UPDATE USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'support'));

-- subscriptions / invoices: owner + admin
CREATE POLICY "subs_owner_select" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'support'));
CREATE POLICY "subs_admin_write" ON public.subscriptions FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "invoices_select" ON public.invoices FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id = subscription_id AND (s.user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'support')))
);
CREATE POLICY "invoices_admin_write" ON public.invoices FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ===== STORAGE BUCKETS =====
INSERT INTO storage.buckets (id, name, public) VALUES
  ('id-photos','id-photos', false),
  ('selfies','selfies', false),
  ('qr-codes','qr-codes', true),
  ('products','products', true),
  ('vehicles','vehicles', true)
ON CONFLICT (id) DO NOTHING;

-- public buckets: anyone can read
CREATE POLICY "public_buckets_read" ON storage.objects FOR SELECT USING (bucket_id IN ('qr-codes','products','vehicles'));

-- private buckets: only owner + admin can read
CREATE POLICY "private_buckets_owner_read" ON storage.objects FOR SELECT USING (
  bucket_id IN ('id-photos','selfies') AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin'))
);

-- authenticated users can upload to their own folder in any bucket
CREATE POLICY "users_upload_own_folder" ON storage.objects FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "users_update_own_folder" ON storage.objects FOR UPDATE USING (
  auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "users_delete_own_folder" ON storage.objects FOR DELETE USING (
  auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin')
);
