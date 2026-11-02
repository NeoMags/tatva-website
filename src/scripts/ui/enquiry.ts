/** Enquiry form: instant validation, then a JSON post to /api/enquiry. */
import { parseEnquiry, validateEnquiry, type FieldError } from "../../lib/validation";
import { chime } from "./sound";

export function initEnquiryForm(): void {
  const form = document.querySelector<HTMLFormElement>("[data-enquiry-form]");
  if (!form) return;
  const status = form.querySelector<HTMLElement>("[data-form-status]");
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const msg = form.querySelector<HTMLTemplateElement>("[data-messages]")?.dataset ?? {};
  const messageFor: Record<FieldError, string> = {
    required: msg.required ?? "Required",
    email: msg.email ?? "Check the email address",
    short: msg.short ?? "Please write a little more",
    long: msg.required ?? "Too long",
  };

  const showErrors = (errors: Record<string, FieldError | undefined>) => {
    form.querySelectorAll<HTMLElement>("[data-err-for]").forEach((el) => {
      const field = el.dataset.errFor ?? "";
      const error = errors[field];
      el.textContent = error ? messageFor[error] : "";
      form.querySelector(`[name="${field}"]`)?.setAttribute("aria-invalid", String(Boolean(error)));
    });
  };

  const read = () => {
    const data = Object.fromEntries(new FormData(form).entries()) as Record<string, unknown>;
    data.consent = (form.elements.namedItem("consent") as HTMLInputElement | null)?.checked ?? false;
    data.locale = document.documentElement.lang;
    return parseEnquiry(data);
  };

  // Re-check a field when the visitor leaves it, once they have tried to submit.
  let attempted = false;
  form.addEventListener("focusout", () => attempted && showErrors(validateEnquiry(read())));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    attempted = true;
    const enquiry = read();
    const errors = validateEnquiry(enquiry);
    showErrors(errors);
    if (Object.keys(errors).length) {
      const first = Object.keys(errors)[0];
      form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    if (!button || !status) return;
    button.disabled = true;
    button.textContent = button.dataset.sending ?? "Sending…";
    status.textContent = "";
    status.removeAttribute("data-tone");
    try {
      const turnstile = (form.querySelector('[name="cf-turnstile-response"]') as HTMLInputElement | null)?.value;
      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...enquiry, turnstile }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      status.dataset.tone = "ok";
      status.textContent = msg.sent ?? "Sent.";
      form.reset();
      attempted = false;
      chime("sent");
    } catch {
      status.dataset.tone = "error";
      status.textContent = msg.error ?? "Could not send.";
    } finally {
      button.disabled = false;
      button.textContent = button.dataset.label ?? "Send";
    }
  });
}
