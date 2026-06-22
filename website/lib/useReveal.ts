"use client";

import { useEffect, useRef } from "react";

// Scroll-reveal hook. The element is fully visible in server HTML; only after
// mount do we add the hidden `.reveal` class, then `.is-revealed` once it scrolls
// into view (then unobserve). A no-JS page is therefore fully visible.
export function useReveal<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // No-op (stay visible) under reduced motion or without IntersectionObserver.
    if (
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ||
      typeof IntersectionObserver === "undefined"
    ) {
      return;
    }

    el.classList.add("reveal");
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            obs.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return ref;
}
