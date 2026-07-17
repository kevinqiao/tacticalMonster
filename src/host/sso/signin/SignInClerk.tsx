import { SignIn, useAuth, useClerk } from "@clerk/clerk-react";
import React, { useCallback, useEffect, useRef } from "react";

import type { User } from "host/service/UserManager";
import { usePartnerManager } from "host/service/PartnerManager";
import { clerkReturnUrl } from "host/service/clerk/clerkReturnUrl";
import { isClerkConfigured } from "host/service/clerk/clerkEnv";
import { isCampaignPlayerShellUri } from "host/util/PageUtils";

import { useClerkSignIn } from "@/component/lobby/shared/useClerkSignIn";

type SignInClerkProps = {
  cid: number;
  onComplete: (user: User) => void;
  portalTheme?: boolean;
};

const SignInClerkInner: React.FC<SignInClerkProps> = ({ cid, onComplete, portalTheme = false }) => {
  void cid;

  const { partnerPid, partnerResolveReady, campaignPartnerSlug } = usePartnerManager();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { signOut } = useClerk();
  const exchangedRef = useRef(false);
  const retryTimerRef = useRef<number | null>(null);
  const returnUrl = clerkReturnUrl();

  const { exchangeSession, busy, error, clearError } = useClerkSignIn({
    partnerId: partnerPid,
    onSuccess: onComplete,
  });

  const tryExchange = useCallback(async () => {
    if (!partnerResolveReady || exchangedRef.current || busy) return;

    const token = await getToken();
    if (!token) return;

    exchangedRef.current = true;
    const ok = await exchangeSession(token);
    if (!ok) {
      // Stop the 800ms hammer on hard failures; user can retry via sign-out.
      if (retryTimerRef.current != null) {
        window.clearInterval(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      return;
    }

    if (retryTimerRef.current != null) {
      window.clearInterval(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, [busy, exchangeSession, getToken, partnerResolveReady]);

  useEffect(() => {
    if (!partnerResolveReady || !isSignedIn) return;

    void tryExchange();

    retryTimerRef.current = window.setInterval(() => {
      void tryExchange();
    }, 800);

    return () => {
      if (retryTimerRef.current != null) {
        window.clearInterval(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [isSignedIn, partnerResolveReady, tryExchange]);

  // Popup: campaign player shells (keep landing SPA) + embeds (CrazyGames iframes).
  // Other first-party surfaces still use redirect.
  const prefersOauthPopup =
    typeof window !== "undefined" &&
    (() => {
      if (isCampaignPlayerShellUri(window.location.pathname)) return true;
      try {
        return window.self !== window.top;
      } catch {
        return true;
      }
    })();

  const clerkSignInProps = {
    routing: "virtual" as const,
    oauthFlow: (prefersOauthPopup ? "popup" : "redirect") as "popup" | "redirect",
    withSignUp: false,
    transferable: false,
    redirectUrl: returnUrl,
    signInUrl: returnUrl,
  };

  // Single-session Clerk apps must not mount <SignIn /> while already signed in
  // (dev warning + redirect to afterSignInUrl). Show exchange status instead.
  const showClerkForm = isLoaded && !isSignedIn;

  return (
    <div className={portalTheme ? "sso-auth-form sso-auth-form--portal" : "sso-auth-form"}>
      <p style={{ margin: 0, fontSize: 14, color: "#444", textAlign: "center" }}>
        Clerk 登录（玩家账号）；Partner PID {partnerPid}
        {campaignPartnerSlug ? ` · 商户 ${campaignPartnerSlug}` : ""}。
      </p>

      {showClerkForm ? <SignIn {...clerkSignInProps} /> : null}

      {!isLoaded || (isSignedIn && !error) ? (
        <p style={{ margin: 0, fontSize: 13, color: "#666", textAlign: "center" }}>
          {!isLoaded
            ? "正在加载登录状态…"
            : busy || !partnerResolveReady
              ? "已登录 Clerk，正在换取平台会话…"
              : "已登录 Clerk…"}
        </p>
      ) : null}
      {error ? (
        <p style={{ margin: 0, fontSize: 13, color: "#b91c1c", textAlign: "center" }}>{error}</p>
      ) : null}
      {isSignedIn && error ? (
        <button
          type="button"
          className={portalTheme ? "portal-btn" : undefined}
          style={{ marginTop: 8 }}
          onClick={() => {
            exchangedRef.current = false;
            clearError();
            void signOut({ redirectUrl: returnUrl });
          }}
        >
          退出 Clerk 并重试
        </button>
      ) : null}
    </div>
  );
};

const SignInClerk: React.FC<SignInClerkProps> = (props) => {
  if (!isClerkConfigured()) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          backgroundColor: "white",
          color: "#b91c1c",
          padding: 16,
          textAlign: "center",
        }}
      >
        未配置 VITE_CLERK_PUBLISHABLE_KEY。请在项目根目录运行 `clerk env pull` 或手动设置环境变量。
      </div>
    );
  }

  return <SignInClerkInner {...props} />;
};

export default SignInClerk;
