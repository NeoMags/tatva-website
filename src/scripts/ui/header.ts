/** Header controls: theme cycle, sound toggle and the mobile menu. */
import { chime, initSound, isSoundOn, setSound } from "./sound";

type Theme = "system" | "dark" | "light";
const THEMES: Theme[] = ["dark", "light", "system"];
const THEME_KEY = "tatva-theme";

function storedTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return THEMES.includes(t as Theme) ? (t as Theme) : "dark";
  } catch {
    return "dark";
  }
}

function applyTheme(theme: Theme, button: HTMLButtonElement | null): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* storage blocked */
  }
  if (!button) return;
  button.dataset.current = theme;
  const label = button.dataset[`label${theme[0].toUpperCase()}${theme.slice(1)}` as "labelSystem"] ?? theme;
  button.setAttribute("aria-label", `${button.dataset.labelTheme}: ${label}`);
  button.title = `${button.dataset.labelTheme}: ${label}`;
}

export function initHeader(): void {
  initSound();

  const themeButton = document.querySelector<HTMLButtonElement>("[data-theme-toggle]");
  applyTheme(storedTheme(), themeButton);
  themeButton?.addEventListener("click", () => {
    const next = THEMES[(THEMES.indexOf(storedTheme()) + 1) % THEMES.length];
    applyTheme(next, themeButton);
    chime("tap");
  });

  const soundButton = document.querySelector<HTMLButtonElement>("[data-sound-toggle]");
  const renderSound = () => {
    if (!soundButton) return;
    const on = isSoundOn();
    soundButton.setAttribute("aria-pressed", String(on));
    const label = on ? soundButton.dataset.labelOn : soundButton.dataset.labelOff;
    soundButton.setAttribute("aria-label", label ?? "");
    soundButton.title = label ?? "";
  };
  renderSound();
  soundButton?.addEventListener("click", () => {
    setSound(!isSoundOn());
    renderSound();
  });

  const menuButton = document.querySelector<HTMLButtonElement>("[data-menu-toggle]");
  const panel = document.querySelector<HTMLElement>("[data-menu-panel]");
  if (menuButton && panel) {
    const setOpen = (open: boolean) => {
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.setAttribute("aria-label", (open ? menuButton.dataset.labelClose : menuButton.dataset.labelOpen) ?? "");
      panel.dataset.open = String(open);
      document.body.style.overflow = open ? "hidden" : "";
    };
    menuButton.addEventListener("click", () => setOpen(menuButton.getAttribute("aria-expanded") !== "true"));
    panel.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        menuButton.focus();
      }
    });
    window.matchMedia("(min-width: 960px)").addEventListener("change", (mq) => mq.matches && setOpen(false));
  }

  // Header gains a background once the page scrolls, so it stays readable over content.
  const header = document.querySelector<HTMLElement>("[data-site-header]");
  const onScroll = () => header?.toggleAttribute("data-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}
