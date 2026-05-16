# Multi-Provider Lipa Numbers + Branded Payment Page

## Lengo
Seller anaweza kusajili **lipa numbers nyingi** kutoka watoa-huduma tofauti (M-Pesa, Tigo Pesa/Mixx by Yas, Airtel Money, Halopesa, TTCL, NMB, CRDB, NBC, Selcom, n.k.). Mteja anachagua njia anayopendelea wakati wa kulipa. Ukurasa wa malipo unaonyesha rangi rasmi ya provider ili kujenga imani.

## Mabadiliko

### 1. Database (migration mpya)
- Jedwali jipya **`shop_lipa_numbers`** lenye:
  - `shop_id`, `provider` (enum/text), `account_type` (till/paybill/account/wallet), `number`, `account_name`, `instructions`, `qr_code_url`, `is_default`, `active`, `sort_order`.
  - RLS: public read; owner full write; admin override.
- Jedwali **`orders`**: ongeza `lipa_number_id` (mteja amechagua ipi).
- Lipa namba ya zamani kwenye `shops.lipa_number` itabaki kama backward-compat (read-only).

### 2. Providers catalog (`src/lib/payment-providers.ts`)
Orodha ngumu yenye: key, swahili/english label, logo color, brand bg & fg (hex/oklch), aina ya account inayohitajika, placeholder ya namba, USSD code (mf. `*150*00#`), na maelezo mafupi.
- Mobile money: M-Pesa (Vodacom), Tigo Pesa / Mixx by Yas, Airtel Money, Halopesa, TTCL Pesa, Azam Pesa.
- Banks: NMB, CRDB, NBC, Stanbic, Equity, Exim, DTB.
- Aggregators: Selcom Pay.

### 3. Seller registration wizard
Hatua ya **Payments** inabadilishwa:
- Picker ya provider (grid ya cards zenye rangi za brand + logo).
- Form inayobadilika kulingana na provider (Till vs Paybill+Account vs Bank Account+Name).
- Kitufe **+ Ongeza njia nyingine** ili kuongeza watoa huduma zaidi kabla ya kumaliza.
- Mmoja anachaguliwa kama **default**.

### 4. Ukurasa wa kusimamia (`/seller/payments`)
Ukurasa mpya wa seller — orodha ya lipa numbers zote, ongeza, hariri, futa, weka default. Quick-toggle ya active.
Link kwenye seller dashboard.

### 5. Checkout & Order page
- **Checkout**: ikiwa duka lina lipa numbers zaidi ya moja, mteja anaona picker ya brand cards na anachagua moja. Hifadhi `lipa_number_id` kwenye order. Kama haijachaguliwa, default itatumika.
- **Order page (status = accepted)**: badala ya kadi rahisi, onyesha **branded payment card** — full-bleed gradient ya rangi ya provider, logo/badge, namba kubwa yenye copy-button, kiasi cha kulipa, hatua za USSD (`*150*00#` n.k.), QR (kama ipo), na onyo la usalama ("Hakikisha jina ni X kabla ya kuthibitisha"). Mteja anaweza kubadilisha provider kama duka lina nyingi.

### 6. Trust signals kwenye payment card
- Badge ya "Imethibitishwa" kama duka ni verified.
- Jina la mpokeaji (account_name) likionyeshwa kwa herufi nzito.
- Maelezo: "Tuma uthibitisho baada ya kulipa. Hutoshiriki PIN yako."
- Rangi & logo zinazoendana na provider.

## Technical Notes
- Brand colors zitatumika kupitia inline styles (sio Tailwind tokens) kwa kuwa ni za nje ya design system — tutaweka helper `getProviderTheme(key)` itakayorudisha `{ bg, fg, accent }`.
- Logos: SVG/text-based ndani ya component (hatutapakua trademarked assets) — tutatumia monogram + brand color block.
- Backward compatibility: kama `shop_lipa_numbers` haina rekodi, tutaonyesha `shops.lipa_number` ya zamani.

## Files
- `supabase/migrations/<new>.sql` — table, RLS, column.
- `src/lib/payment-providers.ts` — catalog.
- `src/components/LipaNumberForm.tsx`, `LipaNumberCard.tsx`, `LipaProviderPicker.tsx`, `BrandedPaymentCard.tsx`.
- `src/routes/seller.payments.tsx` — management room.
- Hariri: `seller.index.tsx` (wizard + link), `checkout.tsx`, `orders.$orderId.tsx`, `seller.tsx` (nav).
