const STORAGE_KEY = "tm.audio.prefs.v1";

export type AudioPrefs = {
  muted: boolean;
  sfxVolume: number;
  uiVolume: number;
  bgmVolume: number;
};

const DEFAULT_PREFS: AudioPrefs = {
  muted: false,
  sfxVolume: 0.65,
  uiVolume: 0.55,
  bgmVolume: 0.4,
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

export function loadAudioPrefs(): AudioPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<AudioPrefs>;
    return {
      muted: Boolean(parsed.muted),
      sfxVolume: clamp01(parsed.sfxVolume ?? DEFAULT_PREFS.sfxVolume),
      uiVolume: clamp01(parsed.uiVolume ?? DEFAULT_PREFS.uiVolume),
      bgmVolume: clamp01(parsed.bgmVolume ?? DEFAULT_PREFS.bgmVolume),
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function saveAudioPrefs(prefs: AudioPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore quota / private mode */
  }
}
