import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Timestamp-based OTP timer.
 *  - Survives app backgrounding (uses Date.now(), not a counter).
 *  - Re-render every 1s while active.
 *  - `restart()` resets the start timestamp.
 */
export const useOtpTimer = (
  totalSeconds: number,
): {
  remaining: number;
  expired: boolean;
  restart: () => void;
} => {
  const startedAtRef = useRef<number>(Date.now());
  const [, force] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      force(v => v + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
  const remaining = Math.max(0, totalSeconds - elapsed);
  const expired = remaining === 0;

  const restart = useCallback(() => {
    startedAtRef.current = Date.now();
    force(v => v + 1);
  }, []);

  return { remaining, expired, restart };
};

export const formatTimer = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};
