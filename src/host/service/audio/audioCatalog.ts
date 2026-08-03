export type AudioChannel = "sfx" | "ui" | "bgm";

export type AudioClipDef = {
  channel: AudioChannel;
  /** Path under site root (after BASE_URL), e.g. `audio/common/ui_click.ogg` */
  src: string;
  volume?: number;
  /** Ignore repeats within this window (ms). */
  throttleMs?: number;
  rate?: number;
};

/** Semantic event id → clip. Missing files are no-ops at play time. */
export const AUDIO_CATALOG: Record<string, AudioClipDef> = {
  "ui.click.primary": {
    channel: "ui",
    src: "audio/common/ui_click.ogg",
    volume: 0.45,
    throttleMs: 40,
  },
  "ui.modal.open": {
    channel: "ui",
    src: "audio/common/ui_modal_open.ogg",
    volume: 0.5,
    throttleMs: 120,
  },
  "ui.modal.close": {
    channel: "ui",
    src: "audio/common/ui_modal_close.ogg",
    volume: 0.45,
    throttleMs: 120,
  },
  "meta.shop.purchase.success": {
    channel: "ui",
    src: "audio/common/meta_purchase_ok.ogg",
    volume: 0.6,
  },
  "meta.ad.reward": {
    channel: "ui",
    src: "audio/common/meta_reward.ogg",
    volume: 0.65,
  },
  "game.solitaire.deal.opening": {
    channel: "sfx",
    src: "audio/solitaire/deal_opening.ogg",
    volume: 0.55,
  },
  "game.solitaire.draw": {
    channel: "sfx",
    src: "audio/solitaire/draw.ogg",
    volume: 0.5,
    throttleMs: 50,
  },
  "game.solitaire.move": {
    channel: "sfx",
    src: "audio/solitaire/move.ogg",
    volume: 0.5,
    throttleMs: 40,
  },
  "game.solitaire.move.foundation": {
    channel: "sfx",
    src: "audio/solitaire/move_foundation.ogg",
    volume: 0.55,
    throttleMs: 40,
  },
  "game.solitaire.flip": {
    channel: "sfx",
    src: "audio/solitaire/flip.ogg",
    volume: 0.45,
    throttleMs: 40,
  },
  "game.solitaire.recycle": {
    channel: "sfx",
    src: "audio/solitaire/recycle.ogg",
    /** Quieter + slight rate-up so ticks track ~0.32s flights without drowning the pile */
    volume: 0.36,
    rate: 1.2,
    /** ≈ 1.5× recycle stagger — flutter follows motion without one-shot-at-t0 feel */
    throttleMs: 42,
  },
  "game.solitaire.drag_cancel": {
    channel: "sfx",
    src: "audio/solitaire/drag_cancel.ogg",
    volume: 0.4,
    throttleMs: 80,
  },
  "game.solitaire.win": {
    channel: "sfx",
    src: "audio/solitaire/win.ogg",
    volume: 0.95,
  },
  "game.solitaire.lose": {
    channel: "sfx",
    src: "audio/solitaire/lose.ogg",
    volume: 0.55,
  },
  "game.solitaire.score_delta": {
    channel: "sfx",
    src: "audio/solitaire/score_delta.ogg",
    volume: 0.35,
    throttleMs: 90,
  },
  "game.blockblast.place": {
    channel: "sfx",
    src: "audio/blockblast/place.ogg",
    volume: 0.5,
    throttleMs: 40,
  },
  "game.blockblast.clear": {
    channel: "sfx",
    src: "audio/blockblast/clear.ogg",
    volume: 0.6,
    throttleMs: 40,
  },
  "game.blockblast.drag_cancel": {
    channel: "sfx",
    src: "audio/blockblast/drag_cancel.ogg",
    volume: 0.4,
    throttleMs: 80,
  },
  "game.blockblast.game_over": {
    channel: "sfx",
    src: "audio/blockblast/game_over.ogg",
    volume: 0.55,
  },
  "game.match3.swap": {
    channel: "sfx",
    src: "audio/match3/swap.ogg",
    volume: 0.45,
    throttleMs: 40,
  },
  "game.match3.clear": {
    channel: "sfx",
    src: "audio/match3/clear.ogg",
    volume: 0.55,
    throttleMs: 50,
  },
  "game.match3.fall": {
    channel: "sfx",
    src: "audio/match3/fall.ogg",
    volume: 0.35,
    throttleMs: 60,
  },
  "game.match3.spawn": {
    channel: "sfx",
    src: "audio/match3/spawn.ogg",
    volume: 0.4,
    throttleMs: 60,
  },
};

export const SOLITAIRE_AUDIO_BANK = Object.keys(AUDIO_CATALOG).filter((id) =>
  id.startsWith("game.solitaire.")
);

export const BLOCKBLAST_AUDIO_BANK = Object.keys(AUDIO_CATALOG).filter((id) =>
  id.startsWith("game.blockblast.")
);

export const MATCH3_AUDIO_BANK = Object.keys(AUDIO_CATALOG).filter((id) =>
  id.startsWith("game.match3.")
);

export const COMMON_UI_AUDIO_BANK = [
  "ui.click.primary",
  "ui.modal.open",
  "ui.modal.close",
  "meta.shop.purchase.success",
  "meta.ad.reward",
];
