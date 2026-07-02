import React, { useEffect, useRef, useState } from 'react';

interface Props {
  value: number;
  duration?: number; // ms
  suffix?: string;
  prefix?: string;
  className?: string;
  decimals?: number;
}

// Smoothly counts a number from 0 → value with an ease-out curve.
// Re-runs whenever `value` changes.
export function CountUp({ value, duration = 900, suffix = '', prefix = '', className, decimals = 0 }: Props) {
  const [n, setN] = useState(0);
  const start = useRef<number | null>(null);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!Number.isFinite(value)) {
      setN(0);
      return;
    }
    start.current = null;
    if (raf.current) cancelAnimationFrame(raf.current);
    const target = value;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3); // easeOutCubic
    const step = (ts: number) => {
      if (start.current === null) start.current = ts;
      const elapsed = ts - start.current;
      const t = Math.min(1, elapsed / duration);
      setN(target * ease(t));
      if (t < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value, duration]);

  const display = decimals > 0 ? n.toFixed(decimals) : Math.round(n);
  return <span className={className}>{prefix}{display}{suffix}</span>;
}
