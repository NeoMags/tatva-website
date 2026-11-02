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
  "meta.title": "TATVA | Technology, SaaS Products & Business Solutions",
  "meta.description":
    "TATVA builds SaaS products, business management systems, intelligent automation and immersive digital experiences. Consult, Build, Automate, Scale.",

  "nav.skip": "Skip to content",
  "nav.work": "Work",
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

  "hero.eyebrow": "TATVA — Technology & Business Solutions",
  "hero.title.1": "Ideas are everywhere.",
  "hero.title.2": "Execution makes the difference.",
  "hero.lead":
    "TATVA turns business challenges into digital products, intelligent systems and compelling experiences.",
  "hero.body":
    "From understanding the problem to designing, developing and delivering the solution — business thinking, technology and creativity, together.",
  "hero.cta.primary": "Explore our work",
  "hero.cta.secondary": "Start a conversation",
  "hero.scroll": "Scroll to see the elements combine",
  "hero.sculpture.alt":
    "Four geometric solids — a cube, an icosahedron, a tetrahedron and an octahedron — joined by fine lines into one structure.",

  "pillars.eyebrow": "The four elements of TATVA",
  "pillars.title": "Different disciplines. One integrated approach.",
  "pillars.consult": "Consult",
  "pillars.consult.native": "",
  "pillars.consult.body": "Understand the business, identify the problem and plan the solution.",
  "pillars.build": "Build",
  "pillars.build.native": "",
  "pillars.build.body": "Design and develop software, products, brands and digital experiences.",
  "pillars.automate": "Automate",
  "pillars.automate.native": "",
  "pillars.automate.body": "Connect systems, simplify processes and remove repetitive work.",
  "pillars.scale": "Scale",
  "pillars.scale.native": "",
  "pillars.scale.body": "Improve operations, expand capabilities and enable growth.",
  "pillars.element.consult": "Earth · Cube",
  "pillars.element.build": "Water · Icosahedron",
  "pillars.element.automate": "Fire · Tetrahedron",
  "pillars.element.scale": "Air · Octahedron",
  "pillars.akasha": "Space — the fifth element — is what connects them: the system.",
} as const;

export type UIKey = keyof typeof en;

const kn: Partial<Record<UIKey, string>> = {
  "meta.title": "TATVA | ತಂತ್ರಜ್ಞಾನ, SaaS ಉತ್ಪನ್ನಗಳು ಮತ್ತು ವ್ಯಾಪಾರ ಪರಿಹಾರಗಳು",
  "meta.description":
    "TATVA SaaS ಉತ್ಪನ್ನಗಳು, ವ್ಯಾಪಾರ ನಿರ್ವಹಣಾ ವ್ಯವಸ್ಥೆಗಳು, ಸ್ವಯಂಚಾಲನೆ ಮತ್ತು ಡಿಜಿಟಲ್ ಅನುಭವಗಳನ್ನು ನಿರ್ಮಿಸುತ್ತದೆ.",
  "nav.skip": "ವಿಷಯಕ್ಕೆ ಹೋಗಿ",
  "nav.work": "ಕೆಲಸ",
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
  "hero.eyebrow": "TATVA — ತಂತ್ರಜ್ಞಾನ ಮತ್ತು ವ್ಯಾಪಾರ ಪರಿಹಾರಗಳು",
  "hero.title.1": "ಆಲೋಚನೆಗಳು ಎಲ್ಲೆಡೆ ಇವೆ.",
  "hero.title.2": "ಕಾರ್ಯರೂಪಕ್ಕೆ ತರುವುದೇ ವ್ಯತ್ಯಾಸ.",
  "hero.lead":
    "TATVA ವ್ಯಾಪಾರದ ಸವಾಲುಗಳನ್ನು ಡಿಜಿಟಲ್ ಉತ್ಪನ್ನಗಳು, ಬುದ್ಧಿವಂತ ವ್ಯವಸ್ಥೆಗಳು ಮತ್ತು ಆಕರ್ಷಕ ಅನುಭವಗಳಾಗಿ ಪರಿವರ್ತಿಸುತ್ತದೆ.",
  "hero.body":
    "ಸಮಸ್ಯೆಯನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳುವುದರಿಂದ ಹಿಡಿದು ಪರಿಹಾರವನ್ನು ವಿನ್ಯಾಸಗೊಳಿಸಿ, ಅಭಿವೃದ್ಧಿಪಡಿಸಿ ತಲುಪಿಸುವವರೆಗೆ — ವ್ಯಾಪಾರ ಚಿಂತನೆ, ತಂತ್ರಜ್ಞಾನ ಮತ್ತು ಸೃಜನಶೀಲತೆ ಒಟ್ಟಿಗೆ.",
  "hero.cta.primary": "ನಮ್ಮ ಕೆಲಸ ನೋಡಿ",
  "hero.cta.secondary": "ಸಂಭಾಷಣೆ ಆರಂಭಿಸಿ",
  "hero.scroll": "ಅಂಶಗಳು ಒಂದಾಗುವುದನ್ನು ನೋಡಲು ಸ್ಕ್ರಾಲ್ ಮಾಡಿ",
  "hero.sculpture.alt":
    "ನಾಲ್ಕು ಜ್ಯಾಮಿತೀಯ ಘನಾಕೃತಿಗಳು ಸೂಕ್ಷ್ಮ ರೇಖೆಗಳಿಂದ ಒಂದೇ ರಚನೆಯಾಗಿ ಜೋಡಣೆಯಾಗಿವೆ.",
  "pillars.eyebrow": "TATVA ದ ನಾಲ್ಕು ಅಂಶಗಳು",
  "pillars.title": "ವಿವಿಧ ಕ್ಷೇತ್ರಗಳು. ಒಂದೇ ಸಮಗ್ರ ವಿಧಾನ.",
  "pillars.consult.native": "ಸಲಹೆ",
  "pillars.consult.body": "ವ್ಯಾಪಾರವನ್ನು ಅರ್ಥಮಾಡಿಕೊಂಡು, ಸಮಸ್ಯೆಯನ್ನು ಗುರುತಿಸಿ, ಪರಿಹಾರವನ್ನು ಯೋಜಿಸುವುದು.",
  "pillars.build.native": "ನಿರ್ಮಾಣ",
  "pillars.build.body": "ಸಾಫ್ಟ್‌ವೇರ್, ಉತ್ಪನ್ನಗಳು, ಬ್ರ್ಯಾಂಡ್‌ಗಳು ಮತ್ತು ಡಿಜಿಟಲ್ ಅನುಭವಗಳ ವಿನ್ಯಾಸ ಮತ್ತು ಅಭಿವೃದ್ಧಿ.",
  "pillars.automate.native": "ಸ್ವಯಂಚಾಲನೆ",
  "pillars.automate.body": "ವ್ಯವಸ್ಥೆಗಳನ್ನು ಜೋಡಿಸಿ, ಪ್ರಕ್ರಿಯೆಗಳನ್ನು ಸರಳಗೊಳಿಸಿ, ಪುನರಾವರ್ತಿತ ಕೆಲಸವನ್ನು ತೆಗೆದುಹಾಕುವುದು.",
  "pillars.scale.native": "ವಿಸ್ತರಣೆ",
  "pillars.scale.body": "ಕಾರ್ಯಾಚರಣೆಗಳನ್ನು ಸುಧಾರಿಸಿ, ಸಾಮರ್ಥ್ಯ ಹೆಚ್ಚಿಸಿ, ಬೆಳವಣಿಗೆಗೆ ದಾರಿ ಮಾಡುವುದು.",
  "pillars.element.consult": "ಪೃಥ್ವಿ · ಘನ",
  "pillars.element.build": "ಜಲ · ವಿಂಶತಿಫಲಕ",
  "pillars.element.automate": "ಅಗ್ನಿ · ಚತುಷ್ಫಲಕ",
  "pillars.element.scale": "ವಾಯು · ಅಷ್ಟಫಲಕ",
  "pillars.akasha": "ಐದನೆಯ ಅಂಶವಾದ ಆಕಾಶವೇ ಇವನ್ನು ಜೋಡಿಸುತ್ತದೆ: ಅದೇ ವ್ಯವಸ್ಥೆ.",
};

