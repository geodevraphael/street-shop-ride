# Direct payments + price negotiation + nationwide geo + inter-region couriers

Four related changes. I'll group them and ship in phases so we don't break the live flow.

## 1. Direct payment to seller (drop "real payment integration")

No gateway. Current M-Pesa proof flow stays, but the language and the admin TODO change:

- Client pays seller directly (M-Pesa Lipa Number / Tigo Pesa / cash on pickup).
- Seller pays the boda boda directly after delivery.
- App is only proof-of-payment + status tracking, not money custody.
- Remove "real payment integration" from the production-readiness list.

No schema change needed. Small UI relabel on `checkout` and `orders.$orderId` to make it clear money never touches the app.

## 2. Seller ↔ Boda price negotiation

Today: pricing is computed up-front in `src/lib/pricing.ts` and locked. We change it to a quote/counter-offer flow scoped to the delivery fee only (product price stays the seller's).

Schema (one new table + a couple of order columns):

```sql
-- offers from boda to seller for a specific order's delivery
delivery_offers (
  id, order_id, rider_id, amount numeric, note text,
  status: 'pending'|'accepted'|'rejected'|'withdrawn',
  created_at, responded_at
)

-- orders gets:
delivery_fee_locked boolean default false
accepted_offer_id uuid
```

Flow:
- After `payment_confirmed`, seller posts the delivery on a "boda board" (riders in the area see it with pickup → drop coords and an estimated suggested fee from our existing `pricing.ts` as a hint).
- Riders submit `delivery_offers` (amount + optional note).
- Seller accepts one → that rider becomes `order.rider_id`, `delivery_fee` updates to offer amount, status → `rider_assigned`. Other offers auto-reject.
- Seller can also enter a fixed price and a rider can accept it as-is (one-tap).

RLS: rider sees own offers + open deliveries; seller sees offers on their orders; admin sees all.

## 3. Nationwide village/ward/district/region picker

You uploaded `Villages.geojson` — 15,183 features with `Region_Nam / District_N / Ward_Name / Vil_Mtaa_N`. Plan:

- Strip polygons (we don't need them for a picker — they'd bloat the DB). Keep only the hierarchy + centroid lat/lng.
- Import into `regions` table (already exists with `level` + `parent_id`) as 4 levels: `region → district → ward → village`. ~15k rows total, fine for Postgres.
- New `<LocationPicker>` component: cascading selects Region → District → Ward → Village. Used in:
  - shop address (sellers)
  - delivery address (clients) — replaces / supplements free-text + map pin
  - rider service area
- Computes centroid for distance estimation when client hasn't dropped a pin.

I'll do the import as a one-off script (`bun run scripts/import-villages.ts`) writing in batches.

## 4. Inter-region delivery via courier vendors (USIRI, etc.)

New delivery mode picked at checkout based on whether pickup and drop are in the same district:

- **Local (same district)** → existing boda flow with negotiation (#2).
- **Inter-region** → courier vendor flow.

Schema:

```sql
courier_vendors (
  id, name, logo_url, contact_phone, contact_whatsapp,
  active boolean, regions_served text[], pricing_notes text
)

-- orders gets:
delivery_mode: 'boda'|'courier' default 'boda'
courier_vendor_id uuid null
courier_tracking_ref text null         -- vendor's waybill / parcel #
courier_office_pickup text null        -- which office client collects from
courier_office_drop text null          -- which office seller drops to
```

New `order_status` values: `courier_dropped_at_office`, `courier_in_transit`, `courier_arrived_at_destination` (replace the `picked_up → delivered` chain when `delivery_mode = 'courier'`). Client sees these as a 4-step timeline.

Vendor updates: vendors don't have logins in MVP. Seller manually updates status from the order detail page (with a "share waybill" button that opens WhatsApp to vendor). Phase 2: per-vendor portal user that can update only their assigned orders (admin invites them).

Admin gets a `/admin/couriers` page to CRUD vendors and seed a few real ones (USIRI, SuperLink, Royal Sumry, etc.).

---

## Phased delivery

To avoid one giant unsafe change:

- **Phase A (this turn)**: Plan approval + village import script + relabel direct-payment copy. No breaking changes. ~1 migration (regions data), small UI text.
- **Phase B**: `LocationPicker` wired into shop + address forms. Distance estimation falls back to village centroid.
- **Phase C**: Delivery negotiation (`delivery_offers` table, boda board, seller accept).
- **Phase D**: Courier mode (`courier_vendors`, new statuses, admin CRUD, seller-driven status updates).

Each phase is its own approval so you see progress without surprises.

## What I will NOT touch unless you say so

- Existing successful orders / order history.
- Referral / payout system.
- Auth and role model.
- The map / live tracking (still useful for local boda).

## Open questions

1. For couriers: do you want me to seed any specific vendors now (names + phone numbers), or just build the admin CRUD empty?
2. For the boda board: should riders see ALL open deliveries in their region, or only ones whose pickup is within X km of their current location?
3. Inter-region: who decides the mode — auto (different district = courier) or seller chooses per order?
