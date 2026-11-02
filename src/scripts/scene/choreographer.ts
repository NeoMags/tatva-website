/**
 * Turns page state (time, scroll, anchors in the layout, pointer, hovered
 * discipline) into a pose for the tesseract. The page layout decides WHERE the
 * tesseract sits, through empty anchor boxes; this module decides HOW it moves.
 *
 * DOM contract
 *   [data-scene-hero]          hero track; scrolling through it carries the visitor into the tesseract
 *   [data-anchor="hero"]       box the tesseract occupies in the hero
 *   [data-scene-disciplines]   the disciplines section
 *   [data-anchor="disciplines"] box the tesseract occupies there (logo pose, nodes = disciplines)
 *   [data-discipline="0..5"]   hover/focus target; lights that discipline's node
 *   [data-scene-end]           once this reaches the top, the scene fades out and sleeps
 */
import { Quaternion, Vector3 } from "three";
import type { Stage } from "./stage";
import { OUTER_CLOCKWISE, VERTICES, displayRotate } from "./hypercube";

/** Screen direction of each node in the display pose, used to tilt toward a hovered node. */
const NODE_DIRECTIONS = OUTER_CLOCKWISE.map((vi) => {
  const [x, y] = displayRotate([VERTICES[vi][0], VERTICES[vi][1], VERTICES[vi][2]]);
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len };
});
/** Seconds the turn from the logo pose into the 3D pose takes, after the build-up. */
const REVEAL_SECONDS = 2.6;
import type { TesseractState } from "./tesseract";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Distance from the centre to a hexagon corner, in tesseract units (√(8/3)). */
const HEX_RADIUS = Math.sqrt(8 / 3);
/** How long the opening build-up takes, in seconds. */
const BUILD_SECONDS = 2.8;

export interface ChoreographyEvents {
  onBuilt?: () => void;
  onDiscipline?: (index: number) => void;
}

export interface Frame {
  tesseract: TesseractState;
  position: Vector3;
  scale: number;
  rotation: Quaternion;
  /** forward travel into the tesseract, 0..1 */
  travel: number;
  pointer: { x: number; y: number };
  /** canvas opacity, 0..1 */
  visibility: number;
  /** 0..1 how far the scene has moved into the disciplines section */
  discBlend: number;
}

export class Choreographer {
  private readonly heroTrack = document.querySelector<HTMLElement>("[data-scene-hero]");
  private readonly heroAnchor = document.querySelector<HTMLElement>('[data-anchor="hero"]');
  private readonly discSection = document.querySelector<HTMLElement>("[data-scene-disciplines]");
  private readonly discAnchor = document.querySelector<HTMLElement>('[data-anchor="disciplines"]');
  private readonly endMarker = document.querySelector<HTMLElement>("[data-scene-end]");

  private startTime = -1;
  private built = false;
  private enter = 0;
  private disc = 0;
  private visibility = 1;
  private hovered = -1;
  private readonly pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  private readonly heroCentre = new Vector3();
  private readonly discCentre = new Vector3();
  private readonly qTilt = new Quaternion();
  private readonly basePose = new Quaternion();
  private readonly qRoll = new Quaternion();
  private readonly qYaw = new Quaternion();
  private readonly axisX = new Vector3(1, 0, 0);
  private readonly axisY = new Vector3(0, 1, 0);
  private readonly axisZ = new Vector3(0, 0, 1);

  private readonly out: Frame = {
    tesseract: { xw: 0, yw: 0, zw: 0, build: 0, opacity: 1, activeNode: -1, pulses: 0, time: 0, reveal: 0 },
    position: new Vector3(),
    scale: 1,
    rotation: new Quaternion(),
    travel: 0,
    pointer: { x: 0, y: 0 },
    visibility: 1,
    discBlend: 0,
  };

  constructor(
    private readonly stage: Stage,
    private readonly logoPose: Quaternion,
    private readonly displayPose: Quaternion,
    /** maps discipline index (clockwise from top) → node index */
    private readonly nodeOrder: number[],
    private readonly events: ChoreographyEvents = {},
  ) {
    document.querySelectorAll<HTMLElement>("[data-discipline]").forEach((el) => {
      const index = Number(el.dataset.discipline);
      const enter = () => {
        this.hovered = index;
        this.events.onDiscipline?.(index);
      };
      const leave = () => {
        if (this.hovered === index) this.hovered = -1;
      };
      el.addEventListener("pointerenter", enter);
      el.addEventListener("focusin", enter);
      el.addEventListener("pointerleave", leave);
      el.addEventListener("focusout", leave);
    });
  }

