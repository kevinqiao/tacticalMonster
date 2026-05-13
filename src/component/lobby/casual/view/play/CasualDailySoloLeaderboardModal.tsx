import {
  CASUAL_DAILY_SOLO_CHALLENGE_BLOCK_BLAST_ID,
  CASUAL_DAILY_SOLO_CHALLENGE_SOLITAIRE_ID,
} from "@/convex/casualPlatform/convex/data/casualTournamentConfigs";
import { ModalProp } from "host/service/ModalManager";
import { useUserManager } from "host/service/UserManager";
import React, { useCallback, useEffect, useState } from "react";

import { useCasualPlatform } from "../../service/useCasualPlatformManager";
import "./casualDailySoloLeaderboardModal.css";

export type CasualDailySoloLeaderboardModalData = {
  gameKind: "solitaire" | "block_blast";
};

type LbRow = { rank: number; uid: string; score: number; submittedAt?: number };

function displayUid(uid: string, selfUid: string | undefined): string {
  if (selfUid && uid === selfUid) return "我";
  if (uid.length <= 10) return uid;
  return `${uid.slice(0, 4)}…${uid.slice(-4)}`;
}

const CasualDailySoloLeaderboardModal: React.FC<ModalProp> = ({ visible, close, data }) => {
  const casual = useCasualPlatform();
  const { user } = useUserManager();
  const payload = data as CasualDailySoloLeaderboardModalData | undefined;
  const gameKind = payload?.gameKind === "block_blast" ? "block_blast" : "solitaire";
  const tournamentId =
    gameKind === "solitaire"
      ? CASUAL_DAILY_SOLO_CHALLENGE_SOLITAIRE_ID
      : CASUAL_DAILY_SOLO_CHALLENGE_BLOCK_BLAST_ID;
  const title = gameKind === "solitaire" ? "Solitaire" : "Block Blast";

  const [rows, setRows] = useState<LbRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!casual.convexUrl) {
      setRows([]);
      setError("未配置休闲服");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = (await casual.fetchLeaderboard(tournamentId, 50)) as LbRow[];
      setRows(Array.isArray(list) ? list : []);
    } catch {
      setError("加载失败");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [casual.convexUrl, casual.fetchLeaderboard, tournamentId]);

  useEffect(() => {
    if (!visible) return;
    void load();
  }, [visible, load]);

  if (!visible) return null;

  return (
    <div className="casual-daily-lb">
      <header className="casual-daily-lb__head">
        <div>
          <h1 className="casual-daily-lb__title">{title} · 当日排行榜</h1>
          <p className="casual-daily-lb__sub">日榜最高分（UTC 日周期）</p>
        </div>
        <button type="button" className="casual-daily-lb__close" onClick={close} aria-label="关闭">
          关闭
        </button>
      </header>

      {error ? <p className="casual-daily-lb__note casual-daily-lb__note--err">{error}</p> : null}

      {loading ? (
        <p className="casual-daily-lb__loading">加载中…</p>
      ) : rows.length === 0 ? (
        <p className="casual-daily-lb__empty">暂无上榜记录，完成一局后将显示分数。</p>
      ) : (
        <ul className="casual-daily-lb__list" aria-label="排行榜">
          {rows.map((r) => {
            const mine = Boolean(user?.uid && r.uid === user.uid);
            return (
              <li
                key={`${r.rank}-${r.uid}`}
                className={`casual-daily-lb__row${mine ? " casual-daily-lb__row--self" : ""}`}
              >
                <span className="casual-daily-lb__rank">{r.rank}</span>
                <span className="casual-daily-lb__uid">{displayUid(r.uid, user?.uid)}</span>
                <span className="casual-daily-lb__score">{r.score}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default CasualDailySoloLeaderboardModal;
