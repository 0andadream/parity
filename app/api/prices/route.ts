import { HermesClient } from "@pythnetwork/hermes-client";
import { NextResponse } from "next/server";
import { CASH, FEEDS, HERMES_HOSTS, WRAPPERS } from "@/lib/feeds";
import { nyseSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type HermesPrice = {
  price: string;
  conf: string;
  expo: number;
  publish_time: number;
};

type HermesParsed = {
  id: string;
  price: HermesPrice;
};

function scaled(p: HermesPrice) {
  const expo = p.expo;
  const price = Number(p.price) * 10 ** expo;
  const conf = Number(p.conf) * 10 ** expo;
  if (!Number.isFinite(price)) {
    throw new Error("non-finite hermes price");
  }
  return { price, conf, expo, publishTime: p.publish_time };
}

async function latestFrom(host: string, key: string, ids: string[]) {
  const client = new HermesClient(host, { accessToken: key });
  const hexIds = ids.map((id) => (id.startsWith("0x") ? id : `0x${id}`));
  const updates = await client.getLatestPriceUpdates(hexIds, { parsed: true });
  return { host, parsed: (updates.parsed ?? []) as HermesParsed[] };
}

export async function GET() {
  const key = process.env.PYTH_API_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      {
        error: "PYTH_API_KEY missing",
        hint: "Set PYTH_API_KEY on the server. Get one at https://pythdata.app/signup. The key never ships to the browser.",
      },
      { status: 500 },
    );
  }

  const ids = FEEDS.map((f) => f.id);
  let lastError: unknown;
  let result: { host: string; parsed: HermesParsed[] } | null = null;

  for (const host of HERMES_HOSTS) {
    try {
      result = await latestFrom(host, key, ids);
      if (result.parsed.length > 0) break;
      lastError = new Error(`${host} returned no parsed prices`);
    } catch (err) {
      lastError = err;
    }
  }

  if (!result || result.parsed.length === 0) {
    const message = lastError instanceof Error ? lastError.message : String(lastError);
    return NextResponse.json(
      { error: "hermes_unavailable", message },
      { status: 502 },
    );
  }

  const byId = new Map<string, HermesParsed>();
  for (const item of result.parsed) {
    byId.set(item.id.replace(/^0x/i, "").toLowerCase(), item);
  }

  const feeds = [];
  for (const meta of FEEDS) {
    const parsed = byId.get(meta.id.toLowerCase());
    if (!parsed) {
      return NextResponse.json(
        {
          error: "missing_feed",
          message: `Hermes did not return ${meta.symbol}`,
          id: meta.id,
          host: result.host,
        },
        { status: 502 },
      );
    }
    const s = scaled(parsed.price);
    feeds.push({
      key: meta.key,
      label: meta.label,
      symbol: meta.symbol,
      id: meta.id,
      price: s.price,
      conf: s.conf,
      expo: s.expo,
      publishTime: s.publishTime,
    });
  }

  const cash = feeds.find((f) => f.key === CASH.key);
  const strip = feeds.map((f) => {
    const bpsVsCash =
      cash && f.key !== CASH.key && cash.price !== 0
        ? ((f.price - cash.price) / cash.price) * 10_000
        : 0;
    return { ...f, bpsVsCash };
  });

  return NextResponse.json({
    fetchedAt: Date.now(),
    host: result.host,
    session: nyseSession(),
    feeds: strip,
    wrappers: WRAPPERS.map((w) => ({
      key: w.key,
      label: w.label,
      mint: w.mint,
      decimals: w.decimals,
      tokenProgram: w.tokenProgram,
      scaledUi: w.scaledUi,
    })),
  });
}
