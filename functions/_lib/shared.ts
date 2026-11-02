/**
 * Shared helpers for the Cloudflare Pages Functions.
 *
 * Environment (set in the Cloudflare dashboard, never in the repo):
 *   TELEGRAM_BOT_TOKEN  bot that sends alerts to Nesar
 *   TELEGRAM_CHAT_ID    Nesar's chat with that bot
 *   TURNSTILE_SECRET    optional; when set, the enquiry form must pass Turnstile
 *   IP_SALT             random string used to hash IP addresses for rate limiting
 *   DB                  D1 database binding (see migrations/)
 */

export interface Env {
  DB?: D1Database;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  TURNSTILE_SECRET?: string;
  IP_SALT?: string;
}

export const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

/** Only accept requests from our own pages. */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return new URL(origin).host === new URL(request.url).host;
}

/** Hash the visitor's IP so it can be rate-limited without storing it. */
export async function ipHash(request: Request, salt = "tatva"): Promise<string> {
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${ip}`));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

/** True when this IP has already sent `limit` rows in the last `minutes`. */
export async function rateLimited(
  db: D1Database | undefined,
  table: "enquiries" | "assist_requests",
  hash: string,
  limit = 5,
  minutes = 10,
): Promise<boolean> {
  if (!db) return false;
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ip_hash = ? AND created_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', ?)`)
    .bind(hash, `-${minutes} minutes`)
    .first<{ n: number }>();
  return (row?.n ?? 0) >= limit;
}

export async function verifyTurnstile(secret: string | undefined, token: unknown, request: Request): Promise<boolean> {
  if (!secret) return true; // Turnstile not configured
  if (typeof token !== "string" || !token) return false;
  const form = new FormData();
  form.set("secret", secret);
  form.set("response", token);
  form.set("remoteip", request.headers.get("cf-connecting-ip") ?? "");
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  const out = (await res.json()) as { success?: boolean };
  return out.success === true;
}

/** Escape text for Telegram's HTML parse mode. */
export const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Sends a Telegram message; returns false (never throws) so the visitor's request still succeeds. */
export async function telegramText(env: Env, html: string): Promise<boolean> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: html, parse_mode: "HTML", disable_web_page_preview: true }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Sends a voice note with a caption. Telegram accepts files up to 50 MB from bots. */
export async function telegramAudio(env: Env, audio: File, captionHtml: string): Promise<boolean> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return false;
  try {
    const form = new FormData();
    form.set("chat_id", env.TELEGRAM_CHAT_ID);
    form.set("caption", captionHtml.slice(0, 1000));
    form.set("parse_mode", "HTML");
    form.set("document", audio, audio.name || "request.webm");
    const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendDocument`, { method: "POST", body: form });
    return res.ok;
  } catch {
    return false;
  }
}
