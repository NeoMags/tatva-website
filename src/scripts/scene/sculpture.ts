/**
 * The TATVA sculpture: four element solids plus the fifth element, space (akasha),
 * drawn as the lines and the central node that connect them.
 *
 * The sculpture knows nothing about scrolling or the page. Each frame the
 * choreographer gives it targets (position, size, highlight per element, and how
 * much of the connecting network to show); the sculpture eases toward them.
 */
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  EdgesGeometry,
  Group,
  IcosahedronGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from "three";
import { ELEMENTS } from "./elements";
import type { ScenePalette } from "./palette";

export interface ElementTarget {
  position: Vector3;
  scale: number;
  /** 0 = dimmed, 1 = fully lit */
  highlight: number;
}

export interface SculptureTargets {
  elements: ElementTarget[];
  /** 0..1 — how much of the connecting network is drawn */
  network: number;
  /** 0..1 — overall network opacity */
  networkOpacity: number;
  /** world-space size of the central space node */
  nodeScale: number;
  /** 0..1 — how fast the solids spin; 1 = full idle spin */
  spin: number;
}

interface ElementView {
  mesh: Mesh<BufferGeometry, MeshStandardMaterial>;
  edges: LineSegments<EdgesGeometry, LineBasicMaterial>;
  holder: Group;
  spin: [number, number, number];
  highlight: number;
}

/** Pairs of element indices joined by a network line, plus four spokes to the centre (-1). */
const LINKS: ReadonlyArray<[number, number]> = [
  [0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3],
  [0, -1], [1, -1], [2, -1], [3, -1],
];

const damp = (current: number, target: number, rate: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-rate * dt));

export class Sculpture {
  readonly object = new Group();
  private readonly views: ElementView[] = [];
  private readonly node: Mesh<IcosahedronGeometry, MeshStandardMaterial>;
  private readonly network: LineSegments<BufferGeometry, LineBasicMaterial>;
  private readonly linePositions: Float32Array;
  private readonly center = new Vector3();
  private networkDraw = 0;
  private networkOpacity = 0;
  private nodeScale = 0.0001;
  private spin = 1;
  private pulse = 0;
  private edgeColor = new Color();

  constructor() {
    for (const def of ELEMENTS) {
      const geometry = def.geometry();
      const mesh = new Mesh(
        geometry,
        new MeshStandardMaterial({ roughness: 0.82, metalness: 0.06, flatShading: true, transparent: true }),
      );
      const edges = new LineSegments(
        new EdgesGeometry(geometry),
        new LineBasicMaterial({ transparent: true, opacity: 1 }),
      );
      // Edges sit a hair outside the faces so they never z-fight.
      edges.scale.setScalar(1.002);
      const holder = new Group();
      holder.add(mesh, edges);
      holder.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      this.object.add(holder);
      this.views.push({ mesh, edges, holder, spin: def.spin, highlight: 1 });
    }

    this.node = new Mesh(
      new IcosahedronGeometry(1, 1),
      new MeshStandardMaterial({ roughness: 0.55, metalness: 0, flatShading: true }),
    );
    this.node.scale.setScalar(this.nodeScale);
    this.object.add(this.node);

    this.linePositions = new Float32Array(LINKS.length * 2 * 3);
    const lineGeometry = new BufferGeometry();
    lineGeometry.setAttribute("position", new BufferAttribute(this.linePositions, 3));
    this.network = new LineSegments(lineGeometry, new LineBasicMaterial({ transparent: true, opacity: 0 }));
    this.network.frustumCulled = false;
    this.object.add(this.network);
  }

  setPalette(palette: ScenePalette): void {
    this.edgeColor.copy(palette.edge);
    for (const view of this.views) {
      view.mesh.material.color.copy(palette.solid);
      view.mesh.material.emissive.copy(palette.edge);
      view.edges.material.color.copy(palette.edge);
    }
    this.node.material.color.copy(palette.node);
    this.node.material.emissive.copy(palette.node);
    this.network.material.color.copy(palette.node);
  }

  /** A short flash when the elements lock together. */
  triggerPulse(): void {
    this.pulse = 1;
  }

  /** Snap straight to targets (first frame, or after a resize). */
  jumpTo(targets: SculptureTargets): void {
    targets.elements.forEach((t, i) => {
      const view = this.views[i];
      view.holder.position.copy(t.position);
      view.holder.scale.setScalar(t.scale);
      view.highlight = t.highlight;
    });
    this.networkDraw = targets.network;
    this.networkOpacity = targets.networkOpacity;
    this.nodeScale = Math.max(targets.nodeScale, 0.0001);
  }

  update(targets: SculptureTargets, dt: number): void {
    const moveRate = 7;
    this.spin = damp(this.spin, targets.spin, 3, dt);
    this.pulse = Math.max(0, this.pulse - dt * 1.6);

    this.center.set(0, 0, 0);
    targets.elements.forEach((t, i) => {
      const view = this.views[i];
      const h = view.holder;
      h.position.x = damp(h.position.x, t.position.x, moveRate, dt);
      h.position.y = damp(h.position.y, t.position.y, moveRate, dt);
      h.position.z = damp(h.position.z, t.position.z, moveRate, dt);
      h.scale.setScalar(damp(h.scale.x, t.scale, moveRate, dt));
      h.rotation.x += view.spin[0] * dt * this.spin;
      h.rotation.y += view.spin[1] * dt * this.spin;
      h.rotation.z += view.spin[2] * dt * this.spin;

      view.highlight = damp(view.highlight, t.highlight, 6, dt);
      const lit = view.highlight;
      view.edges.material.opacity = 0.2 + 0.8 * lit;
      view.mesh.material.opacity = 0.3 + 0.7 * lit;
      view.mesh.material.emissiveIntensity = 0.04 + 0.1 * lit + 0.25 * this.pulse;
      this.center.add(h.position);
    });
    this.center.multiplyScalar(1 / this.views.length);

    this.networkDraw = damp(this.networkDraw, targets.network, 8, dt);
    this.networkOpacity = damp(this.networkOpacity, targets.networkOpacity, 8, dt);
    this.nodeScale = damp(this.nodeScale, Math.max(targets.nodeScale, 0.0001), 6, dt);

    this.node.position.copy(this.center);
    this.node.scale.setScalar(this.nodeScale * (1 + 0.5 * this.pulse));
    this.node.rotation.y += dt * 0.4;
    this.node.visible = this.nodeScale > 0.002;
    this.node.material.emissiveIntensity = 0.35 + 0.6 * this.pulse;

    this.writeNetwork();
    this.network.material.opacity = Math.min(1, this.networkOpacity * (0.55 + 0.45 * this.pulse));
    this.network.visible = this.network.material.opacity > 0.01;
  }

  private writeNetwork(): void {
    const draw = this.networkDraw;
    const a = new Vector3();
    const b = new Vector3();
    LINKS.forEach(([from, to], i) => {
      a.copy(this.views[from].holder.position);
      b.copy(to === -1 ? this.center : this.views[to].holder.position);
      // Grow each line from its start point: draw = 0 → nothing, 1 → full length.
      b.sub(a).multiplyScalar(draw).add(a);
      this.linePositions.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6);
    });
    (this.network.geometry.attributes.position as BufferAttribute).needsUpdate = true;
  }

  dispose(): void {
    this.object.traverse((child) => {
      const disposable = child as Partial<Mesh>;
      disposable.geometry?.dispose();
      const material = disposable.material;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material?.dispose();
    });
  }
}
