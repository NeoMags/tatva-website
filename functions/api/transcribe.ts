/**
 * POST /api/transcribe — turns a voice note into text with Workers AI (Whisper).
 * No language is given, so the model detects it (Kannada, Hindi, English and more).
 * Nothing is stored: the audio is transcribed and discarded. The browser shows the
 * text to the speaker to correct before anything is sent to Nesar.
 */
import { ipHash, json, rateLimited, sameOrigin, type Env } from "../_lib/shared";

const MODEL = "@cf/openai/whisper-large-v3-turbo";
const MAX_BYTES = 8 * 1024 * 1024;
const AUDIO_TYPES = /^audio\/(webm|mp4|ogg|mpeg|aac|x-m4a|wav)/;

/** Base64 without Node's Buffer (works in the plain Workers runtime). */
function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  if (!env.AI) return json({ error: "not_configured" }, 503);
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES + 10_000) return json({ error: "too_large" }, 413);

  let audio: File | null = null;
  try {
    const entry = (await request.formData()).get("audio");
    audio = entry instanceof File ? entry : null;
  } catch {
    return json({ error: "bad_form" }, 400);
  }
  if (!audio || audio.size === 0 || audio.size > MAX_BYTES || !AUDIO_TYPES.test(audio.type)) {
    return json({ error: "bad_audio" }, 422);
  }

  const hash = await ipHash(request, env.IP_SALT);
  if (await rateLimited(env.DB, "transcriptions", hash, 12, 10)) return json({ error: "rate_limited" }, 429);
  await env.DB?.prepare("INSERT INTO transcriptions (ip_hash) VALUES (?)").bind(hash).run();

  try {
    const result = (await env.AI.run(MODEL as Parameters<Ai["run"]>[0], {
      audio: toBase64(new Uint8Array(await audio.arrayBuffer())),
      task: "transcribe",
      vad_filter: true,
      condition_on_previous_text: false,
    } as never)) as { text?: string; transcription_info?: { language?: string } };
    return json({ text: (result.text ?? "").trim(), language: result.transcription_info?.language ?? null });
  } catch {
    // The voice note still reaches Nesar; the sender is asked to add a short note instead.
    return json({ error: "transcription_failed" }, 502);
  }
};
