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
