import { useEffect, useState } from "react";

/**
 * Returns a debounced copy of `value` that only updates after
 * `delay` ms of silence. Use it to throttle expensive operations
 * (API calls, heavy in-memory filtering) that run on every keystroke.
 *
 * @param {*}      value - The raw value to debounce.
 * @param {number} delay - Milliseconds to wait (default 300).
 */
export function useDebounce(value, delay = 600) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
