/**
 * Technology & capabilities (brief, section 06): eight disciplines of tools.
 *
 * `used: true`  = used in TATVA's own delivered or in-development work.
 * `used: false` = being explored; shown with a dashed outline and never implied as delivered.
 *
 * The brief lists these as tools from Nesar's previous development work and interests,
 * without saying which are which. Groups marked `confirmed: false` still need Nesar to
 * confirm each tool's flag before launch.
 */

export interface Tool {
  name: string;
  used: boolean;
}

export interface CapabilityGroup {
  key: string;
  /** Short purpose line: what this layer does for a business */
  purpose: string;
  tools: Tool[];
  confirmed: boolean;
}

export const capabilityGroups: CapabilityGroup[] = [
  {
    key: "Frontend",
    purpose: "Interfaces people find clear and quick to use.",
    tools: [
      { name: "React", used: true },
      { name: "TypeScript", used: true },
      { name: "Vite", used: true },
      { name: "Tailwind CSS", used: true },
      { name: "Astro", used: true }, // this website
      { name: "Three.js", used: true }, // this website's 3D
    ],
    confirmed: false,
  },
  {
    key: "Backend",
    purpose: "Business rules, APIs and security, enforced on the server.",
    tools: [
      { name: "Node.js", used: true },
      { name: "Express.js", used: true },
      { name: "REST APIs", used: true },
      { name: "Cloudflare Workers", used: false }, // this site's backend, not deployed yet
    ],
    confirmed: false,
  },
  {
    key: "Database",
    purpose: "Records that stay correct, private and recoverable.",
    tools: [
      { name: "PostgreSQL", used: true },
      { name: "Neon", used: true },
      { name: "Firebase", used: true },
      { name: "Supabase", used: true }, // deals bot
      { name: "Cloudflare D1", used: false },
    ],
    confirmed: false,
  },
  {
    key: "Architecture",
    purpose: "Systems that grow with the business without being rebuilt.",
    tools: [
      { name: "Multi-tenancy", used: true },
      { name: "Role-based access", used: true },
      { name: "Modular systems", used: true },
      { name: "SOLID principles", used: true },
    ],
    confirmed: false,
  },
  {
    key: "Integrations",
    purpose: "Connecting the services and tools a business already relies on.",
    tools: [
      { name: "Webhooks", used: true },
      { name: "Broker APIs", used: true },
      { name: "Payment gateways", used: true },
      { name: "Telegram Bot API", used: true }, // alert bots
    ],
    confirmed: false,
  },
  {
    key: "Trading",
    purpose: "Strategies defined, tested and automated with risk rules.",
    tools: [
      { name: "TradingView", used: true },
      { name: "Pine Script", used: true },
      { name: "Python", used: true },
      { name: "Angel One SmartAPI", used: true }, // EMA alert scanner
    ],
    confirmed: false,
  },
  {
    key: "Creative",
    purpose: "Ideas made visible before they are built.",
    tools: [
      { name: "3D modelling", used: true },
      { name: "Animation", used: true },
      { name: "Visualization", used: true },
      { name: "Motion design", used: true },
    ],
    confirmed: false,
  },
  {
    key: "AI-assisted development",
    purpose: "Faster delivery, with every change reviewed by a person.",
    tools: [
      { name: "Claude", used: true },
      { name: "Replit AI", used: true },
      { name: "Firebase Studio", used: true },
      { name: "Cloudflare Workers AI", used: false }, // voice-note transcription on this site
    ],
    confirmed: false,
  },
];

/**
 * How the eight disciplines connect in a typical TATVA system (indices into
 * capabilityGroups). Drawn as the network diagram's edges.
 */
export const capabilityLinks: [number, number][] = [
  [0, 1], // interface ↔ server
  [1, 2], // server ↔ data
  [1, 4], // server ↔ integrations
  [3, 1], // architecture shapes the server
  [3, 2], // … and the data model
  [3, 0], // … and the interface
  [4, 5], // integrations ↔ trading (broker APIs, webhooks)
  [5, 2], // trading ↔ data
  [6, 0], // creative ↔ interface
  [7, 1], // AI-assisted development ↔ code
  [7, 6], // AI ↔ creative
  [7, 5], // AI ↔ trading research
];
