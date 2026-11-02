/**
 * Renderer, camera, lights and the render loop. One fixed canvas behind the page.
 * The loop sleeps when the tab is hidden or when the choreographer says the scene
 * is off screen, so the 3D costs nothing while you read other sections.
 */
import {
  DirectionalLight,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from "three";
import type { SceneTier } from "./capability";
import type { ScenePalette } from "./palette";

export interface FrameCallback {
  (dt: number, time: number): boolean | void; // return false to request the loop to sleep
}

export class Stage {
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;
  readonly renderer: WebGLRenderer;
  private readonly hemi: HemisphereLight;
  private readonly key: DirectionalLight;
  private readonly rim: DirectionalLight | null;
  private readonly maxPixelRatio: number;
  private frameId = 0;
  private last = 0;
  private running = false;
  private onFrame: FrameCallback | null = null;
  private readonly keyTarget = new Vector3(2.5, 3, 6);

  constructor(readonly canvas: HTMLCanvasElement, tier: Exclude<SceneTier, "static">) {
    this.maxPixelRatio = tier === "full" ? 2 : 1.25;
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: tier === "full" ? "high-performance" : "low-power",
    });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.setClearColor(0x000000, 0);

    this.camera = new PerspectiveCamera(32, 1, 0.1, 100);
    this.camera.position.set(0, 0, 12);

    this.hemi = new HemisphereLight(0xffffff, 0x000000, 1.2);
    this.key = new DirectionalLight(0xffffff, 2.2);
    this.key.position.copy(this.keyTarget);
    this.scene.add(this.hemi, this.key);
    this.rim = tier === "full" ? new DirectionalLight(0xffffff, 0.8) : null;
    if (this.rim) {
      this.rim.position.set(-4, -2, -5);
      this.scene.add(this.rim);
    }

    this.resize();
  }

  setPalette(p: ScenePalette): void {
    this.hemi.color.set(0xffffff);
    this.hemi.groundColor.copy(p.ambient);
    this.hemi.intensity = p.isLight ? 1.5 : 1.0;
    this.key.color.set(0xffffff);
    this.key.intensity = p.isLight ? 1.3 : 2.2;
    this.rim?.color.copy(p.accent);
  }

  /** Pointer in -1..1 moves the key light, so faces catch light as the cursor moves. */
  setPointer(nx: number, ny: number): void {
    this.keyTarget.set(2.5 + nx * 4, 3 - ny * 3, 6);
  }

  /** Height of the visible world at z = 0, used to convert page pixels to scene units. */
  get worldHeight(): number {
    const fov = (this.camera.fov * Math.PI) / 180;
    return 2 * Math.tan(fov / 2) * this.camera.position.z;
  }

  /** Converts a viewport pixel coordinate to a point on the z = 0 plane. */
  toWorld(px: number, py: number, out = new Vector3()): Vector3 {
    const h = this.worldHeight;
    const w = h * this.camera.aspect;
    return out.set((px / window.innerWidth - 0.5) * w, -(py / window.innerHeight - 0.5) * h, 0);
  }

  /** Scene units per CSS pixel. */
  get unitsPerPixel(): number {
    return this.worldHeight / window.innerHeight;
  }

  /**
   * Shift the lens so the camera looks straight at a point on the z = 0 plane while the
   * framing of the page stays the same (an off-axis "shift lens", as in architectural
   * photography). Without it, a structure placed to one side of the viewport is seen
   * from an angle: its near corners drift outward and crowd its far ones.
   */
  centreOn(x: number, y: number): void {
    if (Math.abs(x - this.lens.x) < 1e-4 && Math.abs(y - this.lens.y) < 1e-4) return;
    this.lens.x = x;
    this.lens.y = y;
    this.applyLens();
  }

  private readonly lens = { x: 0, y: 0 };

  private applyLens(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const upp = this.unitsPerPixel;
    this.camera.position.set(this.lens.x, this.lens.y, 12);
    this.camera.setViewOffset(w, h, -this.lens.x / upp, this.lens.y / upp, w, h);
    this.camera.updateMatrixWorld();
  }

  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.maxPixelRatio));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.applyLens(); // also updates the projection matrix
  }

  start(onFrame: FrameCallback): void {
    this.onFrame = onFrame;
    this.wake();
  }

  /** Resume the loop if it is asleep. Safe to call often. */
  wake(): void {
    if (this.running || document.hidden) return;
    this.running = true;
    this.last = -1; // the first frame after waking measures from itself (dt = 0)
    this.frameId = requestAnimationFrame(this.tick);
  }

  sleep(): void {
    this.running = false;
    cancelAnimationFrame(this.frameId);
  }

  private tick = (now: number): void => {
    if (!this.running) return;
    // dt must never be negative: the rAF timestamp can be earlier than the moment the
    // loop was woken, and a negative step makes every smoothing run backwards.
    // Clamp the top too, so a long pause (tab switch, debugger) never causes a jump.
    const dt = this.last < 0 ? 0 : Math.min(Math.max((now - this.last) / 1000, 0), 1 / 20);
    this.last = now;
    this.key.position.lerp(this.keyTarget, 1 - Math.exp(-4 * dt));
    const keepRunning = this.onFrame?.(dt, now / 1000);
    this.renderer.render(this.scene, this.camera);
    if (keepRunning === false) {
      this.running = false;
      return;
    }
    this.frameId = requestAnimationFrame(this.tick);
  };

  dispose(): void {
    this.sleep();
    this.renderer.dispose();
  }
}
