// Hand-built botanical SVG art + decorative shapes. All colors come from theme tokens.
import { cn } from "@/lib/utils";

type LeafVariant = "line" | "fill" | "dark" | "rose";

function Leaf({
  x,
  y,
  angle,
  len,
  variant,
}: {
  x: number;
  y: number;
  angle: number;
  len: number;
  variant: LeafVariant;
}) {
  const w = len * 0.36;
  const d = `M0 0 C ${len * 0.25} ${-w}, ${len * 0.75} ${-w}, ${len} 0 C ${len * 0.75} ${w}, ${len * 0.25} ${w}, 0 0 Z`;
  const fill =
    variant === "fill"
      ? "var(--sage)"
      : variant === "dark"
        ? "var(--pine)"
        : variant === "rose"
          ? "var(--rose-deep)"
          : "none";
  const stroke = variant === "line" ? "var(--primary)" : "none";
  const rib = variant === "dark" ? "var(--sage)" : variant === "line" ? "var(--primary)" : "var(--card)";
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <path d={d} fill={fill} stroke={stroke} strokeWidth={1.4} strokeLinejoin="round" />
      <path d={`M0 0 L${len * 0.92} 0`} stroke={rib} strokeWidth={1} strokeLinecap="round" opacity={0.85} />
      {variant === "line" &&
        [0.3, 0.5, 0.7].map((t) => (
          <g key={t} stroke="var(--primary)" strokeWidth={0.9} strokeLinecap="round" opacity={0.8}>
            <path d={`M${len * t} 0 L${len * (t + 0.14)} ${-w * 0.62}`} />
            <path d={`M${len * t} 0 L${len * (t + 0.14)} ${w * 0.62}`} />
          </g>
        ))}
    </g>
  );
}

type Pt = [number, number];
function cubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
}

const ROSEMARY: [Pt, Pt, Pt, Pt] = [[196, 330], [214, 262], [246, 204], [290, 140]];
const LAVENDER: [Pt, Pt, Pt, Pt] = [[152, 330], [124, 276], [104, 232], [96, 168]];

