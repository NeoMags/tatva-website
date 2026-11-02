/**
 * The TATVA tesseract as a renderable object: edges, the six logo nodes, the
 * frosted central cube, the dimensional planes and travelling energy pulses.
 *
 * Like the old sculpture, it knows nothing about the page. The choreographer
 * passes a `TesseractState` each frame; the tesseract draws exactly that.
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NormalBlending,
  Points,
  PointsMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
} from "three";
import {
  EDGES,
  INNER_FACES,
  PLANES,
  SILHOUETTE,
  VERTICES,
  project,
  rotate4,
  type EdgeKind,
  type Vec4,
} from "./hypercube";
import type { ScenePalette } from "./palette";

export interface TesseractState {
  /** 4D rotation angles (radians) */
  xw: number;
  yw: number;
  zw: number;
  /** Build-up sequence 0..1: edges → nodes → radials → planes → core */
  build: number;
  /** Overall opacity 0..1 */
  opacity: number;
  /** Index into SILHOUETTE of the lit node, or -1 */
  activeNode: number;
  /** 0..1 strength of the travelling pulses */
  pulses: number;
  /** seconds since start (kept for future effects; the structure itself stays rigid) */
  time: number;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const phase = (t: number, start: number, end: number) => clamp01((t - start) / (end - start));
const smooth = (t: number) => t * t * (3 - 2 * t);

const PULSE_COUNT = 5;

export class Tesseract {
  /** Position, scale and 3D orientation are set on this group by the choreographer. */
  readonly object = new Group();
  /** Rotates the tesseract so its long diagonal faces the viewer: the logo pose. */
  readonly logoPose = new Quaternion();

  private readonly projected = VERTICES.map(() => new Vector3());
  private readonly scaleOf = new Float32Array(16);
  private readonly tmp4: Vec4 = [0, 0, 0, 0];

  private readonly lines: Record<EdgeKind, LineSegments<BufferGeometry, LineBasicMaterial>>;
  private readonly lineEdges: Record<EdgeKind, typeof EDGES>;
  private readonly nodes: InstancedMesh<SphereGeometry, MeshStandardMaterial>;
  private readonly core: Mesh<BufferGeometry, MeshStandardMaterial>;
  private readonly planes: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly pulses: Points<BufferGeometry, PointsMaterial>;
  /** emerald overlay on the edges that meet the highlighted node */
  private readonly highlight: LineSegments<BufferGeometry, LineBasicMaterial>;
  private highlightNode = -1;
  private readonly pulseState = Array.from({ length: PULSE_COUNT }, (_, i) => ({
    edge: (i * 7) % EDGES.length,
    t: i / PULSE_COUNT,
    forward: true,
    speed: 0.35 + (i % 3) * 0.12,
  }));

  private readonly nodeColor = new Color();
  private readonly accentColor = new Color();
  private readonly mixColor = new Color();
  private readonly nodeGlow = new Float32Array(SILHOUETTE.length);
  private readonly matrix = new Matrix4();

