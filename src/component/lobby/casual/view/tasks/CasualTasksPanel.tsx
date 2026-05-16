import { CASUAL_MISSION_TEMPLATES } from "@/convex/casualPlatform/convex/data/casualMissionTemplates";
import { usePageManager } from "host/service/PageManager";
import { useUserManager } from "host/service/UserManager";
import React, { useEffect, useMemo, useState } from "react";

import {
  useCasualPlatform,
  type CasualPlatformValue,
} from "../../service/useCasualPlatformManager";
import "../shared/casualEconomyPages.css";
import {
  missionClaimErrorMessage,
  missionDisplayTitle,
  missionRewardChipsFromTemplate,
  missionRowPhase,
  missionStatusLabelZh,
  missionTierLabelZh,
} from "../shared/casualEconomyUi";

const TIER_ORDER = ["daily", "weekly", "season"] as const;

type TierKey = (typeof TIER_ORDER)[number];

type MissionRow = CasualPlatformValue["missions"][number];

/** 任务正文：Tab 与 Play 侧栏 modal 共用（仅展示 Convex `listSeasonMissions` 合并结果） */
const CasualTasksPanel: React.FC = () => {
  const casual = useCasualPlatform();
  const { user } = useUserManager();
  const { openPage } = usePageManager();
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const liveReady = Boolean(casual.convexUrl && user?.uid);

  const templateById = useMemo(() => {
    const m = new Map<string, (typeof CASUAL_MISSION_TEMPLATES)[number]>();
    for (const row of CASUAL_MISSION_TEMPLATES) {
      m.set(row.taskId, row);
    }
    return m;
  }, []);

  const grouped = useMemo(() => {
    const buckets: Record<TierKey, typeof casual.missions> = {
      daily: [],
      weekly: [],
      season: [],
    };
    for (const mission of casual.missions) {
      const raw = mission.tier as TierKey | undefined;
      const key: TierKey = raw && raw in buckets ? raw : "season";
      buckets[key].push(mission);
    }
    return TIER_ORDER.map((tier) => ({ tier, items: buckets[tier] })).filter((g) => g.items.length > 0);
  }, [casual.missions]);

  const statusNote = !casual.convexUrl
    ? "未配置休闲 Convex（VITE_CONVEX_URL_CASUAL），无法加载任务。"
    : !user?.uid
      ? "请先登录以同步赛季任务与领取进度。"
      : casual.missions.length === 0
        ? "暂未收到服务器任务列表；请确认休闲后端已部署并已订阅 `listSeasonMissions`。"
        : null;

  const renderMissionRow = (m: MissionRow, reactKey: string) => {
    const tpl = templateById.get(m.taskId);
    const title = missionDisplayTitle(m.taskId, m.title);
    const target = Math.max(1, m.target);
    const progress = Math.min(m.progress, target);
    const pct = Math.min(1, progress / target);
    const chips = missionRewardChipsFromTemplate(tpl);
    const loading = busyTaskId === reactKey;
    const phase = missionRowPhase({
      progress: m.progress,
      target: m.target,
      completed: m.completed,
      claimed: Boolean(m.claimed),
    });
    const statusText = missionStatusLabelZh(phase);

    const statusClass =
      phase === "claimed"
        ? "casual-tasks__status casual-tasks__status--claimed"
        : phase === "ready"
          ? "casual-tasks__status casual-tasks__status--ready"
          : phase === "not_started"
            ? "casual-tasks__status casual-tasks__status--not_started"
            : "casual-tasks__status casual-tasks__status--progress";

    const phaseIcon =
      phase === "claimed" ? "✓" : phase === "ready" ? "✦" : phase === "not_started" ? "○" : "◐";

    const barFillClass =
      phase === "claimed"
        ? "casual-tasks__barFill casual-tasks__barFill--claimed"
        : phase === "ready" || m.completed
          ? "casual-tasks__barFill casual-tasks__barFill--complete"
          : phase === "not_started"
            ? "casual-tasks__barFill casual-tasks__barFill--idle"
            : "casual-tasks__barFill";

    return (
      <article
        key={reactKey}
        className={`casual-tasks__card casual-tasks__card--phase-${phase}${m.claimed ? " casual-tasks__card--done" : ""}`}
      >
        <div className="casual-tasks__cardMain">
          <div className="casual-tasks__phaseIcon" aria-hidden title={statusText}>
            {phaseIcon}
          </div>
          <div className="casual-tasks__cardBody">
            <div className="casual-tasks__cardTop">
              <h4 className="casual-tasks__cardTitle">{title}</h4>
              <span className={statusClass}>{statusText}</span>
            </div>

            {chips.length > 0 ? (
              <div className="casual-tasks__rewards" aria-label="任务奖励">
                {chips.map((c) => (
                  <span key={c} className="casual-tasks__rewardTag">
                    {c}
                  </span>
                ))}
              </div>
            ) : null}

            <div>
              <div className="casual-tasks__progressRow">
                <span>
                  {phase === "not_started"
                    ? "尚未开始"
                    : phase === "claimed"
                      ? "目标已达成"
                      : "进度"}
                </span>
                <span>
                  {progress} / {target}
                  {phase === "in_progress" && target > 0 ? ` · ${Math.round(pct * 100)}%` : ""}
                </span>
              </div>
              <div
                className={`casual-tasks__bar${phase === "not_started" ? " casual-tasks__bar--dashed" : ""}`}
                aria-hidden
              >
                <div className={barFillClass} style={{ width: `${pct * 100}%` }} />
              </div>
            </div>

            {phase === "ready" ? (
              <button
                type="button"
                className={`casual-tasks__claim casual-tasks__claim--ready${loading ? " casual-tasks__claim--busy" : ""}`}
                disabled={loading || !liveReady}
                onClick={async () => {
                  if (!liveReady) return;
                  setBusyTaskId(reactKey);
                  try {
                    const r = await casual.claimSeasonMission(m.taskId);
                    if (r.ok) {
                      setToast({ ok: true, text: `已领取：${title}` });
                    } else {
                      setToast({ ok: false, text: missionClaimErrorMessage(r.error) });
                    }
                    await Promise.all([
                      casual.refreshCasualPlayer(),
                      casual.refreshSeasonMissions(),
                    ]);
                  } finally {
                    setBusyTaskId(null);
                  }
                }}
              >
                {loading ? "领取中…" : "领取奖励"}
              </button>
            ) : null}

            {phase === "claimed" ? (
              <p className="casual-tasks__doneHint" role="status">
                奖励已领取并发放至账户
              </p>
            ) : null}
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="casual-econ">
      {toast ? (
        <div
          className={`casual-econ__toast${toast.ok ? "" : " casual-econ__toast--err"}`}
          role="status"
        >
          {toast.text}
        </div>
      ) : null}

      <h2 className="casual-econ__sectionTitle">赛季任务</h2>
      <p className="casual-econ__sectionHint">
        完成对局与登录等目标积累进度；达成后可领取配置奖励（赛季券、赛季 XP 等）。
      </p>

      <div className="casual-econ__linkRow">
        <span style={{ fontSize: 13, color: "var(--econ-muted, rgba(26,26,46,0.55))" }}>
          通行证等级与轨道奖励在底栏「通行证」
        </span>
        <button
          type="button"
          className="casual-econ__textBtn"
          onClick={() => openPage({ uri: "/casual/lobby/c5" })}
        >
          去通行证
        </button>
      </div>

      {statusNote ? (
        <div className="casual-econ__mockBanner" role="status">
          {statusNote}
        </div>
      ) : null}

      {liveReady && grouped.length > 0
        ? grouped.map(({ tier, items }) => (
            <section
              key={tier}
              className={`casual-tasks__tier casual-tasks__tier--${tier}`}
              aria-label={missionTierLabelZh(tier)}
            >
              <h3 className="casual-tasks__tierTitle">{missionTierLabelZh(tier)}任务</h3>
              <div className="casual-tasks__list">
                {items.map((m) => renderMissionRow(m, m.taskId))}
              </div>
            </section>
          ))
        : null}
    </div>
  );
};

export default CasualTasksPanel;
