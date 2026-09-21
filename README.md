# PARITY

**Integrity and lifecycle monitoring for tokenized private markets.**

Parity continuously snapshots PreStocks across Solana state, issuer evidence, market observations, and lifecycle events. It shows holders what can be independently verified, what is issuer-attested, and what remains outside the observable onchain state.

[Live app](https://parity-nu-lovat.vercel.app) · **Solana Stocklana · Main Track · PreStocks Bounty**

> Onchain facts vs issuer claims. Not proof of SPV shares.

### Why this exists

Use XAI.

1. xAI was acquired by SpaceX.
2. PreStocks published a conversion process.
3. XAI holders had a conversion deadline (1 XAI → 0.7165 SPACEX before 12 September 2026, 23:59 UTC).
4. That issuer-defined window is now closed.
5. The existence or state of a Solana mint alone does not communicate the entire economic lifecycle.

Official evidence: [PreStocks XAI disclosure](https://prestocks.com/xai).

> Parity exists to monitor that boundary.

Solana can prove the token state. Issuer disclosures describe the offchain economic lifecycle. Parity monitors both without pretending they are the same evidence.

## Architecture

```text
PreStocks API ───────┐
                     │
Solana RPC ──────────┼──→ PARITY SCANNER
                     │         │
Jupiter ─────────────┤         ├── deterministic checks
                     │         ├── snapshot
Lifecycle Sources ───┘         ├── SHA-256
                               └── history / diff
```

```text
                    PARITY
                      │
       ┌──────────────┼───────────────┐
       ↓              ↓               ↓
   ONCHAIN         ISSUER          MARKET
   VERIFIED        ATTESTED        OBSERVED

                      +

          NOT INDEPENDENTLY
              OBSERVABLE
```

No model scores risk. Checks are explicit rules. The UI animation illustrates a scan; it is not a token transfer.

## Explore the evidence

| Open | What to inspect |
| --- | --- |
| [Asset register](https://parity-nu-lovat.vercel.app) | Four PreStocks, evidence classes, lifecycle, integrity hash |
| [XAI](https://parity-nu-lovat.vercel.app/c/XAI) | Mint still observable; issuer conversion window closed |
| [SPACEX](https://parity-nu-lovat.vercel.app/c/SPACEX) | ACTION — holder deadline 12 March 2027, 23:59 UTC |
| [OPENAI](https://parity-nu-lovat.vercel.app/c/OPENAI) | Mint, authorities, mark, premium, Jupiter observation |
| [ANTHROPIC](https://parity-nu-lovat.vercel.app/c/ANTHROPIC#issuer) | Dated BlockOffice attestation, with its scope |
| [History](https://parity-nu-lovat.vercel.app/c/OPENAI#history) | BASELINE, STATE CHANGE, CONDITION — not every price tick |

## States

| State | Meaning |
| --- | --- |
| **CLEAR** | No triggered condition |
| **ATTENTION** | A deterministic monitoring threshold is currently triggered |
| **ACTION** | Issuer disclosure requires holder action before a future deadline |
| **CRITICAL** | A required issuer-defined holder window has already closed |

`CHANGED` is not a current-condition label. History uses **BASELINE**, **STATE CHANGE**, and **CONDITION**.

## Integrity hash vs observations

The table **INTEGRITY HASH** covers durable monitored state: mint identity, owner program, authorities, freeze presence, Token-2022 configuration, catalogue membership, mint observability, lifecycle terms (ratio, deadline, state), and attestation presence.

Live token price, premium, Jupiter `outAmount`, impact, and `scannedAt` are **observations**. They are shown. They do not rewrite the integrity hash. Identical integrity hashes do not mean prices did not move.

**STATE CHANGE** fires when an underlying monitored fact changes (authority, freeze, configuration, mint, lifecycle terms).

**CONDITION** fires only when a defined boundary is crossed (premium ±15%, Jupiter route presence, impact 3%, issuer mark availability). Ordinary premium ticks inside the same band are not history events.

**BASELINE** is the first observation.

## Jupiter

Jupiter measures the observed permissionless Solana DEX route at the tested size ($500 USDC).

- No route → `NO JUPITER ROUTE`
- Impact strictly above 3% → `THIN ON OBSERVED ROUTE`

A thin or missing Jupiter route does not establish that the asset lacks liquidity through issuer, RFQ, OTC, centralized, or other venues.

## What Parity does not do

- It does not prove SPV reserves.
- It does not independently prove private-company share custody unless suitable independent evidence exists.
- It does not recommend buying or selling.
- It does not assign AI-generated risk scores.
- It does not treat issuer claims as onchain facts.
- It does not treat Jupiter as the entire market.
- It does not invent missing information.

When evidence is unavailable:

`NO DATA`

`API PULLED AT` is not `MARK UPDATED AT`. If PreStocks does not expose an authoritative mark-update timestamp, Parity shows `MARK UPDATED AT — NO DATA`. Retrieval time does not establish mark freshness.

## 60-second demo

### 0–8 sec

Open the homepage.

> “A tokenized private company has two realities: what exists onchain, and what the issuer says that token economically represents. Parity monitors the boundary.”

Point at the four assets.

### 8–23 sec

Open [XAI](https://parity-nu-lovat.vercel.app/c/XAI).

> “xAI was acquired by SpaceX. PreStocks required XAI holders to convert at 0.7165 SPACEX before September 12.”

Point at `WINDOW CLOSED`, then at the onchain mint state.

> “The token can remain observable on Solana even though the issuer-defined conversion window has closed.”

### 23–35 sec

Open [SPACEX](https://parity-nu-lovat.vercel.app/c/SPACEX).

Point at `ACTION` and the live countdown.

> “SpaceX has another lifecycle deadline. Parity tracks it before the holder misses it.”

### 35–50 sec

Open [OPENAI](https://parity-nu-lovat.vercel.app/c/OPENAI).

Point at mint, supply, mint authority, freeze authority, Token-2022 configuration, mark, premium, Jupiter observation.

> “Every observation is classified. Solana facts are verified. PreStocks claims are issuer-attested. Market data is observed.”

Point at `NOT INDEPENDENTLY OBSERVABLE`.

### 50–60 sec

Open history. Show `BASELINE`, `CONDITION`, or a real `STATE CHANGE` if one exists.

> **“Parity does not pretend to prove the SPV. It proves what it can observe, labels what it must trust, and records what changed.”**

End on PARITY.

## Verify it yourself

```sh
curl --fail --silent --show-error https://parity-nu-lovat.vercel.app/api/scan
curl --fail --silent --show-error https://parity-nu-lovat.vercel.app/api/scan/OPENAI
curl --fail --silent --show-error https://parity-nu-lovat.vercel.app/api/scan/XAI
```

Inspect `scannedAt`, `observations`, `canonical` (integrity hash payload), `historyKind`, and `historyEvents`. Calls within 30 seconds reuse the saved observation. Requests never submit a Solana transaction.

```sh
npm test
npm run build
```

Logic: [lib/checks.ts](lib/checks.ts), [lib/engine.ts](lib/engine.ts), [data/lifecycle.ts](data/lifecycle.ts).

## Run locally

Node.js 20.9+ (Vercel uses Node.js 24).

```sh
npm ci
cp .env.example .env.local
npm run dev
```

| Variable | Purpose |
| --- | --- |
| `RPC_URL` | Optional mainnet endpoint; empty uses public Solana RPC |
| `BLOB_READ_WRITE_TOKEN` | Optional private Blob credentials for durable history |

Credentials are server-only. Never commit `.env.local`.

## Honesty / limitations

- Parity is not Proof of Reserves.
- Onchain token state does not independently prove underlying SPV holdings.
- Lifecycle evidence is manually curated in `data/lifecycle.ts`, reviewed on the date displayed.
- Historical XAI catalogue prices are not manufactured. Current issuer API values remain `NO DATA` when the asset is absent.
- The app observes on page/API access; it is not a guaranteed real-time alert feed.