  constructor(lite: boolean) {
    this.lineEdges = {
      outer: EDGES.filter((e) => e.kind === "outer"),
      inner: EDGES.filter((e) => e.kind === "inner"),
      radial: EDGES.filter((e) => e.kind === "radial"),
    };
    const makeLines = (count: number) => {
      const g = new BufferGeometry();
      g.setAttribute("position", new BufferAttribute(new Float32Array(count * 6), 3));
      const l = new LineSegments(g, new LineBasicMaterial({ transparent: true, depthWrite: false }));
      l.frustumCulled = false;
      this.object.add(l);
      return l;
    };
    this.lines = {
      outer: makeLines(this.lineEdges.outer.length),
      inner: makeLines(this.lineEdges.inner.length),
      radial: makeLines(this.lineEdges.radial.length),
    };

    const sphere = new SphereGeometry(1, lite ? 12 : 20, lite ? 8 : 14);
    this.nodes = new InstancedMesh(
      sphere,
      new MeshStandardMaterial({ roughness: 0.3, metalness: 0.2, emissiveIntensity: 0.6 }),
      SILHOUETTE.length,
    );
    this.nodes.frustumCulled = false;
    this.object.add(this.nodes);

    // Central cube: 6 faces × 2 triangles, positions rewritten every frame.
    const coreGeometry = new BufferGeometry();
    coreGeometry.setAttribute("position", new BufferAttribute(new Float32Array(6 * 6 * 3), 3));
    this.core = new Mesh(
      coreGeometry,
      new MeshStandardMaterial({
        roughness: 0.35,
        metalness: 0.05,
        flatShading: true,
        transparent: true,
        side: DoubleSide,
        depthWrite: false,
      }),
    );
    this.core.frustumCulled = false;
    this.object.add(this.core);

    const planeGeometry = new BufferGeometry();
    planeGeometry.setAttribute("position", new BufferAttribute(new Float32Array(PLANES.length * 6 * 3), 3));
    this.planes = new Mesh(
      planeGeometry,
      new MeshBasicMaterial({ transparent: true, side: DoubleSide, depthWrite: false }),
    );
    this.planes.frustumCulled = false;
    this.object.add(this.planes);

    const highlightGeometry = new BufferGeometry();
    highlightGeometry.setAttribute("position", new BufferAttribute(new Float32Array(4 * 6), 3));
    this.highlight = new LineSegments(
      highlightGeometry,
      new LineBasicMaterial({ transparent: true, depthWrite: false, opacity: 0 }),
    );
    this.highlight.frustumCulled = false;
    this.object.add(this.highlight);

    const pulseGeometry = new BufferGeometry();
    pulseGeometry.setAttribute("position", new BufferAttribute(new Float32Array(PULSE_COUNT * 3), 3));
    this.pulses = new Points(
      pulseGeometry,
      new PointsMaterial({ size: 0.11, transparent: true, depthWrite: false, blending: AdditiveBlending }),
    );
    this.pulses.frustumCulled = false;
    this.object.add(this.pulses);

    // Logo pose: the (1,1,1) diagonal points at the camera, with one hexagon corner straight up.
    this.logoPose.setFromUnitVectors(new Vector3(1, 1, 1).normalize(), new Vector3(0, 0, 1));
    let best = -Infinity;
    let roll = 0;
    for (const i of SILHOUETTE) {
      const [x, y, z] = VERTICES[i];
      const p = new Vector3(x, y, z).applyQuaternion(this.logoPose);
      const angle = Math.atan2(p.y, p.x);
      const score = -Math.abs(angle - Math.PI / 2);
      if (score > best) {
        best = score;
        roll = Math.PI / 2 - angle;
      }
    }
    this.logoPose.premultiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), roll));

    // Silhouette nodes in clockwise order from the top, so page items can map to them.
    this.clockwise = SILHOUETTE.map((vi, i) => {
      const [x, y, z] = VERTICES[vi];
      const p = new Vector3(x, y, z).applyQuaternion(this.logoPose);
      const fromTop = (Math.PI / 2 - Math.atan2(p.y, p.x) + Math.PI * 2) % (Math.PI * 2);
      return { i, fromTop };
    })
      .sort((a, b) => a.fromTop - b.fromTop)
      .map((n) => n.i);
  }

  /** Indices into the node list, clockwise from the top node in the logo pose. */
  readonly clockwise: number[];

  setPalette(p: ScenePalette): void {
    this.lines.outer.material.color.copy(p.line);
    this.lines.inner.material.color.copy(p.line);
    this.lines.radial.material.color.copy(p.line);
    this.nodeColor.copy(p.node);
    this.accentColor.copy(p.accent);
    this.nodes.material.emissive.copy(p.node).multiplyScalar(p.isLight ? 0 : 0.35);
    this.core.material.color.copy(p.core);
    this.core.material.emissive.copy(p.core).multiplyScalar(p.isLight ? 0.05 : 0.18);
    this.planes.material.color.copy(p.plane);
    this.pulses.material.color.copy(p.accent);
    this.highlight.material.color.copy(p.accent);
    // Changing blending forces a shader rebuild; only do it when it actually changes.
    const blending = p.isLight ? NormalBlending : AdditiveBlending;
    for (const m of [this.planes.material, this.pulses.material]) {
      if (m.blending !== blending) {
        m.blending = blending;
        m.needsUpdate = true;
      }
    }
    for (let i = 0; i < SILHOUETTE.length; i++) this.nodes.setColorAt(i, this.nodeColor);
    if (this.nodes.instanceColor) this.nodes.instanceColor.needsUpdate = true;
  }

  /** Position of a silhouette node in world space (for linking DOM labels, if needed). */
  nodeWorldPosition(index: number, out = new Vector3()): Vector3 {
    return out.copy(this.projected[SILHOUETTE[index]]).applyMatrix4(this.object.matrixWorld);
  }

  update(state: TesseractState, dt: number): void {
    // 1. Rotate in 4D and project to 3D.
    for (let i = 0; i < 16; i++) {
      rotate4(VERTICES[i], state.xw, state.yw, state.zw, this.tmp4);
      this.scaleOf[i] = project(this.tmp4, this.projected[i]);
    }

    // 2. Build-up timings (fractions of state.build).
    const b = state.build;
    const draw = {
      outer: smooth(phase(b, 0, 0.35)),
      radial: smooth(phase(b, 0.35, 0.6)),
      inner: smooth(phase(b, 0.55, 0.8)),
    };
    const nodesIn = phase(b, 0.2, 0.5);
    const planesIn = smooth(phase(b, 0.5, 0.8));
    const coreIn = smooth(phase(b, 0.7, 1));
    const o = state.opacity;

    // 3. Edges, each growing from its first vertex while it draws in.
    (Object.keys(this.lines) as EdgeKind[]).forEach((kind) => {
      const positions = this.lines[kind].geometry.attributes.position as BufferAttribute;
      const arr = positions.array as Float32Array;
      const f = draw[kind];
      this.lineEdges[kind].forEach(({ a, b: e }, i) => {
        const pa = this.projected[a];
        const pb = this.projected[e];
        arr.set([pa.x, pa.y, pa.z, pa.x + (pb.x - pa.x) * f, pa.y + (pb.y - pa.y) * f, pa.z + (pb.z - pa.z) * f], i * 6);
      });
      positions.needsUpdate = true;
      const base = kind === "inner" ? 0.55 : kind === "radial" ? 0.7 : 0.9;
      this.lines[kind].material.opacity = base * o * (f > 0 ? 1 : 0);
    });

    // 4. Nodes: pop in one after another; the active one turns emerald and grows.
    SILHOUETTE.forEach((vi, i) => {
      const pop = smooth(clamp01(nodesIn * SILHOUETTE.length - i * 0.6));
      const target = state.activeNode === i ? 1 : 0;
      this.nodeGlow[i] += (target - this.nodeGlow[i]) * (1 - Math.exp(-8 * dt));
      const g = this.nodeGlow[i];
      const size = 0.085 * pop * (1 + 0.7 * g) * Math.sqrt(this.scaleOf[vi]);
      this.matrix.makeScale(size, size, size).setPosition(this.projected[vi]);
      this.nodes.setMatrixAt(i, this.matrix);
      this.nodes.setColorAt(i, this.mixColor.copy(this.nodeColor).lerp(this.accentColor, g));
    });
    this.nodes.instanceMatrix.needsUpdate = true;

    // Emerald edges for the highlighted node (its 3 frame edges and its edge to the core),
    // fading with the node's own glow so the switch between disciplines is smooth.
    if (state.activeNode >= 0) this.highlightNode = state.activeNode;
    const glow = this.highlightNode >= 0 ? this.nodeGlow[this.highlightNode] : 0;
    if (glow > 0.01) {
      const vi = SILHOUETTE[this.highlightNode];
      const arr = (this.highlight.geometry.attributes.position as BufferAttribute).array as Float32Array;
      EDGES.filter((e) => e.a === vi || e.b === vi).forEach((e, i) => {
        const pa = this.projected[e.a];
        const pb = this.projected[e.b];
        arr.set([pa.x, pa.y, pa.z, pb.x, pb.y, pb.z], i * 6);
      });
      (this.highlight.geometry.attributes.position as BufferAttribute).needsUpdate = true;
    }
    this.highlight.material.opacity = glow * o;
    this.highlight.visible = glow > 0.01 && o > 0.01;
    if (this.nodes.instanceColor) this.nodes.instanceColor.needsUpdate = true;
    this.nodes.material.opacity = o;
    this.nodes.material.transparent = o < 1;
    this.nodes.visible = nodesIn > 0 && o > 0.01;

    // 5. Central cube (the w = -1 cube; it swells and shrinks as the 4D rotation moves it).
    const core = this.core.geometry.attributes.position as BufferAttribute;
    const coreArr = core.array as Float32Array;
    let k = 0;
    for (const [q0, q1, q2, q3] of INNER_FACES) {
      for (const vi of [q0, q1, q2, q0, q2, q3]) {
        const p = this.projected[vi];
        coreArr[k++] = p.x * coreIn;
        coreArr[k++] = p.y * coreIn;
        coreArr[k++] = p.z * coreIn;
      }
    }
    core.needsUpdate = true;
    this.core.geometry.computeVertexNormals();
    this.core.material.opacity = 0.55 * coreIn * o;
    this.core.visible = coreIn > 0.001 && o > 0.01;

    // 6. Dimensional planes.
    const planes = this.planes.geometry.attributes.position as BufferAttribute;
    const planeArr = planes.array as Float32Array;
    k = 0;
    for (const [q0, q1, q2, q3] of PLANES) {
      for (const vi of [q0, q1, q2, q0, q2, q3]) {
        const p = this.projected[vi];
        planeArr[k++] = p.x;
        planeArr[k++] = p.y;
        planeArr[k++] = p.z;
      }
    }
    planes.needsUpdate = true;
    this.planes.material.opacity = 0.045 * planesIn * o;
    this.planes.visible = planesIn > 0 && o > 0.01;

    // 7. Energy pulses: points that travel along edges, turning at each vertex.
    const pulseArr = (this.pulses.geometry.attributes.position as BufferAttribute).array as Float32Array;
    this.pulseState.forEach((p, i) => {
      p.t += dt * p.speed;
      if (p.t >= 1) {
        const edge = EDGES[p.edge];
        const at = p.forward ? edge.b : edge.a;
        const options = EDGES.map((e, idx) => ({ e, idx })).filter(
          ({ e, idx }) => idx !== p.edge && (e.a === at || e.b === at),
        );
        const next = options[Math.floor(Math.random() * options.length)];
        p.edge = next.idx;
        p.forward = next.e.a === at;
        p.t = 0;
      }
      const edge = EDGES[p.edge];
      const from = this.projected[p.forward ? edge.a : edge.b];
      const to = this.projected[p.forward ? edge.b : edge.a];
      pulseArr[i * 3] = from.x + (to.x - from.x) * p.t;
      pulseArr[i * 3 + 1] = from.y + (to.y - from.y) * p.t;
      pulseArr[i * 3 + 2] = from.z + (to.z - from.z) * p.t;
    });
    (this.pulses.geometry.attributes.position as BufferAttribute).needsUpdate = true;
    this.pulses.material.opacity = state.pulses * o * coreIn;
    this.pulses.visible = this.pulses.material.opacity > 0.01;
  }

  dispose(): void {
    this.object.traverse((child) => {
      const d = child as Partial<Mesh>;
      d.geometry?.dispose();
      const m = d.material;
      if (Array.isArray(m)) m.forEach((x) => x.dispose());
      else m?.dispose();
    });
  }
}
