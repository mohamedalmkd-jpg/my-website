"use client";

import { easings } from "@react-spring/web";

import { Inview } from "@/components/common/robot-inview";
import { RobotText } from "@/components/common/robot-text";
import type { StudioService } from "@/data/mocks/home";

export interface ServicesProps {
  id: string;
  title: string;
  items: readonly StudioService[];
}

const RISE = { duration: 900, easing: easings.easeOutQuart };

/** Four service cards that rise in, one after another, as the grid enters. */
export const Services = ({ id, title, items }: ServicesProps) => (
  <section id={id} aria-labelledby={`${id}-title`} className="w-full px-4 py-24 md:px-10 md:py-40">
    <RobotText
      tag="h2"
      id={`${id}-title`}
      className="mb-12 text-left justify-start text-4xl font-light leading-display md:mb-20 md:text-title"
      lineIn={{ y: "0%", opacity: 1 }}
      lineOut={{ y: "100%", opacity: 0 }}
      lineConfig={RISE}
      mode="once"
      overflow
      lazy
    >
      {title}
    </RobotText>
    <ul className="grid gap-4 md:grid-cols-2 md:gap-6">
      {items.map((item, i) => (
        <Inview
          key={item.index}
          tag="li"
          mode="once"
          from={{ opacity: 0, y: 60 }}
          to={{ opacity: 1, y: 0 }}
          config={RISE}
          delayIn={(i % 2) * 120}
          className="group rounded-card border border-line bg-surface p-8 transition-colors duration-[var(--duration-normal)] ease-entrance hover:border-accent-soft md:p-12"
        >
          <span className="text-sm tracking-[0.2em] text-accent-soft">{item.index}</span>
          <h3 className="mt-6 text-2xl font-medium leading-display md:text-4xl">{item.title}</h3>
          <p className="mt-4 leading-relaxed text-muted md:text-lg">{item.text}</p>
          <p className="mt-8 flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <span key={tag} className="rounded-full border border-line px-3 py-1 text-sm text-muted">
                {tag}
              </span>
            ))}
          </p>
        </Inview>
      ))}
    </ul>
  </section>
);
