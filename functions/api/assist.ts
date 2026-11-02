/**
 * POST /api/assist — requests from the floating assistant.
 *   kind=help      TATVA Care: senior-citizen help (consent required), voice and/or text
 *   kind=question  a question the guided chat could not answer
 * Voice recordings are forwarded to Telegram and never stored.
 */
import { parseHelpRequest, validPhone } from "../../src/lib/validation";
import { esc, ipHash, json, rateLimited, sameOrigin, telegramAudio, telegramText, type Env } from "../_lib/shared";

const MAX_AUDIO_BYTES = 8 * 1024 * 1024; // ~2 minutes at 32 kbps is well under 1 MB; generous margin
const AUDIO_TYPES = /^audio\/(webm|mp4|ogg|mpeg|aac|x-m4a)/;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  if (Number(request.headers.get("content-length") ?? 0) > MAX_AUDIO_BYTES + 50_000) return json({ error: "too_large" }, 413);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "bad_form" }, 400);
  }
  const field = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v : undefined;
  };

  const kind = field("kind") === "help" ? "help" : field("kind") === "question" ? "question" : null;
  const requestId = field("requestId") ?? "";
  if (!kind || !/^[0-9a-f-]{36}$/i.test(requestId)) return json({ error: "invalid" }, 422);

  const req = parseHelpRequest(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")));
  if (req.website) return json({ ok: true }); // honeypot
  if (!req.name || !validPhone(req.phone)) return json({ error: "invalid" }, 422);
  if (kind === "help" && !req.consent) return json({ error: "consent_required" }, 422);

  const audioEntry = form.get("audio");
  const audio = audioEntry instanceof File && audioEntry.size > 0 ? audioEntry : null;
  if (audio && (audio.size > MAX_AUDIO_BYTES || !AUDIO_TYPES.test(audio.type))) return json({ error: "bad_audio" }, 422);
  if (!audio && !req.details) return json({ error: "empty" }, 422);

  const hash = await ipHash(request, env.IP_SALT);
  if (await rateLimited(env.DB, "assist_requests", hash, 6, 10)) return json({ error: "rate_limited" }, 429);

  let id: number | undefined;
  if (env.DB) {
    // INSERT OR IGNORE + unique request_id: a retried submission is not recorded or alerted twice.
    const row = await env.DB.prepare(
      `INSERT OR IGNORE INTO assist_requests
         (request_id, kind, name, phone, area, details, requester, has_audio, consent, locale, ip_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    )
      .bind(
        requestId,
        kind,
        req.name,
        req.phone,
        req.area ?? null,
        req.details ?? null,
        req.for ?? null,
        audio ? 1 : 0,
        req.consent ? 1 : 0,
        field("locale") ?? null,
        hash,
      )
      .first<{ id: number }>();
    if (row) {
      id = row.id;
    } else {
      // Same request sent again: only skip it if Nesar was already alerted.
      const existing = await env.DB.prepare("SELECT id, notified FROM assist_requests WHERE request_id = ?")
        .bind(requestId)
        .first<{ id: number; notified: number }>();
      if (existing?.notified) return json({ ok: true, duplicate: true });
      id = existing?.id;
    }
  }

  const heading = kind === "help" ? "🆘 <b>TATVA Care request</b>" : "<b>Question from the assistant</b>";
  const lines = [
    `${heading}${id ? ` #${id}` : ""}`,
    `<b>${esc(req.name)}</b> · <a href="tel:${esc(req.phone)}">${esc(req.phone)}</a>`,
    req.for ? `For: ${req.for === "family" ? "a family member" : "themselves"}` : "",
    req.area ? `Area: ${esc(req.area)}` : "",
    req.details ? `\n${esc(req.details)}` : "",
    audio ? "\n🎙 Voice message attached" : "",
    kind === "help" ? "Consent given in the assistant." : "",
  ].filter(Boolean);
  const caption = lines.join("\n");

  const notified = audio ? await telegramAudio(env, audio, caption) : await telegramText(env, caption);
  if (notified && env.DB && id) await env.DB.prepare("UPDATE assist_requests SET notified = 1 WHERE id = ?").bind(id).run();

  // A help request that reached nobody must not look successful to the person asking.
  if (!notified && (kind === "help" || !env.DB)) return json({ error: "not_delivered" }, 502);
  return json({ ok: true });
};
