import { useCallback, useEffect, useState } from "react";

export type TownViewMode = "hall" | "scene";
export type TownViewPreference = "auto" | TownViewMode;

const STORAGE_KEY = "town.viewPreference";
const MOBILE_MQ = "(max-width: 767px)";

function readPreference(): TownViewPreference {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw === "hall" || raw === "scene" || raw === "auto") return raw;
  } catch {
    /* ignore */
  }
  return "auto";
}

function resolveMode(preference: TownViewPreference, mobile: boolean): TownViewMode {
  if (preference === "hall") return "hall";
  if (preference === "scene") return "scene";
  return mobile ? "hall" : "scene";
}

export function useTownViewMode() {
  const [preference, setPreferenceState] = useState<TownViewPreference>(() => readPreference());
  const [mobile, setMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(MOBILE_MQ).matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const mode = resolveMode(preference, mobile);

  const setPreference = useCallback((next: TownViewPreference) => {
    setPreferenceState(next);
    try {
      sessionStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleMode = useCallback(() => {
    setPreference(mode === "hall" ? "scene" : "hall");
  }, [mode, setPreference]);

  return { mode, preference, mobile, setPreference, toggleMode };
}