  /**
   * Hovering a discipline tips the structure toward that node. A damped spring
   * makes it overshoot slightly and settle, like something finding its balance.
   */
  private readonly lean = { x: 0, y: 0, vx: 0, vy: 0 };
  private updateLean(dt: number): void {
    let tx = 0;
    let ty = 0;
    if (this.hovered >= 0) {
      const dir = NODE_DIRECTIONS[this.hovered] ?? { x: 0, y: 0 };
      // Turn so the hovered node swings toward the viewer.
      // (rotation about Y brings a right-hand node forward when negative; about X, a top node when positive)
      tx = -dir.x * 0.16;
      ty = dir.y * 0.16;
    }
    // Critically damped-ish: a smooth tilt with only a hint of settle.
    const stiffness = 20;
    const damping = 7.5;
    const step = Math.min(dt, 1 / 30);
    this.lean.vx += ((tx - this.lean.x) * stiffness - this.lean.vx * damping) * step;
    this.lean.vy += ((ty - this.lean.y) * stiffness - this.lean.vy * damping) * step;
    this.lean.x += this.lean.vx * step;
    this.lean.y += this.lean.vy * step;
  }

  setPointer(clientX: number, clientY: number): void {
    this.pointer.tx = (clientX / window.innerWidth) * 2 - 1;
    this.pointer.ty = (clientY / window.innerHeight) * 2 - 1;
  }

  private measure() {
    const vh = window.innerHeight;
    let enter = 0;
    if (this.heroTrack) {
      const r = this.heroTrack.getBoundingClientRect();
      const travel = r.height - vh;
      if (travel > vh * 0.3) {
        enter = clamp01(-r.top / travel);
      } else if (this.heroAnchor) {
        // Unpinned hero (phones): progress as the tesseract scrolls up past the middle.
        const a = this.heroAnchor.getBoundingClientRect();
        enter = clamp01((vh * 0.5 - (a.top + a.height / 2)) / (vh * 0.6));
      }
    }
    let disc = 0;
    if (this.discSection) {
      const r = this.discSection.getBoundingClientRect();
      disc = clamp01((vh * 0.85 - r.top) / (vh * 0.5));
    }
    let visibility = 1;
    if (this.endMarker) visibility = clamp01(this.endMarker.getBoundingClientRect().top / (vh * 0.35));
    return { enter, disc, visibility };
  }

  get visible(): boolean {
    return this.visibility > 0.001 || this.measure().visibility > 0.001;
  }

  private anchor(el: HTMLElement | null, out: Vector3): number {
    if (!el) {
      out.set(0, 0, 0);
      return 4;
    }
    const r = el.getBoundingClientRect();
    this.stage.toWorld(r.left + r.width / 2, r.top + r.height / 2, out);
    return Math.min(r.width, r.height) * this.stage.unitsPerPixel;
  }

