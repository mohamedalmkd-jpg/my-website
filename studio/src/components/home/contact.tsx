"use client";

import { easings } from "@react-spring/web";

import { Inview } from "@/components/common/robot-inview";
import { RobotText } from "@/components/common/robot-text";
import type { StudioLink } from "@/data/mocks/home";

export interface ContactProps {
  id: string;
  kicker: string;
  title: string;
  cta: StudioLink;
  note: string;
}

const RISE = { duration: 1000, easing: easings.easeOutQuart };

/** Closing call to action — the headline letters rise, then the button scales in. */
export const Contact = ({ id, kicker, title, cta, note }: ContactProps) => (
  <section
    id={id}
    aria-labelledby={`${id}-title`}
    className="flex w-full flex-col items-center px-4 py-32 text-center md:px-10 md:py-48"
  >
    <p className="mb-6 text-sm uppercase tracking-[0.2em] text-accent-soft">{kicker}</p>
    <RobotText
      tag="h2"
      id={`${id}-title`}
      className="max-w-[70rem] text-center justify-center text-4xl font-light leading-display md:text-title"
      wordIn={{ y: "0%", opacity: 1 }}
      wordOut={{ y: "110%", opacity: 0 }}
      wordStagger={60}
      wordConfig={RISE}
      mode="once"
      overflow
      lazy
    >
      {title}
    </RobotText>
    <Inview
      tag="p"
      mode="once"
      from={{ opacity: 0, scale: 0.85 }}
      to={{ opacity: 1, scale: 1 }}
      config={RISE}
      delayIn={300}
      className="mt-12"
    >
      <a
        href={cta.href}
        className="inline-block rounded-full bg-accent px-10 py-5 text-lg font-medium text-foreground transition-opacity duration-[var(--duration-fast)] ease-entrance hover:opacity-85 focus-visible:opacity-85"
      >
        {cta.label} →
      </a>
    </Inview>
    <p className="mt-6 text-muted">{note}</p>
  </section>
);
