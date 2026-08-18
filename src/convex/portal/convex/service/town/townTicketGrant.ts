import { townPlayScopeKey } from "../../data/portalPlayContext";

export const TOWN_TICKET_GRANT_V1_AMOUNT = 1000;
export const TOWN_TICKET_GRANT_V1_REASON = "town_ticket_grant_v1";

export const TOWN_COIN_GRANT_V1_AMOUNT = 3000;
export const TOWN_COIN_GRANT_V1_REASON = "town_coin_grant_v1";

export function isTownPlayScopeKey(scopeKey: string): boolean {
  return scopeKey.startsWith("town:") && scopeKey.length > "town:".length;
}

export function collectTownTicketGrantTargets(args: {
  wallets: { uid: string; scopeKey: string }[];
  progress: { uid: string; townId: string }[];
}): { uid: string; scopeKey: string }[] {
  const map = new Map<string, { uid: string; scopeKey: string }>();
  for (const wallet of args.wallets) {
    if (!isTownPlayScopeKey(wallet.scopeKey)) continue;
    map.set(`${wallet.uid}\0${wallet.scopeKey}`, {
      uid: wallet.uid,
      scopeKey: wallet.scopeKey,
    });
  }
  for (const row of args.progress) {
    const scopeKey = townPlayScopeKey(row.townId);
    if (!isTownPlayScopeKey(scopeKey)) continue;
    map.set(`${row.uid}\0${scopeKey}`, { uid: row.uid, scopeKey });
  }
  return [...map.values()];
}
