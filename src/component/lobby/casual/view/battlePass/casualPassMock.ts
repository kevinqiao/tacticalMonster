export type PassTrack = "free" | "standard" | "deluxe";

/** 本地预览：通行证进度与领取状态（与后端无耦合） */
export interface CasualPassMockState {
  seasonId: string;
  seasonName: string;
  seasonStartsAt: number;
  seasonEndsAt: number;
  level: number;
  xp: number;
  seasonVouchers: number;
  tracksPurchased: { standard: boolean; deluxe: boolean };
  claimed: Array<{ track: PassTrack; level: number }>;
}

export function createInitialPassMock(now = Date.now()): CasualPassMockState {
  const seasonStartsAt = now - 86400000 * 14;
  const seasonEndsAt = now + 86400000 * 76;
  return {
    seasonId: "mock_season_neon_1",
    seasonName: "第 1 赛季 · 霓虹集会",
    seasonStartsAt,
    seasonEndsAt,
    level: 3,
    xp: 2350,
    seasonVouchers: 12,
    tracksPurchased: { standard: true, deluxe: false },
    claimed: [
      { track: "free", level: 1 },
      { track: "standard", level: 1 },
      { track: "free", level: 2 },
    ],
  };
}
