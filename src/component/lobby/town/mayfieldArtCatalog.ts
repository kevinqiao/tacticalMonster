/** Saloon Row / Mayfield art paths (public/assets, independent of casual). */

const BASE = `${import.meta.env.BASE_URL}assets/saloon-row/mayfield`;

export const MAYFIELD_ART = {
  mapD0: `${BASE}/mayfield_d0_map.png`,
  player: `${BASE}/mayfield_player.png`,
  aspectRatio: 16 / 9,
} as const;