/** Large hero illustration: sage, rosemary and lavender under a desert sun. */
export function HerbIllustration({ className }: { className?: string }) {
  const needles = Array.from({ length: 16 }, (_, i) => {
    const t = 0.12 + i * 0.054;
    const [x, y] = cubic(...ROSEMARY, t);
    const [x2, y2] = cubic(...ROSEMARY, t + 0.01);
    const a = Math.atan2(y2 - y, x2 - x);
    const len = 15 - i * 0.45;
    return [a - 1.05, a + 1.05].map((dir, k) => (
      <path
        key={`${i}-${k}`}
        d={`M${x.toFixed(1)} ${y.toFixed(1)} l${(Math.cos(dir) * len).toFixed(1)} ${(Math.sin(dir) * len).toFixed(1)}`}
        stroke="var(--pine)"
        strokeWidth={2.4}
        strokeLinecap="round"
        opacity={k ? 0.9 : 0.65}
      />
    ));
  });
  const buds = Array.from({ length: 9 }, (_, i) => {
    const t = 0.55 + i * 0.05;
    const [x, y] = cubic(...LAVENDER, t);
    return (
      <g key={i}>
        <ellipse cx={x - 4} cy={y} rx={3.4} ry={5.2} fill="var(--rose-deep)" opacity={0.85} transform={`rotate(-20 ${x - 4} ${y})`} />
        <ellipse cx={x + 4} cy={y - 2} rx={3.4} ry={5.2} fill="var(--rose-deep)" opacity={0.65} transform={`rotate(20 ${x + 4} ${y - 2})`} />
      </g>
    );
  });

  return (
    <svg viewBox="0 0 360 360" className={cn("h-auto w-full", className)} aria-hidden>
      <circle cx={190} cy={165} r={122} fill="var(--rose)" opacity={0.5} />
      <circle cx={190} cy={165} r={142} fill="none" stroke="var(--rose-deep)" strokeWidth={1.2} strokeDasharray="1 8" strokeLinecap="round" opacity={0.7} />
      <circle cx={292} cy={66} r={15} fill="var(--marigold)" opacity={0.55} />
      <circle cx={70} cy={96} r={9} fill="none" stroke="var(--primary)" strokeWidth={1.2} />
      <circle cx={318} cy={210} r={5} fill="var(--pine)" opacity={0.7} />
      <circle cx={58} cy={210} r={3.5} fill="var(--marigold)" />
      <circle cx={256} cy={30} r={3} fill="var(--primary)" />

      <path d={`M${LAVENDER[0].join(" ")} C ${LAVENDER.slice(1).map((p) => p.join(" ")).join(", ")}`} fill="none" stroke="var(--primary)" strokeWidth={1.8} strokeLinecap="round" />
      {buds}
      <Leaf x={136} y={300} angle={-160} len={30} variant="line" />

      <path d={`M${ROSEMARY[0].join(" ")} C ${ROSEMARY.slice(1).map((p) => p.join(" ")).join(", ")}`} fill="none" stroke="var(--pine)" strokeWidth={2} strokeLinecap="round" />
      {needles}

      <path d="M172 334 C 166 262, 150 190, 176 64" fill="none" stroke="var(--pine)" strokeWidth={2.2} strokeLinecap="round" />
      <Leaf x={168} y={292} angle={-152} len={48} variant="fill" />
      <Leaf x={167} y={282} angle={-26} len={52} variant="line" />
      <Leaf x={160} y={242} angle={-162} len={54} variant="line" />
      <Leaf x={159} y={230} angle={-22} len={50} variant="fill" />
      <Leaf x={156} y={192} angle={-150} len={46} variant="dark" />
      <Leaf x={157} y={182} angle={-36} len={46} variant="line" />
      <Leaf x={162} y={142} angle={-140} len={38} variant="fill" />
      <Leaf x={165} y={132} angle={-42} len={36} variant="rose" />
      <Leaf x={171} y={98} angle={-122} len={28} variant="fill" />
      <Leaf x={173} y={90} angle={-62} len={26} variant="dark" />

      {/* twine binding the bundle */}
      <path d="M142 314 Q 176 326 212 312" fill="none" stroke="var(--rose-deep)" strokeWidth={7} strokeLinecap="round" />
      <path d="M144 304 Q 176 316 210 302" fill="none" stroke="var(--rose-deep)" strokeWidth={4} strokeLinecap="round" opacity={0.7} />
      <path d="M180 320 q -12 14 -26 18 M180 320 q 8 16 22 20" fill="none" stroke="var(--rose-deep)" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

/** Small line-art sprig used as a page ornament. */
export function Sprig({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 220" className={cn("h-auto", className)} aria-hidden>
      <path d="M96 216 C 84 170, 70 120, 40 30" fill="none" stroke="var(--primary)" strokeWidth={1.5} strokeLinecap="round" />
      <Leaf x={86} y={170} angle={-140} len={62} variant="line" />
      <Leaf x={78} y={140} angle={-50} len={58} variant="line" />
      <Leaf x={64} y={104} angle={-150} len={48} variant="line" />
      <Leaf x={58} y={86} angle={-60} len={40} variant="line" />
      <Leaf x={92} y={196} angle={-20} len={56} variant="rose" />
      <circle cx={112} cy={56} r={4} fill="var(--pine)" />
      <circle cx={128} cy={150} r={3.5} fill="var(--pine)" />
      <Leaf x={100} y={20} angle={40} len={20} variant="dark" />
    </svg>
  );
}

/** Logo mark: three leaves on a stem. */
export function LeafMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("size-9", className)} aria-hidden>
      <circle cx={26} cy={24} r={20} fill="var(--rose)" opacity={0.7} />
      <path d="M22 44 C 22 34, 20 22, 26 8" fill="none" stroke="var(--pine)" strokeWidth={1.8} strokeLinecap="round" />
      <Leaf x={21} y={32} angle={-155} len={15} variant="fill" />
      <Leaf x={22} y={26} angle={-25} len={16} variant="dark" />
      <Leaf x={24} y={15} angle={-120} len={11} variant="fill" />
    </svg>
  );
}

/** The dots-and-dash divider that sits under headings. */
export function Flourish({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-1.5", className)} aria-hidden>
      <span className="size-1.5 rounded-full bg-rose" />
      <span className="size-1.5 rounded-full bg-rose" />
      <span className="size-1.5 rounded-full bg-rose" />
      <span className="h-1 w-20 rounded-full bg-rose" />
    </div>
  );
}

/** Rose wave that bleeds off the top-right corner. */
export function WaveTop({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 180" preserveAspectRatio="none" className={cn("pointer-events-none absolute", className)} aria-hidden>
      <path d="M90 0 C 170 90, 330 140, 600 118 L600 0 Z" fill="var(--rose)" opacity={0.75} />
    </svg>
  );
}

/** Rose hill that rises from the bottom-left. */
export function HillBottom({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 500 260" preserveAspectRatio="none" className={cn("pointer-events-none absolute", className)} aria-hidden>
      <path d="M0 40 C 170 10, 360 90, 500 260 L0 260 Z" fill="var(--rose)" opacity={0.75} />
    </svg>
  );
}

/** Page heading in the hand-lettered face, with the flourish beneath. */
export function PageHeading({
  title,
  subtitle,
  className,
}: {
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <h1 className="text-4xl leading-none">{title}</h1>
      <Flourish />
      {subtitle && <p className="text-lg text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
