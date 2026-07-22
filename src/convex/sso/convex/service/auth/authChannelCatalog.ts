export type AuthChannelDef = {
  cid: number;
  provider: string;
  label: string;
};
export const WEB_AUTH_CHANNEL_CID = 0;
export const CLERK_AUTH_CHANNEL_CID = 1;
export const EMBED_AUTH_CHANNEL_CID = 2;
/**
 * Code-defined auth channel catalog (identity cids for UID routing).
 * Partner enablement SoT is `playerAuth` / `staffAuth`, not this list.
 */
export const AUTH_CHANNEL_CATALOG: AuthChannelDef[] = [
  { cid: WEB_AUTH_CHANNEL_CID, provider: "web", label: "Web (accountId / email)" },
  { cid: EMBED_AUTH_CHANNEL_CID, provider: "embed", label: "Partner WebView embed" },
  { cid: CLERK_AUTH_CHANNEL_CID, provider: "clerk", label: "Clerk" },
];

export function getAuthChannelByCid(cid: number): AuthChannelDef | undefined {
  return AUTH_CHANNEL_CATALOG.find((row) => row.cid === cid);
}

export function listAuthChannelCatalog(): Array<{ cid: number; provider: string; label: string }> {
  return AUTH_CHANNEL_CATALOG.map(({ cid, provider, label }) => ({ cid, provider, label }));
}

export function expandAuthChannelIds(
  channelIds: number[]
): Array<{ cid: number; provider: string }> {
  const out: Array<{ cid: number; provider: string }> = [];
  for (const cid of channelIds) {
    const row = getAuthChannelByCid(cid);
    if (row) out.push({ cid: row.cid, provider: row.provider });
  }
  return out;
}
