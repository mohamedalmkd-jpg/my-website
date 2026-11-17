"use client";

import { easings } from "@react-spring/web";

import { RobotText } from "@/components/common/robot-text";
import { Spring } from "@/components/common/robot-spring";
import type { StudioLink } from "@/data/mocks/home";

export interface HeroProps {
  kicker: string;
  title: string;
  lead: string;
  primary: StudioLink;
  secondary: StudioLink;
}

const EASE = { duration: 1100, easing: easings.easeOutQuart };

/** First screen: line-by-line headline, then the lead and the two actions rise in. */
export const Hero = ({ kicker, title, lead, primary, secondary }: HeroProps) => (
  <section
    aria-labelledby="hero-title"
    className="relative flex min-h-svh w-full flex-col justify-end px-4 pb-16 pt-32 md:px-10 md:pb-24"
  >
    <Spring
      tag="p"
      from={{ opacity: 0, y: 16 }}
      to={{ opacity: 1, y: 0 }}
      config={EASE}
      className="mb-6 text-sm uppercase tracking-[0.2em] text-accent-soft"
    >
      {kicker}
    </Spring>

    <RobotText
      tag="h1"
      id="hero-title"
      className="max-w-[90rem] text-left justify-start text-5xl font-light leading-display tracking-tight md:text-display"
      wordIn={{ y: "0%", opacity: 1 }}
      wordOut={{ y: "110%", opacity: 0 }}
      wordStagger={70}
      wordConfig={EASE}
      delayIn={150}
      mode="once"
      overflow
    >
      {title}
    </RobotText>

    <Spring
      tag="footer"
      from={{ opacity: 0, y: 24 }}
      to={{ opacity: 1, y: 0 }}
      config={EASE}
      delayIn={650}
      className="mt-10 flex flex-col gap-8 md:flex-row md:items-end md:justify-between"
    >
      <p className="max-w-[40rem] text-lg leading-relaxed text-muted md:text-lead">{lead}</p>
      <div className="flex flex-wrap gap-3">
        <a
          href={primary.href}
          className="rounded-full bg-accent px-7 py-4 font-medium text-foreground transition-opacity duration-[var(--duration-fast)] ease-entrance hover:opacity-85 focus-visible:opacity-85"
        >
          {primary.label}
        </a>
        <a
          href={secondary.href}
          className="rounded-full border border-line px-7 py-4 font-medium text-foreground transition-colors duration-[var(--duration-fast)] ease-entrance hover:border-accent-soft focus-visible:border-accent-soft"
        >
          {secondary.label}
        </a>
      </div>
    </Spring>
  </section>
);
