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

/**
 * The 3D display pose (Euler XYZ, radians): a three-quarter view in which all
 * eight corners of the outer cube are distinct and clear of the inner cube, even
 * with perspective (chosen by searching pitch/yaw for spacing and clearance).
 * Shared by the live scene and the build-time SVG drawing so both match.
 */
export const DISPLAY_EULER: [number, number, number] = [0.13, -0.43, 0];

/** Rotate a 3D point by DISPLAY_EULER (three.js 'XYZ' order: v' = Rx·Ry·Rz·v). */
export function displayRotate([x, y, z]: [number, number, number]): [number, number, number] {
  const [ax, ay, az] = DISPLAY_EULER;
  // Rz
  let x1 = x * Math.cos(az) - y * Math.sin(az);
  let y1 = x * Math.sin(az) + y * Math.cos(az);
  let z1 = z;
  // Ry
  const x2 = x1 * Math.cos(ay) + z1 * Math.sin(ay);
  const z2 = -x1 * Math.sin(ay) + z1 * Math.cos(ay);
  x1 = x2;
  z1 = z2;
  // Rx
  const y3 = y1 * Math.cos(ax) - z1 * Math.sin(ax);
  const z3 = y1 * Math.sin(ax) + z1 * Math.cos(ax);
  return [x1, y3, z3];
}

/** Outer-cube corners (indices into VERTICES), clockwise on screen from the top, in the display pose. */
export const OUTER_CLOCKWISE: number[] = OUTER.map((i) => {
  const [x, y] = displayRotate([VERTICES[i][0], VERTICES[i][1], VERTICES[i][2]]);
  const fromTop = (Math.PI / 2 - Math.atan2(y, x) + Math.PI * 4) % (Math.PI * 2);
  return { i, fromTop };
})
  .sort((a, b) => a.fromTop - b.fromTop)
  .map((n) => n.i);
