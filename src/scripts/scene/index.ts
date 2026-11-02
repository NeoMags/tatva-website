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

  let first = true;
  stage.start((dt, time) => {
    const f = choreo.frame(dt, time, first);
    tesseract.object.position.copy(f.position);
    tesseract.object.scale.setScalar(f.scale);
    tesseract.object.quaternion.copy(f.rotation);
    tesseract.object.updateMatrixWorld();
    tesseract.update(f.tesseract, dt);
    dust.update(time, f.travel, f.pointer.x, f.pointer.y, 1);
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
