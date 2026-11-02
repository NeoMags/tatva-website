/**
 * Entry point for the 3D scene. Loaded lazily, only on devices that get 3D.
 * If anything fails, the page keeps its still emblem drawings: the scene is an enhancement.
 */
import type { SceneTier } from "./capability";
import { Choreographer } from "./choreographer";
import { Dust } from "./dust";
import { readPalette } from "./palette";
import { Stage } from "./stage";
import { Tesseract } from "./tesseract";
import { chime } from "../ui/sound";
import { Vector3 } from "three";

export function mountScene(canvas: HTMLCanvasElement, tier: Exclude<SceneTier, "static">): () => void {
  const lite = tier === "lite";
  const stage = new Stage(canvas, tier);
  const tesseract = new Tesseract(lite);
  const dust = new Dust(lite ? 220 : 650);
  stage.scene.add(dust.object, tesseract.object);

  const applyPalette = () => {
    const palette = readPalette();
    stage.setPalette(palette);
    tesseract.setPalette(palette);
    dust.setPalette(palette);
  };
  applyPalette();

  const choreo = new Choreographer(stage, tesseract.logoPose, tesseract.clockwise, {
    onBuilt: () => chime("assemble"),
    onDiscipline: (i) => chime("pillar", String(i)),
  });

  // Discipline numbers follow their nodes: project each node to the screen every frame.
  const labelBox = document.querySelector<HTMLElement>('[data-anchor="disciplines"]');
  const labels = Array.from(document.querySelectorAll<HTMLElement>("[data-node-label]"));
  const nodePos = new Vector3();
  const centrePos = new Vector3();
  const toScreen = (v: Vector3) => {
    v.project(stage.camera);
    return { x: ((v.x + 1) / 2) * window.innerWidth, y: ((1 - v.y) / 2) * window.innerHeight };
  };
  const placeLabels = () => {
    if (!labelBox || labels.length === 0) return;
    const box = labelBox.getBoundingClientRect();
    if (box.bottom < 0 || box.top > window.innerHeight) return;
    const c = toScreen(centrePos.copy(tesseract.object.position));
    labels.forEach((label, i) => {
      tesseract.nodeWorldPosition(tesseract.clockwise[i], nodePos);
      const depth = nodePos.z - tesseract.object.position.z;
      const p = toScreen(nodePos);
      const active = label.hasAttribute("data-active");
      const dx = p.x - c.x;
      const dy = p.y - c.y;
      const len = Math.hypot(dx, dy) || 1;
      // Outward from the centre; the active number rides just above its node as it moves to the centre.
      const ux = active ? 0 : dx / len;
      const uy = active ? -1 : dy / len;
      const offset = active ? Math.min(46, box.width * 0.1) : Math.min(30, box.width * 0.07);
      label.style.setProperty("--x", `${(p.x + ux * offset - box.left).toFixed(1)}px`);
      label.style.setProperty("--y", `${(p.y + uy * offset - box.top).toFixed(1)}px`);
      // Nearer nodes read slightly larger and brighter: the numbers share the scene's depth.
      const near = Math.max(-1, Math.min(1, depth / (f0.scale * 1.2)));
      label.style.setProperty("--depth", (1 + near * 0.12).toFixed(3));
      label.style.opacity = String(0.75 + near * 0.25);
    });
    // Switch the labels from their fixed CSS spots to tracked positions once positions exist.
    if (!labelBox.hasAttribute("data-tracked")) labelBox.setAttribute("data-tracked", "");
  };
  let f0 = { scale: 1 };

  let first = true;
  stage.start((dt, time) => {
    const f = choreo.frame(dt, time, first);
    tesseract.object.position.copy(f.position);
    tesseract.object.scale.setScalar(f.scale);
    tesseract.object.quaternion.copy(f.rotation);
    tesseract.object.updateMatrixWorld();
    tesseract.update(f.tesseract, dt);
    dust.update(time, f.travel, f.pointer.x, f.pointer.y, 1);
    f0 = f;
    if (f.discBlend > 0.02) placeLabels();
    if (first) {
      first = false;
      document.documentElement.dataset.scene = "live";
    }
    canvas.style.opacity = String(f.visibility);
    return f.visibility > 0.001;
  });

  const wake = () => {
    if (choreo.visible) stage.wake();
  };
  const onPointer = (e: PointerEvent) => {
    choreo.setPointer(e.clientX, e.clientY);
    wake();
  };
  const onResize = () => {
    stage.resize();
    wake();
  };
  const onVisibility = () => (document.hidden ? stage.sleep() : wake());
  const themeObserver = new MutationObserver(() =>
    requestAnimationFrame(() => {
      applyPalette();
      wake();
    }),
  );
  const systemTheme = window.matchMedia("(prefers-color-scheme: light)");
  const onSystemTheme = () => {
    applyPalette();
    wake();
  };

  window.addEventListener("scroll", wake, { passive: true });
  window.addEventListener("pointermove", onPointer, { passive: true });
  window.addEventListener("resize", onResize);
  document.addEventListener("visibilitychange", onVisibility);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  systemTheme.addEventListener("change", onSystemTheme);
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    stage.sleep();
    document.documentElement.dataset.scene = "static";
  });

  return () => {
    window.removeEventListener("scroll", wake);
    window.removeEventListener("pointermove", onPointer);
    window.removeEventListener("resize", onResize);
    document.removeEventListener("visibilitychange", onVisibility);
    themeObserver.disconnect();
    systemTheme.removeEventListener("change", onSystemTheme);
    tesseract.dispose();
    dust.dispose();
    stage.dispose();
  };
}
