/** 异步 run 同桌会话 id（由 matchId 推导，不落库） */
export function canonicalCasualRunSessionExternalId(matchId: string): string {
  return `casual_sess:${matchId}`;
}
