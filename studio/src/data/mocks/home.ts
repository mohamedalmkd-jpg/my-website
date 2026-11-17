/**
 * Copy for the VONUMO Studio home page (`/`). Content lives here, not in the
 * components — they read it through props (hard rule #4).
 */

export interface StudioService {
  index: string;
  title: string;
  text: string;
  tags: readonly string[];
}

export interface StudioStep {
  index: string;
  title: string;
  text: string;
}

export interface StudioLink {
  label: string;
  href: string;
}

export const studioHome = {
  brand: "VONUMO",
  back: { label: "← Zur Website", href: "https://vonumo.vercel.app" } as StudioLink,
  nav: [
    { label: "Leistungen", href: "#leistungen" },
    { label: "Ablauf", href: "#ablauf" },
    { label: "Kontakt", href: "#kontakt" },
  ] as readonly StudioLink[],
  hero: {
    kicker: "VONUMO Studio · Next.js 16",
    title: "Websites, die sich bewegen wie echte Dinge.",
    lead: "Jede Bewegung ist eine Feder, jedes Scrollen bleibt flüssig. Wir bauen Marketing-Seiten, die sich physisch anfühlen — und trotzdem schnell, barrierefrei und auffindbar sind.",
    primary: { label: "Projekt starten", href: "#kontakt" } as StudioLink,
    secondary: { label: "Leistungen ansehen", href: "#leistungen" } as StudioLink,
  },
  marquee: ["Federn", "Scroll", "Typografie", "Tiefe", "Tempo", "Gefühl"] as readonly string[],
  servicesTitle: "Was wir bauen",
  services: [
    {
      index: "01",
      title: "Animierte Landingpages",
      text: "Text, der Zeile für Zeile auftaucht, Sektionen, die beim Scrollen einrasten — jede Bewegung mit Federphysik statt starrer Kurven.",
      tags: ["react-spring", "Text-Engine"],
    },
    {
      index: "02",
      title: "Scroll-Storytelling",
      text: "Lenis-Smooth-Scroll und scroll-gekoppelte Szenen erzählen Ihr Produkt in Kapiteln — auf dem Handy genauso flüssig wie am Desktop.",
      tags: ["Lenis", "Parallax"],
    },
    {
      index: "03",
      title: "Design-System",
      text: "Farben, Typografie und Abstände als Tokens: ein adaptives Raster skaliert das Layout pixelgenau über jede Bildschirmbreite.",
      tags: ["Tailwind v4", "Tokens"],
    },
    {
      index: "04",
      title: "Sichtbar bei Google & KI",
      text: "Server-gerendert, strukturierte Daten, llms.txt und eine Ruhefassung für Crawler — schön für Menschen, lesbar für Maschinen.",
      tags: ["SEO", "AEO"],
    },
  ] as readonly StudioService[],
  processTitle: "So arbeiten wir",
  process: [
    { index: "01", title: "Entdecken", text: "Ziele, Zielgruppe und das eine Gefühl, das Ihre Seite auslösen soll." },
    { index: "02", title: "Gestalten", text: "Layout und Bewegung entstehen zusammen — wir prototypen Federn, nicht Folien." },
    { index: "03", title: "Bauen", text: "Next.js 16, typisiert, Server Components zuerst, jede Animation gemessen." },
    { index: "04", title: "Launchen", text: "Lighthouse ≥ 90, Barrierefreiheit 100, Test auf echten Handys — dann live." },
  ] as readonly StudioStep[],
  contact: {
    kicker: "Kontakt",
    title: "Lassen Sie uns etwas bauen, das man fühlt.",
    cta: { label: "Termin vereinbaren", href: "https://vonumo.vercel.app/termin" } as StudioLink,
    note: "Antwort innerhalb von 24 Stunden.",
  },
  footer: "© VONUMO Studio — gebaut mit dem Textura Next.js-16-Starter.",
};

export type StudioHome = typeof studioHome;
