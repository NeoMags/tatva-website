/** POST /api/enquiry — the project enquiry form. */
import { parseEnquiry, validateEnquiry } from "../../src/lib/validation";
import { esc, ipHash, json, rateLimited, sameOrigin, telegramText, verifyTurnstile, type Env } from "../_lib/shared";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  if (Number(request.headers.get("content-length") ?? 0) > 20_000) return json({ error: "too_large" }, 413);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "bad_json" }, 400);
  }

  const enquiry = parseEnquiry(body);
  // Honeypot filled in: pretend success so the bot learns nothing.
  if (enquiry.website) return json({ ok: true });

  const errors = validateEnquiry(enquiry);
  if (Object.keys(errors).length) return json({ error: "invalid", fields: errors }, 422);

  if (!(await verifyTurnstile(env.TURNSTILE_SECRET, body.turnstile, request))) return json({ error: "challenge" }, 403);

  const hash = await ipHash(request, env.IP_SALT);
  if (await rateLimited(env.DB, "enquiries", hash)) return json({ error: "rate_limited" }, 429);

  let id: number | undefined;
  if (env.DB) {
    const row = await env.DB.prepare(
      `INSERT INTO enquiries (name, email, phone, organization, interest, budget, message, locale, ip_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    )
      .bind(
        enquiry.name,
        enquiry.email,
        enquiry.phone ?? null,
        enquiry.organization ?? null,
        enquiry.interest,
        enquiry.budget ?? null,
        enquiry.message,
        enquiry.locale ?? null,
        hash,
      )
      .first<{ id: number }>();
    id = row?.id;
  }

  const text = [
    `<b>New enquiry</b>${id ? ` #${id}` : ""}`,
    `<b>${esc(enquiry.name)}</b> · ${esc(enquiry.email)}${enquiry.phone ? ` · ${esc(enquiry.phone)}` : ""}`,
    enquiry.organization ? `Organization: ${esc(enquiry.organization)}` : "",
    `Interest: ${esc(enquiry.interest)}${enquiry.budget ? ` · Budget: ${esc(enquiry.budget)}` : ""}`,
    "",
    esc(enquiry.message),
  ]
    .filter((line, i, all) => line !== "" || all[i - 1] !== "")
    .join("\n");
  const notified = await telegramText(env, text);
  if (notified && env.DB && id) await env.DB.prepare("UPDATE enquiries SET notified = 1 WHERE id = ?").bind(id).run();

  // Without a database AND without Telegram the enquiry would be lost: report failure.
  if (!env.DB && !notified) return json({ error: "not_configured" }, 503);
  return json({ ok: true });
};
