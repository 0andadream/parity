import { Mark } from "@/components/Mark";

/** mark 16px · PARITY · hairline · AAPL */
export function Lockup() {
  return (
    <div className="flex items-center gap-2.5" aria-label="PARITY AAPL">
      <Mark size={16} />
      <span className="flex items-center font-[family-name:var(--font-geist)] text-[13px] font-medium uppercase tracking-[0.12em]">
        P
        <ASpread />
        RITY
      </span>
      <span className="h-3 w-px bg-current opacity-35" aria-hidden />
      <span className="font-mono text-[13px] tabular-nums tracking-[0.18em]">AAPL</span>
    </div>
  );
}

/** A as a small inverted V / spread. No crossbar. */
function ASpread() {
  return (
    <svg
      width="9"
      height="11"
      viewBox="0 0 9 12"
      className="-mx-px -translate-y-px"
      fill="currentColor"
      aria-hidden
    >
      <polygon points="4.5,0.2 5.45,0.2 2.7,12 1.55,12" />
      <polygon points="3.55,0.2 4.5,0.2 7.45,12 6.3,12" />
    </svg>
  );
}