  frame(dt: number, time: number, first = false): Frame {
    if (this.startTime < 0) this.startTime = time;
    const raw = this.measure();
    const k = first ? 1 : 1 - Math.exp(-6 * dt);
    this.enter = lerp(this.enter, raw.enter, k);
    this.disc = lerp(this.disc, raw.disc, k);
    this.visibility = clamp01(lerp(this.visibility, raw.visibility, k));
    this.enter = clamp01(this.enter);
    this.disc = clamp01(this.disc);

    if (!window.matchMedia("(hover: hover)").matches) {
      // No hover pointer on touch screens: a slow sway stands in for it.
      this.pointer.tx = Math.sin(time * 0.3) * 0.4;
      this.pointer.ty = Math.cos(time * 0.23) * 0.25;
    }
    const pk = 1 - Math.exp(-4 * dt);
    this.pointer.x = lerp(this.pointer.x, this.pointer.tx, pk);
    this.pointer.y = lerp(this.pointer.y, this.pointer.ty, pk);
    this.stage.setPointer(this.pointer.x, this.pointer.y);

    const build = clamp01((time - this.startTime) / BUILD_SECONDS);
    if (build >= 1 && !this.built) {
      this.built = true;
      this.events.onBuilt?.();
    }

    const e = smooth(this.enter);
    const d = smooth(this.disc);

    // Size and place: hero box, then the disciplines box.
    const heroSize = this.anchor(this.heroAnchor, this.heroCentre);
    const discSize = this.discAnchor ? this.anchor(this.discAnchor, this.discCentre) : heroSize;
    if (!this.discAnchor) this.discCentre.copy(this.heroCentre);

    const heroScale = ((heroSize * 0.44) / HEX_RADIUS) * (1 + 1.4 * e * e);
    const discScale = (discSize * 0.4) / HEX_RADIUS;
    this.out.scale = lerp(heroScale, discScale, d);
    this.out.position.lerpVectors(this.heroCentre, this.discCentre, d);
    this.out.position.y += Math.sin(time * 0.5) * heroSize * 0.012 * (1 - d);
    // Disciplines: a slow float, as if the structure is suspended and balancing.
    this.out.position.y += Math.sin(time * 0.7) * discSize * 0.012 * d;

    // Orientation: logo pose, a slow continuous roll, gentle yaw sway, pointer tilt.
    // In the disciplines section the roll settles to zero so nodes line up with their labels.
    // Hold the exact logo pose while it builds, then ease into motion over 3 s.
    const sway = smooth(clamp01((time - this.startTime - BUILD_SECONDS) / 3));
    const free = sway * (1 - d);
    const roll = ((time - this.startTime - BUILD_SECONDS) * 0.05) % (Math.PI * 2);
    const settledRoll = Math.atan2(Math.sin(roll), Math.cos(roll)) * free;
    this.updateLean(dt);
    // Balancing sway in the disciplines section: small enough that nodes stay by their numbers.
    const balanceYaw = (Math.sin(time * 0.55) * 0.07 + this.lean.x) * d;
    const balanceTilt = (Math.sin(time * 0.43 + 1.3) * 0.05 + this.lean.y) * d;
    const balanceRoll = Math.sin(time * 0.31) * 0.035 * d;
    const yaw = (Math.sin(time * 0.21) * 0.18 + this.pointer.x * 0.2) * free + balanceYaw;
    const tilt = this.pointer.y * 0.14 * free + balanceTilt;
    this.qRoll.setFromAxisAngle(this.axisZ, settledRoll + balanceRoll);
    this.qYaw.setFromAxisAngle(this.axisY, yaw);
    this.qTilt.setFromAxisAngle(this.axisX, tilt);
    // After the build-up, turn from the flat logo pose into the 3D pose so all eight corners show.
    // The disciplines section always uses the 3D pose.
    const reveal = Math.max(smooth(clamp01((time - this.startTime - BUILD_SECONDS) / REVEAL_SECONDS)), d);
    this.basePose.slerpQuaternions(this.logoPose, this.displayPose, reveal);
    this.out.rotation.copy(this.qTilt).multiply(this.qYaw).multiply(this.qRoll).multiply(this.basePose);
    this.out.tesseract.reveal = reveal;

    // 4D: a slow breath makes the central cube expand and contract; scrolling into the
    // hero turns the tesseract inside out (the inner cube becomes the outer one).
    const breath = Math.sin(time * 0.45) * 0.12 * sway;
    const t = this.out.tesseract;
    t.xw = lerp(breath + e * (Math.PI / 2), Math.sin(time * 0.5) * 0.06, d);
    t.yw = lerp(e * 0.55, 0, d);
    t.zw = lerp(Math.sin(time * 0.31) * 0.05 * sway, 0, d);
    t.build = build;
    t.opacity = lerp(1 - 0.9 * smooth(clamp01((this.enter - 0.55) / 0.45)), 1, d);
    t.activeNode = d > 0.5 && this.hovered >= 0 ? this.nodeOrder[this.hovered] : -1;
    t.pulses = 1;
    t.time = time;

    this.out.discBlend = d;
    this.out.travel = e * (1 - d);
    this.out.pointer.x = this.pointer.x;
    this.out.pointer.y = this.pointer.y;
    this.out.visibility = this.visibility;
    return this.out;
  }
}
