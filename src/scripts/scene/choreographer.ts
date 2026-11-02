/**
 * Turns page state (scroll position, anchors in the layout, pointer, hovered pillar)
 * into targets for the sculpture. The page layout decides WHERE things go, through
 * empty anchor elements; this module only decides HOW the sculpture moves between them.
 *
 * DOM contract
 *   [data-scene-hero]            tall hero track; scrolling through it assembles the elements
 *   [data-anchor="hero"]         box the sculpture occupies in the hero
 *   [data-scene-pillars]         the pillars section
 *   [data-anchor-pillar="<id>"]  one box per pillar; the matching solid moves there
 *   [data-pillar="<id>"]         hover/focus target that highlights that pillar's solid
 *   [data-scene-end]             once this reaches the top, the scene fades out and sleeps
 */
import { Vector3 } from "three";
import { PILLAR_ORDER, type PillarId } from "./elements";
import type { SculptureTargets } from "./sculpture";
import type { Stage } from "./stage";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Ease with a slight overshoot — the "snap" when the elements lock together. */
const easeOutBack = (t: number) => {
  const c = 1.4;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

/** Loose starting positions, as fractions of the hero box size. */
const SCATTER: ReadonlyArray<[number, number, number]> = [
  [-0.3, 0.24, 0.1],
  [0.28, 0.3, -0.5],
  [-0.22, -0.28, 0.4],
  [0.3, -0.2, 0.15],
];
/** Assembled positions: the four vertices of a tetrahedron. */
const ASSEMBLED: ReadonlyArray<[number, number, number]> = [
  [1, 1, 1],
  [1, -1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
].map(([x, y, z]) => [x / Math.sqrt(3), y / Math.sqrt(3), z / Math.sqrt(3)] as [number, number, number]);

export interface ChoreographyEvents {
  onAssembled?: () => void;
  onPillarFocus?: (pillar: PillarId) => void;
}

export class Choreographer {
  private readonly heroTrack: HTMLElement | null;
  private readonly heroAnchor: HTMLElement | null;
  private readonly pillarsSection: HTMLElement | null;
  private readonly pillarAnchors: Map<PillarId, HTMLElement>;
  private readonly endMarker: HTMLElement | null;

  private assembly = 0;
  private pillarsBlend = 0;
  private visibility = 1;
  private pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  private hovered: PillarId | null = null;
  private armed = true;

  private readonly targets: SculptureTargets = {
    elements: PILLAR_ORDER.map(() => ({ position: new Vector3(), scale: 1, highlight: 1 })),
    network: 0,
    networkOpacity: 0,
    nodeScale: 0,
    spin: 1,
  };
  private readonly tmp = new Vector3();
  private readonly anchorCenter = new Vector3();

  constructor(
    private readonly stage: Stage,
    private readonly events: ChoreographyEvents = {},
  ) {
    this.heroTrack = document.querySelector("[data-scene-hero]");
    this.heroAnchor = document.querySelector('[data-anchor="hero"]');
    this.pillarsSection = document.querySelector("[data-scene-pillars]");
    this.endMarker = document.querySelector("[data-scene-end]");
    this.pillarAnchors = new Map(
      PILLAR_ORDER.flatMap((id) => {
        const el = document.querySelector<HTMLElement>(`[data-anchor-pillar="${id}"]`);
        return el ? [[id, el] as const] : [];
      }),
    );

    document.querySelectorAll<HTMLElement>("[data-pillar]").forEach((el) => {
      const id = el.dataset.pillar as PillarId;
      const enter = () => {
        this.hovered = id;
        this.events.onPillarFocus?.(id);
      };
      const leave = () => {
        if (this.hovered === id) this.hovered = null;
      };
      el.addEventListener("pointerenter", enter);
      el.addEventListener("focusin", enter);
      el.addEventListener("pointerleave", leave);
      el.addEventListener("focusout", leave);
    });
  }

  setPointer(clientX: number, clientY: number): void {
    this.pointer.tx = (clientX / window.innerWidth) * 2 - 1;
    this.pointer.ty = (clientY / window.innerHeight) * 2 - 1;
  }

  /** Raw scroll-derived progress values, before smoothing. */
  private measure(): { assembly: number; pillars: number; visibility: number } {
    const vh = window.innerHeight;
    let assembly = 0;
    if (this.heroTrack) {
      const r = this.heroTrack.getBoundingClientRect();
      const travel = r.height - vh;
      if (travel > vh * 0.3) {
        // Pinned hero (desktop): assemble while scrolling through the track.
        assembly = clamp01(-r.top / (travel * 0.85));
      } else if (this.heroAnchor) {
        // Unpinned hero (phones): assemble as the sculpture rises to the middle of the screen.
        const a = this.heroAnchor.getBoundingClientRect();
        const centre = a.top + a.height / 2;
        assembly = clamp01((vh * 0.98 - centre) / (vh * 0.25));
      }
    }
    let pillars = 0;
    if (this.pillarsSection) {
      const r = this.pillarsSection.getBoundingClientRect();
      pillars = clamp01((vh * 0.9 - r.top) / (vh * 0.5));
    }
    let visibility = 1;
    if (this.endMarker) {
      const r = this.endMarker.getBoundingClientRect();
      visibility = clamp01(r.top / (vh * 0.35));
    }
    return { assembly, pillars, visibility };
  }

  /** Whether the scene needs to keep rendering. */
  get visible(): boolean {
    return this.visibility > 0.001 || this.measure().visibility > 0.001;
  }

  get canvasOpacity(): number {
    return this.visibility;
  }

  /** Computes this frame's targets. Call once per frame. */
  frame(dt: number, time: number, first = false): SculptureTargets {
    const raw = this.measure();
    const rate = first ? Infinity : 6;
    const k = 1 - Math.exp(-rate * dt);
    this.assembly = first ? raw.assembly : lerp(this.assembly, raw.assembly, k);
    this.pillarsBlend = first ? raw.pillars : lerp(this.pillarsBlend, raw.pillars, k);
    this.visibility = first ? raw.visibility : lerp(this.visibility, raw.visibility, k);

    // Touch devices have no hover pointer: give the light a slow sway instead.
    const hasPointer = window.matchMedia("(hover: hover)").matches;
    if (!hasPointer) {
      this.pointer.tx = Math.sin(time * 0.35) * 0.5;
      this.pointer.ty = Math.cos(time * 0.27) * 0.3;
    }
    const pk = 1 - Math.exp(-5 * dt);
    this.pointer.x = lerp(this.pointer.x, this.pointer.tx, pk);
    this.pointer.y = lerp(this.pointer.y, this.pointer.ty, pk);
    this.stage.setPointer(this.pointer.x, this.pointer.y);

    // Assembly curve: drift slowly for the first 60% of the scroll, then snap.
    const a = this.assembly;
    const ea = a < 0.6 ? 0.35 * smooth(a / 0.6) : 0.35 + 0.65 * easeOutBack(clamp01((a - 0.6) / 0.4));
    const eb = smooth(this.pillarsBlend);

    if (a > 0.97 && this.armed) {
      this.armed = false;
      this.events.onAssembled?.();
    } else if (a < 0.5) {
      this.armed = true;
    }

    // Hero box → centre and size in scene units.
    const upp = this.stage.unitsPerPixel;
    let heroSize = 4;
    if (this.heroAnchor) {
      const r = this.heroAnchor.getBoundingClientRect();
      this.stage.toWorld(r.left + r.width / 2, r.top + r.height / 2, this.anchorCenter);
      heroSize = Math.min(r.width, r.height) * upp;
    }

    const spinAngle = time * 0.22;
    const cos = Math.cos(spinAngle);
    const sin = Math.sin(spinAngle);
    const lean = (1 - ea) * heroSize * 0.03;

    this.targets.elements.forEach((t, i) => {
      const id = PILLAR_ORDER[i];
      const bob = Math.sin(time * 0.6 + i * 1.7) * heroSize * 0.015 * (1 - ea);

      // Scattered
      const s = SCATTER[i];
      const sx = s[0] * heroSize + this.pointer.x * lean;
      const sy = s[1] * heroSize - this.pointer.y * lean + bob;
      const sz = s[2] * heroSize * 0.4;

      // Assembled, slowly turning as one body
      const p = ASSEMBLED[i];
      const r = heroSize * 0.3;
      const axv = (p[0] * cos + p[2] * sin) * r;
      const azv = (-p[0] * sin + p[2] * cos) * r;
      const ayv = p[1] * r;

      let x = this.anchorCenter.x + lerp(sx, axv, ea);
      let y = this.anchorCenter.y + lerp(sy, ayv, ea);
      let z = lerp(sz, azv, ea);
      let scale = lerp(heroSize * 0.12, heroSize * 0.1, ea);

      // Row, aligned to each pillar's anchor box
      const anchor = this.pillarAnchors.get(id);
      if (anchor && eb > 0) {
        const ar = anchor.getBoundingClientRect();
        this.stage.toWorld(ar.left + ar.width / 2, ar.top + ar.height / 2, this.tmp);
        const rowScale = Math.min(ar.width, ar.height) * upp * 0.36;
        x = lerp(x, this.tmp.x, eb);
        y = lerp(y, this.tmp.y, eb);
        z = lerp(z, 0, eb);
        scale = lerp(scale, rowScale, eb);
      }

      t.position.set(x, y, z);
      t.scale = scale;
      const lit = this.hovered === null ? 1 : this.hovered === id ? 1 : 0;
      t.highlight = lerp(1, lit, eb);
      // The hovered pillar's solid grows slightly; the others shrink back.
      if (this.hovered !== null) t.scale *= lerp(1, this.hovered === id ? 1.12 : 0.9, eb);
    });

    this.targets.network = clamp01((a - 0.55) / 0.4);
    this.targets.networkOpacity = smooth(this.targets.network) * (1 - eb);
    this.targets.nodeScale = heroSize * 0.045 * smooth(clamp01((a - 0.75) / 0.25)) * (1 - eb);
    this.targets.spin = lerp(1, 0.35, ea) * (this.hovered ? 1.8 : 1);
    return this.targets;
  }
}
