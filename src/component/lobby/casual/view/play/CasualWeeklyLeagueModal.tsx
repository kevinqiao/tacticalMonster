import { ModalProp } from "host/service/ModalManager";
import { useUserManager } from "host/service/UserManager";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { useCasualPlatform } from "../../service/useCasualPlatformManager";
import { leaderboardDisplayName } from "../leaderboards/casualLeaderboardsMock";
import { casualLadderTierLabel } from "./casualSeasonLadderLabels";
import "./casualWeeklyLeagueModal.css";

export type CasualWeeklyLeagueModalData = Record<string, never>;

type CohortRow = {
  uid: string;
  weeklyLeagueXp: number;
  rank: number;
  isBot?: boolean;
  rowState?: "active" | "matching";
};

function rowLabel(uid: string, selfUid: string | undefined): string {
  if (selfUid && uid === selfUid) return "我";
  return leaderboardDisplayName(uid);
}

const CasualWeeklyLeagueModal: React.FC<ModalProp> = ({ visible, close }) => {
  const casual = useCasualPlatform();
  const { user } = useUserManager();
  const snap = casual.weeklyLeagueSnapshot;
  const selfUid = user?.uid ?? casual.casualPlayer?.uid;

  const [rows, setRows] = useState<CohortRow[]>([]);
  const [matching, setMatching] = useState({ total: 0, bots: 0, humans: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!casual.convexUrl) {
      setRows([]);
      setMatching({ total: 0, bots: 0, humans: 0 });
      setError("未配置休闲服");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await casual.ensureWeeklyLeagueMember();
      const res = await casual.fetchWeeklyLeagueCohort();
      setRows(Array.isArray(res.members) ? res.members : []);
      setMatching(res.matching ?? { total: 0, bots: 0, humans: 0 });
    } catch {
      setError("加载失败");
      setRows([]);
      setMatching({ total: 0, bots: 0, humans: 0 });
    } finally {
      setLoading(false);
    }
  }, [casual.convexUrl, casual.ensureWeeklyLeagueMember, casual.fetchWeeklyLeagueCohort]);

  useEffect(() => {
    if (!visible) return;
    void load();
  }, [visible, load]);

  const tierLabel = useMemo(
    () => casualLadderTierLabel(snap?.leagueTierId ?? "bronze"),
    [snap?.leagueTierId]
  );

  const matchingNote = useMemo(() => {
    if (matching.total <= 0) return null;
    const parts: string[] = [];
    if (matching.humans > 0) parts.push(`玩家 ${matching.humans}`);
    if (matching.bots > 0) parts.push(`对手 ${matching.bots}`);
    return parts.length > 0 ? `匹配中 · ${parts.join(" · ")}` : `匹配中 · ${matching.total}`;
  }, [matching]);

  if (!visible) return null;

  return (
    <div className="casual-weekly-league">
      <header className="casual-weekly-league__head">
        <div>
          <h1 className="casual-weekly-league__title">周联赛</h1>
          <p className="casual-weekly-league__sub">
            {tierLabel} · 当周 XP {snap?.weeklyLeagueXp ?? 0}
            {snap && snap.cohortRank > 0 ? ` · 排名 ${snap.cohortRank}/${snap.cohortSize}` : ""}
          </p>
        </div>
        <button type="button" className="casual-weekly-league__close" onClick={close} aria-label="关闭">
          关闭
        </button>
      </header>

      {snap?.peakLeagueTier ? (
        <p className="casual-weekly-league__peak">
          历史最高：{casualLadderTierLabel(snap.peakLeagueTier)}
        </p>
      ) : null}

      {error ? <p className="casual-weekly-league__note casual-weekly-league__note--err">{error}</p> : null}

      {loading ? (
        <p className="casual-weekly-league__loading">加载中…</p>
      ) : (
        <>
          <ul className="casual-weekly-league__list" aria-label="周联赛 cohort">
            {rows.map((r) => {
              const self = Boolean(selfUid && r.uid === selfUid);
              return (
                <li
                  key={`${r.rank}-${r.uid}`}
                  className={`casual-weekly-league__row${self ? " casual-weekly-league__row--self" : ""}${r.isBot ? " casual-weekly-league__row--bot" : ""}`}
                >
                  <span className="casual-weekly-league__rank">{r.rank}</span>
                  <span className="casual-weekly-league__name">{rowLabel(r.uid, selfUid)}</span>
                  <span className="casual-weekly-league__xp">{r.weeklyLeagueXp.toLocaleString()}</span>
                </li>
              );
            })}
          </ul>
          {matchingNote ? (
            <p className="casual-weekly-league__matching">{matchingNote}</p>
          ) : null}
        </>
      )}
    </div>
  );
};

export default CasualWeeklyLeagueModal;
