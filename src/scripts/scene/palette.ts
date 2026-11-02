/** Reads the scene colours from the CSS design tokens, so the 3D follows the theme. */
import { Color } from "three";

export interface ScenePalette {
  line: Color;
  node: Color;
  core: Color;
  plane: Color;
  dust: Color;
  accent: Color;
  ambient: Color;
  isLight: boolean;
}

function token(styles: CSSStyleDeclaration, name: string, fallback: string): Color {
  const value = styles.getPropertyValue(name).trim();
  try {
    return new Color(value || fallback);
  } catch {
    return new Color(fallback);
  }
}

export function readPalette(): ScenePalette {
  const s = getComputedStyle(document.documentElement);
  const bg = token(s, "--bg", "#050505");
  return {
    line: token(s, "--scene-line", "#e6e6e6"),
    node: token(s, "--scene-node", "#f2f2f2"),
    core: token(s, "--scene-core", "#d9d9d9"),
    plane: token(s, "--scene-plane", "#ffffff"),
    dust: token(s, "--scene-dust", "#9a9a9a"),
    accent: token(s, "--scene-accent", "#00c389"),
    ambient: token(s, "--scene-ambient", "#151515"),
    isLight: bg.getHSL({ h: 0, s: 0, l: 0 }).l > 0.5,
  };
}
