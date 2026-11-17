import { RobotProvider, RobotView } from "@/components/common/robot-view";
import { Contact } from "@/components/home/contact";
import { Hero } from "@/components/home/hero";
import { Marquee } from "@/components/home/marquee";
import { Process } from "@/components/home/process";
import { Services } from "@/components/home/services";
import { studioHome as c } from "@/data/mocks/home";

/**
 * Home view — VONUMO Studio landing page. A Server Component: the header and
 * footer are static markup, every animated section is a client leaf in
 * `src/components/home/` (hard rule #7). Copy lives in `src/data/mocks/home.ts`.
 *
 * `robot` is the robot form (obsidian/frontend/robot-form.md): `app/robot-view`
 * renders `<HomeView robot />` for crawlers and lab tools, routed there by the
 * proxy. Same content — skip the intro, the cursor and the live 3D (a still
 * instead), and import first-screen springs from `robot-spring` / `robot-text`
 * so the served HTML is at rest. Never read `headers()` here: `/` must stay
 * static.
 */
export const HomeView = ({ robot = false }: { robot?: boolean }) => {
  return (
    <RobotProvider robot={robot}>
      {robot && <RobotView />}
      <header className="fixed inset-x-0 top-0 z-10 flex items-center justify-between gap-4 px-4 py-5 md:px-10">
        <a href={c.back.href} className="font-medium tracking-[0.2em] text-foreground">
          {c.brand}
          <span className="ml-3 text-sm tracking-normal text-muted">{c.back.label}</span>
        </a>
        <nav aria-label="Seitenbereiche" className="hidden gap-8 md:flex">
          {c.nav.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-muted transition-colors duration-[var(--duration-fast)] ease-entrance hover:text-foreground focus-visible:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </header>
      <main className="w-full bg-background font-sans text-foreground">
        <Hero {...c.hero} />
        <Marquee words={c.marquee} />
        <Services id="leistungen" title={c.servicesTitle} items={c.services} />
        <Process id="ablauf" title={c.processTitle} steps={c.process} />
        <Contact id="kontakt" {...c.contact} />
      </main>
      <footer className="w-full border-t border-line px-4 py-8 text-sm text-muted md:px-10">
        {c.footer}
      </footer>
    </RobotProvider>
  );
};
