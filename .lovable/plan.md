# Delivery Subsidy & Transparent Boda Payment

## Lengo
Wakati wa checkout, mteja **HAONI** gharama ya boda — anaona tu jumla ya bidhaa. Baada ya muuzaji kukubali oda, anajadiliana na boda kuhusu nauli, halafu anaweka:

- **Total boda fee** (kile alichokubaliana na boda)
- **Subsidy ya muuzaji**: `0%` (mteja analipa yote) / `50%` (split) / `100%` (free delivery — muuzaji analipa yote)

Mteja anaona breakdown wazi: "Boda: 3,000 · Muuzaji amechangia 1,500 · Wewe utalipa 1,500". Anajumuisha kwenye malipo yake.

Baada ya delivery, mteja **anathibitisha "Nimempa boda malipo yake"** (kama mteja ndiye anayelipa boda mkononi) au kama muuzaji analipa boda, hatua hii inahamishiwa kwa muuzaji.

## Mabadiliko

### 1. Database
Migration mpya kwenye `orders`:
- `delivery_subsidy_pct` int default 0 (0–100). Asilimia ambayo muuzaji anachangia.
- `delivery_negotiated` boolean default false. Inakuwa true muuzaji akiweka nauli.
- `boda_paid_confirmed` boolean default false.
- `boda_paid_confirmed_at` timestamptz.
- `boda_paid_by` text — 'client' au 'seller'.

Rekebisha `delivery_fee` semantics: tutahifadhi `delivery_fee` kama **total fee** (kile boda anapata). Ongeza VIEW/helper kuhesabu `client_share = delivery_fee * (100 - subsidy_pct) / 100`.

Sasisha `validate_order_status_transition`: kuhama kutoka `accepted` → `payment_submitted` kuruhusiwa tu kama `delivery_negotiated = true` (au subsidy = 100%, hapo mteja halipi boda kabisa lakini bado anapaswa kulipa bidhaa).

### 2. Checkout (`src/routes/checkout.tsx`)
- **Ondoa** Delivery row & fare computation kabisa kwenye summary.
- Total = subtotal tu.
- Kopi mpya: "Gharama ya boda itapangwa na muuzaji baada ya kukubali oda. Wengine wanachangia au kulipia yote." 
- Bado tunatuma `distance_km`/`eta_min` kama hint kwa muuzaji, lakini `delivery_fee = 0` na `delivery_subsidy_pct = 0` (defaults).

### 3. Seller — baada ya kukubali (`seller.orders.tsx` + `orders.$orderId.tsx` seller view)
Component mpya `DeliveryNegotiationCard.tsx` inayoonekana kwa muuzaji kati ya `accepted` na `payment_confirmed`:
- Input: "Nauli ya boda" (TZS)
- Toggle ya subsidy: **Mteja alipe yote (0%)** / **Tugawane 50/50** / **Mimi nitalipa boda yote (100%)** + custom slider
- Preview live: "Mteja atalipa nyongeza ya X. Wewe utachangia Y."
- Button: "Tuma kwa mteja" → updates `delivery_fee`, `delivery_subsidy_pct`, `delivery_negotiated=true`.

Kabla ya hii kufanyika, mteja ataona "Muuzaji anajadiliana na boda…" badala ya BrandedPaymentCard.

### 4. Order page mteja view (`orders.$orderId.tsx`)
Wakati `accepted` & `!delivery_negotiated`:
- Card: "Muuzaji anajadiliana na boda kuhusu nauli. Subiri kidogo…" (spinner)
- Hide payment card.

Wakati `accepted` & `delivery_negotiated`:
- **Delivery breakdown card** (mpya) — transparent:
  ```
  Bidhaa:                  15,000
  Nauli ya boda:            3,000
  Mchango wa muuzaji:      −1,500  (50% subsidy badge ya kijani)
  ─────────────────────────────────
  Utalipa muuzaji:         16,500
  ```
- Kama subsidy = 100%: onyesha "Muuzaji analipia boda yote 🎉 — wewe unalipa bidhaa tu."
- BrandedPaymentCard tumia `client_total = subtotal + client_share`.

### 5. Confirm boda paid (mteja, baada ya `delivered`)
Kama subsidy < 100%, mteja anaona hatua ya ziada kabla ya `completed`:
- Card ya manjano: "Je, umemkabidhi boda nauli yake ya {client_share}?"
- Buttons: **"Ndiyo, nimempa"** (sets `boda_paid_confirmed=true`, `boda_paid_by='client'`) au "Bado"
- Status haiwezi kwenda `completed` mpaka hii itolewe.

Kama subsidy = 100%, hatua hii inafichwa kwa mteja; muuzaji ndiye anayethibitisha (toleo la `seller.orders.tsx`).

### 6. Files
**Create:**
- `supabase/migrations/<new>.sql`
- `src/components/DeliveryNegotiationCard.tsx` (seller input)
- `src/components/DeliveryBreakdownCard.tsx` (transparent breakdown kwa mteja)
- `src/components/BodaPaymentConfirm.tsx` (confirm step)
- `src/lib/delivery-share.ts` (helper: `computeClientShare(fee, subsidyPct)`)

**Edit:**
- `src/routes/checkout.tsx` — ondoa fare display
- `src/routes/orders.$orderId.tsx` — wire negotiation gate, breakdown, confirm step
- `src/routes/seller.orders.tsx` — show negotiation prompt on accepted orders

## Technical notes
- `delivery_fee` inabaki kama **total** boda anachopata. `client_share` ni derived, sio stored.
- RLS: column updates za `delivery_fee`, `delivery_subsidy_pct`, `delivery_negotiated` zinaruhusiwa kwa shop owner tu (tayari kupitia `orders_update` policy + status validation trigger ataongezewa rule).
- Backward-compat: oda za zamani ambazo zilikuwa na `delivery_fee` zilizowekwa wakati wa checkout zitabaki kufanya kazi — kama `delivery_negotiated` haipo (NULL/false), tutaonyesha breakdown ya legacy bila subsidy.
