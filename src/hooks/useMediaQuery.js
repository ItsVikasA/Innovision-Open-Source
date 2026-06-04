import { useState, useEffect } from "react";

/**
 * Custom React Hook to detect if a CSS media query matches the client environment.
 * Prevents unnecessary re-renders and handles client-side lifecycle safely.
 *
 * @param {string} query - The CSS media query string (e.g., "(max-width: 768px)")
 * @returns {boolean} - True if the query matches, false otherwise.
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia(query);
    
    // Set initial state
    setMatches(media.matches);

    const listener = (event) => {
      setMatches(event.matches);
    };

    // Use standard addEventListener for modern browsers
    media.addEventListener("change", listener);
    
    return () => {
      media.removeEventListener("change", listener);
    };
  }, [query]);

  return matches;
}
