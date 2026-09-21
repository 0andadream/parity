import { NextRequest, NextResponse } from "next/server";
import {
  JUPITER_QUOTE_URL,
  MAX_IMPACT,
  USDC_MINT,
  usdToUsdcRaw,
  wrapperByMint,
} from "@/lib/feeds";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type JupiterQuote = {
  outAmount?: string;
  priceImpactPct?: string;
  routePlan?: { swapInfo?: { label?: string } }[];
  error?: string;
  errorCode?: string;
};

export async function GET(req: NextRequest) {
  const mint = req.nextUrl.searchParams.get("mint") ?? "";
  const amountUsd = Number(req.nextUrl.searchParams.get("amountUsd"));
  const wrapper = wrapperByMint(mint);

  if (!wrapper) {
    return NextResponse.json(
      { error: "unknown_mint", message: "mint must be AAPLx or AAPLon from Day 0" },
      { status: 400 },
    );
  }
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    return NextResponse.json(
      { error: "bad_amount", message: "amountUsd must be a positive number" },
      { status: 400 },
    );
  }

  const inAmount = usdToUsdcRaw(amountUsd);
  const url = new URL(JUPITER_QUOTE_URL);
  url.searchParams.set("inputMint", USDC_MINT);
  url.searchParams.set("outputMint", wrapper.mint);
  url.searchParams.set("amount", inAmount);
  url.searchParams.set("slippageBps", "50");

  let raw: JupiterQuote;
  try {
    const res = await fetch(url, { cache: "no-store" });
    raw = (await res.json()) as JupiterQuote;
    if (!res.ok) {
      return NextResponse.json({
        mint: wrapper.mint,
        label: wrapper.label,
        amountUsd,
        inAmount,
        outAmount: null,
        priceImpactPct: null,
        impliedPx: null,
        executable: false,
        error: raw.error ?? raw.errorCode ?? `jupiter_http_${res.status}`,
        errorBody: raw,
        decimals: wrapper.decimals,
        tokenProgram: wrapper.tokenProgram,
        scaledUi: wrapper.scaledUi,
      });
    }
  } catch (err) {
    return NextResponse.json(
      {
        mint: wrapper.mint,
        label: wrapper.label,
        amountUsd,
        error: err instanceof Error ? err.message : "jupiter_fetch_failed",
        outAmount: null,
        priceImpactPct: null,
        impliedPx: null,
        executable: false,
      },
      { status: 502 },
    );
  }

  const outAmount = raw.outAmount ?? null;
  const impact =
    raw.priceImpactPct === undefined || raw.priceImpactPct === null
      ? null
      : Number(raw.priceImpactPct);
  const tokensOut =
    outAmount === null ? null : Number(outAmount) / 10 ** wrapper.decimals;
  const impliedPx =
    tokensOut && tokensOut > 0 ? amountUsd / tokensOut : null;
  const executable =
    outAmount !== null &&
    tokensOut !== null &&
    tokensOut > 0 &&
    impact !== null &&
    Number.isFinite(impact) &&
    impact <= MAX_IMPACT;

  const route = (raw.routePlan ?? [])
    .map((step) => step.swapInfo?.label)
    .filter(Boolean);

  return NextResponse.json({
    mint: wrapper.mint,
    label: wrapper.label,
    amountUsd,
    inAmount,
    outAmount,
    outAmountRaw: outAmount,
    tokensOut,
    decimals: wrapper.decimals,
    tokenProgram: wrapper.tokenProgram,
    scaledUi: wrapper.scaledUi,
    priceImpactPct: impact,
    impliedPx,
    executable,
    route,
    error: executable || outAmount ? null : raw.error ?? "no_route",
  });
}
