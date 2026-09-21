# Parity

Live three-feed board for **one** tokenized equity: cash AAPL vs AAPLx vs AAPLon, plus real Jupiter quotes that say fillable-at-size or mid-with-no-book.

Cash AAPL has one price. Solana has at least two wrapper tokens (AAPLx, AAPLon). Different instruments, different books, not fungible. Comparing mids and picking cheaper is wrong. Parity shows which mid is an actual Solana DEX fill.

Not a cheaper-wrapper router. Not an xStock↔Ondo swap. Not five tickers. No mocks. No Anchor.

## Day 0 evidence

Captured 2026-09-21 from this machine. Commands and payloads below. Do not treat these prints as live; the app re-fetches Hermes + Jupiter on load.

### 0. Pyth API key

Hermes latest prices require `Authorization: Bearer $PYTH_API_KEY` (Pyth Core upgrade, 26 Aug 2026).

- Catalog lookup **does not** need a key. Confirmed: `GET /v2/price_feeds?query=AAPL` on both hosts returned HTTP 200.
- Latest prices **do** need a key. Confirmed: same hosts returned HTTP 401 `unauthorized` with no header.
- Key is stored only in server env (`PYTH_API_KEY`). It is not prefixed `NEXT_PUBLIC_`. It never ships to the browser.
- Signup: [pythdata.app/signup](https://pythdata.app/signup) (Pyth Terminal). `pythdata.app` timed out from this network during Day 0; `hermes.pyth.network` and `pyth.dourolabs.app` were reachable.

Set the key before `next dev` / Vercel:

```bash
cp .env.example .env.local
# paste PYTH_API_KEY=
```

### 1. Feed IDs (not invented)

```bash
curl -sS "https://pyth.dourolabs.app/hermes/v2/price_feeds?query=AAPL"
# same payload on https://hermes.pyth.network/v2/price_feeds?query=AAPL
```

HTTP 200. Parsed symbols in the payload:

| Role | `attributes.symbol` | Feed ID | `asset_type` | `description` |
| --- | --- | --- | --- | --- |
| Cash | `Equity.US.AAPL/USD` | `49f6b65cb1de6b10eaf75e7c03ca029c306d0357e91b5311b175084a5ad55688` | Equity | APPLE INC / US DOLLAR |
| xStock | `Crypto.AAPLX/USD` | `978e6cc68a119ce066aa830017318563a9ed04ec3a0a6439010fc11296a58675` | Crypto | APPLE XSTOCK / US DOLLAR |
| Ondo | `Crypto.AAPLON/USD` | `e6734de88a83d9d2fb33072adab319004700aefd069653aba30ba9e3cac056f2` | Crypto | APPLE ONDO TOKENIZED STOCK / US DOLLAR |

Also in that query, **not used**: `Crypto.AAPLX/AAPL.RR` (redemption rate) and `Equity.Index.AAPL/USD` (Pyth 24/7 index). Cash feed `market_hours.is_open` was `true` at capture.

Same IDs from targeted queries `?query=AAPLX` and `?query=AAPLON`.

### 2. Latest Hermes prices

```bash
curl -sS -H "Authorization: Bearer $PYTH_API_KEY" \
  "https://pyth.dourolabs.app/hermes/v2/updates/price/latest?ids[]=49f6b65cb1de6b10eaf75e7c03ca029c306d0357e91b5311b175084a5ad55688&ids[]=978e6cc68a119ce066aa830017318563a9ed04ec3a0a6439010fc11296a58675&ids[]=e6734de88a83d9d2fb33072adab319004700aefd069653aba30ba9e3cac056f2"
```

Without a key this returned HTTP 401 `unauthorized` on both `pyth.dourolabs.app` and `hermes.pyth.network`. After the key is set, the app prints live `price`, `expo`, `publish_time` on the board (clock + “Xs ago”). No silent fallback prices.

Day 0 live print (once the server key is present):

```
# filled by scripts/day0-prices.mjs — see section below after first authenticated pull
```

### 3. Mints (issuer docs + explorers, not guessed)

| Token | Mint | Decimals | Program | Source |
| --- | --- | --- | --- | --- |
| USDC | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | 6 | Tokenkeg | canonical Solana USDC |
| AAPLx | `XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp` | 8 | Token-2022 | [Backed product page](https://assets.backed.fi/products/apple-xstock) (Solana SPL), [Solscan](https://solscan.io/token/XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp) name `Apple xStock`, Jupiter verified, icon `xstocks-metadata.backed.fi` |
| AAPLon | `123mYEnRLM2LLYsJW3K6oyYh8uP1fngj732iG638ondo` | 9 | Token-2022 | Ondo official `constants.rs` `("AAPLon", "123mYEnRLM2LLYsJW3K6oyYh8uP1fngj732iG638ondo")`, [Solscan](https://solscan.io/token/123mYEnRLM2LLYsJW3K6oyYh8uP1fngj732iG638ondo) name `Apple (Ondo Tokenized)`, Jupiter verified, icon `cdn.ondo.finance` |

Ondo Solana GM tokens use Token-2022 extensions including `scaledUiAmountConfig`. Parity shows Jupiter’s **raw** `outAmount` and labels it. Implied fill uses raw units / 10^decimals.

### 4. Jupiter quotes

Amount is raw USDC (6 decimals). `$50 = 50000000`, `$500 = 500000000`, `$5k = 5000000000`.

```
GET https://lite-api.jup.ag/swap/v1/quote?inputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&outputMint=MINT&amount=AMOUNT&slippageBps=50
```

Captured 2026-09-21 (terminal, then re-checked through `/api/quote` on localhost). `priceImpactPct` treated as a **fraction** (0.017 ≈ 1.7%). Executable if a route exists AND `priceImpactPct <= 0.03`.

#### AAPLx `XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp`

| Size | HTTP | outAmount (raw, 8 dp) | tokensOut | implied fill | priceImpactPct | route |
| --- | --- | --- | --- | --- | --- | --- |
| $50 | 200 | `14771116` | 0.14771116 | $338.50 | `0.00193767` (0.19%) | Whirlpool |
| $500 | 200 | `147698994` | 1.47698994 | $338.53 | `0.00201988` (0.20%) | Raydium CLMM |
| $5k | 200 | `1476856691` | 14.76856691 | $338.56 | `0.00210991` (0.21%) | Whirlpool + Byreal + Raydium CLMM |

#### AAPLon `123mYEnRLM2LLYsJW3K6oyYh8uP1fngj732iG638ondo`

| Size | HTTP | outAmount (raw, 9 dp) | tokensOut | implied fill | priceImpactPct | route |
| --- | --- | --- | --- | --- | --- | --- |
| $50 | 200 | `141804501` | 0.141804501 | $352.60 | `0` | Meteora DLMM |
| $500 | 200 | `1324307915` | 1.324307915 | $377.56 | `0.01711696` (1.71%) | Meteora DLMM |
| $5k | **400** | — | — | — | — | **`{"error":"No routes found","errorCode":"NO_ROUTES_FOUND"}`** |

Local `/api/quote` re-check (dev server, same mints):

```
AAPLx $500 → outAmount 147692921, impliedPx 338.540, priceImpactPct 0.005006, executable true, route Raydium CLMM
AAPLon $5k → error "No routes found", executable false
```

### 5. GATE

AAPLx quotes cleanly at $50 / $500 / $5k with impact well under 3%. That is the liquid wrapper.

AAPLon quotes at $50 and $500, then **no route at $5k**. That failure is success for the demo: a mid without a Solana DEX book at size.

Both were clean at $500, so we quoted $5k until one broke. One ticker: **AAPL**.

## Honesty

Jupiter scores **permissionless Solana DEX fill only**. Ondo size may live on mint / RFQ / CEX. Thin Jupiter is not “Ondo has no liquidity anywhere.” AAPLx and AAPLon are not fungible. Parity does not route between them and does not execute swaps.

## App

Next.js App Router, TypeScript, Tailwind. One page. Secrets only on the server.

```
HermesClient("https://pyth.dourolabs.app/hermes", { accessToken: process.env.PYTH_API_KEY })
# fallback host: https://hermes.pyth.network
# Jupiter: https://lite-api.jup.ag/swap/v1/quote only
```

```
.env.example
PYTH_API_KEY=
RPC_URL=
```

| File | What |
| --- | --- |
| `app/api/prices/route.ts` | 3 Hermes prices → `{ symbol, price, conf, publishTime, id }` |
| `app/api/quote/route.ts` | `mint`, `amountUsd` → USDC raw → Jupiter → `outAmount`, `priceImpactPct`, `impliedPx`, `error` |
| `app/page.tsx` | price strip, NYSE badge, feed age, size chips, two quote rows, verdict |
| `lib/feeds.ts` | Day 0 IDs and mints |
| `lib/session.ts` | America/New_York 09:30–16:00 weekdays |

Implied fill = `inUsd / tokensOut`. tokensOut = Jupiter raw `outAmount / 10^decimals`. Token-2022 raw out is labeled.

## Demo script

1. Open the board.
2. “Cash AAPL has one price. Solana has two wrappers that do not share a book.”
3. Point at the live strip and the bps vs cash.
4. Click **$500**. AAPLx fills (YES, impact ~0.2%).
5. Click **$5,000** if AAPLon still quotes at $500. AAPLon: no route. Mid is not a fill.
6. “Parity does not pretend these are one market.”

## Local

```bash
cp .env.example .env.local
# PYTH_API_KEY=...
npm install
npm run dev
```

```bash
node scripts/day0-prices.mjs   # authenticated Hermes print for the table above
```

## Live

- GitHub: https://github.com/0andadream/parity
- Vercel URL: *(filled on deploy — needs `vercel login` plus server env `PYTH_API_KEY`)*

```bash
npx vercel --prod --yes
npx vercel env add PYTH_API_KEY
```
