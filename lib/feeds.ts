/** Day 0 IDs and mints only. Do not invent replacements. */

export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const USDC_DECIMALS = 6;

export const HERMES_HOSTS = [
  "https://pyth.dourolabs.app/hermes",
  "https://hermes.pyth.network",
] as const;

export const JUPITER_QUOTE_URL = "https://lite-api.jup.ag/swap/v1/quote";

/** Executable if a route exists AND priceImpactPct <= this fraction (3%). */
export const MAX_IMPACT = 0.03;

export const SIZE_USD = [50, 500, 5000] as const;
export type SizeUsd = (typeof SIZE_USD)[number];

export const CASH = {
  key: "cash",
  label: "AAPL",
  venue: "NYSE cash",
  symbol: "Equity.US.AAPL/USD",
  id: "49f6b65cb1de6b10eaf75e7c03ca029c306d0357e91b5311b175084a5ad55688",
} as const;

export type Wrapper = {
  key: "aaplx" | "aaplon";
  label: "AAPLx" | "AAPLon";
  issuer: string;
  symbol: string;
  id: string;
  mint: string;
  decimals: number;
  tokenProgram: "Token-2022";
  /** Raw Jupiter outAmount is the source of truth; UI amount may be scaled. */
  scaledUi: boolean;
};

export const WRAPPERS: readonly Wrapper[] = [
  {
    key: "aaplx",
    label: "AAPLx",
    issuer: "xStocks / Backed",
    symbol: "Crypto.AAPLX/USD",
    id: "978e6cc68a119ce066aa830017318563a9ed04ec3a0a6439010fc11296a58675",
    mint: "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp",
    decimals: 8,
    tokenProgram: "Token-2022",
    scaledUi: false,
  },
  {
    key: "aaplon",
    label: "AAPLon",
    issuer: "Ondo",
    symbol: "Crypto.AAPLON/USD",
    id: "e6734de88a83d9d2fb33072adab319004700aefd069653aba30ba9e3cac056f2",
    mint: "123mYEnRLM2LLYsJW3K6oyYh8uP1fngj732iG638ondo",
    decimals: 9,
    tokenProgram: "Token-2022",
    scaledUi: true,
  },
] as const;

export const FEEDS = [CASH, ...WRAPPERS] as const;

export function wrapperByMint(mint: string): Wrapper | undefined {
  return WRAPPERS.find((w) => w.mint === mint);
}

export function usdToUsdcRaw(amountUsd: number): string {
  return Math.round(amountUsd * 10 ** USDC_DECIMALS).toString();
}
