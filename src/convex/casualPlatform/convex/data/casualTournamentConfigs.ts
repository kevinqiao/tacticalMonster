/** 静态示例配置；后续可改为 DB + admin 配表 */

export const DEFAULT_CASUAL_TOURNAMENT_ID = "casual_demo_async_v1";

export function getDefaultCasualTournaments(): Array<{
  tournamentId: string;
  title: string;
  gameId: string;
  matchType: string;
  status: string;
}> {
  return [
    {
      tournamentId: DEFAULT_CASUAL_TOURNAMENT_ID,
      title: "Demo PVE Async",
      gameId: "block_blast",
      matchType: "tournament_a",
      status: "open",
    },
  ];
}
