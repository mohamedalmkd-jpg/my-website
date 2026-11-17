"use client";

import { easings } from "@react-spring/web";
import { useRef } from "react";

import { SpringTrigger } from "@/components/animation/springs/spring-trigger";
import { Inview } from "@/components/common/robot-inview";
import { RobotText } from "@/components/common/robot-text";
import type { StudioStep } from "@/data/mocks/home";

export interface ProcessProps {
  id: string;
  title: string;
  steps: readonly StudioStep[];
}

const RISE = { duration: 900, easing: easings.easeOutQuart };

/** Four steps on a rail that fills with the scroll. */
export const Process = ({ id, title, steps }: ProcessProps) => {
  const rail = useRef<HTMLOListElement>(null);
  return (
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
      <div className="relative pl-8 md:pl-16">
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-px bg-line" />
        <SpringTrigger
          tag="span"
          mode="scrub"
          trigger={rail as React.RefObject<HTMLElement>}
          start="top center"
          end="bottom center"
          from={{ scaleY: 0 }}
          to={{ scaleY: 1 }}
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-px"
          innerTag="span"
          innerClassName="block h-full w-full origin-top bg-accent"
        />
        <ol ref={rail} className="grid gap-16 md:gap-24">
          {steps.map((step) => (
            <Inview
              key={step.index}
              tag="li"
              mode="once"
              from={{ opacity: 0, x: 40 }}
              to={{ opacity: 1, x: 0 }}
              config={RISE}
              className="grid gap-3 md:grid-cols-[8rem_1fr_2fr] md:items-baseline md:gap-10"
            >
              <span className="text-sm tracking-[0.2em] text-accent-soft">{step.index}</span>
              <h3 className="text-3xl font-medium leading-display md:text-5xl">{step.title}</h3>
              <p className="leading-relaxed text-muted md:text-lg">{step.text}</p>
            </Inview>
          ))}
        </ol>
      </div>
    </section>
  );
};
