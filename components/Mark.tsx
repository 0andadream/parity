/** Twin ticks: two price prints, same height, 4px apart, never merge. */

type Props = {
  size?: number;
  className?: string;
};

export function Mark({ size = 16, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect x="5" y="1" width="1.25" height="12" fill="currentColor" />
      <rect x="9" y="3" width="1.25" height="12" fill="currentColor" />
    </svg>
  );
}
