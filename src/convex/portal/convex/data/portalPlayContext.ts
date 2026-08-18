/** Town play scope keys — minimal slice for portal town wallet isolation. */
export function townPlayScopeKey(townId: string): string {
  return `town:${townId}`;
}
