import { AudioManager } from "./AudioManager";

/** Thin emit API for game/UI code — never import Howler outside AudioManager. */
export const AudioBus = {
  emit(id: string): void {
    AudioManager.play(id);
  },
  preload(ids: string[]): void {
    AudioManager.preload(ids);
  },
  unlock(): void {
    AudioManager.unlock();
  },
  setDucked(ducked: boolean): void {
    AudioManager.setDucked(ducked);
  },
  setMuted(muted: boolean): void {
    AudioManager.setMuted(muted);
  },
  toggleMuted(): boolean {
    return AudioManager.toggleMuted();
  },
  getMuted(): boolean {
    return AudioManager.getPrefs().muted;
  },
  stopAll(): void {
    AudioManager.stopAll();
  },
};
