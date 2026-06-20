import { DEFAULT_CASUAL_TOURNAMENT_ID } from "@/convex/casualPlatform/convex/data/casualTournamentConfigs";
import { PageProp } from "host/RenderApp";
import { useUserManager } from "host/service/UserManager";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useCasualPlatform } from "../../service/useCasualPlatformManager";
import "../shared/casualEconomyPages.css";
import {
  formatSubmittedRelative,
  leaderboardDisplayName,
  MOCK_C_ARENA_LEADERBOARD,
  MOCK_LEADERBOARD_SELF_RANK,
  MOCK_MAIN_SEASON_LEADERBOARD,
  MOCK_TOURNAMENT_LEADERBOARD,
} from "./casualLeaderboardsMock";
import CasualPageShell from "../shell/CasualPageShell";
import {
  CASUAL_LEADERBOARDS_SESSION_TAB_KEY,
  type CasualLeaderboardsNavTab,
} from "./casualLeaderboardNavIntent";

type BoardTab = CasualLeaderboardsNavTab;

type TourRow = { rank: number; uid: string; score: number; submittedAt?: number };
type PtsRow = { rank: number; uid: string; points: number };

function injectSelfUid<T extends { uid: string }>(rows: T[], selfUid: string | undefined): T[] {
  if (!selfUid) return rows;
  return rows.map((r) => (r.uid === "lb_self_slot" ? { ...r, uid: selfUid } : r));
}

function rowLabel(uid: string, selfUid: string | undefined): string {
  if (selfUid && uid === selfUid) return "我";
  return leaderboardDisplayName(uid);
}

