/**
 * Entry point for the 3D scene. Loaded lazily, only on devices that get 3D.
 * If anything fails, the page keeps its still drawings: the scene is an enhancement.
 */
import type { SceneTier } from "./capability";
import { Choreographer } from "./choreographer";
import { readPalette } from "./palette";
import { Sculpture } from "./sculpture";
import { Stage } from "./stage";
import { chime } from "../ui/sound";

export function mountScene(canvas: HTMLCanvasElement, tier: Exclude<SceneTier, "static">): () => void {
  const stage = new Stage(canvas, tier);
  const sculpture = new Sculpture();
  stage.scene.add(sculpture.object);

  const applyPalette = () => {
    const palette = readPalette();
    stage.setPalette(palette);
    sculpture.setPalette(palette);
  };
  applyPalette();

  const choreo = new Choreographer(stage, {
    onAssembled: () => {
      sculpture.triggerPulse();
      chime("assemble");
    },
    onPillarFocus: (pillar) => chime("pillar", pillar),
  });

  let first = true;
  stage.start((dt, time) => {
    const targets = choreo.frame(dt, time, first);
    if (first) {
      sculpture.jumpTo(targets);
      first = false;
      document.documentElement.dataset.scene = "live";
    }
    sculpture.update(targets, dt);
    canvas.style.opacity = String(choreo.canvasOpacity);
    return choreo.canvasOpacity > 0.001;
  });

  // Wake the loop whenever something could have changed what is on screen.
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
  const themeObserver = new MutationObserver(() => {
    // Let the CSS variables settle before reading them.
    requestAnimationFrame(() => {
      applyPalette();
      wake();
    });
  });
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
    sculpture.dispose();
    stage.dispose();
  };
}
