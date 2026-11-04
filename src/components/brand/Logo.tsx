import { LOGO } from "./logo-paths";
import { cn } from "@/lib/utils";

/**
 * MIZENZA / ميزنزا vector logo system. Every variant is inline SVG paths
 * (no raster text, no web-font dependency), so it stays crisp at any size.
 * - "horizontal": Latin wordmark | Arabic wordmark
 * - "stacked":    Latin above Arabic
 * - "latin" / "arabic": a single script
 * - "icon":       the framed signature M
 * tone="color" uses ivory letters, brass viewfinder corners and a crimson record dot;
 * tone="mono" paints everything in currentColor.
 */
export type LogoVariant = "horizontal" | "stacked" | "latin" | "arabic" | "icon";

const LABEL = "MIZENZA · ميزنزا";

function Corners({ stroke }: { stroke: string }) {
  return (
    <path
      d="M-16 -102V-124H6 M130 2V24H108"
      fill="none"
      stroke={stroke}
      strokeWidth={3.4}
      strokeLinecap="square"
    />
  );
}

function Latin({ mono }: { mono: boolean }) {
  const fill = mono ? "currentColor" : "var(--ivory)";
  return (
    <g>
      <Corners stroke={mono ? "currentColor" : "var(--brass)"} />
      <circle cx={-3} cy={-111} r={4.4} fill={mono ? "currentColor" : "var(--crimson)"} />
      <g fill={fill}>
        <path transform={`scale(${LOGO.latinScale})`} d={LOGO.latinM} />
        <path
          transform={`translate(${LOGO.latinShift} 0) scale(${LOGO.latinScale})`}
          d={LOGO.latinRest}
        />
      </g>
    </g>
  );
}

function Arabic({ mono, x, y, scale = 1 }: { mono: boolean; x: number; y: number; scale?: number }) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${LOGO.arabicScale * scale})`}
      fill={mono ? "currentColor" : "var(--ivory)"}
    >
      <path d={LOGO.arabic} />
    </g>
  );
}

export function Logo({
  variant = "horizontal",
  tone = "color",
  className,
  title = LABEL,
  decorative = false,
}: {
  variant?: LogoVariant;
  tone?: "color" | "mono";
  className?: string;
  title?: string;
  /** Set when an adjacent text label already names the brand. */
  decorative?: boolean;
}) {
  const mono = tone === "mono";
  const a11y = decorative
    ? ({ "aria-hidden": true } as const)
    : ({ role: "img", "aria-label": title } as const);
  const LW = LOGO.latinWidth;
  const AW = LOGO.arabicWidth;

  if (variant === "icon") {
    return (
      <svg viewBox="0 0 160 160" className={cn("shrink-0", className)} {...a11y}>
        <rect width="160" height="160" rx="30" fill={mono ? "transparent" : "var(--obsidian)"} />
        <path
          d="M22 48V22H48 M112 22H138V48 M138 112V138H112 M48 138H22V112"
          fill="none"
          stroke={mono ? "currentColor" : "var(--brass)"}
          strokeWidth={7}
          strokeLinecap="square"
        />
        <circle cx={127} cy={33} r={6.5} fill={mono ? "currentColor" : "var(--crimson)"} />
        <path
          transform={LOGO.iconTransform}
          d={LOGO.iconM}
          fill={mono ? "currentColor" : "var(--ivory)"}
        />
      </svg>
    );
  }
  if (variant === "latin") {
    return (
      <svg viewBox={`-24 -132 ${LW + 48} 172`} className={className} {...a11y}>
        <Latin mono={mono} />
      </svg>
    );
  }
  if (variant === "arabic") {
    return (
      <svg viewBox={`-8 -110 ${AW + 16} 150`} className={className} {...a11y}>
        <Arabic mono={mono} x={0} y={0} />
      </svg>
    );
  }
  if (variant === "stacked") {
    const s = 1.35;
    return (
      <svg viewBox={`-24 -132 ${LW + 48} 330`} className={className} {...a11y}>
        <Latin mono={mono} />
        <Arabic mono={mono} x={(LW - AW * s) / 2} y={150} scale={s} />
      </svg>
    );
  }
  const gap = 44;
  const ax = LW + gap * 2;
  return (
    <svg viewBox={`-24 -132 ${ax + AW + 48} 172`} className={className} {...a11y}>
      <Latin mono={mono} />
      <rect
        x={LW + gap - 0.75}
        y={-96}
        width={1.5}
        height={108}
        fill={mono ? "currentColor" : "var(--brass)"}
        opacity={mono ? 0.5 : 1}
      />
      <Arabic mono={mono} x={ax} y={0} />
    </svg>
  );
}

/** Parent endorsement line, shown consistently above the masthead. */
export function Presents({ className }: { className?: string }) {
  return (
    <p
      dir="ltr"
      lang="en"
      className={cn("font-presents text-sm italic tracking-wide text-ivory/80", className)}
    >
      mrahmostudios <span className="text-brass">presents</span>
    </p>
  );
}
