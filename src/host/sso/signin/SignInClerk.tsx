import { SignIn, useAuth } from "@clerk/clerk-react";
import React, { useCallback, useEffect, useRef } from "react";

import type { User } from "host/service/UserManager";
import { usePartnerManager } from "host/service/PartnerManager";
import { clerkReturnUrl } from "host/service/clerk/clerkReturnUrl";
import { isClerkConfigured } from "host/service/clerk/clerkEnv";

import { useClerkSignIn } from "@/component/lobby/shared/useClerkSignIn";

type SignInClerkProps = {
  cid: number;
  onComplete: (user: User) => void;
};

const SignInClerkInner: React.FC<SignInClerkProps> = ({ cid, onComplete }) => {
  void cid;

  const { partnerPid, partnerResolveReady, campaignMerchantSlug } = usePartnerManager();
  const { isSignedIn, getToken } = useAuth();
  const exchangedRef = useRef(false);
  const retryTimerRef = useRef<number | null>(null);
  const returnUrl = clerkReturnUrl();

  const { exchangeSession, busy, error } = useClerkSignIn({
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
      exchangedRef.current = false;
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

  const clerkSignInProps = {
    routing: "virtual" as const,
    oauthFlow: "popup" as const,
    withSignUp: false,
    transferable: false,
    redirectUrl: returnUrl,
    signInUrl: returnUrl,
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        height: "100%",
        backgroundColor: "white",
        pointerEvents: "auto",
        gap: 12,
        padding: 16,
        boxSizing: "border-box",
      }}
    >
      <p style={{ margin: 0, fontSize: 14, color: "#444", textAlign: "center" }}>
        Clerk 登录（玩家账号）；Partner PID {partnerPid}
        {campaignMerchantSlug ? ` · 商户 ${campaignMerchantSlug}` : ""}。
      </p>

      <SignIn {...clerkSignInProps} />

      {busy ? <p style={{ margin: 0, fontSize: 13, color: "#666" }}>正在换取平台会话…</p> : null}
      {error ? (
        <p style={{ margin: 0, fontSize: 13, color: "#b91c1c", textAlign: "center" }}>{error}</p>
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
