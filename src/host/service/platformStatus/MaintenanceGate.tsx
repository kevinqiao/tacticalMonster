import { api } from "@/convex/sso/convex/_generated/api";
import { useQuery } from "convex/react";
import { isPlatformAuthed } from "host/service/platformAuth/platformAccessToken";
import { useUserManager } from "host/service/UserManager";
import { useHistoryLocationKey } from "host/service/useHistoryLocationKey";
import React, { useMemo } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import "./maintenanceGate.css";

const platformStatusFns = {
  getPlatformStatus: api.service.partner.platformStatus.getPlatformStatus,
  getPlatformOperatorAccess: api.service.partner.platformAdmin.getPlatformOperatorAccess,
};

function formatWhen(ts: number | null, locale: string): string | null {
  if (ts == null || !Number.isFinite(ts) || ts <= 0) return null;
  try {
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ts));
  } catch {
    return new Date(ts).toLocaleString();
  }
}

/**
 * Global maintenance UX:
 * - maintenance: full-screen block (platform staff / /platform/* bypass)
 * - pre_notice: non-blocking top banner
 */
export const MaintenanceGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t, i18n } = useTranslation("host.shell");
  const { user } = useUserManager();
  const locationKey = useHistoryLocationKey();
  const status = useQuery(platformStatusFns.getPlatformStatus, {});
  const authed = isPlatformAuthed(user);
  const access = useQuery(
    platformStatusFns.getPlatformOperatorAccess,
    authed ? {} : "skip"
  );

  const pathname = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.pathname;
  }, [locationKey]);

  const isPlatformPath = pathname === "/platform" || pathname.startsWith("/platform/");
  const isOperator = access?.isOperator === true;
  const mode = status?.mode ?? "normal";

  const bypassHardGate = isPlatformPath || isOperator;
  const blockApp = mode === "maintenance" && !bypassHardGate;

  const title =
    (status?.title && status.title.trim()) ||
    t("maintenance.title", { defaultValue: "系统维护中" });
  const message =
    (status?.message && status.message.trim()) ||
    t("maintenance.message", {
      defaultValue: "我们正在进行系统维护，请稍后再试。",
    });
  const endLabel = formatWhen(status?.plannedEndAt ?? null, i18n.language);
  const startLabel = formatWhen(status?.plannedStartAt ?? null, i18n.language);

  const noticeBanner =
    mode === "pre_notice" && !blockApp
      ? createPortal(
          <div className="platform-maintenance-banner" role="status">
            <strong>
              {t("maintenance.noticeTitle", { defaultValue: "维护预告" })}
            </strong>
            <span>
              {message}
              {startLabel || endLabel
                ? ` ${t("maintenance.noticeWindow", {
                    defaultValue: "预计时间：{{window}}",
                    window: [startLabel, endLabel].filter(Boolean).join(" – "),
                  })}`
                : ""}
            </span>
          </div>,
          document.body
        )
      : null;

  if (blockApp) {
    return (
      <>
        {createPortal(
          <div className="platform-maintenance-overlay" role="alertdialog" aria-modal="true">
            <div className="platform-maintenance-card">
              <p className="platform-maintenance-kicker">
                {t("maintenance.kicker", { defaultValue: "暂时无法使用" })}
              </p>
              <h1>{title}</h1>
              <p className="platform-maintenance-body">{message}</p>
              {endLabel ? (
                <p className="platform-maintenance-eta">
                  {t("maintenance.eta", {
                    defaultValue: "预计恢复时间：{{time}}",
                    time: endLabel,
                  })}
                </p>
              ) : null}
              <div className="platform-maintenance-actions">
                <button
                  type="button"
                  className="platform-maintenance-btn"
                  onClick={() => window.location.reload()}
                >
                  {t("maintenance.retry", { defaultValue: "刷新重试" })}
                </button>
                <a className="platform-maintenance-link" href="/platform/admin">
                  {t("maintenance.opsEntry", { defaultValue: "运营入口" })}
                </a>
              </div>
            </div>
          </div>,
          document.body
        )}
      </>
    );
  }

  return (
    <>
      {noticeBanner}
      {children}
    </>
  );
};
