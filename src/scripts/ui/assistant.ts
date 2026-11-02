/**
 * The TATVA assistant: a guided chat with a senior-help (TATVA Care) flow.
 *
 * Deliberately scripted, not AI: it cannot invent prices or promises.
 * Everything a visitor types is rendered with textContent (never innerHTML).
 * Requests go to /api/assist; voice recordings are forwarded to Nesar, not stored.
 */
import type { AssistantStrings } from "../../i18n/assistant";
import { parseHelpRequest, validPhone } from "../../lib/validation";
import { chime } from "./sound";

interface Data {
  s: AssistantStrings;
  phone: { display: string; e164: string };
  whatsapp: string;
  disciplines: { title: string; body: string }[];
}

const MAX_RECORDING_SECONDS = 120;

type Child = Node | string;
function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  for (const c of children) node.append(c);
  return node;
}

export function initAssistant(): void {
  const root = document.querySelector<HTMLElement>("[data-assistant]");
  const raw = document.getElementById("assistant-data")?.textContent;
  if (!root || !raw) return;
  const data = JSON.parse(raw) as Data;
  const s = data.s;

  const openBtn = root.querySelector<HTMLButtonElement>("[data-assist-open]")!;
  const panel = root.querySelector<HTMLElement>("[data-assist-panel]")!;
  const closeBtn = root.querySelector<HTMLButtonElement>("[data-assist-close]")!;
  const log = root.querySelector<HTMLOListElement>("[data-assist-log]")!;
  const actions = root.querySelector<HTMLElement>("[data-assist-actions]")!;
  const composer = root.querySelector<HTMLFormElement>("[data-assist-composer]")!;
  const input = composer.querySelector<HTMLInputElement>("input")!;

  let started = false;
  let recorder: Recorder | null = null;

  // ---------- open / close ----------
  const open = () => {
    panel.hidden = false;
    root.setAttribute("data-open", "");
    openBtn.setAttribute("aria-expanded", "true");
    if (!started) {
      started = true;
      start();
    }
    (actions.querySelector<HTMLElement>("button, a") ?? input).focus();
    chime("tap");
  };
  const close = () => {
    recorder?.cancel();
    panel.hidden = true;
    root.removeAttribute("data-open");
    openBtn.setAttribute("aria-expanded", "false");
    openBtn.focus();
  };
  openBtn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  panel.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
  // Any link or button on the page can open the assistant with data-open-assistant.
  document.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("[data-open-assistant]")) {
      e.preventDefault();
      open();
    }
  });

  // ---------- conversation helpers ----------
  const scroll = () => requestAnimationFrame(() => (log.scrollTop = log.scrollHeight));
  const bot = (...content: Child[]) => {
    log.append(el("li", { class: "msg bot" }, ...content));
    scroll();
  };
  const note = (...content: Child[]) => {
    log.append(el("li", { class: "msg note" }, ...content));
    scroll();
  };
  const user = (text: string) => {
    log.append(el("li", { class: "msg user" }, text));
    scroll();
  };
  const setActions = (...nodes: Node[]) => {
    actions.replaceChildren(...nodes);
    // Forms need the room: hide the free-text box while one is shown.
    composer.hidden = nodes.some((n) => n instanceof HTMLElement && n.classList.contains("card"));
    scroll();
  };
  const chip = (label: string, onClick: () => void, cls = "chip") => {
    const b = el("button", { type: "button", class: cls }, label);
    b.addEventListener("click", () => {
      user(label);
      onClick();
    });
    return b;
  };
  const linkChip = (label: string, href: string, cls = "chip") =>
    el("a", { class: cls, href, ...(href.startsWith("http") ? { target: "_blank", rel: "noopener" } : {}) }, label);
  const backChip = () => chip(s.back, start);
  const callTatva = (cls = "chip") => linkChip(`${s.careCall} · ${data.phone.display}`, `tel:${data.phone.e164}`, cls);

  // ---------- main menu ----------
  function start() {
    recorder?.cancel();
    bot(s.greeting);
    setActions(
      chip(s.optCare, careIntro, "chip care"),
      chip(s.optServices, services),
      chip(s.optProducts, products),
      chip(s.optPricing, pricing),
      chip(s.optProject, project),
      linkChip(s.optWhatsapp, data.whatsapp),
    );
  }

  function services() {
    bot(s.servicesIntro);
    setActions(
      ...data.disciplines.map((d) =>
        chip(d.title, () => {
          bot(d.body);
          setActions(chip(s.optProject, project), chip(s.optServices, services), backChip());
        }),
      ),
      backChip(),
    );
  }

  function products() {
    bot(s.productsText);
    setActions(linkChip(s.productsLink, "/work"), chip(s.optPricing, pricing), backChip());
  }

  function pricing() {
    bot(s.pricingText);
    setActions(chip(s.optProject, project), linkChip(s.optWhatsapp, data.whatsapp), backChip());
  }

  function project() {
    bot(s.projectText);
    const go = el("a", { class: "chip primary", href: "#contact" }, s.projectGo);
    go.addEventListener("click", () => {
      close();
      document.getElementById("enq-name")?.focus({ preventScroll: true });
    });
    setActions(go, backChip());
  }

  // ---------- free text ----------
  const routes: { words: RegExp; go: () => void }[] = [
    { words: /senior|elder|old|parent|medicine|medical|help|errand|amma|appa|ಹಿರಿಯ|ಔಷಧ|ಸಹಾಯ|बुज़ुर्ग|बुजुर्ग|दवा|मदद/i, go: careIntro },
    { words: /price|pricing|cost|rate|fee|subscription|₹|ಬೆಲೆ|कीमत|दाम/i, go: pricing },
    { words: /product|inspecto|poultry|inventory|live|ಉತ್ಪನ್ನ|प्रोडक्ट/i, go: products },
    { words: /service|software|app|website|design|3d|automation|architect|ಸೇವೆ|सेवा/i, go: services },
    { words: /project|quote|enquir|build|start|ಯೋಜನೆ|प्रोजेक्ट/i, go: project },
  ];
  composer.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim().slice(0, 500);
    if (!text) return;
    input.value = "";
    user(text);
    const route = routes.find((r) => r.words.test(text));
    if (route) route.go();
    else fallback(text);
  });

  function fallback(question: string) {
    bot(s.fallback);
    setActions(
      chip(s.fallbackYes, () => contactDetails({ kind: "question", details: question })),
      linkChip(s.optWhatsapp, data.whatsapp),
      backChip(),
    );
  }

  // ---------- TATVA Care ----------
  function careIntro() {
    bot(s.careIntro);
    note(s.careNotEmergency);
    bot(s.careHours);
    setActions(chip(s.careStart, careConsent, "chip primary"), callTatva(), backChip());
  }

  function careConsent() {
    const boxes = [s.consent1, s.consent2, s.consent3].map((text, i) => {
      const box = el("input", { type: "checkbox", id: `care-consent-${i}` });
      return { box, label: el("label", { class: "tick", for: `care-consent-${i}` }, box, el("span", {}, text)) };
    });
    const agree = el("button", { type: "button", class: "big primary", disabled: "" }, s.consentAgree);
    const sync = () => (agree.disabled = !boxes.every((b) => b.box.checked));
    boxes.forEach((b) => b.box.addEventListener("change", sync));
    agree.addEventListener("click", () => {
      user(s.consentAgree);
      contactDetails({ kind: "help" });
    });
    setActions(el("div", { class: "card" }, el("h3", {}, s.consentTitle), ...boxes.map((b) => b.label), agree), backChip());
  }

  interface Draft {
    kind: "help" | "question";
    details?: string;
    who?: string;
    name?: string;
    phone?: string;
    area?: string;
    /** fixed per request, so a retry after a failure is recognised as the same request */
    requestId?: string;
  }

  function contactDetails(draft: Draft) {
    const name = el("input", { type: "text", id: "care-name", autocomplete: "name", maxlength: "120" });
    const phone = el("input", { type: "tel", id: "care-phone", autocomplete: "tel", inputmode: "tel", maxlength: "16" });
    const area = el("input", { type: "text", id: "care-area", maxlength: "160" });
    const err = el("p", { class: "err", role: "alert" });
    const card = el("div", { class: "card" });

    if (draft.kind === "help") {
      const me = el("button", { type: "button", class: "big", "aria-pressed": "true" }, s.whoMe);
      const family = el("button", { type: "button", class: "big", "aria-pressed": "false" }, s.whoFamily);
      draft.who = "self";
      const pick = (who: string) => {
        draft.who = who;
        me.setAttribute("aria-pressed", String(who === "self"));
        family.setAttribute("aria-pressed", String(who === "family"));
      };
      me.addEventListener("click", () => pick("self"));
      family.addEventListener("click", () => pick("family"));
      card.append(el("h3", {}, s.whoTitle), el("div", { class: "row2" }, me, family));
    }

    card.append(
      el("label", { for: "care-name" }, s.nameLabel, name),
      el("label", { for: "care-phone" }, s.phoneLabel, phone),
    );
    if (draft.kind === "help") card.append(el("label", { for: "care-area" }, s.areaLabel, area));
    const next = el("button", { type: "button", class: "big primary" }, draft.kind === "help" ? s.recordTitle : s.send);
    next.addEventListener("click", () => {
      draft.name = name.value.trim();
      draft.phone = phone.value.trim();
      draft.area = area.value.trim() || undefined;
      if (!draft.name) {
        err.textContent = s.nameRequired;
        name.focus();
        return;
      }
      if (!validPhone(draft.phone.replace(/[\s-]/g, ""))) {
        err.textContent = s.phoneInvalid;
        phone.focus();
        return;
      }
      err.textContent = "";
      if (draft.kind === "help") request(draft);
      else void submit(draft, null);
    });
    card.append(err, next);
    setActions(card, backChip());
    name.focus();
  }

  function request(draft: Draft, mode: "voice" | "text" = canRecord() ? "voice" : "text") {
    const card = el("div", { class: "card" }, el("h3", {}, s.recordTitle));
    const err = el("p", { class: "err", role: "alert" });
    let audio: Blob | null = null;
    const send = el("button", { type: "button", class: "big primary" }, s.submitHelp);

    if (mode === "voice") {
      const time = el("span", { class: "time" }, "0:00");
      const label = el("span", {}, s.recordStart);
      const mic = el("button", { type: "button", class: "mic" }, label, time);
      const player = el("audio", { controls: "" });
      player.hidden = true;
      const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
      mic.addEventListener("click", async () => {
        if (recorder?.active) {
          recorder.stop();
          return;
        }
        err.textContent = "";
        try {
          recorder = await Recorder.start({
            onTick: (sec) => (time.textContent = `${fmt(sec)} / ${fmt(MAX_RECORDING_SECONDS)}`),
            onDone: (blob) => {
              audio = blob;
              mic.removeAttribute("data-recording");
              label.textContent = s.recordAgain;
              player.src = URL.createObjectURL(blob);
              player.hidden = false;
            },
          });
          audio = null;
          player.hidden = true;
          mic.setAttribute("data-recording", "");
          label.textContent = s.recordStop;
        } catch {
          err.textContent = s.recordDenied;
          request(draft, "text");
        }
      });
      const typeInstead = el("button", { type: "button", class: "linkbtn" }, s.typeInstead);
      typeInstead.addEventListener("click", () => {
        recorder?.cancel();
        request(draft, "text");
      });
      card.append(el("p", { class: "small" }, s.recordHint), mic, player, typeInstead);
      send.addEventListener("click", () => {
        if (recorder?.active) recorder.stop();
        if (!audio) {
          err.textContent = s.needSomething;
          return;
        }
        void submit(draft, audio, send, err);
      });
    } else {
      const details = el("textarea", { id: "care-details", maxlength: "2000" });
      card.append(el("label", { for: "care-details" }, s.detailsLabel, details));
      if (canRecord()) {
        const speak = el("button", { type: "button", class: "linkbtn" }, s.speakInstead);
        speak.addEventListener("click", () => request(draft, "voice"));
        card.append(speak);
      }
      send.addEventListener("click", () => {
        const text = details.value.trim();
        if (!text) {
          err.textContent = s.needSomething;
          details.focus();
          return;
        }
        draft.details = text;
        void submit(draft, null, send, err);
      });
    }

    card.append(err, send, el("p", { class: "small" }, s.privacy));
    setActions(card, callTatva(), backChip());
  }

  async function submit(draft: Draft, audio: Blob | null, button?: HTMLButtonElement, err?: HTMLElement) {
    const body = new FormData();
    const req = parseHelpRequest({
      name: draft.name,
      phone: draft.phone,
      area: draft.area,
      details: draft.details,
      consent: draft.kind === "help" ? "true" : "false",
      for: draft.who,
    });
    body.set("kind", draft.kind);
    draft.requestId ??= crypto.randomUUID();
    body.set("requestId", draft.requestId);
    body.set("locale", document.documentElement.lang);
    for (const [k, v] of Object.entries(req)) if (v !== undefined) body.set(k, String(v));
    if (audio) body.set("audio", audio, `request.${audio.type.includes("mp4") ? "m4a" : "webm"}`);

    if (button) {
      button.disabled = true;
      button.textContent = s.sending;
    }
    try {
      const res = await fetch("/api/assist", { method: "POST", body });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      chime("sent");
      if (draft.kind === "help") {
        bot(s.sentHelp.replace("{phone}", req.phone));
        note(s.sentHelpWarn);
      } else {
        bot(s.sentQuestion);
      }
      setActions(callTatva(), backChip());
    } catch {
      if (err) err.textContent = s.sendError;
      else bot(s.sendError);
      if (button) {
        button.disabled = false;
        button.textContent = s.submitHelp;
      }
      setActions(...Array.from(actions.childNodes), callTatva("chip primary"));
    }
  }
}

