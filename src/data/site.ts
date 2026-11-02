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
  /** TODO: confirm ownership of tatva.in before using it anywhere. */
  domain: null as string | null,
} as const;
