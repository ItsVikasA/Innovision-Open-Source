"use client";
import { useEffect, useRef, useState, useCallback } from "react";

const AnimatedCounter = ({ end, duration = 2000, suffix = "", prefix = "" }) => {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef(null);
  const rafRef = useRef(null);

  const animateCount = useCallback(() => {
    const startTime = performance.now();
    const startValue = 0;

    const updateCount = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);

      const currentCount = Math.floor(startValue + (end - startValue) * easeOut);
      setCount(currentCount);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(updateCount);
      } else {
        setCount(end);
      }
    };

    rafRef.current = requestAnimationFrame(updateCount);
  }, [end, duration]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true);
            animateCount();
          }
        });
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      observer.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [hasAnimated, animateCount]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
};

export default AnimatedCounter;
