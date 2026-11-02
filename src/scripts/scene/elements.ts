/**
 * The four elements of TATVA and their solids. Shared by the live WebGL scene and
 * by the build-time SVG fallback, so both always draw the same geometry.
 */
import {
  BoxGeometry,
  IcosahedronGeometry,
  OctahedronGeometry,
  TetrahedronGeometry,
  type BufferGeometry,
} from "three";

export type PillarId = "consult" | "build" | "automate" | "scale";

export interface ElementDef {
  pillar: PillarId;
  element: "earth" | "water" | "fire" | "air";
  /** Builds the solid at roughly unit circumradius so all four read at the same size. */
  geometry: () => BufferGeometry;
  /** Idle spin axis speed (radians per second). */
  spin: [number, number, number];
}

export const ELEMENTS: readonly ElementDef[] = [
  { pillar: "consult", element: "earth", geometry: () => new BoxGeometry(1.2, 1.2, 1.2), spin: [0.11, 0.17, 0] },
  { pillar: "build", element: "water", geometry: () => new IcosahedronGeometry(1, 0), spin: [0.07, -0.13, 0.05] },
  { pillar: "automate", element: "fire", geometry: () => new TetrahedronGeometry(1.15, 0), spin: [-0.15, 0.1, 0.06] },
  { pillar: "scale", element: "air", geometry: () => new OctahedronGeometry(1.05, 0), spin: [0.09, 0.14, -0.07] },
] as const;

export const PILLAR_ORDER: readonly PillarId[] = ELEMENTS.map((e) => e.pillar);
