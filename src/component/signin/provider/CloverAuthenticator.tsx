import { useConvex } from "convex/react";
import { gsap } from "gsap";
import { AppsConfiguration } from "model/PageConfiguration";
import { PageConfig } from "model/PageProps";
import React, { useCallback, useEffect, useRef, useState } from "react";
import useEventSubscriber from "service/EventManager";
import { usePageManager } from "service/PageManager";
import { usePartnerManager } from "service/PartnerManager";
import { useUserManager } from "service/UserManager";
import { api } from "../../../convex/_generated/api";
import { AuthProps } from "../SSOController";
const CloverAuthenticator: React.FC<AuthProps> = ({ provider }) => {
  const maskRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<HTMLDivElement | null>(null);
  const { partner } = usePartnerManager();
  const { user, authComplete } = useUserManager();
  const [error, setError] = useState(0);
  const { event: accountEvent } = useEventSubscriber([], ["account"]);
  const { currentPage } = usePageManager();
  const convex = useConvex();
  useEffect(() => {
    const channelAuth = async () => {
      if (!provider || !currentPage) return;
      const employeeId = currentPage.params?.employee_id;
      const merchantId = currentPage.params?.merchant_id;
      const code = currentPage.params?.code;
      const accessToken = currentPage.hash?.access_token;
      const data = { merchantId, code, accessToken, employeeId };
      // if (!merchantId || !employeeId) return;
      show();
      const res = await convex.action(api.authoize.authorize, {
        data,
        channelId: provider.channelId,
        partnerId: provider?.partnerId,
      });

      if (res?.ok) {
        authComplete(res.message, 1);
        close();
      } else setError(res.errorCode);
    };

    if (!user && partner && currentPage) {
      setTimeout(() => channelAuth(), 100);
    }
  }, [user, partner, currentPage]);

  useEffect(() => {
    if (!currentPage) return;
    const app: any = AppsConfiguration.find((c) => c.name === currentPage.app);
    if (app?.navs) {
      const config: PageConfig | undefined = app.navs.find((s: any) => s.name === currentPage.name);
      const role = user ? user.role ?? 1 : 0;
      if (config?.auth && role < config.auth) {
        open();
      } else close();
    }
  }, [user, currentPage]);
  // useEffect(() => {
  //   if (user) close();
  // }, [user]);

  useEffect(() => {
    if (accountEvent?.name === "signin") {
      open();
    }
  }, [accountEvent]);

  const open = useCallback(() => {
    const url = "/www/oauth-code.html";
    window.location.href = url;
  }, []);

  const show = useCallback(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        tl.kill();
      },
    });
    tl.fromTo(maskRef.current, { autoAlpha: 0 }, { autoAlpha: 0.7, duration: 0.8 });
    tl.fromTo(controllerRef.current, { autoAlpha: 0, scale: 0.5 }, { autoAlpha: 1, scale: 1.0, duration: 0.8 }, "<");
    tl.play();
  }, []);

  const close = useCallback(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        tl.kill();
      },
    });
    tl.to(maskRef.current, { autoAlpha: 0, duration: 0.6 });
    tl.to(controllerRef.current, { autoAlpha: 0, duration: 0.6 }, "<");
    tl.play();
  }, []);

  return (
    <>
      <div
        ref={maskRef}
        className="mask"
        style={{ zIndex: 1990, width: "100vw", height: "100vh", backgroundColor: "red" }}
      ></div>
      <div
        ref={controllerRef}
        className="signin_control"
        style={{
          zIndex: 2000,
          color: "white",
          opacity: 0,
        }}
      >
        {error > 0 ? "Authentication fail" : "Authenticating...."}
      </div>
    </>
  );
};

export default CloverAuthenticator;
