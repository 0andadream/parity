# PARITY

Live application: https://parity-nu-lovat.vercel.app

Integrity and lifecycle monitoring for PreStocks.

## Day 0 evidence

Observed 21 September 2026. Raw public responses are archived in `data/day0/`. These are historical evidence, never substituted for a failed live scan.

### Catalogue

Source: https://prestocks.com/api/prestocks

OPENAI, ANTHROPIC and SPACEX are present. XAI is absent. No lifecycle/status field or source mark-update timestamp is present in the returned records. Those values are `NO DATA`. Sanitized sample (only requested assets; descriptions and image links omitted):

```json
[
  {
    "name": "Anthropic PreStocks",
    "symbol": "ANTHROPIC",
    "external_url": "https://www.prestocks.com/anthropic",
    "contract_address": "Pren1FvFX6J3E4kXhJuCiAD5aDmGEb7qJRncwA8Lkhw",
    "markPrice": 1047.68859806,
    "markValuation": 1716472550768,
    "tokenPrice": 1062.409427739794,
    "impliedValuation": 1740590308770,
    "supply": 7381.867194789
  },
  {
    "name": "OpenAI PreStocks",
    "symbol": "OPENAI",
    "external_url": "https://www.prestocks.com/openai",
    "contract_address": "PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF",
    "markPrice": 994.4312205347201,
    "markValuation": 1232030968246,
    "tokenPrice": 1112.1708974101027,
    "impliedValuation": 1377902221185,
    "supply": 2826.434948047826
  },
  {
    "name": "SpaceX PreStocks",
    "symbol": "SPACEX",
    "external_url": "https://www.prestocks.com/spacex",
    "contract_address": "PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh",
    "markPrice": 155.22968959039946,
    "markValuation": 2035233707963,
    "tokenPrice": 117.46599060435332,
    "impliedValuation": 1540109654590,
    "supply": 43712.533765345
  }
]
```

### Solana accounts

RPC: `https://api.mainnet-beta.solana.com`, `getAccountInfo`, `jsonParsed`, `finalized`. All four accounts are initialized Token-2022 mints owned by `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`.

| Symbol | Mint | Raw supply | Decimals | Base UI supply | Mint / freeze authority |
|---|---|---|---|---|---|
| OPENAI | `PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF` | 1901869963771 | 9 | 1901.869963771 | `WV9PJN7XTmTLVwbutCLFxp8TyePee6Xq5mRq6Fti5Wc` / `WV9PJN7XTmTLVwbutCLFxp8TyePee6Xq5mRq6Fti5Wc` |
| ANTHROPIC | `Pren1FvFX6J3E4kXhJuCiAD5aDmGEb7qJRncwA8Lkhw` | 7381867194789 | 9 | 7381.867194789 | `WV9PJN7XTmTLVwbutCLFxp8TyePee6Xq5mRq6Fti5Wc` / `WV9PJN7XTmTLVwbutCLFxp8TyePee6Xq5mRq6Fti5Wc` |
| SPACEX | `PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh` | 8742506753069 | 9 | 8742.506753069 | `WV9PJN7XTmTLVwbutCLFxp8TyePee6Xq5mRq6Fti5Wc` / `WV9PJN7XTmTLVwbutCLFxp8TyePee6Xq5mRq6Fti5Wc` |
| XAI | `PreC1KtJ1sBPPqaeeqL6Qb15GTLCYVvyYEwxhdfTwfx` | 2078524355305 | 9 | 2078.524355305 | `WV9PJN7XTmTLVwbutCLFxp8TyePee6Xq5mRq6Fti5Wc` / `WV9PJN7XTmTLVwbutCLFxp8TyePee6Xq5mRq6Fti5Wc` |

XAI candidate is independently observable as an initialized Token-2022 mint with onchain symbol XAI and name xAI PreStocks. Its address also appears in the official https://prestocks.com/xai page payload. This verifies the historical address association; it does not create a current catalogue match.

