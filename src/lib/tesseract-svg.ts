/**
 * Build-time SVG of the tesseract in its 3D display pose: the same geometry and
 * pose as the live scene (hypercube.ts), drawn flat. Used as the still fallback
 * when WebGL is off, and to place the discipline labels before the scene loads.
 */
import { EDGES, INNER_FACES, OUTER_CLOCKWISE, VERTICES, displayRotate, project } from "../scripts/scene/hypercube";

type Pt = [x: number, y: number, depth: number];

/** Half-width of the SVG viewBox in model units (outer cube corners reach ≈ 1.75). */
const EXTENT = 1.9;
const round = (n: number) => Math.round(n * 1000) / 1000;

/** Every vertex in the rest pose, projected 4D → 3D, rotated to the display pose; y points down. */
const POINTS: Pt[] = VERTICES.map((v) => {
  const p = { x: 0, y: 0, z: 0 };
  project(v, p);
  const [x, y, z] = displayRotate([p.x, p.y, p.z]);
  return [round(x), round(-y), round(z)];
});

/**
 * Label anchor for each discipline node, as % of a square box whose central 80%
 * holds the drawing (matches `.scene-fallback { inset: 10% }`), pushed outward.
 */
export function nodeLabelPositions(push = 7): { x: number; y: number }[] {
  return OUTER_CLOCKWISE.map((vi) => {
    const [x, y] = POINTS[vi];
    const len = Math.hypot(x, y) || 1;
    const px = 50 + (x / EXTENT) * 40 + (x / len) * push;
    const py = 50 + (y / EXTENT) * 40 + (y / len) * push;
    return { x: round(px), y: round(py) };
  });
}

export function tesseractSVG({ id, label }: { id: string; label?: string }): string {
  const seg = (a: number, b: number) => `M${POINTS[a][0]} ${POINTS[a][1]}L${POINTS[b][0]} ${POINTS[b][1]}`;
  const path = (kind: string) =>
    EDGES.filter((e) => e.kind === kind)
      .map((e) => seg(e.a, e.b))
      .join("");
  // Inner cube faces, back to front, so nearer faces sit on top.
  const faces = INNER_FACES.map((f) => ({ f, depth: f.reduce((s, i) => s + POINTS[i][2], 0) / 4 }))
    .sort((a, b) => a.depth - b.depth)
    .map(({ f }) => `<path d="M${f.map((i) => `${POINTS[i][0]} ${POINTS[i][1]}`).join("L")}Z"/>`)
    .join("");
  const nodes = OUTER_CLOCKWISE.map((vi) => {
    const [x, y, z] = POINTS[vi];
    const r = round(0.07 * (1 + z * 0.12));
    return `<circle cx="${x}" cy="${y}" r="${r}"/>`;
  }).join("");
  const a11y = label ? `role="img" aria-label="${label}"` : `aria-hidden="true"`;
  return `<svg id="${id}" viewBox="${-EXTENT} ${-EXTENT} ${EXTENT * 2} ${EXTENT * 2}" ${a11y} fill="none" stroke-linecap="round" stroke-linejoin="round">
<g fill="var(--emblem-face-b)" stroke="none">${faces}</g>
<path d="${path("radial")}" stroke="var(--emblem-line)" stroke-width="0.012" opacity="0.55"/>
<path d="${path("inner")}" stroke="var(--emblem-line)" stroke-width="0.014" opacity="0.8"/>
<path d="${path("outer")}" stroke="var(--emblem-line)" stroke-width="0.018"/>
<g fill="var(--emblem-node)">${nodes}</g>
</svg>`;
}