// ---------- recording ----------
function canRecord(): boolean {
  return Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== "undefined";
}

/** Small wrapper around MediaRecorder with a hard time limit. */
class Recorder {
  active = true;
  private timer = 0;
  private cancelled = false;

  private constructor(
    private readonly media: MediaRecorder,
    private readonly stream: MediaStream,
  ) {}

  static async start(opts: { onTick: (sec: number) => void; onDone: (blob: Blob) => void }): Promise<Recorder> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    const type = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((t) => MediaRecorder.isTypeSupported(t));
    const media = new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: 32000 } : undefined);
    const rec = new Recorder(media, stream);
    const chunks: Blob[] = [];
    media.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    media.onstop = () => {
      rec.active = false;
      clearInterval(rec.timer);
      stream.getTracks().forEach((t) => t.stop());
      if (!rec.cancelled) opts.onDone(new Blob(chunks, { type: media.mimeType || "audio/webm" }));
    };
    const started = performance.now();
    rec.timer = window.setInterval(() => {
      const sec = (performance.now() - started) / 1000;
      opts.onTick(sec);
      if (sec >= MAX_RECORDING_SECONDS) rec.stop();
    }, 250);
    media.start(1000);
    return rec;
  }

  stop(): void {
    if (this.media.state !== "inactive") this.media.stop();
  }

  cancel(): void {
    this.cancelled = true;
    this.stop();
    this.stream.getTracks().forEach((t) => t.stop());
  }
}