All mints expose permanentDelegate, defaultAccountState, transferFeeConfig, confidentialTransferMint, confidentialTransferFeeConfig, transferHook, scaledUiAmountConfig, metadataPointer, pausableConfig and tokenMetadata. Full states, metadata URIs, and slot evidence are in the RPC files. OPENAI has a scheduled scaled UI multiplier of 1.4861347 effective at Unix 1784305800. Base UI supply and scaled display supply must remain separate.

### Jupiter observations

USDC mint `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`; input `500000000`; ExactIn; 50 bps slippage. Endpoint: https://lite-api.jup.ag/swap/v1/quote. Raw impact is a fraction (multiply by 100 for percentage display).

| Symbol | Route exists | outAmount (raw) | priceImpactPct (raw) | Venues |
|---|---|---|---|---|
| OPENAI | YES | 297114776 | 0.0172409466362027247704126945 | Manifest |
| ANTHROPIC | YES | 475096567 | 0 | Deriverse, GoonFi V2, Manifest |
| SPACEX | YES | 811675058 | 0.0464689520619082117896981194 | Meteora DLMM |
| XAI | YES | 5550272331 | 0.0591908388494875999578579373 | Meteora DLMM, Meteora DLMM |

A missing or thin Jupiter route does not mean the asset has no liquidity through issuer, RFQ, centralized, OTC, or other venues.

### Lifecycle sources

