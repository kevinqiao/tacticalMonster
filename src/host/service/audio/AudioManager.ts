import { Howl, Howler } from "howler";
import { AUDIO_CATALOG, type AudioChannel, type AudioClipDef } from "./audioCatalog";
import { loadAudioPrefs, saveAudioPrefs, type AudioPrefs } from "./audioPrefs";

function assetUrl(rel: string): string {
  const base = import.meta.env.BASE_URL || "/";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const path = rel.replace(/^\//, "");
  return `${normalizedBase}${path}`;
}

class AudioManagerImpl {
  private prefs: AudioPrefs = loadAudioPrefs();
  private unlocked = false;
  private ducked = false;
  private howls = new Map<string, Howl>();
  private lastPlayAt = new Map<string, number>();
  private prefListeners = new Set<(p: AudioPrefs) => void>();

  getPrefs(): AudioPrefs {
    return { ...this.prefs };
  }

  subscribePrefs(listener: (p: AudioPrefs) => void): () => void {
    this.prefListeners.add(listener);
    return () => this.prefListeners.delete(listener);
  }

  private emitPrefs(): void {
    const snap = this.getPrefs();
    for (const l of this.prefListeners) l(snap);
  }

  private persist(next: AudioPrefs): void {
    this.prefs = next;
    saveAudioPrefs(next);
    this.applyMuteState();
    this.emitPrefs();
  }

  setMuted(muted: boolean): void {
    this.persist({ ...this.prefs, muted });
  }

  toggleMuted(): boolean {
    const next = !this.prefs.muted;
    this.setMuted(next);
    return next;
  }

  setChannelVolume(channel: AudioChannel, volume: number): void {
    const v = Math.min(1, Math.max(0, volume));
    if (channel === "sfx") this.persist({ ...this.prefs, sfxVolume: v });
    else if (channel === "ui") this.persist({ ...this.prefs, uiVolume: v });
    else this.persist({ ...this.prefs, bgmVolume: v });
  }

  /** Call from a user gesture so mobile browsers allow playback. */
  unlock(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    try {
      Howler.ctx?.resume?.();
    } catch {
      /* ignore */
    }
    this.applyMuteState();
  }

  isUnlocked(): boolean {
    return this.unlocked;
  }

  setDucked(ducked: boolean): void {
    this.ducked = ducked;
    this.applyMuteState();
  }

  private applyMuteState(): void {
    Howler.mute(this.prefs.muted || this.ducked);
  }

  private channelGain(channel: AudioChannel): number {
    if (channel === "sfx") return this.prefs.sfxVolume;
    if (channel === "ui") return this.prefs.uiVolume;
    return this.prefs.bgmVolume;
  }

  private getHowl(id: string, def: AudioClipDef): Howl {
    let h = this.howls.get(id);
    if (h) return h;
    h = new Howl({
      src: [assetUrl(def.src)],
      volume: 1,
      preload: true,
      html5: false,
    });
    this.howls.set(id, h);
    return h;
  }

  preload(ids: string[]): void {
    for (const id of ids) {
      const def = AUDIO_CATALOG[id];
      if (!def) continue;
      this.getHowl(id, def);
    }
  }

  play(id: string): void {
    if (this.prefs.muted || this.ducked) return;
    const def = AUDIO_CATALOG[id];
    if (!def) return;

    const now = performance.now();
    const throttle = def.throttleMs ?? 0;
    if (throttle > 0) {
      const prev = this.lastPlayAt.get(id) ?? 0;
      if (now - prev < throttle) return;
    }
    this.lastPlayAt.set(id, now);

    try {
      if (!this.unlocked) {
        this.unlock();
      }
      const howl = this.getHowl(id, def);
      const vol = (def.volume ?? 1) * this.channelGain(def.channel);
      const rate = def.rate ?? 1;
      const start = () => {
        const soundId = howl.play();
        if (soundId == null) return;
        howl.volume(vol, soundId);
        if (rate !== 1) howl.rate(rate, soundId);
      };
      if (howl.state() === "loaded") {
        start();
      } else {
        howl.once("load", start);
        howl.load();
      }
    } catch (e) {
      console.warn("[audio] play failed", id, e);
    }
  }

  stopAll(): void {
    for (const h of this.howls.values()) {
      h.stop();
    }
  }
}

export const AudioManager = new AudioManagerImpl();
