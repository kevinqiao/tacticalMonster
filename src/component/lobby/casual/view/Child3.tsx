import { DEFAULT_CASUAL_TOURNAMENT_ID } from "@/convex/casualPlatform/convex/data/casualTournamentConfigs";
import { useFooterNavIsDesktop } from "component/lobby/tactical/control/footer/FooterNavIsDesktop";
import { PageProp } from "host/RenderApp";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { useCasualPlatformOptional } from "../service/useCasualPlatformManager";
import "../style.css";
import { useCasualLobbySlideChildSwipe } from "./useCasualLobbySlideChildSwipe";

/** PVE 异步锦标赛：列表、报名、榜单 */
const Child3: React.FC<PageProp> = ({ visible }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const isDesktop = useFooterNavIsDesktop();
  useCasualLobbySlideChildSwipe(rootRef, { enabled: !isDesktop });
  const casual = useCasualPlatformOptional();
  const [board, setBoard] = useState<
    Array<{ rank: number; uid: string; score: number; submittedAt?: number }>
  >([]);
  const demoId = DEFAULT_CASUAL_TOURNAMENT_ID;

  const loadBoard = useCallback(async () => {
    if (!casual?.fetchLeaderboard) return;
    const rows = await casual.fetchLeaderboard(demoId, 20);
    setBoard(rows);
  }, [casual]);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard, casual?.tournaments]);

  return (
    <div ref={rootRef} style={{ width: "100%", height: "100%" }}>
      {!casual?.convexUrl ? (
        <div className="casual-lobby-child" style={{ opacity: visible > 0 ? 1 : 0 }}>
          <h2 style={{ margin: "0 0 8px" }}>Tournaments</h2>
          <p style={{ margin: 0, opacity: 0.75 }}>
            Set <code style={{ fontSize: 13 }}>VITE_CONVEX_URL_CASUAL</code> for tournament API.
          </p>
        </div>
      ) : (
        <div className="casual-lobby-child" style={{ opacity: visible > 0 ? 1 : 0 }}>
          <h2 style={{ margin: "0 0 8px" }}>Tournaments</h2>
          <p style={{ margin: "0 0 12px", opacity: 0.8, fontSize: 14 }}>
            Player: {casual.casualPlayer?.uid ?? "…"} · coins {casual.casualPlayer?.coins ?? "—"}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {casual.tournaments.map((t) => (
              <button
                key={t.tournamentId}
                type="button"
                onClick={async () => {
                  await casual.joinTournament(t.tournamentId);
                  await loadBoard();
                  await casual.refreshCasualPlayer();
                }}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid #cbd6e8",
                  background: "#fff",
                  cursor: "pointer",
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
        </div>
      )}
    </div>
  );
};

export default Child3;
