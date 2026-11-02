/**
 * Validation shared by the browser (instant feedback) and the server functions
 * (the real check). Never trust the browser's result on its own.
 */

export interface Enquiry {
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  interest: string;
  budget?: string;
  message: string;
  consent: boolean;
  /** honeypot: must be empty */
  website?: string;
  locale?: string;
}

export type FieldError = "required" | "email" | "short" | "long";
export type Errors = Partial<Record<keyof Enquiry, FieldError>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const clean = (v: unknown, max: number): string =>
  typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max) : "";

/** Normalises untrusted input into an Enquiry (trimmed, length-capped). */
export function parseEnquiry(input: Record<string, unknown>): Enquiry {
  return {
    name: clean(input.name, 120),
    email: clean(input.email, 200).toLowerCase(),
    phone: clean(input.phone, 30) || undefined,
    organization: clean(input.organization, 160) || undefined,
    interest: clean(input.interest, 120),
    budget: clean(input.budget, 60) || undefined,
    message: clean(input.message, 4000),
    consent: input.consent === true || input.consent === "on" || input.consent === "true",
    website: clean(input.website, 200) || undefined,
    locale: clean(input.locale, 5) || undefined,
  };
}

export function validateEnquiry(e: Enquiry): Errors {
  const errors: Errors = {};
  if (!e.name) errors.name = "required";
  if (!e.email) errors.email = "required";
  else if (!EMAIL.test(e.email)) errors.email = "email";
  if (!e.interest) errors.interest = "required";
  if (!e.message) errors.message = "required";
  else if (e.message.length < 20) errors.message = "short";
  if (!e.consent) errors.consent = "required";
  return errors;
}

/** A help request from the assistant's senior-help flow. */
export interface HelpRequest {
  name: string;
  phone: string;
  area?: string;
  details?: string;
  /** the person agreed to the consent note */
  consent: boolean;
  /** "self" or "family" — who is asking */
  for?: string;
  website?: string;
}

export function parseHelpRequest(input: Record<string, unknown>): HelpRequest {
  return {
    name: clean(input.name, 120),
    phone: clean(input.phone, 30).replace(/[^\d+]/g, ""),
    area: clean(input.area, 160) || undefined,
    details: clean(input.details, 2000) || undefined,
    consent: input.consent === true || input.consent === "true",
    for: clean(input.for, 20) || undefined,
    website: clean(input.website, 200) || undefined,
  };
}

/** An Indian mobile or landline: 10 digits, optionally with +91 / 0 prefix. */
export function validPhone(phone: string): boolean {
  const digits = phone.replace(/^\+?91/, "").replace(/^0/, "");
  return /^\d{10}$/.test(digits);
}
