type Variant = "rainbow" | "blue" | "yellow" | "white" | "red";

const BODY = "M20 6 L27 3 Q32 9 37 3 L44 6 L60 17 L52 28 L46 24 L46 61 L18 61 L18 24 L12 28 L4 17 Z";

/** Maillot stylisé (SVG) — arc-en-ciel, bleu, jaune… */
export function Jersey({
  variant,
  size = 56,
  number,
  tilt = 0,
  className,
}: {
  variant: Variant;
  size?: number;
  number?: string | number;
  tilt?: number;
  className?: string;
}) {
  const id = `j-${variant}-${number ?? ""}-${tilt}`.replace(/[^a-z0-9-]/gi, "");
  const fill =
    variant === "blue" ? "#2347d6" : variant === "yellow" ? "#ffd21f" : variant === "red" ? "#e63946" : "#fbfaf6";
  const ink = variant === "yellow" || variant === "rainbow" || variant === "white" ? "#151515" : "#ffffff";
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      style={{ transform: tilt ? `rotate(${tilt}deg)` : undefined }}
      aria-hidden
    >
      <defs>
        <clipPath id={id}>
          <path d={BODY} />
        </clipPath>
      </defs>
      <path d={BODY} fill={fill} />
      <g clipPath={`url(#${id})`}>
        {variant === "rainbow" && (
          <>
            <rect x="0" y="27" width="64" height="3" fill="#1d6fe0" />
            <rect x="0" y="30" width="64" height="3" fill="#e63946" />
            <rect x="0" y="33" width="64" height="3" fill="#151515" />
            <rect x="0" y="36" width="64" height="3" fill="#ffd21f" />
            <rect x="0" y="39" width="64" height="3" fill="#24a148" />
          </>
        )}
        {variant === "blue" && (
          <>
            <rect x="0" y="54" width="64" height="7" fill="#e63946" />
            <rect x="0" y="51" width="64" height="3" fill="#fff" />
          </>
        )}
        {variant === "yellow" && <rect x="0" y="0" width="64" height="9" fill="#151515" opacity=".12" />}
        <path d="M27 3 Q32 9 37 3" stroke={ink} strokeWidth="2.2" fill="none" opacity=".55" />
      </g>
      <path d={BODY} fill="none" stroke="#151515" strokeWidth="2.2" strokeLinejoin="round" />
      {number !== undefined && (
        <text
          x="32"
          y={variant === "rainbow" ? 56 : 49}
          textAnchor="middle"
          fontFamily="Anton, Impact, sans-serif"
          fontSize={variant === "rainbow" ? 13 : 18}
          fill={ink}
        >
          {number}
        </text>
      )}
    </svg>
  );
}
