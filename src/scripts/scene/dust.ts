/**
 * A sparse field of fine particles around the tesseract: the "space" the
 * structure floats in. Slow drift, slight parallax with the pointer, and a gentle
 * forward travel while the visitor scrolls into the tesseract.
 */
import { AdditiveBlending, BufferAttribute, BufferGeometry, NormalBlending, Points, PointsMaterial } from "three";
import type { ScenePalette } from "./palette";

export class Dust {
  readonly object: Points<BufferGeometry, PointsMaterial>;
  private readonly depth = 40;

  constructor(count: number) {
    const positions = new Float32Array(count * 3);
    // Deterministic pseudo-random spread so every visit looks the same.
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (rand() - 0.5) * 34;
      positions[i * 3 + 1] = (rand() - 0.5) * 22;
      positions[i * 3 + 2] = -rand() * this.depth + 8;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    this.object = new Points(
      geometry,
      new PointsMaterial({ size: 0.045, transparent: true, depthWrite: false, sizeAttenuation: true }),
    );
    this.object.frustumCulled = false;
  }

  setPalette(p: ScenePalette): void {
    this.object.material.color.copy(p.dust);
    this.object.material.blending = p.isLight ? NormalBlending : AdditiveBlending;
    this.object.material.needsUpdate = true;
  }

  /**
   * @param travel 0..1 forward travel (scroll into the tesseract)
   * @param px, py pointer -1..1
   */
  update(time: number, travel: number, px: number, py: number, opacity: number): void {
    this.object.position.set(-px * 0.6, py * 0.4, travel * 9);
    this.object.rotation.z = time * 0.006;
    this.object.material.opacity = opacity * 0.7;
    this.object.visible = opacity > 0.01;
  }

  dispose(): void {
    this.object.geometry.dispose();
    this.object.material.dispose();
  }
}
