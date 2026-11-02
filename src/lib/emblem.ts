/**
 * The TATVA tesseract emblem, generated as SVG from its geometry rather than traced.
 *
 * It is a tesseract projected along its long diagonal: an outer hexagon with six
 * nodes (the outer cube seen corner-on), an inner cube, six edges joining
 * corresponding corners, and the six planes between them. Proportions measured
 * from the approved logo: inner cube ≈ 43% of the outer radius.
 *
 * Colours come from CSS custom properties (--emblem-*), so the same markup works
 * in dark, light and the emerald-glow variant.
 */

export const EMBLEM = { R: 100, r: 43, node: 7.5 } as const;

type Pt = [number, number];
const round = (n: number) => Math.round(n * 100) / 100;

/** Hexagon corners, pointy-top, clockwise from the top: 0 top, 1 upper-right … 5 upper-left. */
export function hexagon(radius: number): Pt[] {
  return Array.from({ length: 6 }, (_, i) => {
    const a = ((90 - 60 * i) * Math.PI) / 180;
    return [round(Math.cos(a) * radius), round(-Math.sin(a) * radius)];
  });
}

const poly = (pts: Pt[]) => `M${pts.map(([x, y]) => `${x} ${y}`).join("L")}Z`;
const line = (a: Pt, b: Pt) => `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`;

export interface EmblemOptions {
  /** Unique id prefix, needed when several emblems share a page (gradient ids). */
  id: string;
  /** Accessible name; omit for a decorative emblem. */
  label?: string;
}

export function emblemSVG({ id, label }: EmblemOptions): string {
  const outer = hexagon(EMBLEM.R);
  const inner = hexagon(EMBLEM.r);
  const c: Pt = [0, 0];

  // Planes between the outer and inner hexagons. The two upper planes catch the light.
  const planes = outer
    .map((p, i) => {
      const j = (i + 1) % 6;
      const lit = i === 0 || i === 5;
      return `<path d="${poly([p, outer[j], inner[j], inner[i]])}" fill="${lit ? "var(--emblem-face-a)" : "var(--emblem-face-b)"}"/>`;
    })
    .join("");

  // Inner cube: top, right and left faces.
  const core =
    `<path d="${poly([inner[0], inner[1], c, inner[5]])}" fill="var(--emblem-core-top)"/>` +
    `<path d="${poly([inner[1], inner[2], inner[3], c])}" fill="var(--emblem-core-side)"/>` +
    `<path d="${poly([inner[5], c, inner[3], inner[4]])}" fill="var(--emblem-core-front)"/>`;

  const edges = [
    poly(outer),
    poly(inner),
    ...outer.map((p, i) => line(p, inner[i])),
    line(c, inner[1]),
    line(c, inner[5]),
    line(c, inner[3]),
  ].join("");

  const nodes = outer
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${EMBLEM.node}" fill="url(#${id}-node)"/>`)
    .join("");

  const a11y = label ? `role="img" aria-label="${label}"` : `aria-hidden="true"`;
  const v = EMBLEM.R + EMBLEM.node + 4;
  return (
    `<svg class="emblem" viewBox="${-v} ${-v} ${v * 2} ${v * 2}" ${a11y} xmlns="http://www.w3.org/2000/svg">` +
    `<defs><radialGradient id="${id}-node" cx="35%" cy="30%" r="75%">` +
    `<stop offset="0" stop-color="var(--emblem-node)"/>` +
    `<stop offset="1" stop-color="var(--emblem-node)" stop-opacity="0.55"/></radialGradient></defs>` +
    `<g class="emblem-planes">${planes}</g><g class="emblem-core">${core}</g>` +
    `<path class="emblem-edges" d="${edges}" fill="none" stroke="var(--emblem-line)" stroke-width="1.6" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>` +
    `<g class="emblem-nodes">${nodes}</g></svg>`
  );
}

/**
 * The emblem at one of seven build stages, used as the glyph for each step of the
 * process: the structure assembles as the process advances.
 *   1 the idea (a single point) · 2 six nodes · 3 the outer frame · 4 connecting edges
 *   5 the inner cube outline · 6 the dimensional planes · 7 the complete emblem
 */
export function emblemStageSVG(stage: number): string {
  const outer = hexagon(EMBLEM.R);
  const inner = hexagon(EMBLEM.r);
  const c: Pt = [0, 0];
  const parts: string[] = [];
  if (stage >= 6) {
    parts.push(
      outer
        .map((p, i) => `<path d="${poly([p, outer[(i + 1) % 6], inner[(i + 1) % 6], inner[i]])}" class="g-plane"/>`)
        .join(""),
    );
  }
  if (stage >= 7) {
    parts.push(
      `<path d="${poly([inner[0], inner[1], c, inner[5]])}" class="g-core g-core-top"/>` +
        `<path d="${poly([inner[1], inner[2], inner[3], c])}" class="g-core"/>` +
        `<path d="${poly([inner[5], c, inner[3], inner[4]])}" class="g-core g-core-low"/>`,
    );
  }
  const lines: string[] = [];
  if (stage >= 3) lines.push(poly(outer));
  if (stage >= 4) lines.push(...outer.map((p, i) => line(p, inner[i])));
  if (stage >= 5) lines.push(poly(inner), line(c, inner[1]), line(c, inner[5]), line(c, inner[3]));
  // Each line is its own path with pathLength=1 so CSS can draw it in.
  lines.forEach((d, i) => parts.push(`<path d="${d}" class="g-line" pathLength="1" style="--i:${i}"/>`));
  if (stage >= 2)
    parts.push(outer.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="9" class="g-node" style="--i:${i}"/>`).join(""));
  if (stage === 1) parts.push(`<circle cx="0" cy="0" r="12" class="g-node g-seed"/>`);
  return `<svg viewBox="-115 -115 230 230" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${parts.join("")}</svg>`;
}