/** 排行榜 Tab：三榜切换；无数据 / 离线时用模拟排行卡片 */
const CasualLeaderboardsTab: React.FC<PageProp> = ({ visible }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const casual = useCasualPlatform();
  const { user } = useUserManager();
  const selfUid = user?.uid ?? casual.casualPlayer?.uid;

  const [tab, setTab] = useState<BoardTab>("tournament");
  const [board, setBoard] = useState<TourRow[]>([]);
  const [mainLb, setMainLb] = useState<PtsRow[]>([]);
  const [cLb, setCLb] = useState<PtsRow[]>([]);

  useEffect(() => {
    if (!visible) return;
    try {
      const raw = sessionStorage.getItem(CASUAL_LEADERBOARDS_SESSION_TAB_KEY);
      if (raw === "tournament" || raw === "mainSeason" || raw === "cArena") {
        setTab(raw);
        sessionStorage.removeItem(CASUAL_LEADERBOARDS_SESSION_TAB_KEY);
      }
    } catch {
      /* private mode / quota */
    }
  }, [visible]);

  const demoId = DEFAULT_CASUAL_TOURNAMENT_ID;
  const activeSeason = casual.seasons.find((s) => s.active) ?? casual.seasons[0];
  const seasonId =
    casual.passProgress?.seasonId ?? activeSeason?.seasonId ?? "casual_s1";

  const loadBoard = useCallback(async () => {
    if (!casual.convexUrl) return;
    const rows = await casual.fetchLeaderboard(demoId, 20);
    setBoard(rows);
  }, [casual, demoId]);

  const loadMainLb = useCallback(async () => {
    if (!casual.convexUrl) return;
    await casual.ensureWeeklyLeagueMember();
    const cohort = await casual.fetchWeeklyLeagueCohort();
    setMainLb(
      cohort.members.map((m) => ({
        rank: m.rank,
        uid: m.uid,
        points: m.weeklyLeagueXp,
      }))
    );
  }, [casual]);

  const loadCLb = useCallback(async () => {
    if (!casual.convexUrl) return;
    const rows = await casual.fetchCArenaLeaderboard(seasonId, 30);
    setCLb(rows);
  }, [casual, seasonId]);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard, casual.convexUrl, casual.tournaments]);

  useEffect(() => {
    if (tab === "mainSeason") void loadMainLb();
    if (tab === "cArena") void loadCLb();
  }, [tab, loadMainLb, loadCLb, casual.convexUrl, casual.seasons]);

  const useTournamentMock = !casual.convexUrl || board.length === 0;
  const useMainMock = !casual.convexUrl || mainLb.length === 0;
  const useCMock = !casual.convexUrl || cLb.length === 0;

  const tournamentRows = useMemo(() => {
    const raw = useTournamentMock ? MOCK_TOURNAMENT_LEADERBOARD : board;
    return injectSelfUid(raw, selfUid);
  }, [useTournamentMock, board, selfUid]);

  const mainRows = useMemo(() => {
    const raw = useMainMock ? MOCK_MAIN_SEASON_LEADERBOARD : mainLb;
    return injectSelfUid(raw, selfUid);
  }, [useMainMock, mainLb, selfUid]);

  const cRows = useMemo(() => {
    const raw = useCMock ? MOCK_C_ARENA_LEADERBOARD : cLb;
    return injectSelfUid(raw, selfUid);
  }, [useCMock, cLb, selfUid]);

  const mockBannerTournament = useMemo(() => {
    if (!casual.convexUrl) return "未配置休闲后端：以下为排行榜界面演示数据。";
    if (board.length === 0) return "当前锦标暂无提交成绩：以下为样式演示，真实数据将自动替换。";
    return null;
  }, [casual.convexUrl, board.length]);

  const mockBannerMain = useMemo(() => {
    if (!casual.convexUrl) return "未配置休闲后端：以下为界面演示数据。";
    if (mainLb.length === 0) return "暂无周联赛 cohort 数据：以下为样式演示。";
    return null;
  }, [casual.convexUrl, mainLb.length]);

  const mockBannerC = useMemo(() => {
    if (!casual.convexUrl) return "未配置休闲后端：以下为界面演示数据。";
    if (cLb.length === 0) return "暂无 C 场榜数据：以下为样式演示。";
    return null;
  }, [casual.convexUrl, cLb.length]);

  const tabBtn = (id: BoardTab, label: string) => (
    <button
      key={id}
      type="button"
      className={`casual-lb__tab${tab === id ? " casual-lb__tab--active" : ""}`}
      onClick={() => setTab(id)}
    >
      {label}
    </button>
  );

  const rankMedalClass = (rank: number) => {
    if (rank === 1) return " casual-lb__rank--gold";
    if (rank === 2) return " casual-lb__rank--silver";
    if (rank === 3) return " casual-lb__rank--bronze";
    return "";
  };

  return (
    <CasualPageShell
      title="排行榜"
      titleId="casual-tab-leaderboards"
      rootRef={rootRef}
      visible={visible}
      showHeader
    >
      <div className="casual-econ">
        <div className="casual-lb__tabs" role="tablist" aria-label="排行榜类型">
          {tabBtn("tournament", "单锦标")}
          {tabBtn("mainSeason", "周联赛")}
          {tabBtn("cArena", "C 场")}
        </div>

        {tab === "tournament" && (
          <section className="casual-lb__panel" aria-labelledby="casual-lb-tour-title">
            {mockBannerTournament ? (
              <div className="casual-econ__mockBanner" role="note">
                {mockBannerTournament}
              </div>
            ) : null}
            <div className="casual-lb__panelHead">
              <h2 id="casual-lb-tour-title" className="casual-econ__sectionTitle" style={{ margin: 0 }}>
                锦标榜 · {demoId}
              </h2>
              {casual.convexUrl ? (
                <button type="button" className="casual-econ__textBtn" onClick={() => void loadBoard()}>
                  刷新
                </button>
              ) : null}
            </div>
            <p className="casual-econ__sectionHint" style={{ marginTop: 4 }}>
              按单次挑战最高分排名；前三名高亮。演示中第 {MOCK_LEADERBOARD_SELF_RANK} 名为「我」占位。
            </p>
            <div className="casual-lb__list" role="list">
              {tournamentRows.map((r) => {
                const self = Boolean(selfUid && r.uid === selfUid);
                return (
                  <div
                    key={`${r.rank}-${r.uid}`}
                    className={`casual-lb__row${self ? " casual-lb__row--self" : ""}`}
                    role="listitem"
                  >
                    <div className={`casual-lb__rank${rankMedalClass(r.rank)}`}>
                      <span className="casual-lb__rankNum">{r.rank}</span>
                    </div>
                    <div className="casual-lb__mid">
                      <div className="casual-lb__name">{rowLabel(r.uid, selfUid)}</div>
                      {r.submittedAt != null ? (
                        <div className="casual-lb__sub">{formatSubmittedRelative(r.submittedAt)}</div>
                      ) : null}
                    </div>
                    <div className="casual-lb__score">
                      <span className="casual-lb__scoreVal">{r.score.toLocaleString()}</span>
                      <span className="casual-lb__scoreLbl">分</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {tab === "mainSeason" && (
          <section className="casual-lb__panel" aria-labelledby="casual-lb-main-title">
            {mockBannerMain ? (
              <div className="casual-econ__mockBanner" role="note">
                {mockBannerMain}
              </div>
            ) : null}
            <div className="casual-lb__panelHead">
              <h2 id="casual-lb-main-title" className="casual-econ__sectionTitle" style={{ margin: 0 }}>
                周联赛 · 本组排名
              </h2>
              {casual.convexUrl ? (
                <button type="button" className="casual-econ__textBtn" onClick={() => void loadMainLb()}>
                  刷新
                </button>
              ) : null}
            </div>
            <div className="casual-lb__list" role="list">
              {mainRows.map((r) => {
                const self = Boolean(selfUid && r.uid === selfUid);
                return (
                  <div
                    key={`${r.rank}-${r.uid}`}
                    className={`casual-lb__row${self ? " casual-lb__row--self" : ""}`}
                    role="listitem"
                  >
                    <div className={`casual-lb__rank${rankMedalClass(r.rank)}`}>
                      <span className="casual-lb__rankNum">{r.rank}</span>
                    </div>
                    <div className="casual-lb__mid">
                      <div className="casual-lb__name">{rowLabel(r.uid, selfUid)}</div>
                      <div className="casual-lb__sub">本周 League XP</div>
                    </div>
                    <div className="casual-lb__score">
                      <span className="casual-lb__scoreVal">{r.points.toLocaleString()}</span>
                      <span className="casual-lb__scoreLbl">分</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {tab === "cArena" && (
          <section className="casual-lb__panel" aria-labelledby="casual-lb-c-title">
            {mockBannerC ? (
              <div className="casual-econ__mockBanner" role="note">
                {mockBannerC}
              </div>
            ) : null}
            <div className="casual-lb__panelHead">
              <h2 id="casual-lb-c-title" className="casual-econ__sectionTitle" style={{ margin: 0 }}>
                C 场榜 · {seasonId}
              </h2>
              {casual.convexUrl ? (
                <button type="button" className="casual-econ__textBtn" onClick={() => void loadCLb()}>
                  刷新
                </button>
              ) : null}
            </div>
            <div className="casual-lb__list" role="list">
              {cRows.map((r) => {
                const self = Boolean(selfUid && r.uid === selfUid);
                return (
                  <div
                    key={`${r.rank}-${r.uid}`}
                    className={`casual-lb__row${self ? " casual-lb__row--self" : ""}`}
                    role="listitem"
                  >
                    <div className={`casual-lb__rank${rankMedalClass(r.rank)}`}>
                      <span className="casual-lb__rankNum">{r.rank}</span>
                    </div>
                    <div className="casual-lb__mid">
                      <div className="casual-lb__name">{rowLabel(r.uid, selfUid)}</div>
                      <div className="casual-lb__sub">C 场积分</div>
                    </div>
                    <div className="casual-lb__score">
                      <span className="casual-lb__scoreVal">{r.points.toLocaleString()}</span>
                      <span className="casual-lb__scoreLbl">分</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </CasualPageShell>
  );
};

export default CasualLeaderboardsTab;
