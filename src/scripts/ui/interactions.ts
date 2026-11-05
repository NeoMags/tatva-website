/**
 * Pointer micro-interactions, opted into with data-fx on an element:
 *
 *   data-fx="tilt"    3D tilt toward the cursor (cards)
 *   data-fx="glow"    border lights up around the cursor
 *   data-fx="spot"    soft light inside the element follows the cursor (rows)
 *   data-fx="flow"    slow gradient line along the top edge
 *   data-magnetic     element drifts a few pixels toward the cursor (buttons)
 *
 * Plus one page-wide spotlight that follows the pointer.
 *
 * Only on devices with a precise pointer that can hover, and never when the visitor
 * asked for reduced motion (then nothing here runs; glow/flow stay off too, keeping
 * the page exactly as before). One rAF loop eases every value, so it stays smooth
 * and costs nothing when the pointer is still.
 */

const TILT_DEG = 5; // max tilt, degrees
const MAGNET_PX = 6; // max magnetic offset, pixels
const EASE = 0.14; // per-frame easing toward the target

interface Tilt {
  el: HTMLElement;
  rx: number;
  ry: number;
  tx: number;
  ty: number;
}
interface Magnet {
  el: HTMLElement;
  x: number;
  y: number;
  tx: number;
  ty: number;
}

export function initInteractions(): void {
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
  const still = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!fine.matches || still.matches) return;
  document.documentElement.dataset.fx = "on";

  // Decorative layers, added by script so markup and pseudo-elements stay untouched.
  const layer = (host: HTMLElement, cls: string) => {
    const s = document.createElement("span");
    s.className = cls;
    s.setAttribute("aria-hidden", "true");
    host.prepend(s);
  };
  const fx = (name: string) => document.querySelectorAll<HTMLElement>(`[data-fx~="${name}"]`);
  fx("glow").forEach((el) => layer(el, "fx-glow"));
  fx("spot").forEach((el) => layer(el, "fx-spot"));
  fx("flow").forEach((el) => layer(el, "fx-flow"));
  document.querySelectorAll<HTMLElement>("[data-fx]").forEach((el) => {
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
  });

  const tilts: Tilt[] = [...fx("tilt")].map((el) => ({ el, rx: 0, ry: 0, tx: 0, ty: 0 }));
  const magnets: Magnet[] = [...document.querySelectorAll<HTMLElement>("[data-magnetic], .btn, .launcher")].map((el) => ({
    el,
    x: 0,
    y: 0,
    tx: 0,
    ty: 0,
  }));

  const page = document.createElement("div");
  page.className = "fx-page-spot";
  page.setAttribute("aria-hidden", "true");
  document.body.append(page);

  let px = -9999;
  let py = -9999;
  let raf = 0;

  // Cursor position inside every hovered fx element, as CSS variables.
  const hoverTargets = new Set<HTMLElement>();
  document.querySelectorAll<HTMLElement>("[data-fx]").forEach((el) => {
    el.addEventListener("pointerenter", () => {
      hoverTargets.add(el);
      el.dataset.hover = "";
    });
    el.addEventListener("pointerleave", () => {
      hoverTargets.delete(el);
      delete el.dataset.hover;
      const t = tilts.find((x) => x.el === el);
      if (t) t.tx = t.ty = 0;
      wake();
    });
  });

  window.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      px = e.clientX;
      py = e.clientY;
      wake();
    },
    { passive: true },
  );
  document.addEventListener("pointerleave", () => {
    page.style.opacity = "0";
  });
  document.addEventListener("pointerenter", () => {
    page.style.opacity = "";
  });

  function wake() {
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function frame() {
    raf = 0;
    let moving = false;

    page.style.setProperty("--sx", `${px}px`);
    page.style.setProperty("--sy", `${py}px`);

    for (const el of hoverTargets) {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${px - r.left}px`);
      el.style.setProperty("--my", `${py - r.top}px`);
      const t = tilts.find((x) => x.el === el);
      if (t) {
        const nx = (px - r.left) / r.width - 0.5;
        const ny = (py - r.top) / r.height - 0.5;
        t.ty = nx * TILT_DEG * 2;
        t.tx = -ny * TILT_DEG * 2;
      }
    }

    for (const t of tilts) {
      t.rx += (t.tx - t.rx) * EASE;
      t.ry += (t.ty - t.ry) * EASE;
      const active = Math.abs(t.rx) > 0.01 || Math.abs(t.ry) > 0.01 || t.tx !== 0 || t.ty !== 0;
      if (active) {
        t.el.dataset.tilting = "";
        t.el.style.setProperty("--rx", `${t.rx.toFixed(3)}deg`);
        t.el.style.setProperty("--ry", `${t.ry.toFixed(3)}deg`);
        moving = true;
      } else if ("tilting" in t.el.dataset) {
        delete t.el.dataset.tilting;
        t.el.style.removeProperty("--rx");
        t.el.style.removeProperty("--ry");
      }
    }

    for (const m of magnets) {
      const r = m.el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = px - cx;
      const dy = py - cy;
      // Pull only while the pointer is near: within the element plus a small margin.
      const reach = Math.max(r.width, r.height) * 0.5 + 24;
      const near = Math.hypot(dx, dy) < reach;
      m.tx = near ? Math.max(-1, Math.min(1, dx / reach)) * MAGNET_PX : 0;
      m.ty = near ? Math.max(-1, Math.min(1, dy / reach)) * MAGNET_PX : 0;
      m.x += (m.tx - m.x) * EASE;
      m.y += (m.ty - m.y) * EASE;
      if (Math.abs(m.x - m.tx) > 0.02 || Math.abs(m.y - m.ty) > 0.02) moving = true;
      m.el.style.setProperty("--mgx", `${m.x.toFixed(2)}px`);
      m.el.style.setProperty("--mgy", `${m.y.toFixed(2)}px`);
    }

    if (moving) wake();
  }
}
