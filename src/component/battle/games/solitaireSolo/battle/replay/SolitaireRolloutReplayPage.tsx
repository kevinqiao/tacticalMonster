import { api } from "@/convex/casualPlatform/convex/_generated/api";
import type { RolloutSummary } from "@/convex/solitaireArena/convex/service/seedPool/solitaireRecordedOpTypes";
import { ConvexProvider, ConvexReactClient, useQuery } from "convex/react";
import { ModalProp } from "host/service/ModalManager";
import React, { useMemo, useState } from "react";
import SolitaireRolloutAnimatedPanel from "./SolitaireRolloutAnimatedPanel";

const _casualUrlRaw = import.meta.env.VITE_CONVEX_URL_CASUAL;
const convex_url =
  typeof _casualUrlRaw === "string" && _casualUrlRaw.trim() !== ""
    ? _casualUrlRaw.trim()
    : "https://amicable-alpaca-980.convex.cloud";

const SOLITAIRE_GAME_TYPE = "solitaire" as const;

type TierFilter = "all" | "easy" | "medium" | "hard";

type SeedEntryRow = {
  seedId: string;
  tier: string;
  difficultyScore: number;
  metrics?: { policyVersion?: string };
};

function RolloutListOverlay({
  seedId,
  expanded,
  onToggleExpanded,
  scoreMin,
  scoreMax,
  onScoreMinChange,
  onScoreMaxChange,
  filteredSummaries,
  selectedRolloutIndex,
  onSelectRollout,
  selectedSummary,
}: {
  seedId: string;
  expanded: boolean;
  onToggleExpanded: () => void;
  scoreMin: string;
  scoreMax: string;
  onScoreMinChange: (v: string) => void;
  onScoreMaxChange: (v: string) => void;
  filteredSummaries: RolloutSummary[];
  selectedRolloutIndex: number;
  onSelectRollout: (index: number) => void;
  selectedSummary: RolloutSummary | null;
}) {
  const collapsedLabel = selectedSummary
    ? `#${selectedSummary.rolloutIndex} · score ${selectedSummary.finalScore} · ${selectedSummary.terminalReason}`
    : `#${selectedRolloutIndex}`;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 65,
        pointerEvents: "auto",
        display: "flex",
        flexDirection: "column",
        maxWidth: "calc(100% - 300px)",
      }}
    >
      <button
        type="button"
        onClick={onToggleExpanded}
        aria-expanded={expanded}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "6px 10px",
          border: "none",
          borderBottom: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(20, 22, 32, 0.92)",
          color: "#e8e8ef",
          fontSize: 11,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ opacity: 0.7 }}>{expanded ? "▾" : "▸"}</span>
        <span style={{ fontWeight: 600 }}>Rollouts</span>
        <span style={{ opacity: 0.85, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {seedId} · {collapsedLabel}
        </span>
        <span style={{ marginLeft: "auto", opacity: 0.65, flexShrink: 0 }}>
          {filteredSummaries.length} rows
        </span>
      </button>
      {expanded && (
        <div
          style={{
            background: "rgba(20, 22, 32, 0.94)",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
            maxHeight: "min(38vh, 280px)",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <div
            style={{
              padding: "6px 10px",
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              flexShrink: 0,
            }}
          >
            <label style={{ fontSize: 11 }}>
              min
              <input
                type="number"
                value={scoreMin}
                onChange={(e) => onScoreMinChange(e.target.value)}
                style={{ width: 64, marginLeft: 4, fontSize: 11 }}
              />
            </label>
            <label style={{ fontSize: 11 }}>
              max
              <input
                type="number"
                value={scoreMax}
                onChange={(e) => onScoreMaxChange(e.target.value)}
                style={{ width: 64, marginLeft: 4, fontSize: 11 }}
              />
            </label>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: "auto", fontSize: 11 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ position: "sticky", top: 0, background: "rgba(20, 22, 32, 0.98)" }}>
                  <th style={{ textAlign: "left", padding: 4 }}>#</th>
                  <th style={{ textAlign: "right", padding: 4 }}>score</th>
                  <th style={{ textAlign: "right", padding: 4 }}>moves</th>
                  <th style={{ textAlign: "left", padding: 4 }}>reason</th>
                  <th style={{ textAlign: "right", padding: 4 }}>sec</th>
                </tr>
              </thead>
              <tbody>
                {filteredSummaries.map((s) => (
                  <tr
                    key={s.rolloutIndex}
                    onClick={() => onSelectRollout(s.rolloutIndex)}
                    style={{
                      cursor: "pointer",
                      background:
                        selectedRolloutIndex === s.rolloutIndex
                          ? "rgba(80,120,200,0.25)"
                          : undefined,
                    }}
                  >
                    <td style={{ padding: 4 }}>{s.rolloutIndex}</td>
                    <td style={{ padding: 4, textAlign: "right" }}>{s.finalScore}</td>
                    <td style={{ padding: 4, textAlign: "right" }}>{s.moves}</td>
                    <td style={{ padding: 4 }}>{s.terminalReason}</td>
                    <td style={{ padding: 4, textAlign: "right" }}>
                      {Math.round(s.elapsedSimSeconds)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const SolitaireRolloutReplayInner: React.FC<ModalProp> = ({ visible, close }) => {
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [accumulatedEntries, setAccumulatedEntries] = useState<SeedEntryRow[]>([]);
  const [selectedSeedId, setSelectedSeedId] = useState<string | null>(null);
  const [selectedRolloutIndex, setSelectedRolloutIndex] = useState(0);
  const [scoreMin, setScoreMin] = useState("");
  const [scoreMax, setScoreMax] = useState("");
  const [rolloutListExpanded, setRolloutListExpanded] = useState(false);

  const poolMeta = useQuery(api.service.seedPool.seedPoolDevQueries.getActivePoolMetaDev, {
    gameType: SOLITAIRE_GAME_TYPE,
  });

  const tierArg = tierFilter === "all" ? undefined : tierFilter;
  const page = useQuery(api.service.seedPool.seedPoolDevQueries.listPoolSeedEntriesDev, {
    gameType: SOLITAIRE_GAME_TYPE,
    tier: tierArg,
    cursor,
    limit: 50,
  });

  React.useEffect(() => {
    if (!page?.entries) return;
    if (!cursor) {
      setAccumulatedEntries(page.entries);
      return;
    }
    setAccumulatedEntries((prev) => {
      const seen = new Set(prev.map((e) => e.seedId));
      const next = [...prev];
      for (const e of page.entries) {
        if (!seen.has(e.seedId)) next.push(e);
      }
      return next;
    });
  }, [page, cursor]);

  React.useEffect(() => {
    setCursor(undefined);
    setAccumulatedEntries([]);
    setSelectedSeedId(null);
  }, [tierFilter]);

  React.useEffect(() => {
    setRolloutListExpanded(false);
  }, [selectedSeedId]);

  const summaries = useQuery(
    api.service.seedPool.seedPoolDevQueries.listRolloutSummariesDev,
    selectedSeedId
      ? { gameType: SOLITAIRE_GAME_TYPE, seedId: selectedSeedId }
      : "skip"
  );

  const filteredSummaries = useMemo(() => {
    if (!summaries) return [];
    const min = scoreMin.trim() ? Number(scoreMin) : undefined;
    const max = scoreMax.trim() ? Number(scoreMax) : undefined;
    return summaries.filter((s) => {
      if (min != null && !Number.isNaN(min) && s.finalScore < min) return false;
      if (max != null && !Number.isNaN(max) && s.finalScore > max) return false;
      return true;
    });
  }, [summaries, scoreMin, scoreMax]);

  const selectedSummary = useMemo(
    () => filteredSummaries.find((s) => s.rolloutIndex === selectedRolloutIndex) ?? null,
    [filteredSummaries, selectedRolloutIndex]
  );

  const selectedPoolPolicyVersion = useMemo(() => {
    if (!selectedSeedId) return null;
    const entry = accumulatedEntries.find((e) => e.seedId === selectedSeedId);
    return entry?.metrics?.policyVersion ?? null;
  }, [accumulatedEntries, selectedSeedId]);

  if (!visible) return null;

  const poolError =
    poolMeta === undefined
      ? null
      : poolMeta === null
        ? "No active seed pool. Run pool:load first."
        : null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        background: "#1a1a22",
        color: "#e8e8ef",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Rollout replay (dev)</div>
          <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>
            {poolMeta
              ? `pool ${poolMeta.poolVersion} · ${poolMeta.entryCount} seeds · ${poolMeta.rolloutCount} rollouts/seed`
              : poolError ?? "Loading pool meta…"}
          </div>
        </div>
        <button type="button" onClick={close} style={{ padding: "6px 12px" }}>
          Close
        </button>
      </header>

      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
        <aside
          style={{
            width: "32%",
            minWidth: 200,
            maxWidth: 280,
            borderRight: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <div style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <label style={{ fontSize: 11, marginRight: 6 }}>Tier</label>
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value as TierFilter)}
              style={{ fontSize: 12 }}
            >
              <option value="all">all</option>
              <option value="easy">easy</option>
              <option value="medium">medium</option>
              <option value="hard">hard</option>
            </select>
          </div>
          <div style={{ flex: 1, overflow: "auto", fontSize: 11 }}>
            {accumulatedEntries.map((e) => (
              <button
                key={e.seedId}
                type="button"
                onClick={() => {
                  setSelectedSeedId(e.seedId);
                  setSelectedRolloutIndex(0);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "6px 10px",
                  border: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  background:
                    selectedSeedId === e.seedId ? "rgba(80,120,200,0.25)" : "transparent",
                  color: "inherit",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 600 }}>{e.seedId}</div>
                <div style={{ opacity: 0.7 }}>
                  {e.tier} · diff {Math.round(e.difficultyScore)}
                </div>
              </button>
            ))}
            {page && !page.isDone && page.continueCursor && (
              <button
                type="button"
                style={{ margin: 8, padding: "4px 10px", fontSize: 11 }}
                onClick={() => setCursor(page.continueCursor)}
              >
                Load more…
              </button>
            )}
          </div>
        </aside>

        <section
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            minWidth: 0,
          }}
        >
          {!selectedSeedId ? (
            <div style={{ padding: 16, opacity: 0.6, fontSize: 13 }}>Select a seed</div>
          ) : (
            <div
              style={{
                position: "relative",
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                <SolitaireRolloutAnimatedPanel
                  seedId={selectedSeedId}
                  rolloutIndex={selectedRolloutIndex}
                  summary={selectedSummary}
                  poolPolicyVersion={selectedPoolPolicyVersion}
                />
              </div>
              <RolloutListOverlay
                seedId={selectedSeedId}
                expanded={rolloutListExpanded}
                onToggleExpanded={() => setRolloutListExpanded((v) => !v)}
                scoreMin={scoreMin}
                scoreMax={scoreMax}
                onScoreMinChange={setScoreMin}
                onScoreMaxChange={setScoreMax}
                filteredSummaries={filteredSummaries}
                selectedRolloutIndex={selectedRolloutIndex}
                onSelectRollout={setSelectedRolloutIndex}
                selectedSummary={selectedSummary}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

const SolitaireRolloutReplayPage: React.FC<ModalProp> = (props) => {
  const client = useMemo(() => new ConvexReactClient(convex_url), []);
  return (
    <ConvexProvider client={client}>
      <SolitaireRolloutReplayInner {...props} />
    </ConvexProvider>
  );
};

export default SolitaireRolloutReplayPage;
