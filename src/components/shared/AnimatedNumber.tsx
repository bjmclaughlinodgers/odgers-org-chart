import { useEffect, useRef, useState } from 'react';

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

interface AnimatedNumberProps {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}

export function AnimatedNumber({
  value,
  format = (n) => String(n),
  duration = 500,
  className,
}: AnimatedNumberProps) {
  const prevRef = useRef(value);
  const rafRef = useRef(0);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    if (from === to) return;

    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      setDisplay(from + (to - from) * eased);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(to);
        prevRef.current = to;
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  // Set prevRef on mount without animation
  useEffect(() => { prevRef.current = value; }, []);

  return <span className={className}>{format(display)}</span>;
}
