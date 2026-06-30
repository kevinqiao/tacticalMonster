import React, { useCallback, useEffect, useMemo, useState } from "react";

import { getPortalTournamentDefinition } from "@/convex/portal/convex/data/portalTournamentConfigs";
import { PageProp } from "host/RenderApp";
import { parsePortalPathFromPathname } from "@/host/util/portalPathParse";
import { useModalManager } from "host/service/ModalManager";
import { useUserManager } from "host/service/UserManager";
import { isPlatformAuthed } from "host/service/platformAuth/platformAccessToken";

import {
  assignmentMatchesAwaitWatch,
  hasAnyOpenCasualRunAssignment,
  modalDataForOpenAssignment,
  type OpenCasualRunAssignment,
} from "../casual/service/casualOpenRunAssignment";
import { isOpenCasualRunExpired } from "../casual/service/casualOpenRunReconcile";
import { joinEntryErrorMessage } from "../casual/view/shared/casualEconomyUi";
import CasualPlayMatchOverlay from "../casual/view/play/CasualPlayMatchOverlay";
import {
  CASUAL_MATCH_OPEN_TIMEOUT_MS,
  type AwaitOpenCasualRunMatchWatch,
  useAwaitOpenCasualRunAssignment,
} from "../casual/service/useAwaitOpenCasualRunAssignment";
import { PortalCenterModal } from "./PortalCenterModal";
import {
  PortalHistoryList,
  PortalWeeklyLeaderboardPanel,
} from "./PortalPanels";
import {
  PortalHistoryReportOverlays,
  usePortalHistoryReport,
} from "./PortalHistoryReportOverlays";
import {
  isValidPortalGameType,
  PortalProvider,
  portalGameDisplayName,
  portalPlayModalForGameType,
  usePortal,
} from "./service/usePortalManager";
import {
  pickPortalOpenAssignmentForMode,
  pickPortalOpenAssignmentsForGameType,
  pickPortalMatchQueueForGameType,
  portalMatchTypeLabel,
} from "./service/portalOpenRunHelpers";
import "./portal.css";

type PortalPanelModal = "soloLb" | "multiLb" | "history" | null;

function formatWeekRemaining(endsAt: number | null): string {
  if (!endsAt) return "";
  const ms = Math.max(0, endsAt - Date.now());
  const h = Math.floor(ms / 3600000);
  const d = Math.floor(h / 24);
  const rh = h % 24;
  if (d > 0) return `本周剩余 ${d} 天 ${rh} 小时`;
  return `本周剩余 ${rh} 小时`;
}

function formatMyStanding(points?: number, rank?: number | null): string {
  if (typeof points !== "number") return "本周暂无积分";
  return `我的本周 ${points} 分${rank ? ` · 第 ${rank} 名` : ""}`;
}

function leaveMatchQueueErrorText(error: string): string {
  if (error === "cannot_leave_claiming") return "正在创建对局，请稍候…";
  if (error === "not_in_queue") return "当前不在匹配队列中。";
  return `退出失败：${error}`;
}

