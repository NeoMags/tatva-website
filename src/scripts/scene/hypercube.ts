/**
 * Tesseract (4D hypercube) maths, independent of rendering.
 *
 * 16 vertices at (±1, ±1, ±1, ±1); 32 edges join vertices that differ in one
 * coordinate. Each frame the vertices are rotated in 4D and projected to 3D with
 * a 4D perspective: points with larger w come out larger. With the eye distance
 * below, the w = -1 cube projects at 43% of the w = +1 cube, matching the logo.
 */

export type Vec4 = [number, number, number, number];

/** Eye distance along w. (d-1)/(d+1) = 0.43 → d ≈ 2.509, the logo's inner/outer ratio. */
export const W_EYE = 2.509;

export const VERTICES: Vec4[] = Array.from({ length: 16 }, (_, i) => [
  i & 1 ? 1 : -1,
  i & 2 ? 1 : -1,
  i & 4 ? 1 : -1,
  i & 8 ? 1 : -1,
]);

export type EdgeKind = "outer" | "inner" | "radial";

export interface Edge {
  a: number;
  b: number;
  kind: EdgeKind;
}

/** Edges classified in the rest pose: outer cube (w = +1), inner cube (w = -1), or joining them. */
export const EDGES: Edge[] = (() => {
  const out: Edge[] = [];
  for (let a = 0; a < 16; a++) {
    for (let bit = 0; bit < 4; bit++) {
      const b = a ^ (1 << bit);
      if (b <= a) continue;
      const kind: EdgeKind = bit === 3 ? "radial" : VERTICES[a][3] > 0 ? "outer" : "inner";
      out.push({ a, b, kind });
    }
  }
  return out;
})();

export const OUTER = VERTICES.map((v, i) => (v[3] > 0 ? i : -1)).filter((i) => i >= 0);
export const INNER = VERTICES.map((v, i) => (v[3] < 0 ? i : -1)).filter((i) => i >= 0);

/**
 * The six outer vertices that form the logo's hexagon when viewed along the
 * (1,1,1) diagonal — every outer vertex except (1,1,1) and (-1,-1,-1).
 */
export const SILHOUETTE = OUTER.filter((i) => {
  const [x, y, z] = VERTICES[i];
  return !(x === y && y === z);
});

/** Faces of the inner cube, as vertex quads (wound consistently outward). */
export const INNER_FACES: [number, number, number, number][] = (() => {
  const faces: [number, number, number, number][] = [];
  const inner = (x: number, y: number, z: number) =>
    VERTICES.findIndex((v) => v[0] === x && v[1] === y && v[2] === z && v[3] === -1);
  for (const axis of [0, 1, 2]) {
    for (const sign of [-1, 1]) {
      const [u, w] = [0, 1, 2].filter((k) => k !== axis);
      const corner = (su: number, sw: number) => {
        const p = [0, 0, 0];
        p[axis] = sign;
        p[u] = su;
        p[w] = sw;
        return inner(p[0], p[1], p[2]);
      };
      const quad: [number, number, number, number] = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)];
      faces.push(sign > 0 ? quad : [quad[0], quad[3], quad[2], quad[1]]);
    }
  }
  return faces;
})();

/** The 12 "dimensional planes": each 3-cube edge swept along w, joining inner and outer cubes. */
export const PLANES: [number, number, number, number][] = EDGES.filter((e) => e.kind === "outer").map(({ a, b }) => [
  a,
  b,
  b ^ 8,
  a ^ 8,
]);

/** Rotates in the XW, YW and ZW planes (the 4D rotations that make a tesseract "turn inside out"). */
export function rotate4(v: Vec4, xw: number, yw: number, zw: number, out: Vec4): Vec4 {
  let [x, y, z, w] = v;
  let c = Math.cos(xw);
  let s = Math.sin(xw);
  [x, w] = [x * c - w * s, x * s + w * c];
  c = Math.cos(yw);
  s = Math.sin(yw);
  [y, w] = [y * c - w * s, y * s + w * c];
  c = Math.cos(zw);
  s = Math.sin(zw);
  [z, w] = [z * c - w * s, z * s + w * c];
  out[0] = x;
  out[1] = y;
  out[2] = z;
  out[3] = w;
  return out;
}

/** 4D → 3D perspective. Scaled so a w = +1 vertex keeps its size. */
export function project(v: Vec4, out: { x: number; y: number; z: number }): number {
  const k = (W_EYE - 1) / (W_EYE - v[3]);
  out.x = v[0] * k;
  out.y = v[1] * k;
  out.z = v[2] * k;
  return k;
}
