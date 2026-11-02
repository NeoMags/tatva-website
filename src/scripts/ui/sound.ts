/**
 * Small "jewel" chimes, synthesised in the browser (no audio files).
 * Off by default; the visitor turns sound on with the header toggle and the
 * choice is remembered. Browsers only allow audio after a user gesture, so the
 * AudioContext is created when sound is first switched on.
 */

const STORAGE_KEY = "tatva-sound";
type ChimeKind = "assemble" | "pillar" | "tap" | "sent";

const PILLAR_NOTES: Record<string, number> = {
  consult: 1046.5, // C6
  build: 1174.66, // D6
  automate: 1318.51, // E6
  scale: 1567.98, // G6
};

// Bell-like partial ratios with their relative loudness and decay (seconds).
const PARTIALS: ReadonlyArray<[ratio: number, gain: number, decay: number]> = [
  [1, 1, 1.4],
  [2, 0.3, 0.9],
  [2.76, 0.42, 0.7],
  [5.4, 0.12, 0.35],
];

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = false;
let lastPlayed = 0;

function readStored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

function ensureContext(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 7000;
  master = ctx.createGain();
  master.gain.value = 0.07;
  master.connect(lowpass).connect(ctx.destination);
  return ctx;
}

function bell(freq: number, at: number, volume = 1): void {
  if (!ctx || !master) return;
  for (const [ratio, gain, decay] of PARTIALS) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq * ratio;
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(gain * volume, at + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, at + decay);
    osc.connect(env).connect(master);
    osc.start(at);
    osc.stop(at + decay + 0.05);
  }
}

export function isSoundOn(): boolean {
  return enabled;
}

/** Must be called from a click or key handler (a user gesture). */
export function setSound(on: boolean): void {
  enabled = on;
  try {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    /* storage blocked — the choice lasts for this visit only */
  }
  if (on) {
    const audio = ensureContext();
    void audio?.resume();
    chime("tap");
  }
}

export function chime(kind: ChimeKind, variant?: string): void {
  if (!enabled) return;
  const audio = ensureContext();
  if (!audio || audio.state !== "running") return;
  const now = audio.currentTime;
  // Avoid a cascade of notes when the pointer sweeps across several items.
  if (kind === "pillar" && now - lastPlayed < 0.12) return;
  lastPlayed = now;

  switch (kind) {
    case "assemble":
      bell(880, now, 0.8);
      bell(1318.51, now + 0.09, 0.7);
      bell(1760, now + 0.18, 0.6);
      break;
    case "pillar":
      bell(PILLAR_NOTES[variant ?? ""] ?? 1046.5, now, 0.55);
      break;
    case "sent":
      bell(1046.5, now, 0.7);
      bell(1567.98, now + 0.12, 0.7);
      break;
    case "tap":
      bell(1975.53, now, 0.35);
      break;
  }
}

/** Restores the stored preference. Audio itself waits for the first gesture. */
export function initSound(): void {
  enabled = readStored();
  if (!enabled) return;
  const unlock = () => {
    const audio = ensureContext();
    void audio?.resume();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
}