const PortalGamePageInner: React.FC<{ visible: number }> = ({ visible }) => {
  const portal = usePortal();
  const { user, askAuth, cancelAuth, logout } = useUserManager();
  const { openModal } = useModalManager();

  const signIn = useCallback(() => {
    askAuth({});
  }, [askAuth]);
  const signOut = useCallback(() => {
    cancelAuth();
    void logout();
  }, [cancelAuth, logout]);
  const authed = Boolean(isPlatformAuthed(user) && portal.portalSessionReady);
  const [joining, setJoining] = useState<"solo" | "multi" | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [awaitingMatch, setAwaitingMatch] = useState<AwaitOpenCasualRunMatchWatch | null>(null);
  const [leavingMatch, setLeavingMatch] = useState(false);
  const [panelModal, setPanelModal] = useState<PortalPanelModal>(null);
  const historyReport = usePortalHistoryReport();

  /** 含已超时待 reconcile 的 open run，与后端 `already_in_open_match` 语义一致 */
  const openAssignments = useMemo(() => {
    if (!portal.gameType) return [];
    return pickPortalOpenAssignmentsForGameType(
      portal.openRunAssignments,
      portal.gameType
    );
  }, [portal.openRunAssignments, portal.gameType]);

  const soloOpenAssignment = useMemo(() => {
    if (!portal.gameType) return undefined;
    return pickPortalOpenAssignmentForMode(
      portal.openRunAssignments,
      portal.gameType,
      "solo"
    );
  }, [portal.gameType, portal.openRunAssignments]);

  const multiOpenAssignment = useMemo(() => {
    if (!portal.gameType) return undefined;
    return pickPortalOpenAssignmentForMode(
      portal.openRunAssignments,
      portal.gameType,
      "multi"
    );
  }, [portal.gameType, portal.openRunAssignments]);

  const matchQueue = useMemo(() => {
    if (!portal.gameType) return [];
    return pickPortalMatchQueueForGameType(portal.matchQueueEntries, portal.gameType);
  }, [portal.matchQueueEntries, portal.gameType]);

  const queueWaiting = matchQueue.some((e) => e.status === "waiting");
  const queueClaiming = matchQueue.some((e) => e.status === "claiming");
  const primaryQueueEntry = matchQueue[0];
  const primaryQueueTitle = primaryQueueEntry
    ? getPortalTournamentDefinition(primaryQueueEntry.templateId)?.title ??
      primaryQueueEntry.templateId
    : "";

  const hasGlobalOpenRun = hasAnyOpenCasualRunAssignment(portal.openRunAssignments);
  const hasOpenRun = openAssignments.length > 0;
  const matchOverlayOpen =
    awaitingMatch != null || queueWaiting || queueClaiming;
  const soloJoinBlocked =
    matchOverlayOpen || (hasGlobalOpenRun && soloOpenAssignment == null);
  const multiJoinBlocked =
    matchOverlayOpen || (hasGlobalOpenRun && multiOpenAssignment == null);

  const historyCount = openAssignments.length + portal.gameHistory.length;

  const openAssignment = useCallback(
    (hit: OpenCasualRunAssignment) => {
      if (!portal.gameType) return;
      setPanelModal(null);
      openModal({
        name: portalPlayModalForGameType(portal.gameType),
        data: modalDataForOpenAssignment(hit),
      });
    },
    [openModal, portal.gameType]
  );

  useAwaitOpenCasualRunAssignment({
    watch: awaitingMatch,
    enabled: visible !== 0 && awaitingMatch != null,
    timeoutMs: CASUAL_MATCH_OPEN_TIMEOUT_MS + 15_000,
    openRunAssignments: portal.openRunAssignments,
    onMatched: (hit) => {
      setAwaitingMatch(null);
      setNote(null);
      openAssignment(hit);
    },
    onTimeout: () => {
      setAwaitingMatch(null);
      setNote("匹配超时，请稍后重试。");
    },
  });

  useEffect(() => {
    const entry = primaryQueueEntry;
    if (!portal.gameType) return;
    if (entry && (entry.status === "waiting" || entry.status === "claiming")) {
      setAwaitingMatch({
        templateId: entry.templateId,
        gameKind: portal.gameType,
      });
    }
  }, [portal.gameType, primaryQueueEntry?.templateId, primaryQueueEntry?.status]);

  useEffect(() => {
    if (visible === 0 || panelModal !== "history") return;
    void portal.reconcilePendingHistorySettlements();
  }, [visible, panelModal, portal.reconcilePendingHistorySettlements]);

  useEffect(() => {
    if (user?.uid || panelModal !== "history") return;
    setPanelModal(null);
  }, [user?.uid, panelModal]);

  useEffect(() => {
    if (!awaitingMatch || !portal.gameType) return;
    const hit = portal.openRunAssignments.find((a) =>
      assignmentMatchesAwaitWatch(a, awaitingMatch)
    );
    if (!hit) return;
    setAwaitingMatch(null);
    setNote(null);
    openAssignment(hit);
  }, [awaitingMatch, portal.gameType, portal.openRunAssignments, openAssignment]);

  const handleLeaveMatchQueue = useCallback(async () => {
    if (leavingMatch || !queueWaiting) return;
    setLeavingMatch(true);
    try {
      const res = await portal.leaveCasualMatchQueue(primaryQueueEntry?.templateId);
      setAwaitingMatch(null);
      if (res.ok) {
        setNote(null);
      } else {
        setNote(leaveMatchQueueErrorText(res.error));
      }
    } finally {
      setLeavingMatch(false);
    }
  }, [
    leavingMatch,
    portal.leaveCasualMatchQueue,
    primaryQueueEntry?.templateId,
    queueWaiting,
  ]);

  if (!portal.gameType) {
    return (
      <div className="portal-page">
        <p>无效的游戏类型。请访问 /portal/block_blast 等有效路径。</p>
      </div>
    );
  }

  const gameTitle = portalGameDisplayName(portal.gameType);
  const mySolo = portal.myWeeklyPoints?.byMode.solo;
  const myMulti = portal.myWeeklyPoints?.byMode.multi;

  const handleJoin = async (mode: "solo" | "multi") => {
    if (!authed) {
      askAuth({});
      setNote("请先登录后再开始挑战。");
      return;
    }
    if (!portal.portalSessionReady) {
      setNote("正在同步对局状态，请稍候…");
      return;
    }

    const resumeAssignment =
      mode === "solo" ? soloOpenAssignment : multiOpenAssignment;
    if (resumeAssignment) {
      openAssignment(resumeAssignment);
      return;
    }

    if (hasGlobalOpenRun) {
      setNote(joinEntryErrorMessage("already_in_open_match"));
      return;
    }

    if (mode === "multi" && queueWaiting) {
      setNote("已在匹配队列中，请先退出匹配或等待开桌。");
      return;
    }
    if (mode === "multi" && multiJoinBlocked && !queueWaiting) {
      setNote("正在匹配或对局创建中，请稍候。");
      return;
    }
    if (mode === "solo" && soloJoinBlocked) {
      setNote("正在匹配或对局创建中，请稍候。");
      return;
    }

    setJoining(mode);
    setNote(null);
    try {
      const outcome = await portal.joinTournament(mode);
      if (outcome.kind === "ready") {
        openModal({
          name: portalPlayModalForGameType(portal.gameType!),
          data: {
            casualTournamentId: outcome.templateId,
            casualMatchGameId: outcome.gameId,
            casualSessionKey: `${outcome.gameId}:${Date.now()}`,
          },
        });
      } else if (outcome.kind === "queued") {
        setAwaitingMatch({
          templateId: outcome.templateId,
          gameKind: portal.gameType!,
        });
      } else if (outcome.error === joinEntryErrorMessage("already_in_open_match")) {
        const fallback =
          mode === "solo" ? soloOpenAssignment : multiOpenAssignment;
        if (fallback) {
          openAssignment(fallback);
        } else {
          setNote(outcome.error);
        }
      } else {
        setNote(outcome.error);
      }
    } finally {
      setJoining(null);
    }
  };

  if (visible === 0) return null;

  return (
    <div className="portal-page">
      <header className="portal-header">
        <div className="portal-header-row">
          <div className="portal-header-main">
            <h1>{gameTitle}</h1>
            <p className="portal-muted">{formatWeekRemaining(portal.weekEndsAt)}</p>
            {!portal.convexUrl && (
              <p className="portal-error">未配置 VITE_CONVEX_URL_PORTAL</p>
            )}
          </div>
          <div className="portal-header-auth">
            {user?.uid ? (
              <button
                type="button"
                className="portal-btn portal-btn-outline portal-header-auth-btn"
                aria-label="Sign out"
                onClick={signOut}
              >
                SignOut
              </button>
            ) : (
              <button
                type="button"
                className="portal-btn portal-btn-outline portal-header-auth-btn"
                aria-label="Sign in"
                onClick={signIn}
              >
                SignIn
              </button>
            )}
          </div>
        </div>
      </header>

      {!authed ? (
        <div className="portal-auth" role="status">
          <p>登录后可参与单人挑战、多人竞技并同步周榜积分。</p>
          <button type="button" className="portal-btn" onClick={() => askAuth({})}>
            登录
          </button>
        </div>
      ) : null}

      {hasOpenRun && (
        <div className="portal-ongoing" role="status">
          <p className="portal-ongoing-text">
            {openAssignments.length === 1
              ? "有一场正在进行中的对局"
              : `有 ${openAssignments.length} 场未完成的对局`}
          </p>
          <div className="portal-ongoing-actions">
            {openAssignments.map((a) => (
              <button
                key={a.gameId}
                type="button"
                className="portal-btn portal-btn-resume"
                onClick={() => openAssignment(a)}
              >
                进入{portalMatchTypeLabel(a.templateId)}
                {isOpenCasualRunExpired(a) ? "（已超时）" : ""}
              </button>
            ))}
          </div>
        </div>
      )}

      {!hasOpenRun && queueClaiming ? (
        <div className="portal-ongoing portal-ongoing--queue" role="status">
          <p className="portal-ongoing-text">正在创建对局，请稍候…</p>
        </div>
      ) : !hasOpenRun && queueWaiting ? (
        <div className="portal-ongoing portal-ongoing--queue" role="status">
          <p className="portal-ongoing-text">
            正在匹配中
            {primaryQueueTitle ? `（${primaryQueueTitle}）` : ""}
          </p>
          <button
            type="button"
            className="portal-btn portal-btn-outline portal-btn-resume"
            disabled={leavingMatch || joining != null}
            onClick={() => void handleLeaveMatchQueue()}
          >
            {leavingMatch ? "…" : "退出匹配"}
          </button>
        </div>
      ) : null}

      {note && <p className="portal-note">{note}</p>}

      <CasualPlayMatchOverlay
        open={visible !== 0 && !hasOpenRun && matchOverlayOpen}
        phase={queueClaiming ? "claiming" : "waiting"}
        waitingForPeer={
          awaitingMatch != null && !queueWaiting && !queueClaiming
            ? false
            : (primaryQueueEntry?.waitingForPeer ?? false)
        }
        tournamentTitle={primaryQueueTitle || undefined}
        leaving={leavingMatch}
        onLeave={
          queueWaiting && primaryQueueEntry?.waitingForPeer
            ? () => void handleLeaveMatchQueue()
            : undefined
        }
      />

      <section className="portal-section">
        <h2>单人挑战</h2>
        <p className="portal-muted">达标 +3 分 · 未达标 -1 分（seed P75）</p>
        <p className="portal-standing">{formatMyStanding(mySolo?.points, mySolo?.rank)}</p>
        <div className="portal-section-actions">
          <button
            type="button"
            className="portal-btn"
            disabled={
              !user?.uid ||
              joining != null ||
              soloJoinBlocked ||
              (!portal.portalSessionReady && !soloOpenAssignment)
            }
            onClick={() => void handleJoin("solo")}
          >
            {joining === "solo"
              ? "加入中…"
              : soloOpenAssignment
                ? "继续单人挑战"
                : soloJoinBlocked
                  ? "请先完成进行中的对局"
                  : "开始单人挑战"}
          </button>
          <button
            type="button"
            className="portal-btn"
            onClick={() => setPanelModal("soloLb")}
          >
            本周排行榜
          </button>
        </div>
      </section>

      <section className="portal-section">
        <h2>多人竞技</h2>
        <p className="portal-muted">5 人免费 · 名次积分 5 / 3 / 1 / -1 / -2</p>
        <p className="portal-standing">{formatMyStanding(myMulti?.points, myMulti?.rank)}</p>
        <div className="portal-section-actions">
          <button
            type="button"
            className="portal-btn portal-btn-secondary"
            disabled={
              !user?.uid ||
              joining != null ||
              multiJoinBlocked ||
              (!portal.portalSessionReady && !multiOpenAssignment)
            }
            onClick={() => void handleJoin("multi")}
          >
            {joining === "multi"
              ? "匹配中…"
              : queueWaiting
                ? "正在匹配中"
                : multiOpenAssignment
                  ? "继续多人竞技"
                  : multiJoinBlocked
                    ? "请先完成进行中的对局"
                    : "开始多人竞技"}
          </button>
          <button
            type="button"
            className="portal-btn portal-btn-secondary"
            onClick={() => setPanelModal("multiLb")}
          >
            本周排行榜
          </button>
        </div>
      </section>

      {user?.uid ? (
        <section className="portal-section portal-section--compact">
          <h2>历史记录</h2>
          <p className="portal-muted">
            {historyCount > 0 ? `共 ${historyCount} 场对局` : "完成对局后在此查看"}
          </p>
          <button
            type="button"
            className="portal-btn portal-btn-outline portal-btn-full"
            onClick={() => setPanelModal("history")}
          >
            查看历史记录
          </button>
        </section>
      ) : null}

      <PortalCenterModal
        open={panelModal === "soloLb"}
        title="本周排行榜 · 单人挑战"
        onClose={() => setPanelModal(null)}
      >
        <PortalWeeklyLeaderboardPanel
          rows={portal.soloLeaderboard}
          myPoints={mySolo?.points}
          myRank={mySolo?.rank}
        />
      </PortalCenterModal>

      <PortalCenterModal
        open={panelModal === "multiLb"}
        title="本周排行榜 · 多人竞技"
        onClose={() => setPanelModal(null)}
      >
        <PortalWeeklyLeaderboardPanel
          rows={portal.multiLeaderboard}
          myPoints={myMulti?.points}
          myRank={myMulti?.rank}
        />
      </PortalCenterModal>

      <PortalCenterModal
        open={panelModal === "history"}
        title="历史记录"
        onClose={() => setPanelModal(null)}
      >
        <PortalHistoryList
          openAssignments={openAssignments}
          gameHistory={portal.gameHistory}
          onOpenAssignment={openAssignment}
          onOpenReport={historyReport.openReport}
        />
      </PortalCenterModal>

      <PortalHistoryReportOverlays
        reportSummary={historyReport.reportSummary}
        reportTableMetaNote={historyReport.reportTableMetaNote}
        watchTarget={historyReport.watchTarget}
        watchLabel={historyReport.watchLabel}
        watchGameType={historyReport.watchGameType}
        onCloseReport={historyReport.closeReport}
        onCloseWatch={historyReport.closeWatch}
        onWatchFromReport={historyReport.openWatchFromReport}
      />
    </div>
  );
};

const PortalGamePage: React.FC<PageProp> = ({ visible, data }) => {
  const raw = data?.gameType ?? data?.params?.gameType;
  const fromPath =
    typeof window !== "undefined"
      ? parsePortalPathFromPathname(window.location.pathname).gameType ?? undefined
      : undefined;
  const gameTypeRaw = (typeof raw === "string" ? raw : fromPath) ?? "";
  const gameType = isValidPortalGameType(gameTypeRaw) ? gameTypeRaw : null;

  return (
    <PortalProvider gameType={gameType}>
      <PortalGamePageInner visible={visible} />
    </PortalProvider>
  );
};

export default PortalGamePage;
