/** Arena proxy：将 portal/casual ingest 的 tableSummary 映射为客户端 UI 形（含再战字段）。 */

export type CasualTableSummaryClientRow = {
  rank: number;
  score?: number;
  rowState?: "scored" | "playing" | "matching";
  revealAt?: number;
  displayLabel: string;
  isYou: boolean;
  isBot?: boolean;
};

export type CasualTableSummaryClient = {
  maxPlayers: number;
  rows: CasualTableSummaryClientRow[];
  isBoardStable?: boolean;
  replayOffered?: boolean;
  replayMode?: "ad" | "token";
  replayTokenCount?: number;
  canReplay?: boolean;
  adReplayDailyRemaining?: number;
  replayWindowEndsAt?: number;
};

function replayFieldsFromParsed(o: Record<string, unknown>): Partial<CasualTableSummaryClient> {
  const out: Partial<CasualTableSummaryClient> = {};
  if (typeof o.replayOffered === "boolean") out.replayOffered = o.replayOffered;
  if (o.replayMode === "ad" || o.replayMode === "token") out.replayMode = o.replayMode;
  if (typeof o.replayTokenCount === "number") out.replayTokenCount = o.replayTokenCount;
  if (typeof o.canReplay === "boolean") out.canReplay = o.canReplay;
  if (typeof o.adReplayDailyRemaining === "number") {
    out.adReplayDailyRemaining = o.adReplayDailyRemaining;
  }
  if (typeof o.replayWindowEndsAt === "number" && Number.isFinite(o.replayWindowEndsAt)) {
    out.replayWindowEndsAt = o.replayWindowEndsAt;
  }
  return out;
}

export function casualTableSummaryFromParsed(v: unknown): CasualTableSummaryClient | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  if (typeof o.maxPlayers !== "number" || !Array.isArray(o.rows)) return undefined;
  const rows: CasualTableSummaryClientRow[] = [];
  for (const item of o.rows) {
    if (!item || typeof item !== "object") return undefined;
    const r = item as Record<string, unknown>;
    if (typeof r.rank !== "number" || typeof r.displayLabel !== "string" || typeof r.isYou !== "boolean") {
      return undefined;
    }
    if (r.rowState === "matching") {
      rows.push({
        rank: r.rank,
        rowState: "matching",
        displayLabel: r.displayLabel,
        isYou: r.isYou,
        ...(r.isBot === true ? { isBot: true as const } : {}),
      });
      continue;
    }
    const rowState =
      r.rowState === "playing" || r.rowState === "scored" ? r.rowState : undefined;
    if (rowState === "playing") {
      rows.push({
        rank: r.rank,
        rowState: "playing",
        displayLabel: r.displayLabel,
        isYou: r.isYou,
        ...(typeof r.revealAt === "number" ? { revealAt: r.revealAt } : {}),
        ...(r.isBot === true ? { isBot: true as const } : {}),
      });
      continue;
    }
    if (typeof r.score !== "number") return undefined;
    rows.push({
      rank: r.rank,
      score: r.score,
      rowState: rowState ?? "scored",
      displayLabel: r.displayLabel,
      isYou: r.isYou,
      ...(typeof r.revealAt === "number" ? { revealAt: r.revealAt } : {}),
      ...(r.isBot === true ? { isBot: true as const } : {}),
    });
  }
  if (rows.length === 0) return undefined;
  return {
    maxPlayers: o.maxPlayers,
    rows,
    ...(typeof o.isBoardStable === "boolean" ? { isBoardStable: o.isBoardStable } : {}),
    ...replayFieldsFromParsed(o),
  };
}
