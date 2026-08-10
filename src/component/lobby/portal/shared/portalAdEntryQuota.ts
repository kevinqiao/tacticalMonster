/** Finite ad-entry daily caps are 0–100; larger values are the unlimited sentinel. */
export function isFinitePortalAdEntryCap(cap: number): boolean {
  return Number.isFinite(cap) && cap > 0 && cap <= 100;
}
