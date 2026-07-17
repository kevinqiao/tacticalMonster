import {
  isStaffWebSignInContext,
  resolveWebSignInFromLocation,
} from "@/component/lobby/shared/resolveWebSignInFromLocation";
import { usePartnerManager } from "host/service/PartnerManager";
import { isClerkConfigured } from "host/service/clerk/clerkEnv";
import { User } from "host/service/UserManager";
import React, { useEffect, useMemo, useState } from "react";
import SignInClerk from "../signin/SignInClerk";
import SignInWeb from "../signin/SignInWeb";

type AuthTab = "web" | "clerk";

/**
 * SSO modal channels:
 * - `auth_channels` → consumer (Clerk / Embed)
 * - Staff consoles (`/platform`, `/partner/…`) → always Web password UI.
 */
const WebPanel1: React.FC<{ onComplete: (user: User) => void; portalTheme?: boolean }> = ({
  onComplete,
  portalTheme = false,
}) => {
  const { partner, partnerPid, partnerResolveReady } = usePartnerManager();
  const staffCtx = resolveWebSignInFromLocation();
  const staffConsole = isStaffWebSignInContext(staffCtx);

  const consumerChannelIds = partner?.authChannelIds ?? partner?.auth_channels ?? [];
  const staffChannelIds = partner?.staffAuthChannelIds ?? partner?.staff_auth_channels ?? [];

  const clerkKeyConfigured = isClerkConfigured();
  /** Staff consoles always offer Web sign-in (never gate on partner.staff_auth_channels). */
  const hasWeb = staffConsole;
  const hasClerk = !staffConsole && consumerChannelIds.includes(1) && clerkKeyConfigured;
  const defaultTab: AuthTab = hasWeb ? "web" : "clerk";
  const [tab, setTab] = useState<AuthTab>(defaultTab);

  useEffect(() => {
    if (hasWeb) setTab("web");
    else if (hasClerk) setTab("clerk");
  }, [hasClerk, hasWeb]);

  const activeTab = useMemo(() => {
    if (staffConsole) return "web";
    if (tab === "web" && hasWeb) return "web";
    if (tab === "clerk" && hasClerk) return "clerk";
    return defaultTab;
  }, [defaultTab, hasClerk, hasWeb, staffConsole, tab]);

  const showTabs = hasWeb && hasClerk;
  const warnMissingStaffWebChannel =
    staffConsole &&
    staffCtx.staffGate !== "platform" &&
    partnerResolveReady &&
    !staffChannelIds.includes(0);

  // Staff: always mount Web form — avoid empty panel with only the floating ×.
  if (staffConsole) {
    return (
      <div className={portalTheme ? "sso-auth-panel sso-auth-panel--portal" : "sso-auth-panel"}>
        {warnMissingStaffWebChannel ? (
          <div
            style={{
              padding: "8px 16px",
              backgroundColor: "#fef3c7",
              color: "#92400e",
              fontSize: 13,
              textAlign: "center",
            }}
          >
            当前 Partner PID {partnerPid} 未在 <code>staff_auth_channels</code> 中启用 Web（cid=0）。登录可能被后端拒绝；请配置{" "}
            <code>[0]</code>。
          </div>
        ) : null}
        <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <SignInWeb key="web" cid={0} onComplete={onComplete} portalTheme={portalTheme} />
        </div>
      </div>
    );
  }

  return (
    <div className={portalTheme ? "sso-auth-panel sso-auth-panel--portal" : "sso-auth-panel"}>
      {clerkKeyConfigured && !consumerChannelIds.includes(1) && partnerResolveReady ? (
        <div
          style={{
            padding: "8px 16px",
            backgroundColor: "#fef3c7",
            color: "#92400e",
            fontSize: 13,
            textAlign: "center",
          }}
        >
          当前 Partner PID {partnerPid} 未在 <code>auth_channels</code> 中启用 Clerk（cid=1）。
        </div>
      ) : null}

      {consumerChannelIds.includes(1) && !clerkKeyConfigured ? (
        <div
          style={{
            padding: "8px 16px",
            backgroundColor: "#fef3c7",
            color: "#92400e",
            fontSize: 13,
            textAlign: "center",
          }}
        >
          Partner 已启用 Clerk，但未配置 <code>VITE_CLERK_PUBLISHABLE_KEY</code>。
        </div>
      ) : null}

      {showTabs ? (
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "12px 16px 0",
            backgroundColor: "white",
            pointerEvents: "auto",
          }}
        >
          <button
            type="button"
            onClick={() => setTab("web")}
            style={{
              flex: 1,
              padding: "8px 12px",
              border: activeTab === "web" ? "2px solid #111" : "1px solid #ccc",
              borderRadius: 8,
              background: activeTab === "web" ? "#f3f4f6" : "white",
              cursor: "pointer",
            }}
          >
            Web 账号
          </button>
          <button
            type="button"
            onClick={() => setTab("clerk")}
            style={{
              flex: 1,
              padding: "8px 12px",
              border: activeTab === "clerk" ? "2px solid #111" : "1px solid #ccc",
              borderRadius: 8,
              background: activeTab === "clerk" ? "#f3f4f6" : "white",
              cursor: "pointer",
            }}
          >
            Clerk
          </button>
        </div>
      ) : null}

      <div style={{ flex: 1, minHeight: 0 }}>
        {activeTab === "web" && hasWeb ? (
          <SignInWeb key="web" cid={0} onComplete={onComplete} portalTheme={portalTheme} />
        ) : null}
        {activeTab === "clerk" && hasClerk ? (
          <SignInClerk key="clerk" cid={1} onComplete={onComplete} portalTheme={portalTheme} />
        ) : null}
        {!hasWeb && !hasClerk ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "#666",
              padding: 16,
              textAlign: "center",
            }}
          >
            未配置可用的 consumer 登录渠道（auth_channels）。玩家登录请启用 Clerk（cid=1）。
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default WebPanel1;
