/**
 * Portfolio projects. One entry per project page at /work/<slug>.
 *
 * RULES (from the brief): never invent clients, metrics, testimonials or features.
 * Only write what Nesar has stated. Leave a field out rather than guess; the page
 * shows "case study being written" for missing parts.
 *
 * `statusConfirmed: false` marks a status taken from early notes that Nesar has not
 * yet confirmed. scripts/check-content.mjs fails the production build while any remain.
 */

export type Status = "Live" | "Delivered" | "In Development" | "Prototype" | "Concept";

/** Index into the six disciplines (same order as the emblem nodes, clockwise from the top). */
export type DisciplineIndex = 0 | 1 | 2 | 3 | 4 | 5;

export interface Project {
  slug: string;
  title: string;
  /** Short name of the kind of product, shown under the title */
  kind: string;
  disciplines: DisciplineIndex[];
  status: Status;
  statusConfirmed: boolean;
  featured: boolean;
  /** One or two sentences, shown in lists */
  summary: string;
  problem?: string;
  requirements?: string[];
  solution?: string;
  approach?: string;
  features?: string[];
  tools?: { name: string; used: boolean }[];
  /** Image paths under /images/work/<slug>/; empty until Nesar provides them */
  images: { src: string; alt: string }[];
  /** Brand names explored for the product, if any */
  brandExplorations?: string[];
}

export const projects: Project[] = [
  {
    slug: "inspecto",
    title: "Inspecto",
    kind: "Inspection software",
    disciplines: [0, 2],
    status: "Live",
    statusConfirmed: true,
    featured: true,
    summary: "Inspection software, live and in use.",
    images: [],
  },
  {
    slug: "poultry-farm-management",
    title: "Poultry Farm Management",
    kind: "Farm operations software",
    disciplines: [2, 0],
    status: "Live",
    statusConfirmed: true,
    featured: true,
    summary:
      "Farm operations in one place: sheds and flocks, feed consumption, egg inventory, dispatch, accounting and sales.",
    features: [
      "Shed and flock management",
      "Feed consumption tracking",
      "Egg inventory",
      "Dispatch",
      "Accounting",
      "Sales",
      "Operational reporting",
    ],
    images: [],
  },
  {
    slug: "inventory",
    title: "Inventory App",
    kind: "Inventory management software",
    disciplines: [2, 0],
    status: "Live",
    statusConfirmed: true,
    featured: true,
    summary: "Inventory management software, live and in use.",
    images: [],
  },
  {
    slug: "universal-business-management",
    title: "Universal Business Management",
    kind: "Modular business platform",
    disciplines: [0, 2, 1],
    status: "In Development",
    statusConfirmed: true,
    featured: true,
    summary:
      "A modular platform for inventory, accounting, purchases, sales, customers, suppliers, billing and analytics. A first version is built; further integrations are in progress.",
    features: [
      "Inventory",
      "Accounting",
      "Purchases and sales",
      "Customers and suppliers",
      "Billing",
      "Business analytics",
    ],
    images: [],
  },
  {
    slug: "fleet-management",
    title: "Fleet Management Ecosystem",
    kind: "Fleet and logistics platform",
    disciplines: [2, 0],
    status: "In Development",
    statusConfirmed: false,
    featured: true,
    summary: "Multi-vehicle fleet operations: trips, drivers, consignments, expenses, dispatch, renewals and reporting.",
    features: [
      "Vehicle and driver management",
      "Trip and consignment tracking",
      "Expenses and renewals",
      "Dispatch and delivery",
      "Operational reporting",
    ],
    brandExplorations: ["TruckNes", "MDrive Fleet Management"],
    images: [],
  },
  {
    slug: "community-connect",
    title: "Community Connect",
    kind: "Citizen services platform",
    disciplines: [0, 1],
    status: "In Development",
    statusConfirmed: false,
    featured: false,
    summary: "A SaaS platform for citizen services and public grievances, designed for Karnataka.",
    images: [],
  },
  {
    slug: "trading-systems",
    title: "Trading Systems & Automation",
    kind: "Trading software",
    disciplines: [1, 0],
    status: "In Development",
    statusConfirmed: false,
    featured: false,
    summary:
      "The software side of trading: a dashboard and trade management connected to Pine Script indicators, webhook automation and broker APIs. No trading results are published.",
    features: [
      "Trade management dashboard",
      "TradingView and Pine Script integration",
      "Webhook automation",
      "Broker API connectivity",
      "Market alert scanners delivered to Telegram",
    ],
    tools: [
      { name: "TradingView", used: true },
      { name: "Pine Script", used: true },
      { name: "Python", used: true },
      { name: "Telegram Bot API", used: true },
    ],
    images: [],
  },
  {
    slug: "crew-tasks",
    title: "Crew Tasks",
    kind: "Android app",
    disciplines: [0],
    status: "Prototype",
    statusConfirmed: false,
    featured: false,
    summary: "An Android app for small groups to assign tasks, track progress, and keep shared to-dos and reminders.",
    features: ["Task assignment", "Progress tracking", "Groups", "To-dos and reminders"],
    images: [],
  },
  {
    slug: "deals-bot",
    title: "Deals Bot",
    kind: "Telegram automation",
    disciplines: [1],
    status: "Prototype",
    statusConfirmed: false,
    featured: false,
    summary: "A Telegram channel bot that posts Flipkart and Amazon deals, price drops and coupon codes automatically.",
    tools: [
      { name: "Supabase", used: true },
      { name: "Telegram Bot API", used: true },
    ],
    images: [],
  },
  {
    slug: "design-visualization",
    title: "Design & Visualization",
    kind: "Architecture and 3D work",
    disciplines: [3, 4],
    status: "Delivered",
    statusConfirmed: false,
    featured: true,
    summary:
      "Architectural visualization, 3D modelling, building elevations, interiors and exteriors, signage and animation.",
    images: [],
  },
  {
    slug: "brand-communication",
    title: "Brand & Communication",
    kind: "Identity and marketing work",
    disciplines: [5],
    status: "Delivered",
    statusConfirmed: false,
    featured: false,
    summary:
      "Brand identities, logos, corporate communication, websites, advertising layouts, social media content and digital marketing.",
    images: [],
  },
];

const statusOrder: Record<Status, number> = { Live: 0, Delivered: 1, "In Development": 2, Prototype: 3, Concept: 4 };

/** Live work first, then delivered, then in development, and so on. Stable within a status. */
export function sortedProjects(list = projects): Project[] {
  return [...list].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
}

export function projectBySlug(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}
