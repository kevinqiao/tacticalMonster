/**
 * tcgArena v1 占位。真实战斗与卡册合成不在本切片。
 */
export const TCG_ARENA_PLACEHOLDER = {
  arenaId: "tcgArena" as const,
  ready: false,
  reason: "v1 placeholder",
};

export function previewTcgSeed(_seedId: string) {
  return { placeholder: true as const, gameType: "tcg" as const };
}
