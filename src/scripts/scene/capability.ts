/**
 * Decides how much 3D a device should get.
 *   full   — desktop/laptop with WebGL
 *   lite   — capable phone or tablet: lower pixel density, fewer lights
 *   static — reduced motion, data saver, no WebGL, or a low-power phone: still SVG drawings
 *
 * Kept free of Three.js imports so it can run before the 3D bundle is downloaded.
 */
export type SceneTier = "full" | "lite" | "static";

interface NavigatorHints extends Navigator {
  deviceMemory?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
}

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function detectTier(): SceneTier {
  const nav = navigator as NavigatorHints;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "static";
  if (nav.connection?.saveData) return "static";
  if (nav.connection?.effectiveType && /(^|-)2g$/.test(nav.connection.effectiveType)) return "static";
  if (!hasWebGL()) return "static";

  const touchFirst = window.matchMedia("(pointer: coarse)").matches;
  const smallScreen = Math.min(window.screen.width, window.screen.height) < 820;
  if (!(touchFirst && smallScreen)) return "full";

  // Phones: only reasonably capable ones get 3D. Safari does not expose deviceMemory,
  // so an unknown value is judged by core count alone.
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory;
  const capable = cores >= 6 && (memory === undefined || memory >= 4);
  return capable ? "lite" : "static";
}
