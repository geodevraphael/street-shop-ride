
# LocalMarket — Minimalist Local Shops + Boda Delivery

A clean, icon-rich marketplace where local shops list products, clients order (incl. food delivery), boda boda riders pick up and deliver, and admin/support manages subscriptions and billing.

## Roles & Onboarding

1. **Seller (Shop)** — wizard: business name → ID type (National ID / Passport / Driving Licence / Business Permit) + ID photo → selfie → 30s GPS averaging for accurate shop location → Lipa Number + Scan-to-Pay QR upload → done.
2. **Client** — minimal: phone/email + name + selfie optional. Saved addresses with labels (Home, Office, Mom's, custom) added via wizard with map pin.
3. **Boda Boda** — phone + selfie + ID photo. ID type chosen; **Driving Licence holders flagged "Verified Rider"** and ranked higher in nearby search. Plate number, vehicle photo.
4. **Admin / Support** — manages users, subscriptions, billing, invoices, reports, region GeoJSON upload.

## Core Features

- **Browse shops** by: nearby me / my street / pick another street / search products / recommendations.
- **Product catalog** per shop with food category support; add-to-cart, checkout.
- **Payment display**: shop's Lipa Number + Scan QR shown at checkout (manual confirmation v1).
- **Delivery**: client or seller searches nearby boda. Pricing: `max(1500, 1500 + 100·km + 20·min)`.
- **Order lifecycle**: placed → seller accepts → boda assigned → picked up → delivered → confirmed.
- **Subscriptions** (auto-tracked):
  - Boda: free until 10 completed routes, then **KES 10,000/month**.
  - Seller: free until 10 sales, then **KES 20,000/month**.
- **Reports**: report seller / report boda with reason + notes; admin queue.
- **Admin GeoJSON**: upload Region → County → Sub-county → Ward → Village layers; preview on map (Leaflet).
- **Wizards**: seller registration, add product, add saved address, boda registration.

## Pages (TanStack routes)

```
/                       Landing + role picker
/auth/login             Phone/email login
/auth/register          Pick role → role wizard
/shops                  Browse shops (filters: nearby, street, search)
/shops/$shopId          Shop detail + products
/products/search        Product search + recommendations
/cart                   Cart
/checkout               Address pick + payment (Lipa/QR)
/orders                 Client orders
/orders/$orderId        Track order, request boda

/seller                 Seller dashboard
/seller/products        Manage products (+ wizard)
/seller/orders          Incoming orders, find boda
/seller/billing         Subscription status

/rider                  Boda dashboard (nearby pickup requests)
/rider/history          Routes history + earnings
/rider/billing          Subscription status

/admin                  KPIs
/admin/users            Users by role
/admin/subscriptions    Billing & invoices
/admin/reports          Report queue
/admin/regions          GeoJSON upload + map preview

/account/addresses      Saved addresses (wizard)
/account/profile        Profile
```

## Backend (Lovable Cloud)

Tables:
- `profiles` (id, full_name, phone, role, avatar_url, created_at)
- `user_roles` (user_id, role enum: client|seller|rider|admin|support) — separate table per security best practice
- `shops` (id, owner_id, name, category, lipa_number, qr_code_url, lat, lng, street, ward_id, verified, sales_count, subscription_active)
- `seller_documents` (id, shop_id, id_type, id_photo_url, selfie_url)
- `riders` (id, user_id, plate, vehicle_photo_url, id_type, id_photo_url, selfie_url, license_verified, current_lat, current_lng, available, deliveries_count, subscription_active)
- `products` (id, shop_id, name, description, price, image_url, category, stock, is_food)
- `addresses` (id, user_id, label, lat, lng, street, notes)
- `orders` (id, client_id, shop_id, address_id, status, subtotal, delivery_fee, distance_km, eta_min, rider_id, created_at)
- `order_items` (id, order_id, product_id, qty, price)
- `reports` (id, reporter_id, target_type, target_id, reason, notes, status, created_at)
- `subscriptions` (id, user_id, role, started_at, monthly_amount, active, last_invoice_at)
- `invoices` (id, subscription_id, amount, period_start, period_end, paid, created_at)
- `regions` (id, level [region|county|subcounty|ward|village], name, parent_id, geojson jsonb)

RLS: users see own data; shops/products public read; admin role has full access via `has_role()` security-definer function.

Storage buckets: `id-photos` (private), `selfies` (private), `qr-codes` (public), `products` (public), `vehicles` (public).

## Design System

- Minimalist, icon-led. **OKLCH tokens** in `src/styles.css`.
- Primary: warm amber (`oklch(0.74 0.16 65)`), neutral slate background, generous whitespace, rounded-xl cards, subtle shadows. No purple.
- Inter font. Lucide icons everywhere.
- Reusable: `RoleCard`, `WizardStepper`, `ShopCard`, `ProductCard`, `OrderStatusPill`, `MapPicker` (Leaflet), `GeoAverager` (30s sampler).

## Pricing Engine

```ts
const fee = Math.max(1500, 1500 + 100 * km + 20 * etaMin);
```

## Deliverables this turn

1. Enable Cloud + create schema + RLS + storage buckets.
2. Design system + landing + role picker + auth scaffolding.
3. All role dashboards (seller, client, rider, admin) with the routes above.
4. Wizards: seller registration (incl. 30s GPS averager), add product, add address, rider registration.
5. Shops browse + product search + cart + checkout (Lipa/QR display) + orders.
6. Boda nearby search + pricing engine + assignment.
7. Admin: users list, subscriptions/invoices, reports queue, GeoJSON upload with Leaflet preview.
8. Reporting flows.

## Out of scope for v1 (flagged for next turns)

- Real M-Pesa STK push integration (display only for now).
- SMS/push notifications.
- Live rider GPS streaming (we'll use last-known location).
- Auto-charging subscriptions (we mark due; admin marks paid).

I'll ship this as one coherent build, then we iterate on whatever you want sharpened first.
