/**
 * Build-time SVG drawings of the sculpture, used when a device gets no 3D
 * (reduced motion, data saver, low-power phone, no WebGL, or no JavaScript).
 * Generated from the same geometry as the live scene, projected orthographically.
 */
import { EdgesGeometry, Euler, Matrix4, Vector3 } from "three";
import { ELEMENTS } from "../scripts/scene/elements";

type Pt = [number, number];

const VIEW = new Matrix4().makeRotationFromEuler(new Euler(-0.42, 0.62, 0.08));

function hull(points: Pt[]): Pt[] {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Pt[] = [];
  for (const pt of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pt) <= 0) lower.pop();
    lower.push(pt);
  }
  const upper: Pt[] = [];
  for (const pt of [...p].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pt) <= 0) upper.pop();
    upper.push(pt);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

const r = (n: number) => Math.round(n * 10) / 10;

/** Edges and silhouette of one element solid, centred on (cx, cy). */
function solidPaths(index: number, cx: number, cy: number, size: number, extraSpin = 0) {
  const geometry = ELEMENTS[index].geometry();
  const edges = new EdgesGeometry(geometry);
  const pos = edges.getAttribute("position");
  const spin = new Matrix4().makeRotationFromEuler(new Euler(extraSpin * 0.7, extraSpin, 0));
  const m = VIEW.clone().multiply(spin);
  const v = new Vector3();
  const segs: string[] = [];
  const pts: Pt[] = [];
  for (let i = 0; i < pos.count; i += 2) {
    const a = v.fromBufferAttribute(pos, i).applyMatrix4(m);
    const ax = cx + a.x * size;
    const ay = cy - a.y * size;
    const b = v.fromBufferAttribute(pos, i + 1).applyMatrix4(m);
    const bx = cx + b.x * size;
    const by = cy - b.y * size;
    segs.push(`M${r(ax)} ${r(ay)}L${r(bx)} ${r(by)}`);
    pts.push([ax, ay], [bx, by]);
  }
  geometry.dispose();
  edges.dispose();
  const silhouette = hull(pts).map(([x, y], i) => `${i ? "L" : "M"}${r(x)} ${r(y)}`).join("") + "Z";
  return { edges: segs.join(""), silhouette };
}

/** The assembled sculpture: four solids, the network lines and the central node. */
export function assembledSculptureSVG(label: string): string {
  const size = 400;
  const c = size / 2;
  const radius = 120;
  const verts = [
    [1, 1, 1],
    [1, -1, -1],
    [-1, 1, -1],
    [-1, -1, 1],
  ].map(([x, y, z]) => new Vector3(x, y, z).normalize().applyMatrix4(VIEW));
  const centres: Pt[] = verts.map((p) => [c + p.x * radius, c - p.y * radius]);
  const lines: string[] = [];
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      lines.push(`M${r(centres[i][0])} ${r(centres[i][1])}L${r(centres[j][0])} ${r(centres[j][1])}`);
    }
    lines.push(`M${r(centres[i][0])} ${r(centres[i][1])}L${c} ${c}`);
  }
  // Draw back-to-front so nearer solids overlap farther ones.
  const order = verts.map((p, i) => [p.z, i] as const).sort((a, b) => a[0] - b[0]);
  const solids = order
    .map(([, i]) => {
      const s = solidPaths(i, centres[i][0], centres[i][1], 44, i);
      return `<path d="${s.silhouette}" class="sv-face"/><path d="${s.edges}" class="sv-edge"/>`;
    })
    .join("");
  return `<svg viewBox="0 0 ${size} ${size}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg"><path d="${lines.join("")}" class="sv-net"/><circle cx="${c}" cy="${c}" r="9" class="sv-node"/>${solids}</svg>`;
}

/** A single element solid, for pillar cards. */
export function elementSVG(index: number): string {
  const s = solidPaths(index, 60, 60, 40, 0.3);
  return `<svg viewBox="0 0 120 120" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path d="${s.silhouette}" class="sv-face"/><path d="${s.edges}" class="sv-edge"/></svg>`;
}
