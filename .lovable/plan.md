# Streamlined Order & Delivery Flow

## New end-to-end flow

1. **Client taps a product** → product detail page opens (already exists).
2. **Place Order** button (no checkout cart needed for single-product flow): creates order with status `placed`. Cart-based checkout is kept for multi-item orders but funnels into the same status machine.
3. **Seller accepts** → status `accepted`. Client gets notified.
4. **Client pays** outside the app (M-Pesa Lipa Number / QR shown), then:
   - Uploads SMS screenshot **or** receipt photo
   - Enters M-Pesa transaction code
   - Taps **Nimelipia** → status `payment_submitted`
5. **Seller confirms payment** (sees uploaded proof + code) → status `payment_confirmed`.
6. **Seller finds boda boda** using existing nearby finder → assigns rider → status `rider_assigned`.
7. **Seller marks "Send product"** when handed to rider → status `picked_up`. Rider live-tracking begins.
8. **Client tracks on map** → sees own location, shop pickup point, delivery address, and rider's near-real-time position.
9. **Rider marks delivered** → status `delivered`. Client confirms received → `completed`.

## Lightweight live tracking (no DB bloat)

**Approach: Supabase Realtime Broadcast (ephemeral channels), NOT postgres_changes.**

- Rider app sends position via `channel.send({ type: 'broadcast', event: 'pos', payload: {lat,lng,t} })` every 8–12s while on an active order.
- Client subscribes to the same channel `track:{orderId}` and updates marker.
- Broadcast messages are **never persisted** — zero DB writes, zero storage cost.
- Only the rider's *last known* position is optionally upserted to `riders.current_lat/lng` (already exists) at most every 60s as a fallback for when the client opens the map cold.
- Channel auto-cleans when both parties leave.

This avoids accumulating a `rider_locations` history table.

## Branded map

- Use **Leaflet + react-leaflet** (lightweight, ~40KB) with **CartoDB Voyager** tiles (free, no API key) styled via CSS filter to match brand warm-orange palette (hue-rotate + saturate to nudge tiles toward our `--primary` warm tones).
- Custom markers using brand colors: shop (primary orange), rider (warning amber, animated pulse), client (accent), destination (success green).
- Polyline shop→rider→destination in `--primary`.

## Schema changes

Add to `orders`:
- `payment_proof_url text` — uploaded SMS/receipt image
- `payment_ref text` — M-Pesa code entered by client
- `payment_submitted_at timestamptz`
- `payment_confirmed_at timestamptz`

Extend `orders.status` enum/check to include: `payment_submitted`, `payment_confirmed` (insert before `rider_assigned`).

Storage bucket: `payment-proofs` (private, RLS: client uploads to own order folder; seller of that shop can read).

## Files to add/edit

- **Migration**: new columns, status values, storage bucket + policies.
- `src/lib/tracking.ts` — `useLiveTracking(orderId, role)` hook wrapping Supabase Realtime broadcast (publish for rider, subscribe for client/seller).
- `src/components/TrackingMap.tsx` — Leaflet map with branded tiles + markers + polyline.
- `src/components/PaymentProofDialog.tsx` — upload image + enter ref + submit.
- `src/components/OrderStatusPill.tsx` — add 2 new statuses.
- `src/routes/products.$productId.tsx` — add **Place Order Now** button (skips cart).
- `src/routes/orders.$orderId.tsx` — render different action panels per status (Pay & upload proof → Track map → Confirm received). Embed `TrackingMap` from `picked_up` onward.
- `src/routes/seller.orders.tsx` — add buttons: Accept, Confirm payment (with proof preview), Find boda (link to detail), Mark sent.
- `src/routes/rider.index.tsx` — when on active order, start broadcasting position via `navigator.geolocation.watchPosition`; toggle button.
- Install: `bun add leaflet react-leaflet @types/leaflet`.

## Brand map theme (CSS)

```css
.brand-map .leaflet-tile-pane {
  filter: saturate(1.15) hue-rotate(-8deg) brightness(0.98);
}
```

Plus custom `divIcon` markers using Tailwind tokens.

## Out of scope (this turn)

- Push notifications (in-app toasts only for now)
- Payment gateway integration (manual M-Pesa proof remains)
- Historical route playback
