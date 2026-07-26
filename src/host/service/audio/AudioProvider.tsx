import React, { createContext, useContext, useEffect, useState } from "react";
import { COMMON_UI_AUDIO_BANK } from "./audioCatalog";
import { AudioBus } from "./AudioBus";
import { AudioManager } from "./AudioManager";
import type { AudioPrefs } from "./audioPrefs";

type AudioContextValue = {
  prefs: AudioPrefs;
  muted: boolean;
  setMuted: (muted: boolean) => void;
  toggleMuted: () => void;
};

const AudioReactContext = createContext<AudioContextValue>({
  prefs: AudioManager.getPrefs(),
  muted: AudioManager.getPrefs().muted,
  setMuted: () => {},
  toggleMuted: () => {},
});

export function useAudio(): AudioContextValue {
  return useContext(AudioReactContext);
}

/**
 * Unlocks WebAudio on first pointer; exposes mute prefs.
 * Ad ducking is driven from rewardedAdOrchestrator via AudioBus.setDucked.
 */
export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [prefs, setPrefs] = useState(() => AudioManager.getPrefs());

  useEffect(() => AudioManager.subscribePrefs(setPrefs), []);

  useEffect(() => {
    const unlock = () => AudioBus.unlock();
    window.addEventListener("pointerdown", unlock, { once: true, capture: true });
    window.addEventListener("keydown", unlock, { once: true, capture: true });
    return () => {
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
    };
  }, []);

  useEffect(() => {
    AudioBus.preload(COMMON_UI_AUDIO_BANK);
  }, []);

  const value: AudioContextValue = {
    prefs,
    muted: prefs.muted,
    setMuted: (muted) => AudioManager.setMuted(muted),
    toggleMuted: () => {
      AudioManager.toggleMuted();
    },
  };

  return (
    <AudioReactContext.Provider value={value}>{children}</AudioReactContext.Provider>
  );
};
