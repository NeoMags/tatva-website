/**
 * Business facts shown across the site. Change them here only.
 * Anything not yet confirmed by Nesar is marked TODO and must not ship as fact.
 */
export const site = {
  legalName: "Tatva Enterprises",
  registration: "MSME registered.", // TODO: add GSTIN once issued
  founder: "Nesar Magavi",
  founderRole: "Founder & Product Architect",
  email: "neomags@gmail.com",
  phone: { display: "+91 99022 61103", e164: "+919902261103" }, // from the business card
  location: "Haveri, Karnataka, India",
  /** Software subscription range stated by Nesar (₹ per month). */
  pricing: { from: 3999, to: 15999 },
  /** Budget options on the enquiry form (proposed; Nesar to confirm). */
  budgets: ["Under ₹25,000", "₹25,000 – ₹75,000", "₹75,000 – ₹2 lakh", "₹2 lakh – ₹5 lakh", "Above ₹5 lakh", "Not sure yet"],
  /** TODO: confirm ownership of tatva.in before using it anywhere. */
  domain: null as string | null,
} as const;
