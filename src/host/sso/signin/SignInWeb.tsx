import React, { useCallback, useMemo } from "react";

import type { User } from "host/service/UserManager";
import { usePartnerManager } from "host/service/PartnerManager";

import WebSignInForm from "@/component/lobby/shared/WebSignInForm";
import { resolveWebSignInFromLocation } from "@/component/lobby/shared/resolveWebSignInFromLocation";

const SignInWeb: React.FC<{ cid: number; onComplete: (user: User) => void; portalTheme?: boolean }> = ({
  onComplete,
  portalTheme = false,
}) => {
  const { partnerPid } = usePartnerManager();
  const signInContext = useMemo(() => {
    const base = resolveWebSignInFromLocation();
    if (
      (base.staffGate === "none" || base.staffGate === "merchant") &&
      base.partnerId === undefined
    ) {
      return { ...base, partnerId: partnerPid };
    }
    return base;
  }, [partnerPid]);

  const onSuccess = useCallback(
    (user: User) => {
      onComplete(user);
    },
    [onComplete]
  );

  const description =
    signInContext.staffGate === "platform"
      ? "平台运营登录；须为 platform_staff 成员。"
      : signInContext.staffGate === "partner"
        ? signInContext.partnerId
          ? `Partner 后台登录（PID ${signInContext.partnerId}）；须为 partner_staff 成员。`
          : "Partner 后台登录；须为 partner_staff 成员。"
        : signInContext.staffGate === "merchant"
          ? signInContext.partnerId
            ? `门店后台登录（Partner PID ${signInContext.partnerId}）；须为 store_staff 成员。`
            : "门店后台登录；须为 store_staff 成员。"
          : "Web 登录（玩家账号）；无 staff 校验。";

  return (
    <div className={portalTheme ? "sso-auth-form sso-auth-form--portal" : "sso-auth-form"}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <WebSignInForm
          staffGate={signInContext.staffGate}
          partnerId={signInContext.partnerId}
          onSuccess={onSuccess}
          defaultAccountId={signInContext.defaultAccountId}
          defaultPassword={signInContext.defaultPassword}
          accountIdLabel="accountId / email"
          description={description}
        />
      </div>
    </div>
  );
};

export default SignInWeb;
