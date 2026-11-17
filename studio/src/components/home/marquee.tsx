"use client";

import { SpringTrigger } from "@/components/animation/springs/spring-trigger";

export interface MarqueeProps {
  words: readonly string[];
}

/** A giant word row that slides sideways with the scroll — two rows in opposite directions. */
export const Marquee = ({ words }: MarqueeProps) => {
  const row = words.join(" · ");
  return (
    <section aria-hidden="true" className="w-full overflow-hidden border-y border-line py-10">
      <SpringTrigger
        tag="p"
        mode="scrub"
        from={{ x: "0%" }}
        to={{ x: "-35%" }}
        innerTag="span"
        innerClassName="block whitespace-nowrap"
        className="text-7xl font-light leading-display text-foreground md:text-mega"
      >
        {row} · {row}
      </SpringTrigger>
      <SpringTrigger
        tag="p"
        mode="scrub"
        from={{ x: "-35%" }}
        to={{ x: "0%" }}
        innerTag="span"
        innerClassName="block whitespace-nowrap"
        className="text-7xl font-light italic leading-display text-accent md:text-mega"
      >
        {row} · {row}
      </SpringTrigger>
    </section>
  );
};
