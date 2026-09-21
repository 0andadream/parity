import type { Lifecycle, SymbolName, Attestation } from '@/lib/types';
// Manually reviewed first-party pages on 2026-09-21. Dates below are issuer terms,
// not events inferred from market prices, an RPC account, or news.
export const VERIFIED_AT = '2026-09-21';
export const HISTORICAL_XAI_MINT = 'PreC1KtJ1sBPPqaeeqL6Qb15GTLCYVvyYEwxhdfTwfx';
const records: Record<SymbolName, Omit<Lifecycle, 'state' | 'daysRemaining'>> = {
 OPENAI: { symbol:'OPENAI', event:'NONE_ON_FILE', successor:null, target:null, ratio:null, deadline:null, consequence:null, action:null, sourceUrl:'https://prestocks.com/openai', verifiedAt:VERIFIED_AT },
 ANTHROPIC: { symbol:'ANTHROPIC', event:'NONE_ON_FILE', successor:null, target:null, ratio:null, deadline:null, consequence:null, action:null, sourceUrl:'https://prestocks.com/anthropic', verifiedAt:VERIFIED_AT },
 XAI: { symbol:'XAI', event:'ACQUIRED', successor:'SpaceX', target:'SPACEX', ratio:0.7165, deadline:'2026-09-12T23:59:00Z', consequence:'Issuer states that unconverted tokens expire worthless after the deadline.', action:'Convert each XAI into 0.7165 SPACEX.', sourceUrl:'https://prestocks.com/xai', verifiedAt:VERIFIED_AT },
 SPACEX: { symbol:'SPACEX', event:'PUBLIC_COMPANY_TRANSITION', successor:null, target:'$SPCXx or any other token', ratio:null, deadline:'2027-03-12T23:59:00Z', consequence:'Issuer states that unconverted tokens expire worthless after the deadline.', action:'Swap SpaceX PreStocks into $SPCXx or any other token before the deadline.', sourceUrl:'https://prestocks.com/spacex', verifiedAt:VERIFIED_AT },
};
export function lifecycleFor(symbol: SymbolName, now = Date.now()): Lifecycle {
 const record = records[symbol];
 const remaining = record.deadline ? Date.parse(record.deadline) - now : null;
 return { ...record, state: remaining === null ? 'NONE_ON_FILE' : remaining <= 0 ? 'WINDOW_CLOSED' : 'ACTION', daysRemaining: remaining === null ? null : Math.max(0, remaining / 86_400_000) };
}
const scope = 'BlockOffice reviewed issuer-provided documents and public information as of the report date. This is a third-party attestation, not a statutory audit or a live custody feed. Parity has not reproduced the underlying document review.';
export const attestations: Partial<Record<SymbolName, Attestation>> = {
 SPACEX: { provider:'BlockOffice Pte. Ltd.', reviewer:'Hue Man Keong · ACCA 5071512', reportDate:'2026-06-17', mintableSupply:'43730.30', mintedSupply:'43713.43', sourceUrl:'https://prestocks.com/documents/spacex-prestocks-attestation-report.pdf', scope },
 ANTHROPIC: { provider:'BlockOffice Pte. Ltd.', reviewer:'Hue Man Keong · ACCA 5071512', reportDate:'2026-07-24', mintableSupply:'7384.00', mintedSupply:'7383.88', sourceUrl:'https://prestocks.com/documents/anthropic-prestocks-attestation-report.pdf', scope },
};
export const FAQ_URL = 'https://prestocks.com/faq?tab=legal';
export const MARKET_LIMITATION = 'A thin or missing Jupiter route does not establish that the asset lacks liquidity through issuer, RFQ, OTC, centralized, or other venues.';
