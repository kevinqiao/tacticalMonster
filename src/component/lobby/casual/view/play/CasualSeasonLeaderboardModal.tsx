import { ModalProp } from "host/service/ModalManager";
import { useUserManager } from "host/service/UserManager";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { useCasualPlatform } from "../../service/useCasualPlatformManager";
import { leaderboardDisplayName } from "../leaderboards/casualLeaderboardsMock";
import "./casualSeasonLeaderboardModal.css";

export type CasualSeasonLeaderboardModalData = {
  /** 保留兼容；平台赛季榜不再按玩法分轨 */
  gameId?: "solitaire" | "block_blast";
};

type PtsRow = { rank: number; uid: string; points: number };

function injectSelfUid(rows: PtsRow[], selfUid: string | undefined): PtsRow[] {
  if (!selfUid) return rows;
  return rows.map((r) => (r.uid === "lb_self_slot" ? { ...r, uid: selfUid } : r));
}

function rowLabel(uid: string, selfUid: string | undefined): string {
  if (selfUid && uid === selfUid) return "我";
  return leaderboardDisplayName(uid);
}

const CasualSeasonLeaderboardModal: React.FC<ModalProp> = ({ visible, close, data }) => {
  const casual = useCasualPlatform();
  const { user } = useUserManager();
  const payload = data as CasualSeasonLeaderboardModalData | undefined;
  void payload?.gameId;

  const activeSeason = casual.seasons.find((s) => s.active) ?? casual.seasons[0];
  const seasonLabel =
    activeSeason?.seasonId ?? casual.passProgress?.seasonId ?? "当前赛季";

  const [rows, setRows] = useState<PtsRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selfUid = user?.uid ?? casual.casualPlayer?.uid;

  const load = useCallback(async () => {
    if (!casual.convexUrl) {
      setRows([]);
      setError("未配置休闲服");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = (await casual.fetchGameSeasonLeaderboard(undefined, "solitaire", 50)) as PtsRow[];
      setRows(Array.isArray(list) ? list : []);
    } catch {
      setError("加载失败");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [casual.convexUrl, casual.fetchGameSeasonLeaderboard]);

  useEffect(() => {
    if (!visible) return;
    void load();
  }, [visible, load]);

  const displayRows = useMemo(() => injectSelfUid(rows, selfUid), [rows, selfUid]);

  if (!visible) return null;

  const showEmptyHint = !loading && !error && casual.convexUrl && rows.length === 0;

  return (
    <div className="casual-season-lb">
      <header className="casual-season-lb__head">
        <div>
          <h1 className="casual-season-lb__title">赛季竞技榜</h1>
          <p className="casual-season-lb__sub">平台累计积分（全玩法合计）· {seasonLabel}</p>
        </div>
        <button type="button" className="casual-season-lb__close" onClick={close} aria-label="关闭">
          关闭
        </button>
      </header>

      {error ? <p className="casual-season-lb__note casual-season-lb__note--err">{error}</p> : null}
      {showEmptyHint ? (
        <p className="casual-season-lb__hint" role="note">
          暂无上榜记录（当前激活赛季下尚无赛季竞技积分数据）。
        </p>
      ) : null}

      {loading ? (
        <p className="casual-season-lb__loading">加载中…</p>
      ) : (
        <ul className="casual-season-lb__list" aria-label="赛季榜">
          {displayRows.map((r) => {
            const self = Boolean(selfUid && r.uid === selfUid);
            return (
              <li
                key={`${r.rank}-${r.uid}`}
                className={`casual-season-lb__row${self ? " casual-season-lb__row--self" : ""}`}
              >
                <span className="casual-season-lb__rank">{r.rank}</span>
                <span className="casual-season-lb__name">{rowLabel(r.uid, selfUid)}</span>
                <span className="casual-season-lb__pts">{r.points.toLocaleString()}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default CasualSeasonLeaderboardModal;
