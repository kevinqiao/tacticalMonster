import { CASUAL_MISSION_TEMPLATES } from "@/convex/casualPlatform/convex/data/casualMissionTemplates";
import { PageProp } from "host/RenderApp";
import { usePageManager } from "host/service/PageManager";
import { useUserManager } from "host/service/UserManager";
import React, { useEffect, useMemo, useRef, useState } from "react";

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
import { MOCK_TASK_FOUR_PHASES, type MockPreviewMission } from "./casualTasksMock";
import CasualPageShell from "../shell/CasualPageShell";

const TIER_ORDER = ["daily", "weekly", "season"] as const;

type TierKey = (typeof TIER_ORDER)[number];

type MissionLike = CasualPlatformValue["missions"][number] | MockPreviewMission;

/** 任务 Tab：顶部固定四态 Mock 示例；已登录且有数据时下方展示真实分组任务 */
const CasualTasksTab: React.FC<PageProp> = ({ visible }) => {
  const rootRef = useRef<HTMLDivElement>(null);
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

  /** 后端合并模板后几乎总有数据；与 Mock 示例分开展示 */
  const showRealTasks = Boolean(
    casual.convexUrl && user?.uid && casual.missions.length > 0
  );

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

  const mockBannerText = showRealTasks
    ? "「四态示例」为固定 Mock，仅用于展示界面样式；下方「我的任务」才是当前账号的真实进度与领取。"
    : !casual.convexUrl
      ? "未配置休闲后端：仅显示下方四态 Mock 示例，操作不会同步服务器。"
      : !user?.uid
        ? "未登录：仅显示下方四态 Mock 示例；登录并连接休闲服后可同步真实任务。"
        : "下方为四态 Mock 示例；当前尚未拉到服务器任务列表，请稍后重试。";

  const renderMissionRow = (m: MissionLike, reactKey: string, preview: boolean) => {
    const tpl = templateById.get(m.taskId);
    const title = missionDisplayTitle(m.taskId, m.title);
    const target = Math.max(1, m.target);
    const progress = Math.min(m.progress, target);
    const pct = Math.min(1, progress / target);
    const chips =
      "previewRewardChips" in m && Array.isArray(m.previewRewardChips) && m.previewRewardChips.length > 0
        ? m.previewRewardChips
        : missionRewardChipsFromTemplate(tpl);
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
        className={`casual-tasks__card casual-tasks__card--phase-${phase}${m.claimed ? " casual-tasks__card--done" : ""}${preview ? " casual-tasks__card--preview" : ""}`}
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
                disabled={loading}
                onClick={async () => {
                  if (preview) {
                    setToast({
                      ok: true,
                      text: "预览：连接休闲服并登录后可在此真实领取奖励。",
                    });
                    return;
                  }
                  setBusyTaskId(reactKey);
                  try {
                    const r = await casual.claimSeasonMission(m.taskId);
                    if (r.ok) {
                      setToast({ ok: true, text: `已领取：${title}` });
                    } else {
                      setToast({ ok: false, text: missionClaimErrorMessage(r.error) });
                    }
                    await casual.refreshCasualPlayer();
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
    <CasualPageShell
      title="任务"
      titleId="casual-tab-tasks"
      rootRef={rootRef}
      visible={visible}
      showHeader
    >
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
            通行证等级奖励在「奖励」
          </span>
          <button
            type="button"
            className="casual-econ__textBtn"
            onClick={() => openPage({ uri: "/casual/lobby/c4" })}
          >
            去奖励
          </button>
        </div>

        <div className="casual-econ__mockBanner" role="note">
          {mockBannerText}
        </div>

        <section
          className="casual-tasks__tier casual-tasks__tier--season casual-tasks__tier--preview"
          aria-label="任务四态 Mock 示例"
        >
          <h3 className="casual-tasks__tierTitle">四态示例（Mock · 固定数据）</h3>
          <p className="casual-tasks__previewHint">
            依次为：<strong>未开始</strong> → <strong>进行中</strong> → <strong>可领取</strong> →{" "}
            <strong>已完成</strong>。与账号真实进度无关。
          </p>
          <div className="casual-tasks__list">
            {MOCK_TASK_FOUR_PHASES.map((m, i) => renderMissionRow(m, `preview-four-${i}`, true))}
          </div>
        </section>

        {showRealTasks ? (
          <>
            <h2 className="casual-econ__sectionTitle casual-tasks__realTitle">我的任务</h2>
            <p className="casual-econ__sectionHint">以下为服务器合并模板后的真实进度，可领取项将调用接口。</p>
            {grouped.map(({ tier, items }) => (
              <section
                key={tier}
                className={`casual-tasks__tier casual-tasks__tier--${tier}`}
                aria-label={missionTierLabelZh(tier)}
              >
                <h3 className="casual-tasks__tierTitle">{missionTierLabelZh(tier)}任务</h3>
                <div className="casual-tasks__list">
                  {items.map((m) => renderMissionRow(m, m.taskId, false))}
                </div>
              </section>
            ))}
          </>
        ) : casual.convexUrl && user?.uid ? (
          <p className="casual-tasks__empty">暂无来自服务器的任务列表；请稍后再试或确认任务模板已部署。</p>
        ) : null}
      </div>
    </CasualPageShell>
  );
};

export default CasualTasksTab;
