/**
 * Interface and page copy for every supported language.
 *
 * English is the source. Kannada and Hindi are DRAFTS written by Claude and must be
 * checked by a native speaker before launch (see `reviewed` below).
 * To add a language: add its code to `locales`, give it a block in `strings`
 * (missing keys fall back to English), and add it to astro.config.mjs.
 */

export const locales = ["en", "kn", "hi"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export const localeMeta: Record<Locale, { label: string; short: string; htmlLang: string; reviewed: boolean }> = {
  en: { label: "English", short: "EN", htmlLang: "en", reviewed: true },
  kn: { label: "ಕನ್ನಡ", short: "ಕ", htmlLang: "kn", reviewed: false },
  hi: { label: "हिन्दी", short: "हि", htmlLang: "hi", reviewed: false },
};

const en = {
  "meta.title": "TATVA | The Architecture of Possibility — Software, Systems & Design",
  "meta.description":
    "TATVA builds SaaS products, business systems, automation, architectural design and 3D visualization from Haveri, Karnataka. Build. Connect. Expand.",

  "nav.skip": "Skip to content",
  "nav.work": "Work",
  "nav.disciplines": "Disciplines",
  "nav.process": "Process",
  "nav.about": "About",
  "nav.contact": "Contact",
  "nav.cta": "Start a project",
  "nav.menu": "Menu",
  "nav.close": "Close menu",
  "nav.language": "Language",
  "nav.theme": "Theme",
  "theme.dark": "Dark",
  "theme.light": "Light",
  "theme.system": "System",
  "sound.on": "Sound on",
  "sound.off": "Sound off",

  "hero.title": "The architecture of possibility.",
  "hero.lead": "TATVA transforms ideas into meaningful structures, intelligent systems and immersive experiences.",
  "hero.cta.primary": "Explore our universe",
  "hero.cta.secondary": "Discover what we build",
  "hero.scroll": "Scroll to enter the tesseract",
  "hero.emblem.alt":
    "The TATVA tesseract: a central cube inside a hexagonal frame of six nodes, joined by connecting edges.",
  "meaning.label": "Meaning",
  "meaning.essence": "The fundamental essence behind every creation.",
  "meaning.chain.1": "Idea",
  "meaning.chain.2": "Structure",
  "meaning.chain.3": "System",
  "meaning.chain.4": "Experience",
  "meaning.chain.5": "Possibility",

  "disc.eyebrow": "The disciplines",
  "disc.title": "Different dimensions. One connected vision.",
  "disc.intro":
    "Each node of the TATVA emblem stands for a discipline. The cube at the centre is the idea they all serve.",
  "disc.0.title": "Digital Products & Software",
  "disc.0.body": "SaaS platforms, business management systems and custom software, built on multi-tenant architecture.",
  "disc.0.items": "SaaS applications|Multi-tenant platforms|APIs and integrations|Subscription platforms",
  "disc.1.title": "Intelligent Systems & Automation",
  "disc.1.body": "Automated workflows, integrations and dashboards that remove repetitive work and show what is happening.",
  "disc.1.items": "Business process automation|AI-assisted workflows|Operational dashboards|Trading strategy automation",
  "disc.2.title": "Business Systems & Industry Solutions",
  "disc.2.body": "Industry software for fleets, farms, inventory and accounts.",
  "disc.2.items": "Fleet and transport|Poultry farm management|Inventory and dispatch|Accounting and reporting",
  "disc.3.title": "Architecture & Spatial Design",
  "disc.3.body": "Building concepts, space planning and construction-ready design, informed by hands-on fabrication.",
  "disc.3.items": "Architectural concepts|Space planning|Interior and exterior|Fabrication-oriented design",
  "disc.4.title": "3D, Animation & Visualization",
  "disc.4.body": "Models, renders and motion that make an idea visible before it is built.",
  "disc.4.items": "3D modelling|Architectural rendering|Product visualization|Motion graphics",
  "disc.5.title": "Brand & Creative Communication",
  "disc.5.body": "Identities, websites and campaigns that say clearly what a business does.",
  "disc.5.items": "Logo and identity systems|Website design|Marketing creatives|Digital advertising",

  "work.eyebrow": "The creations",
  "work.title": "Ideas made visible. Systems made real.",
  "work.intro": "Products and projects TATVA has conceived, designed and built. Each carries its real status.",
  "work.all": "See all work",
  "work.view": "View project",
  "work.filter.all": "All",
  "status.Live": "Live",
  "status.Delivered": "Delivered",
  "status.In Development": "In development",
  "status.Prototype": "Prototype",
  "status.Concept": "Concept",

  "process.eyebrow": "The construction",
  "process.title": "From abstract thought to tangible reality.",
  "process.1.title": "Understand the problem",
  "process.1.body": "How the business works today, who uses it, and where time and money leak.",
  "process.2.title": "Conceptualize the solution",
  "process.2.body": "The smallest set of features that solves the real problem.",
  "process.3.title": "Design the architecture",
  "process.3.body": "Data, roles, integrations and screens, planned before code.",
  "process.4.title": "Build the system",
  "process.4.body": "Working software in short rounds you can see and use.",
  "process.5.title": "Integrate the components",
  "process.5.body": "Payments, messaging, devices and the tools you already use.",
  "process.6.title": "Test and refine",
  "process.6.body": "Real data, real users, edge cases and failure cases.",
  "process.7.title": "Deliver and evolve",
  "process.7.body": "Launch, training, support, and improvements as you grow.",

  "founder.eyebrow": "The founder",
  "founder.title": "A multidisciplinary approach to building things.",
  "founder.role": "Founder & Product Architect",
  "founder.p1":
    "I work at the intersection of business, technology and design. My journey has crossed animation, sales and marketing, construction, metal fabrication, software development and business operations.",
  "founder.p2":
    "Those disciplines shaped how I solve problems. Good solutions need more than technical knowledge: they need an understanding of people, processes, business constraints, design and execution.",
  "founder.p3":
    "Today I build digital products, business systems and creative experiences that bring these disciplines together.",
  "founder.motto": "Think deeply. Design intelligently. Build practically. Improve continuously.",
  "founder.portrait": "Portrait of Nesar Magavi",

  "contact.eyebrow": "Connect with TATVA",
  "contact.title": "Have an idea? Let's give it dimension.",
  "contact.intro":
    "A new product, a better way to run operations, an automated workflow or a building to visualize: tell us what you need.",
  "contact.pricing.label": "Software subscriptions",
  "contact.pricing.range": "₹3,999 – ₹15,999 per month",
  "contact.pricing.note": "Depending on the product, modules and number of users. Custom projects are quoted after a conversation.",
  "contact.whatsapp": "Chat on WhatsApp",
  "contact.call": "Call",
  "contact.email": "Email",
  "contact.location": "Location",
  "form.name": "Name",
  "form.email": "Email",
  "form.phone": "Phone (optional)",
  "form.org": "Organization (optional)",
  "form.interest": "Area of interest",
  "form.interest.placeholder": "Choose one",
  "form.budget": "Budget (optional)",
  "form.budget.placeholder": "Choose a range",
  "form.message": "Tell us about the project",
  "form.consent": "I agree that TATVA may contact me about this enquiry.",
  "form.submit": "Send enquiry",
  "form.sending": "Sending…",
  "form.sent": "Thank you. Your enquiry has reached TATVA, and Nesar will get back to you.",
  "form.error": "The enquiry could not be sent. Please try again, or use WhatsApp or email below.",
  "form.required": "Required",
  "form.invalidEmail": "Enter an email address like name@example.com",
  "form.tooShort": "A few more words would help, at least 20 characters.",
} as const;

export type UIKey = keyof typeof en;

const kn: Partial<Record<UIKey, string>> = {
  "meta.title": "TATVA | ಸಾಧ್ಯತೆಗಳ ವಾಸ್ತುಶಿಲ್ಪ — ಸಾಫ್ಟ್‌ವೇರ್, ವ್ಯವಸ್ಥೆಗಳು ಮತ್ತು ವಿನ್ಯಾಸ",
  "meta.description":
    "TATVA SaaS ಉತ್ಪನ್ನಗಳು, ವ್ಯಾಪಾರ ವ್ಯವಸ್ಥೆಗಳು, ಸ್ವಯಂಚಾಲನೆ, ವಾಸ್ತುಶಿಲ್ಪ ವಿನ್ಯಾಸ ಮತ್ತು 3D ದೃಶ್ಯೀಕರಣವನ್ನು ನಿರ್ಮಿಸುತ್ತದೆ.",
  "nav.skip": "ವಿಷಯಕ್ಕೆ ಹೋಗಿ",
  "nav.work": "ಕೆಲಸ",
  "nav.disciplines": "ಕ್ಷೇತ್ರಗಳು",
  "nav.process": "ಪ್ರಕ್ರಿಯೆ",
  "nav.about": "ಪರಿಚಯ",
  "nav.contact": "ಸಂಪರ್ಕ",
  "nav.cta": "ಯೋಜನೆ ಆರಂಭಿಸಿ",
  "nav.menu": "ಮೆನು",
  "nav.close": "ಮೆನು ಮುಚ್ಚಿ",
  "nav.language": "ಭಾಷೆ",
  "nav.theme": "ಥೀಮ್",
  "theme.dark": "ಗಾಢ",
  "theme.light": "ತಿಳಿ",
  "theme.system": "ಸಿಸ್ಟಮ್",
  "sound.on": "ಧ್ವನಿ ಆನ್",
  "sound.off": "ಧ್ವನಿ ಆಫ್",
  "hero.title": "ಸಾಧ್ಯತೆಗಳ ವಾಸ್ತುಶಿಲ್ಪ.",
  "hero.lead":
    "TATVA ಆಲೋಚನೆಗಳನ್ನು ಅರ್ಥಪೂರ್ಣ ರಚನೆಗಳು, ಬುದ್ಧಿವಂತ ವ್ಯವಸ್ಥೆಗಳು ಮತ್ತು ತಲ್ಲೀನಗೊಳಿಸುವ ಅನುಭವಗಳಾಗಿ ಪರಿವರ್ತಿಸುತ್ತದೆ.",
  "hero.cta.primary": "ನಮ್ಮ ವಿಶ್ವವನ್ನು ಅನ್ವೇಷಿಸಿ",
  "hero.cta.secondary": "ನಾವು ಏನು ನಿರ್ಮಿಸುತ್ತೇವೆ",
  "hero.scroll": "ಟೆಸೆರಾಕ್ಟ್ ಒಳಗೆ ಹೋಗಲು ಸ್ಕ್ರಾಲ್ ಮಾಡಿ",
  "hero.emblem.alt": "TATVA ಟೆಸೆರಾಕ್ಟ್: ಆರು ಬಿಂದುಗಳ ಷಡ್ಭುಜ ಚೌಕಟ್ಟಿನೊಳಗೆ ಮಧ್ಯದ ಘನ.",
  "meaning.label": "ಅರ್ಥ",
  "meaning.essence": "ಪ್ರತಿಯೊಂದು ಸೃಷ್ಟಿಯ ಹಿಂದಿನ ಮೂಲ ಸತ್ವ.",
  "meaning.chain.1": "ಆಲೋಚನೆ",
  "meaning.chain.2": "ರಚನೆ",
  "meaning.chain.3": "ವ್ಯವಸ್ಥೆ",
  "meaning.chain.4": "ಅನುಭವ",
  "meaning.chain.5": "ಸಾಧ್ಯತೆ",
  "disc.eyebrow": "ಕ್ಷೇತ್ರಗಳು",
  "disc.title": "ವಿಭಿನ್ನ ಆಯಾಮಗಳು. ಒಂದೇ ಸಂಪರ್ಕಿತ ದೃಷ್ಟಿ.",
  "disc.intro":
    "TATVA ಲಾಂಛನದ ಪ್ರತಿಯೊಂದು ಬಿಂದುವೂ ಒಂದು ಕ್ಷೇತ್ರವನ್ನು ಸೂಚಿಸುತ್ತದೆ. ಮಧ್ಯದ ಘನವು ಅವೆಲ್ಲವೂ ಸೇವೆ ಸಲ್ಲಿಸುವ ಆಲೋಚನೆ.",
  "disc.0.title": "ಡಿಜಿಟಲ್ ಉತ್ಪನ್ನಗಳು ಮತ್ತು ಸಾಫ್ಟ್‌ವೇರ್",
  "disc.0.body": "SaaS ವೇದಿಕೆಗಳು, ವ್ಯಾಪಾರ ನಿರ್ವಹಣಾ ವ್ಯವಸ್ಥೆಗಳು ಮತ್ತು ಕಸ್ಟಮ್ ಸಾಫ್ಟ್‌ವೇರ್.",
  "disc.1.title": "ಬುದ್ಧಿವಂತ ವ್ಯವಸ್ಥೆಗಳು ಮತ್ತು ಸ್ವಯಂಚಾಲನೆ",
  "disc.1.body": "ಪುನರಾವರ್ತಿತ ಕೆಲಸವನ್ನು ತೆಗೆದುಹಾಕುವ ಸ್ವಯಂಚಾಲಿತ ಕಾರ್ಯಪ್ರವಾಹಗಳು, ಸಂಯೋಜನೆಗಳು ಮತ್ತು ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ಗಳು.",
  "disc.2.title": "ವ್ಯಾಪಾರ ವ್ಯವಸ್ಥೆಗಳು ಮತ್ತು ಉದ್ಯಮ ಪರಿಹಾರಗಳು",
  "disc.2.body": "ವಾಹನ ಸಮೂಹ, ಕೃಷಿ, ದಾಸ್ತಾನು ಮತ್ತು ಲೆಕ್ಕಪತ್ರಕ್ಕಾಗಿ ಉದ್ಯಮ ಸಾಫ್ಟ್‌ವೇರ್.",
  "disc.3.title": "ವಾಸ್ತುಶಿಲ್ಪ ಮತ್ತು ಸ್ಥಳ ವಿನ್ಯಾಸ",
  "disc.3.body": "ಕಟ್ಟಡ ಪರಿಕಲ್ಪನೆಗಳು, ಸ್ಥಳ ಯೋಜನೆ ಮತ್ತು ನಿರ್ಮಾಣಕ್ಕೆ ಸಿದ್ಧವಾದ ವಿನ್ಯಾಸ.",
  "disc.4.title": "3D, ಅನಿಮೇಷನ್ ಮತ್ತು ದೃಶ್ಯೀಕರಣ",
  "disc.4.body": "ನಿರ್ಮಿಸುವ ಮೊದಲೇ ಆಲೋಚನೆಯನ್ನು ಕಾಣುವಂತೆ ಮಾಡುವ ಮಾದರಿಗಳು, ರೆಂಡರ್‌ಗಳು ಮತ್ತು ಚಲನೆ.",
  "disc.5.title": "ಬ್ರ್ಯಾಂಡ್ ಮತ್ತು ಸೃಜನಾತ್ಮಕ ಸಂವಹನ",
  "disc.5.body": "ವ್ಯಾಪಾರ ಏನು ಮಾಡುತ್ತದೆ ಎಂದು ಸ್ಪಷ್ಟವಾಗಿ ಹೇಳುವ ಗುರುತುಗಳು, ವೆಬ್‌ಸೈಟ್‌ಗಳು ಮತ್ತು ಪ್ರಚಾರಗಳು.",
};

const hi: Partial<Record<UIKey, string>> = {
  "meta.title": "TATVA | संभावनाओं की वास्तुकला — सॉफ़्टवेयर, सिस्टम्स और डिज़ाइन",
  "meta.description":
    "TATVA SaaS प्रोडक्ट्स, बिज़नेस सिस्टम्स, ऑटोमेशन, आर्किटेक्चरल डिज़ाइन और 3D विज़ुअलाइज़ेशन बनाता है।",
  "nav.skip": "सामग्री पर जाएँ",
  "nav.work": "काम",
  "nav.disciplines": "विधाएँ",
  "nav.process": "प्रक्रिया",
  "nav.about": "परिचय",
  "nav.contact": "संपर्क",
  "nav.cta": "प्रोजेक्ट शुरू करें",
  "nav.menu": "मेनू",
  "nav.close": "मेनू बंद करें",
  "nav.language": "भाषा",
  "nav.theme": "थीम",
  "theme.dark": "डार्क",
  "theme.light": "लाइट",
  "theme.system": "सिस्टम",
  "sound.on": "आवाज़ चालू",
  "sound.off": "आवाज़ बंद",
  "hero.title": "संभावनाओं की वास्तुकला।",
  "hero.lead": "TATVA विचारों को सार्थक संरचनाओं, इंटेलिजेंट सिस्टम्स और तल्लीन कर देने वाले अनुभवों में बदलता है।",
  "hero.cta.primary": "हमारा ब्रह्मांड देखें",
  "hero.cta.secondary": "देखें हम क्या बनाते हैं",
  "hero.scroll": "टेसेरैक्ट के भीतर जाने के लिए स्क्रॉल करें",
  "hero.emblem.alt": "TATVA टेसेरैक्ट: छह बिंदुओं वाले षट्कोण ढाँचे के भीतर बीच का घन।",
  "meaning.label": "अर्थ",
  "meaning.essence": "हर रचना के पीछे का मूल सार।",
  "meaning.chain.1": "विचार",
  "meaning.chain.2": "संरचना",
  "meaning.chain.3": "सिस्टम",
  "meaning.chain.4": "अनुभव",
  "meaning.chain.5": "संभावना",
  "disc.eyebrow": "विधाएँ",
  "disc.title": "अलग-अलग आयाम। एक जुड़ी हुई दृष्टि।",
  "disc.intro": "TATVA प्रतीक का हर बिंदु एक विधा है। बीच का घन वह विचार है जिसकी सेवा वे सब करते हैं।",
  "disc.0.title": "डिजिटल प्रोडक्ट्स और सॉफ़्टवेयर",
  "disc.0.body": "SaaS प्लेटफ़ॉर्म, बिज़नेस मैनेजमेंट सिस्टम और कस्टम सॉफ़्टवेयर।",
  "disc.1.title": "इंटेलिजेंट सिस्टम्स और ऑटोमेशन",
  "disc.1.body": "दोहराव वाला काम हटाने वाले ऑटोमेटेड वर्कफ़्लो, इंटीग्रेशन और डैशबोर्ड।",
  "disc.2.title": "बिज़नेस सिस्टम्स और इंडस्ट्री सॉल्यूशंस",
  "disc.2.body": "फ़्लीट, फ़ार्म, इन्वेंटरी और अकाउंट्स के लिए इंडस्ट्री सॉफ़्टवेयर।",
  "disc.3.title": "आर्किटेक्चर और स्पेस डिज़ाइन",
  "disc.3.body": "भवन अवधारणाएँ, स्पेस प्लानिंग और निर्माण के लिए तैयार डिज़ाइन।",
  "disc.4.title": "3D, एनिमेशन और विज़ुअलाइज़ेशन",
  "disc.4.body": "मॉडल, रेंडर और मोशन जो किसी विचार को बनने से पहले दिखा देते हैं।",
  "disc.5.title": "ब्रांड और क्रिएटिव कम्युनिकेशन",
  "disc.5.body": "पहचान, वेबसाइट और अभियान जो साफ़ बताते हैं कि बिज़नेस क्या करता है।",
};

const strings: Record<Locale, Partial<Record<UIKey, string>>> = { en, kn, hi };

/** Returns a translator for one locale; falls back to English for missing keys. */
export function useTranslations(locale: Locale) {
  return (key: UIKey): string => strings[locale][key] ?? en[key];
}

/** Path for the same page in another locale. English has no prefix. */
export function localizePath(path: string, locale: Locale): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return locale === defaultLocale ? clean : `/${locale}${clean === "/" ? "/" : clean}`;
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}
