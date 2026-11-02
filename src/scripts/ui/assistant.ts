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
  /** URL of the privacy notice */
  privacyUrl: string;
  disciplines: { title: string; body: string }[];
  /** small optimised headshot of Nesar, shown beside personal messages */
  avatar: string;
}

/** Display names for languages the transcriber may report. */
const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  english: "English",
  kn: "ಕನ್ನಡ (Kannada)",
  kannada: "ಕನ್ನಡ (Kannada)",
  hi: "हिन्दी (Hindi)",
  hindi: "हिन्दी (Hindi)",
  mr: "मराठी (Marathi)",
  marathi: "मराठी (Marathi)",
  te: "తెలుగు (Telugu)",
  telugu: "తెలుగు (Telugu)",
  ta: "தமிழ் (Tamil)",
  tamil: "தமிழ் (Tamil)",
  ur: "اردو (Urdu)",
  urdu: "اردو (Urdu)",
};

/** A press longer than this on the launcher records a voice note instead of opening the chat. */
const HOLD_MS = 450;

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
  /** The small privacy line under send buttons, linking to the full notice. */
  const privacyNote = () =>
    el("p", { class: "small" }, s.privacy, " ", el("a", { href: data.privacyUrl, target: "_blank", rel: "noopener" }, s.privacyLink));

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
  /** @param voice true when opened from a hold-to-speak recording: skip the greeting menu */
  const open = (voice = false) => {
    panel.hidden = false;
    root.setAttribute("data-open", "");
    openBtn.setAttribute("aria-expanded", "true");
    if (!started) {
      started = true;
      if (!voice) start();
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
  // ---------- launcher: tap to chat, hold to speak ----------
  const bubble = root.querySelector<HTMLElement>("[data-assist-bubble]");
  const bubbleDefault = bubble?.innerHTML ?? "";
  let pressing = false;
  let longPress = false;
  let holdTimer = 0;
  let holdRec: Recorder | null = null;
  let holdSeconds = 0;

  const endHoldUI = () => {
    root.removeAttribute("data-holding");
    if (bubble) bubble.innerHTML = bubbleDefault;
  };

  const startHold = async () => {
    longPress = true;
    navigator.vibrate?.(25);
    root.setAttribute("data-holding", "");
    if (bubble) bubble.textContent = s.holdListening;
    holdSeconds = 0;
    try {
      holdRec = await Recorder.start({
        onTick: (sec) => {
          holdSeconds = sec;
          if (bubble && root.hasAttribute("data-holding")) bubble.textContent = `${s.holdListening} ${fmt(sec)}`;
        },
        onDone: (blob) => {
          endHoldUI();
          open(true);
          voiceReview(blob, holdSeconds);
        },
      });
      // Released while the browser was asking for microphone permission:
      // keep recording and give a stop button in the panel instead.
      if (!pressing) {
        endHoldUI();
        open(true);
        recordingCard(holdRec);
      }
    } catch {
      endHoldUI();
      open(true);
      bot(s.recordDenied);
      voiceDetails(null, 0, "");
    }
  };

  openBtn.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    pressing = true;
    longPress = false;
    openBtn.setPointerCapture?.(e.pointerId);
    holdTimer = window.setTimeout(() => void startHold(), HOLD_MS);
  });
  const release = () => {
    if (!pressing) return;
    pressing = false;
    clearTimeout(holdTimer);
    if (!longPress) {
      open();
      return;
    }
    if (holdRec?.active) holdRec.stop();
  };
  openBtn.addEventListener("pointerup", release);
  openBtn.addEventListener("pointercancel", release);
  // Keyboard (Enter/Space) produces a click with no pointer press: open the chat.
  openBtn.addEventListener("click", (e) => {
    if (e.detail === 0) open();
  });
  openBtn.addEventListener("contextmenu", (e) => e.preventDefault());
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
  /** A message from Nesar personally, with his photo. */
  const fromNesar = (text: string) =>
    bot(
      el(
        "span",
        { class: "from-nesar" },
        el("img", { src: data.avatar, alt: "", width: "36", height: "36" }),
        el("span", {}, el("span", { class: "who" }, s.nesarCaption), el("span", {}, text)),
      ),
    );
  const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
  const callTatva = (cls = "chip") => linkChip(`${s.careCall} · ${data.phone.display}`, `tel:${data.phone.e164}`, cls);

  // ---------- main menu ----------
  function start() {
    recorder?.cancel();
    bot(s.greeting);
    setActions(
      chip(s.optCare, careIntro, "chip care"),
      chip(s.optVoice, voiceRecord, "chip care"),
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
    fromNesar(s.careIntro);
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

    card.append(err, send, privacyNote());
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
        fromNesar(s.sentHelp.replace("{phone}", req.phone));
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

  // ---------- voice notes ----------

  /** In-panel recorder for people who can't or don't hold the launcher. */
  function voiceRecord() {
    bot(s.voiceIntro);
    if (!canRecord()) {
      bot(s.recordDenied);
      voiceDetails(null, 0, "");
      return;
    }
    const label = el("span", {}, s.recordStart);
    const time = el("span", { class: "time" }, "0:00");
    const mic = el("button", { type: "button", class: "mic" }, label, time);
    let seconds = 0;
    mic.addEventListener("click", async () => {
      if (recorder?.active) {
        recorder.stop();
        return;
      }
      try {
        recorder = await Recorder.start({
          onTick: (sec) => {
            seconds = sec;
            time.textContent = `${fmt(sec)} / ${fmt(MAX_RECORDING_SECONDS)}`;
          },
          onDone: (blob) => voiceReview(blob, seconds),
        });
        mic.setAttribute("data-recording", "");
        label.textContent = s.recordStop;
      } catch {
        bot(s.recordDenied);
        voiceDetails(null, 0, "");
      }
    });
    setActions(el("div", { class: "card" }, mic), backChip());
  }

  /** Shown when a hold-to-speak recording continues after the finger has lifted. */
  function recordingCard(rec: Recorder) {
    const stop = el("button", { type: "button", class: "mic", "data-recording": "" }, s.voiceRecording);
    stop.addEventListener("click", () => rec.stop());
    setActions(el("div", { class: "card" }, stop));
  }

  /** Plays back the note, sends it to be written down, then asks for the details. */
  async function voiceReview(audio: Blob, seconds: number) {
    if (seconds < 1 || audio.size < 1500) {
      bot(s.voiceTooShort);
      setActions(chip(s.optVoice, voiceRecord, "chip primary"), backChip());
      return;
    }
    const player = el("audio", { controls: "", src: URL.createObjectURL(audio) });
    bot(s.voiceGot.replace("{time}", fmt(seconds)));
    note(player);
    setActions(el("div", { class: "card busy" }, el("span", { class: "spinner", "aria-hidden": "true" }), el("span", {}, "…")));
    const result = await transcribe(audio);
    voiceDetails(audio, seconds, result.text, result.language);
  }

  async function transcribe(audio: Blob): Promise<{ text: string; language?: string }> {
    try {
      const body = new FormData();
      body.set("audio", audio, `note.${audio.type.includes("mp4") ? "m4a" : "webm"}`);
      const res = await fetch("/api/transcribe", { method: "POST", body });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const out = (await res.json()) as { text?: string; language?: string };
      return { text: (out.text ?? "").trim(), language: out.language };
    } catch {
      return { text: "" };
    }
  }

  /** One card: the (editable) transcript, location, mobile, name, anything else, consent. */
  function voiceDetails(audio: Blob | null, seconds: number, transcript: string, language?: string) {
    const card = el("div", { class: "card" });
    const text = el("textarea", { id: "voice-text", maxlength: "4000" });
    text.value = transcript;
    if (transcript) {
      card.append(el("label", { for: "voice-text" }, s.voiceHeard, text));
      const name = language ? LANGUAGE_NAMES[language.toLowerCase()] ?? language : "";
      if (name) card.append(el("p", { class: "small" }, s.voiceDetected.replace("{lang}", name)));
    } else {
      if (audio) bot(s.voiceNoText);
      card.append(el("label", { for: "voice-text" }, s.detailsLabel, text));
    }

    card.append(el("h3", {}, s.detailsTitle));
    const location = el("input", { type: "text", id: "voice-location", autocomplete: "street-address", maxlength: "200" });
    const locate = el("button", { type: "button", class: "linkbtn" }, s.useLocation);
    const locStatus = el("p", { class: "small", role: "status" });
    let coords: { lat: number; lng: number } | null = null;
    locate.addEventListener("click", () => {
      if (!navigator.geolocation) {
        locStatus.textContent = s.locationFailed;
        return;
      }
      locStatus.textContent = s.locating;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          coords = { lat: +pos.coords.latitude.toFixed(5), lng: +pos.coords.longitude.toFixed(5) };
          locStatus.textContent = `✓ ${s.locationAdded} (${coords.lat}, ${coords.lng})`;
        },
        () => (locStatus.textContent = s.locationFailed),
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
      );
    });
    const mobile = el("input", { type: "tel", id: "voice-mobile", autocomplete: "tel", inputmode: "tel", maxlength: "16" });
    const name = el("input", { type: "text", id: "voice-name", autocomplete: "name", maxlength: "120" });
    const important = el("textarea", { id: "voice-important", maxlength: "1000" });
    const consent = el("input", { type: "checkbox", id: "voice-consent" });
    const err = el("p", { class: "err", role: "alert" });
    const send = el("button", { type: "button", class: "big primary" }, s.sendVoice);

    card.append(
      el("label", { for: "voice-location" }, s.locationLabel, location),
      locate,
      locStatus,
      el("label", { for: "voice-mobile" }, s.mobileLabel, mobile),
      el("label", { for: "voice-name" }, s.nameOptional, name),
      el("label", { for: "voice-important" }, s.importantLabel, important),
      el("label", { class: "tick", for: "voice-consent" }, consent, el("span", {}, s.consentVoice)),
      err,
      send,
      privacyNote(),
    );

    let requestId: string | undefined;
    send.addEventListener("click", async () => {
      const phone = mobile.value.replace(/[\s-]/g, "");
      if (!validPhone(phone)) {
        err.textContent = s.phoneInvalid;
        mobile.focus();
        return;
      }
      if (!audio && !text.value.trim()) {
        err.textContent = s.needSomething;
        text.focus();
        return;
      }
      if (!consent.checked) {
        err.textContent = s.consentNeeded;
        consent.focus();
        return;
      }
      err.textContent = "";
      requestId ??= crypto.randomUUID();
      const body = new FormData();
      body.set("kind", "voice");
      body.set("requestId", requestId);
      body.set("locale", document.documentElement.lang);
      body.set("name", name.value.trim());
      body.set("phone", phone);
      body.set("area", location.value.trim());
      body.set("details", text.value.trim());
      body.set("note", important.value.trim());
      body.set("language", language ?? "");
      body.set("transcribed", transcript ? "true" : "false");
      body.set("consent", "true");
      if (coords) {
        body.set("lat", String(coords.lat));
        body.set("lng", String(coords.lng));
      }
      if (audio) body.set("audio", audio, `note.${audio.type.includes("mp4") ? "m4a" : "webm"}`);
      send.disabled = true;
      send.textContent = s.sending;
      try {
        const res = await fetch("/api/assist", { method: "POST", body });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        chime("sent");
        fromNesar(s.sentVoice.replace("{phone}", phone));
        setActions(callTatva(), backChip());
      } catch {
        err.textContent = s.sendError;
        send.disabled = false;
        send.textContent = s.sendVoice;
        if (!card.parentElement?.querySelector(".call-fallback")) {
          const call = callTatva("chip primary");
          call.classList.add("call-fallback");
          actions.append(call);
        }
      }
    });
    void seconds;
    setActions(card, callTatva(), backChip());
    (transcript ? mobile : text).focus();
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
