#!/usr/bin/env node
/**
 * Authenticated Hermes latest print for README Day 0 §2.
 * Usage: PYTH_API_KEY=... node scripts/day0-prices.mjs
 */
import { HermesClient } from "@pythnetwork/hermes-client";

const HOSTS = [
  "https://pyth.dourolabs.app/hermes",
  "https://hermes.pyth.network",
];

const FEEDS = [
  {
    symbol: "Equity.US.AAPL/USD",
    id: "49f6b65cb1de6b10eaf75e7c03ca029c306d0357e91b5311b175084a5ad55688",
  },
  {
    symbol: "Crypto.AAPLX/USD",
    id: "978e6cc68a119ce066aa830017318563a9ed04ec3a0a6439010fc11296a58675",
  },
  {
    symbol: "Crypto.AAPLON/USD",
    id: "e6734de88a83d9d2fb33072adab319004700aefd069653aba30ba9e3cac056f2",
  },
];

const key = process.env.PYTH_API_KEY?.trim();
if (!key) {
  console.error("PYTH_API_KEY missing");
  process.exit(1);
}

const ids = FEEDS.map((f) => `0x${f.id}`);
let lastErr;
for (const host of HOSTS) {
  try {
    const client = new HermesClient(host, { accessToken: key });
    const updates = await client.getLatestPriceUpdates(ids, { parsed: true });
    const capturedAt = new Date().toISOString();
    console.log(`host: ${host}`);
    console.log(`capturedAt: ${capturedAt}`);
    for (const parsed of updates.parsed ?? []) {
      const id = parsed.id.replace(/^0x/i, "").toLowerCase();
      const meta = FEEDS.find((f) => f.id === id);
      const p = parsed.price;
      const price = Number(p.price) * 10 ** p.expo;
      const conf = Number(p.conf) * 10 ** p.expo;
      console.log("---");
      console.log(`symbol: ${meta?.symbol ?? parsed.id}`);
      console.log(`id: ${id}`);
      console.log(`price (raw): ${p.price}`);
      console.log(`expo: ${p.expo}`);
      console.log(`price: ${price}`);
      console.log(`conf (raw): ${p.conf}`);
      console.log(`conf: ${conf}`);
      console.log(`publish_time: ${p.publish_time}`);
      console.log(`publish_time_iso: ${new Date(p.publish_time * 1000).toISOString()}`);
    }
    process.exit(0);
  } catch (err) {
    lastErr = err;
    console.error(`fail ${host}:`, err instanceof Error ? err.message : err);
  }
}
console.error(lastErr);
process.exit(1);
