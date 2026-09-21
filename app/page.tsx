"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Lockup } from "@/components/Lockup";
import { MAX_IMPACT, SIZE_USD, WRAPPERS, type SizeUsd } from "@/lib/feeds";
import { nyseSession } from "@/lib/session";

type Feed = {
  key: string;
  label: string;
  symbol: string;
  id: string;
  price: number;
  conf: number;
  expo: number;
  publishTime: number;
  bpsVsCash: number;
};

type PricesPayload = {
  fetchedAt: number;
  host: string;
  session: { open: boolean; label: "OPEN" | "CLOSED"; clock: string };
  feeds: Feed[];
  error?: string;
  message?: string;
  hint?: string;
};

type QuotePayload = {
  mint: string;
  label: string;
  amountUsd: number;
  outAmount: string | null;
  outAmountRaw: string | null;
  tokensOut: number | null;
  decimals: number;
  tokenProgram: string;
  scaledUi: boolean;
  priceImpactPct: number | null;
  impliedPx: number | null;
  executable: boolean;
  route?: string[];
  error: string | null;
};

function money(n: number | null | undefined, digits = 2) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function signedBps(n: number) {
  if (!Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}`;
}

function ageSec(publishTime: number, nowMs: number) {
  return Math.max(0, Math.floor(nowMs / 1000 - publishTime));
}

function etClock(publishTime: number) {
  return new Date(publishTime * 1000).toLocaleTimeString("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
}

function impactLabel(pct: number | null) {
  if (pct === null || !Number.isFinite(pct)) return "—";
  return `${(pct * 100).toFixed(2)}%`;
}

export default function Page() {
  const [now, setNow] = useState(() => Date.now());
  const [size, setSize] = useState<SizeUsd>(500);
  const [prices, setPrices] = useState<PricesPayload | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<Record<string, QuotePayload | "loading" | "idle">>({
    aaplx: "idle",
    aaplon: "idle",
  });

  const session = prices?.session ?? nyseSession(new Date(now));

  const loadPrices = useCallback(async () => {
    try {
      const res = await fetch("/api/prices", { cache: "no-store" });
      const json = (await res.json()) as PricesPayload;
      if (!res.ok || json.error) {
        setPriceError(json.message ?? json.hint ?? json.error ?? `prices_http_${res.status}`);
        setPrices(json.feeds ? json : null);
        return;
      }
      setPriceError(null);
      setPrices(json);
    } catch (err) {
      setPriceError(err instanceof Error ? err.message : "prices_fetch_failed");
    }
  }, []);

  const loadQuotes = useCallback(async (usd: SizeUsd) => {
    setQuotes({ aaplx: "loading", aaplon: "loading" });
    const next: Record<string, QuotePayload | "loading" | "idle"> = {};
    await Promise.all(
      WRAPPERS.map(async (w) => {
        try {
          const res = await fetch(
            `/api/quote?mint=${encodeURIComponent(w.mint)}&amountUsd=${usd}`,
            { cache: "no-store" },
          );
          const json = (await res.json()) as QuotePayload;
          next[w.key] = json;
        } catch (err) {
          next[w.key] = {
            mint: w.mint,
            label: w.label,
            amountUsd: usd,
            outAmount: null,
            outAmountRaw: null,
            tokensOut: null,
            decimals: w.decimals,
            tokenProgram: w.tokenProgram,
            scaledUi: w.scaledUi,
            priceImpactPct: null,
            impliedPx: null,
            executable: false,
            error: err instanceof Error ? err.message : "quote_fetch_failed",
          };
        }
      }),
    );
    setQuotes(next);
  }, []);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    loadPrices();
    const id = setInterval(loadPrices, 5000);
    return () => clearInterval(id);
  }, [loadPrices]);

  useEffect(() => {
    loadQuotes(size);
    const id = setInterval(() => loadQuotes(size), 12000);
    return () => clearInterval(id);
  }, [size, loadQuotes]);

  const byKey = useMemo(() => {
    const map: Record<string, Feed> = {};
    for (const f of prices?.feeds ?? []) map[f.key] = f;
    return map;
  }, [prices]);

  const cash = byKey.cash;
  const verdict = useMemo(() => {
    const x = quotes.aaplx;
    const o = quotes.aaplon;
    if (x === "idle" || x === "loading" || o === "idle" || o === "loading") {
      return "Quoting Jupiter at this size…";
    }
    const xMid = byKey.aaplx?.price;
    const oMid = byKey.aaplon?.price;
    const cashPx = cash?.price;

    if (x.executable && !o.executable) {
      const midCheaper =
        xMid && oMid && oMid < xMid ? xMid - oMid : cashPx && oMid && oMid < cashPx ? cashPx - oMid : null;
      const impact = o.priceImpactPct !== null ? impactLabel(o.priceImpactPct) : null;
      const fail =
        midCheaper !== null
          ? `Mid looks cheaper by $${money(midCheaper)}. ${o.error ? "No route" : `impact ${impact}`}.`
          : `${o.error ?? "No route"} / impact ${impact ?? "—"}.`;
      return `AAPLx fills at $${money(x.impliedPx)}. AAPLon is not a Solana DEX fill at $${size}. ${fail} Parity does not pretend these are one market.`;
    }
    if (o.executable && !x.executable) {
      return `AAPLon fills at $${money(o.impliedPx)}. AAPLx is not a Solana DEX fill at $${size}. Parity does not pretend these are one market.`;
    }
    if (x.executable && o.executable && x.impliedPx && o.impliedPx) {
      const delta = Math.abs(x.impliedPx - o.impliedPx);
      return `Both wrappers have a Jupiter route at $${size}. Fill prices still disagree by $${money(delta)} — different instruments, different books.`;
    }
    return `No executable Solana DEX fill at $${size} (need a route and impact ≤ ${MAX_IMPACT * 100}%). Mids are not fills.`;
  }, [quotes, byKey, cash, size]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-5 text-[13px] leading-tight">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-[#1c2229] pb-3">
        <div>
          <Lockup />
          <h1 className="mt-1.5 text-[11px] tracking-[0.22em] text-[#8b95a1]">
            cash vs xStock vs Ondo
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="rounded px-2 py-1 text-[11px] tracking-[0.2em]"
            style={{
              background: session.open ? "#0d2a1c" : "#2a0d14",
              color: session.open ? "#3dff9a" : "#ff4d6a",
              border: `1px solid ${session.open ? "#1d5c3a" : "#5c1d2c"}`,
            }}
          >
            {session.label}
          </span>
          <span className="text-[#8b95a1]">
            NYSE {session.clock} ET · 09:30–16:00
          </span>
        </div>
      </header>

      {priceError && (
        <div className="mt-3 border border-[#5c1d2c] bg-[#2a0d14] px-3 py-2 text-[#ff4d6a]">
          {priceError}
        </div>
      )}

      <section className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {(["cash", "aaplx", "aaplon"] as const).map((key) => {
          const feed = byKey[key];
          const title = key === "cash" ? "AAPL" : key === "aaplx" ? "AAPLx" : "AAPLon";
          const sub =
            key === "cash" ? "Equity.US.AAPL/USD" : key === "aaplx" ? "Crypto.AAPLX/USD" : "Crypto.AAPLON/USD";
          const bps = feed?.bpsVsCash ?? 0;
          const up = bps >= 0;
          return (
            <article key={key} className="border border-[#1c2229] bg-[#0b0d10] px-3 py-3">
              <div className="flex items-baseline justify-between">
                <span className="tracking-[0.2em] text-[#8b95a1]">{title}</span>
                {key !== "cash" && feed && (
                  <span style={{ color: up ? "#3dff9a" : "#ff4d6a" }}>
                    {signedBps(bps)} bps vs cash
                  </span>
                )}
              </div>
              <div className="mt-1 text-3xl tabular-nums">
                {feed ? `$${money(feed.price)}` : "—"}
              </div>
              <div className="mt-2 text-[11px] text-[#8b95a1]">
                {sub}
                {feed ? (
                  <>
                    <br />
                    {etClock(feed.publishTime)} ET · {ageSec(feed.publishTime, now)}s ago
                    <br />
                    conf ${money(feed.conf, 4)}
                  </>
                ) : (
                  <><br />waiting on Hermes</>
                )}
              </div>
            </article>
          );
        })}
      </section>

      <section className="mt-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[10px] tracking-[0.3em] text-[#8b95a1]">JUPITER FILL @ SIZE</div>
          <div className="flex gap-1">
            {SIZE_USD.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setSize(n)}
                className="border px-3 py-1 text-[12px]"
                style={{
                  borderColor: size === n ? "#e8edf2" : "#1c2229",
                  background: size === n ? "#e8edf2" : "transparent",
                  color: size === n ? "#07080a" : "#e8edf2",
                }}
              >
                ${n.toLocaleString("en-US")}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto border border-[#1c2229]">
          <table className="w-full text-left">
            <thead className="bg-[#0b0d10] text-[10px] tracking-[0.25em] text-[#8b95a1]">
              <tr>
                <th className="px-3 py-2 font-normal">WRAPPER</th>
                <th className="px-3 py-2 font-normal">MID</th>
                <th className="px-3 py-2 font-normal">FILL PX</th>
                <th className="px-3 py-2 font-normal">IMPACT</th>
                <th className="px-3 py-2 font-normal">YES/NO</th>
              </tr>
            </thead>
            <tbody>
              {WRAPPERS.map((w) => {
                const q = quotes[w.key];
                const mid = byKey[w.key];
                const loading = q === "loading" || q === "idle";
                const quote = loading ? null : q;
                const yes = quote?.executable === true;
                return (
                  <tr key={w.key} className="border-t border-[#1c2229]">
                    <td className="px-3 py-3">
                      <div>{w.label}</div>
                      <div className="text-[11px] text-[#8b95a1]">
                        {w.issuer} · {w.tokenProgram}
                        {w.scaledUi ? " · scaled UI" : ""}
                      </div>
                    </td>
                    <td className="px-3 py-3 tabular-nums">
                      {mid ? `$${money(mid.price)}` : "—"}
                      {mid && (
                        <div className="text-[11px] text-[#8b95a1]">
                          {ageSec(mid.publishTime, now)}s ago
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 tabular-nums">
                      {loading ? "…" : quote?.impliedPx ? `$${money(quote.impliedPx)}` : "—"}
                      {quote?.outAmountRaw && (
                        <div className="text-[11px] text-[#8b95a1]">
                          raw out {quote.outAmountRaw}
                          {quote.scaledUi ? " (Token-2022 raw)" : ""}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 tabular-nums">
                      {loading ? "…" : impactLabel(quote?.priceImpactPct ?? null)}
                    </td>
                    <td className="px-3 py-3">
                      <span style={{ color: yes ? "#3dff9a" : "#ff4d6a" }}>
                        {loading ? "…" : yes ? "YES" : "NO"}
                      </span>
                      {quote?.error && (
                        <div className="text-[11px] text-[#ff4d6a]">{quote.error}</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-4 border border-[#1c2229] bg-[#0b0d10] px-3 py-3">
        <div className="text-[10px] tracking-[0.3em] text-[#8b95a1]">VERDICT</div>
        <p className="mt-2 text-base">{verdict}</p>
      </section>

      <footer className="mt-4 space-y-1 text-[11px] text-[#8b95a1]">
        <p>
          Implied fill = inUsd / tokensOut from Jupiter raw `outAmount`. Executable =
          route exists AND priceImpactPct ≤ {MAX_IMPACT * 100}%.
        </p>
        <p>
          Jupiter scores permissionless Solana DEX fill only. Ondo size may live on
          mint/RFQ/CEX. Thin Jupiter is not “Ondo has no liquidity anywhere.”
        </p>
      </footer>
    </main>
  );
}
