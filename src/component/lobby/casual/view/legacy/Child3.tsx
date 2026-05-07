import {
  CASUAL_SEASON_CHALLENGE_BB_TOURNAMENT_ID,
  DEFAULT_CASUAL_TOURNAMENT_ID,
} from "@/convex/casualPlatform/convex/data/casualTournamentConfigs";
import { PageProp } from "host/RenderApp";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { useCasualPlatform } from "../../service/useCasualPlatformManager";
import CasualPageShell from "../shell/CasualPageShell";

type Tab = "tournaments" | "mainLb" | "cLb" | "shop" | "seasonChallenge";

/** PVE 异步锦标赛、榜单、商店、专场（通用骨架） */
const Child3: React.FC<PageProp> = ({ visible }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const casual = useCasualPlatform();
  const [tab, setTab] = useState<Tab>("tournaments");
  const [board, setBoard] = useState<
    Array<{ rank: number; uid: string; score: number; submittedAt?: number }>
  >([]);
  const [mainLb, setMainLb] = useState<Array<{ rank: number; uid: string; points: number }>>([]);
  const [cLb, setCLb] = useState<Array<{ rank: number; uid: string; points: number }>>([]);
  const [note, setNote] = useState<string | null>(null);

  const demoId = DEFAULT_CASUAL_TOURNAMENT_ID;
  const activeSeason = casual.seasons.find((s) => s.active) ?? casual.seasons[0];
  const seasonId =
    casual.passProgress?.seasonId ?? activeSeason?.seasonId ?? "casual_s1";

  const loadBoard = useCallback(async () => {
    const rows = await casual.fetchLeaderboard(demoId, 20);
    setBoard(rows);
  }, [casual, demoId]);

  const loadMainLb = useCallback(async () => {
    const rows = await casual.fetchMainSeasonLeaderboard(seasonId, 30);
    setMainLb(rows);
  }, [casual, seasonId]);

  const loadCLb = useCallback(async () => {
    const rows = await casual.fetchCArenaLeaderboard(seasonId, 30);
    setCLb(rows);
  }, [casual, seasonId]);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard, casual.tournaments]);

  useEffect(() => {
    if (tab === "mainLb") void loadMainLb();
    if (tab === "cLb") void loadCLb();
  }, [tab, loadMainLb, loadCLb, casual.seasons]);

  const tabBtn = (id: Tab, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setTab(id)}
      style={{
        padding: "6px 10px",
        borderRadius: 6,
        border: tab === id ? "2px solid #2a6" : "1px solid #ccc",
        background: tab === id ? "#e8f8ef" : "#fff",
        cursor: "pointer",
        fontSize: 13,
      }}
    >
      {label}
    </button>
  );

  return (
    <CasualPageShell title="Play" titleId="casual-tab-play" rootRef={rootRef} visible={visible}>
      {!casual.convexUrl ? (
        <p style={{ margin: 0, opacity: 0.75, fontSize: 14 }}>
          配置 <code style={{ fontSize: 13 }}>VITE_CONVEX_URL_CASUAL</code> 后可使用锦标、商店与榜单接口。
        </p>
      ) : (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {tabBtn("tournaments", "Tournaments")}
            {tabBtn("mainLb", "Main season")}
            {tabBtn("cLb", "C arena")}
            {tabBtn("shop", "Shop")}
            {tabBtn("seasonChallenge", "Season challenge")}
          </div>
          {note ? (
            <p style={{ margin: "0 0 8px", fontSize: 13, color: "#1a5f7a" }}>{note}</p>
          ) : null}
          <p style={{ margin: "0 0 12px", opacity: 0.8, fontSize: 14 }}>
            UID: {casual.casualPlayer?.uid ?? "…"}
          </p>

          {tab === "tournaments" && (
            <>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                {casual.tournaments.map((t) => (
                  <button
                    key={t.tournamentId}
                    type="button"
                    onClick={async () => {
                      const r = await casual.joinTournament(t.tournamentId);
                      setNote(r?.ok ? `Joined ${t.matchType}` : `Join: ${(r as { error?: string })?.error ?? "fail"}`);
                      await loadBoard();
                      await casual.refreshCasualPlayer();
                    }}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #cbd6e8",
                      background: "#fff",
                      cursor: "pointer",
                      fontSize: 13,
                    }}
                  >
                    Join · {t.title}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>Leaderboard ({demoId})</h3>
                <button
                  type="button"
                  onClick={() => void loadBoard()}
                  style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #ccc" }}
                >
                  Refresh
                </button>
              </div>
              <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14 }}>
                {board.length === 0 ? (
                  <li style={{ opacity: 0.7 }}>No scores yet</li>
                ) : (
                  board.map((r) => (
                    <li key={`${r.rank}-${r.uid}`}>
                      #{r.rank} {r.uid.slice(0, 8)}… — {r.score}
                    </li>
                  ))
                )}
              </ol>
            </>
          )}

          {tab === "mainLb" && (
            <>
              <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Main season points ({seasonId})</h3>
              <button
                type="button"
                onClick={() => void loadMainLb()}
                style={{ marginBottom: 8, padding: "4px 10px", borderRadius: 6, border: "1px solid #ccc" }}
              >
                Refresh
              </button>
              <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14 }}>
                {mainLb.length === 0 ? (
                  <li style={{ opacity: 0.7 }}>No entries yet</li>
                ) : (
                  mainLb.map((r) => (
                    <li key={`${r.rank}-${r.uid}`}>
                      #{r.rank} {r.uid.slice(0, 8)}… — {r.points} pts
                    </li>
                  ))
                )}
              </ol>
            </>
          )}

          {tab === "cLb" && (
            <>
              <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>C arena only ({seasonId})</h3>
              <button
                type="button"
                onClick={() => void loadCLb()}
                style={{ marginBottom: 8, padding: "4px 10px", borderRadius: 6, border: "1px solid #ccc" }}
              >
                Refresh
              </button>
              <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14 }}>
                {cLb.length === 0 ? (
                  <li style={{ opacity: 0.7 }}>No C runs yet</li>
                ) : (
                  cLb.map((r) => (
                    <li key={`${r.rank}-${r.uid}`}>
                      #{r.rank} {r.uid.slice(0, 8)}… — {r.points} pts
                    </li>
                  ))
                )}
              </ol>
            </>
          )}

          {tab === "shop" && (
            <div style={{ fontSize: 14 }}>
              <p style={{ margin: "0 0 8px", opacity: 0.85 }}>促销不产券；以下为占位 SKU。</p>
              <button
                type="button"
                style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ccc" }}
                onClick={async () => {
                  const r = await casual.purchaseShopSku("shop_coin_tier_1");
                  setNote(r.ok ? "Purchased coin bundle" : `Shop: ${r.error ?? "fail"}`);
                  await casual.refreshCasualPlayer();
                }}
              >
                Buy coin bundle (gems)
              </button>
            </div>
          )}

          {tab === "seasonChallenge" && (
            <div style={{ fontSize: 14 }}>
              <p style={{ margin: "0 0 8px", opacity: 0.85 }}>
                赛季挑战专场：`joinTournament`（`season_challenge`）+ `submitCasualRun`，与挑战点档位同源结算。
              </p>
              <button
                type="button"
                style={{ marginRight: 8, padding: "8px 12px", borderRadius: 8, border: "1px solid #ccc" }}
                onClick={async () => {
                  const r = await casual.joinTournament(CASUAL_SEASON_CHALLENGE_BB_TOURNAMENT_ID);
                  setNote(
                    r?.ok
                      ? `Season challenge joined · vouchers ${r.vouchersCharged ?? "—"}`
                      : `Season challenge: ${(r as { error?: string })?.error ?? "fail"}`
                  );
                  await casual.refreshCasualPlayer();
                }}
              >
                Join season challenge (2 vouchers)
              </button>
              <button
                type="button"
                style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ccc" }}
                onClick={async () => {
                  const r = await casual.redeemSeasonShelfSku("season_challenge_memorial_chest_s1");
                  setNote(r.ok ? "Redeemed memorial shelf" : `Shelf: ${r.error ?? "fail"}`);
                  await casual.refreshCasualPlayer();
                }}
              >
                Redeem memorial shelf (5 vouchers)
              </button>
            </div>
          )}
        </>
      )}
    </CasualPageShell>
  );
};

export default Child3;
