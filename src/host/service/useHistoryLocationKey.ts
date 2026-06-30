import { useEffect, useState } from "react";

function locationKey(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.pathname}${window.location.search}`;
}

/** Re-render when SPA navigation updates the URL (history.replaceState / pushState). */
export function useHistoryLocationKey(): string {
  const [key, setKey] = useState(locationKey);

  useEffect(() => {
    const notify = () => setKey(locationKey());

    window.addEventListener("popstate", notify);
    window.addEventListener("hashchange", notify);

    const replaceState = history.replaceState.bind(history);
    const pushState = history.pushState.bind(history);

    history.replaceState = (...args) => {
      replaceState(...args);
      notify();
    };
    history.pushState = (...args) => {
      pushState(...args);
      notify();
    };

    return () => {
      window.removeEventListener("popstate", notify);
      window.removeEventListener("hashchange", notify);
      history.replaceState = replaceState;
      history.pushState = pushState;
    };
  }, []);

  return key;
}
