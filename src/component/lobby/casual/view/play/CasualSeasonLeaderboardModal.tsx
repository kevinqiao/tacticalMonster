import { ModalProp } from "host/service/ModalManager";
import { useUserManager } from "host/service/UserManager";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { useCasualPlatform } from "../../service/useCasualPlatformManager";
import { leaderboardDisplayName } from "../leaderboards/casualLeaderboardsMock";
import "./casualSeasonLeaderboardModal.css";

export type CasualSeasonLeaderboardModalData = {
  /** 保留兼容；周联赛榜不再按玩法分轨 */
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

  const weekLabel = casual.weeklyLeagueSnapshot?.weekKey ?? "本周";

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
      await casual.ensureWeeklyLeagueMember();
      const cohort = await casual.fetchWeeklyLeagueCohort();
      const list = cohort.members.map((m) => ({
        rank: m.rank,
        uid: m.uid,
        points: m.weeklyLeagueXp,
      }));
      setRows(Array.isArray(list) ? list : []);
    } catch {
      setError("加载失败");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [casual]);

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
          <h1 className="casual-season-lb__title">周联赛排名</h1>
          <p className="casual-season-lb__sub">本 cohort · {weekLabel}</p>
        </div>
        <button type="button" className="casual-season-lb__close" onClick={close} aria-label="关闭">
          关闭
        </button>
      </header>

      {loading ? <p className="casual-season-lb__status">加载中…</p> : null}
      {error ? <p className="casual-season-lb__status casual-season-lb__status--err">{error}</p> : null}
      {showEmptyHint ? (
        <p className="casual-season-lb__status">暂无排名数据（需先加入本周周联赛）。</p>
      ) : null}

      <div className="casual-season-lb__list" role="list">
        {displayRows.map((r) => {
          const self = Boolean(selfUid && r.uid === selfUid);
          return (
            <div
              key={`${r.rank}-${r.uid}`}
              className={`casual-season-lb__row${self ? " casual-season-lb__row--self" : ""}`}
              role="listitem"
            >
              <span className="casual-season-lb__rank">{r.rank}</span>
              <span className="casual-season-lb__name">{rowLabel(r.uid, selfUid)}</span>
              <span className="casual-season-lb__pts">{r.points.toLocaleString()} XP</span>
            </div>
          );
        })}
      </div>

      {casual.convexUrl ? (
        <button type="button" className="casual-season-lb__refresh" onClick={() => void load()}>
          刷新
        </button>
      ) : null}
    </div>
  );
};

export default CasualSeasonLeaderboardModal;