- [XAI](https://prestocks.com/xai): issuer discloses acquisition by SpaceX, conversion at 0.7165 SPACEX per XAI, deadline 2026-09-12T23:59:00Z, and expiration without value after the deadline. Verified against the live page on 2026-09-21. Window closed; mint still observable. The economic consequence is issuer evidence, not a conclusion derived from the mint.
- [SPACEX](https://prestocks.com/spacex): issuer discloses public-company transition and instructs conversion into $SPCXx or any other token by 2027-03-12T23:59:00Z, with expiration without value afterward. Verified 2026-09-21. ACTION until the deadline; CRITICAL only after it.
- [OPENAI](https://prestocks.com/openai) and [ANTHROPIC](https://prestocks.com/anthropic): no lifecycle action disclosure found on reviewed product pages; NONE_ON_FILE is not a guarantee that no event exists.

### Backing investigation

The official [FAQ](https://prestocks.com/faq?tab=legal) explains that third-party attestation reports are periodically published or available on request, potentially at the requester's expense. It suggests comparing supply with report figures. The FAQ also states that counterparty legal names are withheld under confidentiality terms.

[SpaceX report](https://prestocks.com/documents/spacex-prestocks-attestation-report.pdf): BlockOffice Pte. Ltd.; reviewer Hue Man Keong, ACCA 5071512; report date 2026-06-17; mintable supply 43,730.30; reported minted supply 43,713.43.

[Anthropic report](https://prestocks.com/documents/anthropic-prestocks-attestation-report.pdf): same provider/reviewer; report date 2026-07-24; mintable supply 7,384.00; reported minted supply 7,383.88.

These are third-party assessments of issuer-supplied documents and public information at a point in time, not statutory audits. They attest to the relationship between reported minted and mintable supply. Parity can inspect the report and its scope; it cannot independently reproduce the underlying document review or establish current custody from those dated reports. No linked report was found on the reviewed OPENAI or XAI product page: NO DATA, not a claim that none exists anywhere. Full private-company cap tables, confidential holding-entity identities and real-time underlying custody remain not independently observable from these public sources.

## What Parity is

Parity is the integrity and lifecycle monitor for PreStocks. It records live Solana mint state, sourced issuer disclosures, dated third-party evidence, market observations and holder deadlines. Every observation retains its evidence classification and prior-state comparison. The MVP covers only OPENAI, ANTHROPIC, SPACEX and historical XAI.

## Why it exists

A private company, an SPV or other holding entity, a PreStock product, its Solana mint and a token holder are different things. PreStocks describes economic exposure through holding entities; owning the token does not itself confer direct private-company shareholder rights. Solana exposes the token's technical state. Issuer disclosures describe offchain arrangements and lifecycle terms. A holder needs these layers kept separate, with explicit provenance and limits.

## Running locally

Requires Node.js 20.9+ (Vercel project uses Node.js 24), npm and outbound HTTPS.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Set `RPC_URL` to a mainnet Solana RPC endpoint if desired; blank uses the public mainnet endpoint. Credentials are server-only and are never returned by the API or used by browser code. `npm run scan` runs the engine directly (load environment variables through your shell if using a private endpoint). Local history uses ignored `.parity/*.json` files with atomic replacement. `BLOB_READ_WRITE_TOKEN` enables private Vercel Blob storage. Never commit `.env.local`.

## Evidence model

- **ONCHAIN VERIFIED:** finalized RPC mint, owner, initialized state, raw/base/scaled supply, authorities, Token/Token-2022 configuration and onchain metadata. A revoked authority is a known `null`, distinct from unavailable RPC data.
- **ISSUER ATTESTED / THIRD-PARTY ATTESTED:** API reference marks, manually reviewed lifecycle terms and explicitly attributed BlockOffice reports. Report dates and scope are displayed. No current custody conclusion is inferred from a dated report.
- **MARKET OBSERVED:** token price and implied valuation as reported by the issuer API, calculated premium and a real read-only Jupiter quote. An issuer API market price is not presented as an independent trade tape.
- **NOT INDEPENDENTLY OBSERVABLE:** underlying facts beyond the reviewed public evidence, including current confidential custody arrangements and private cap tables. This classification does not erase the value of published attestations.

## Deterministic checks

Nine checks per asset:

1. **Mint match:** live catalogue contract address against the validated SPL mint; onchain metadata mint, where supplied, must agree. `MATCH`, `MISMATCH` or `NO DATA`. XAI's historical association never manufactures a current catalogue match.
2. **Supply:** raw string, integer decimals, exact decimal base UI supply. Effective scaled UI multiplier and display supply are separate. No floating-point arithmetic is used for raw-supply conversion. Token-2022 large integer fields are parsed losslessly.
3. **Mint authority:** `FIRST_SEEN`, `UNCHANGED`, `CHANGED` or `NO DATA`; changes trigger attention.
4. **Freeze authority:** present → `ATTENTION`; revoked → `VERIFIED`; unavailable → `NO DATA`. Presence is not an automatic failure.
5. **Configuration:** hash owner, initialized state, decimals, authorities, extensions and onchain metadata. Accumulating withheld-fee balances are excluded from the configuration fingerprint but retained in the full snapshot. Configuration changes trigger attention.
6. **Mark:** positive reference mark required; missing/nonpositive → `ATTENTION`. API retrieval timestamp and source mark-update timestamp are separate; an absent source timestamp is `NO DATA`.
7. **Lifecycle:** `NONE_ON_FILE`, `ACTION`, `WINDOW_CLOSED`, derived from manually verified first-party terms and the UTC deadline. Exact fractional days are returned by the API; the UI shows complete days plus hours/minutes/seconds.
8. **Premium:** `(tokenPrice - markPrice) / markPrice`. Absolute premium strictly greater than 0.15 triggers attention. Equality at ±15% does not. Missing/nonpositive mark cannot produce a premium. Displayed as percent and basis points.
9. **Jupiter:** $500 nominal USDC, 500000000 raw units, ExactIn, 50 bps slippage. A valid route with impact strictly above 0.03 (3%) triggers attention. A recognized no-route response triggers attention. Timeouts, rate limits and malformed quotes produce `NO DATA`, not `NO`. Raw `priceImpactPct` is retained and multiplied by 100 for percentage display. No swap or wallet transaction exists in the app.

State precedence: overdue required action → **CRITICAL**; future required action → **ACTION**; canonical change → **CHANGED**; any triggered or unavailable check → **ATTENTION**; otherwise **CLEAR**. Additional check attention remains visible even when the headline state is CHANGED. Approaching deadlines alone never create CRITICAL. The check count is checks without triggered conditions divided by total checks, not a risk score or investment judgment.

## Snapshot hashing

Object keys are sorted recursively; array order is retained except mint extensions, which are sorted by extension name. SHA-256 hashes UTF-8 canonical JSON. Included: actual issuer values, mint state, authorities, supply, extensions, metadata, lifecycle terms/state, dated attestation evidence, market quantities, routes and source links. Semantic dates such as a deadline, report date and multiplier activation are retained.

Excluded: observation timestamps, RPC/quote context slots, route update slots, request durations, the derived countdown, computed check statuses and history pointers. These exclusions prevent clock ticks from manufacturing changes. Real quotes, supply activity and market prices can legitimately change on every scan. Field-level diffs preserve previous/current values. Availability changes are recorded; a failed scan never silently substitutes Day 0 data.

Each saved scan has current/previous hashes, a first-seen timestamp and field-level differences. The first observation has no previous hash and is not labeled CHANGED. Up to 100 complete snapshots per asset are retained. History survives deployments in a private Vercel Blob store. ETag conditional writes prevent lost updates between instances; a competing committed snapshot is returned on collision. Local writes are atomic and same-process scans are coalesced. Local JSON is intended for a single development process.

## Server routes

- `GET /api/scan`: catalogue summary, each asset's checks, state, lifecycle, hash pair, change flag, scan age, and an aggregate state hash.
- `GET /api/scan/[symbol]`: complete observation, canonical JSON, field-level differences, source URLs and saved history. Unknown symbols return 404.

The UI polls once per minute while visible and offers SCAN NOW. Calls within 30 seconds reuse the saved observation with its actual timestamp and age. Scan age never implies source mark freshness. Source requests time out after 15 seconds. History-storage failure returns 503 rather than silently starting a new comparison chain. If production storage is not configured, the response explicitly says history is not saved.

## Honesty / limitations

- Parity is not Proof of Reserves.
- Onchain token state does not independently prove underlying SPV holdings.
- Issuer claims are labeled as issuer evidence; published reports are identified as third-party attestations, with their date and limited scope.
- Market observations are not investment recommendations.
- Jupiter observations cover the measured permissionless Solana route only.
- Missing Jupiter liquidity does not establish absence of liquidity elsewhere.
- Public RPC services and Jupiter Lite can rate-limit or become unavailable. Missing values remain `NO DATA`.
- Lifecycle evidence is manually curated in `data/lifecycle.ts`, reviewed on the date displayed, not automatically inferred from headlines. Subsequent disclosure changes require a human review and code update.
- The app observes on page/API access; it does not provide a guaranteed real-time feed, push alerts or continuous issuer-document review.
- The publicly linked reports do not expose a complete cap table, underlying confidential documents or a live holding-entity custody feed.
- Historical XAI catalogue prices are not manufactured. Its current issuer API values remain `NO DATA` when the asset is absent, even when its mint and a market route remain observable.

## Validation

`npm test` exercises canonical ordering/diffs, lossless token parsing, scheduled multiplier activation, invalid-mint rejection, exact deadline boundaries, premium/impact thresholds, route failure vs absence, authority changes and historical-mint provenance. Fixtures under `data/day0` are captured source responses, not invented market data. `npm run typecheck` and `npm run build` validate the application.

## 60-second demo

1. **0–10s:** Asset register — private exposure, issuer claim and Solana token are separate evidence layers.
2. **10–25s:** XAI — show issuer conversion terms, closed deadline, issuer consequence and observable mint together.
3. **25–40s:** SPACEX — show the verified target wording and live countdown.
4. **40–52s:** OPENAI — inspect mint, supply, authorities, mark, market price, premium and backing classification.
5. **52–60s:** Open a real changed history row. Parity observes what it can, labels sourced claims, and records what changed.

## Evidence-flow motion

The source-to-checker packet motion is inspired by the [OFT Sentinel message-flow visualization](https://oft-sentinel.netlify.app/). PARITY retains its own visual design and evidence model. Motion illustrates active scan work and then briefly replays the returned observation; it is not a blockchain transaction stream. Missing source data never becomes a successful packet in replay. The replay button does not fetch or fabricate data. Motion can be paused and respects reduced-motion preferences.
