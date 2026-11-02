/** Reads the scene colours from the CSS design tokens, so the 3D follows the theme. */
import { Color } from "three";

export interface ScenePalette {
  solid: Color;
  edge: Color;
  node: Color;
  ambient: Color;
  light: Color;
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
  const styles = getComputedStyle(document.documentElement);
  const bg = token(styles, "--bg", "#061c18");
  return {
    solid: token(styles, "--scene-solid", "#0b5745"),
    edge: token(styles, "--scene-edge", "#9bcb72"),
    node: token(styles, "--scene-node", "#c8b78b"),
    ambient: token(styles, "--scene-ambient", "#0e3a30"),
    light: new Color("#f5f5ef"),
    isLight: bg.getHSL({ h: 0, s: 0, l: 0 }).l > 0.5,
  };
}