const hi: Partial<Record<UIKey, string>> = {
  "meta.title": "TATVA | टेक्नोलॉजी, SaaS प्रोडक्ट्स और बिज़नेस सॉल्यूशंस",
  "meta.description":
    "TATVA SaaS प्रोडक्ट्स, बिज़नेस मैनेजमेंट सिस्टम, ऑटोमेशन और डिजिटल अनुभव बनाता है।",
  "nav.skip": "सामग्री पर जाएँ",
  "nav.work": "काम",
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
  "hero.eyebrow": "TATVA — टेक्नोलॉजी और बिज़नेस सॉल्यूशंस",
  "hero.title.1": "विचार हर जगह हैं।",
  "hero.title.2": "फ़र्क़ अमल से पड़ता है।",
  "hero.lead":
    "TATVA व्यावसायिक चुनौतियों को डिजिटल प्रोडक्ट्स, इंटेलिजेंट सिस्टम्स और प्रभावशाली अनुभवों में बदलता है।",
  "hero.body":
    "समस्या को समझने से लेकर समाधान को डिज़ाइन, विकसित और डिलीवर करने तक — बिज़नेस सोच, टेक्नोलॉजी और रचनात्मकता, एक साथ।",
  "hero.cta.primary": "हमारा काम देखें",
  "hero.cta.secondary": "बातचीत शुरू करें",
  "hero.scroll": "तत्वों को जुड़ते देखने के लिए स्क्रॉल करें",
  "hero.sculpture.alt": "चार ज्यामितीय ठोस आकृतियाँ बारीक रेखाओं से जुड़कर एक संरचना बनाती हैं।",
  "pillars.eyebrow": "TATVA के चार तत्व",
  "pillars.title": "अलग-अलग विधाएँ। एक समग्र दृष्टिकोण।",
  "pillars.consult.native": "परामर्श",
  "pillars.consult.body": "बिज़नेस को समझना, समस्या पहचानना और समाधान की योजना बनाना।",
  "pillars.build.native": "निर्माण",
  "pillars.build.body": "सॉफ़्टवेयर, प्रोडक्ट्स, ब्रांड और डिजिटल अनुभवों का डिज़ाइन और विकास।",
  "pillars.automate.native": "स्वचालन",
  "pillars.automate.body": "सिस्टम्स को जोड़ना, प्रक्रियाओं को सरल बनाना और दोहराव वाला काम हटाना।",
  "pillars.scale.native": "विस्तार",
  "pillars.scale.body": "संचालन सुधारना, क्षमताएँ बढ़ाना और विकास को संभव बनाना।",
  "pillars.element.consult": "पृथ्वी · घन",
  "pillars.element.build": "जल · विंशफलक",
  "pillars.element.automate": "अग्नि · चतुष्फलक",
  "pillars.element.scale": "वायु · अष्टफलक",
  "pillars.akasha": "पाँचवाँ तत्व, आकाश, इन्हें जोड़ता है: यही सिस्टम है।",
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
