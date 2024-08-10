import { useConvex } from "convex/react";
import React, { useEffect, useState } from "react";
import useEventSubscriber from "service/EventManager";
import { usePartnerManager } from "service/PartnerManager";
import { useUserManager } from "service/UserManager";
import { getURIParam } from "util/PageUtils";
import { api } from "../../../convex/_generated/api";
import { AuthProps } from "../SSOController";
const URLAuthenticator: React.FC<AuthProps> = ({ provider }) => {
  const { partner } = usePartnerManager();
  const { authComplete } = useUserManager();
  const [error, setError] = useState(0);
  const { event: accountEvent } = useEventSubscriber([], ["account"]);
  const convex = useConvex();
  useEffect(() => {
    const channelAuth = async (code: string) => {
      if (!provider) return;
      const res = await convex.action(api.authoize.authorize, {
        data: { code },
        channelId: provider.channel,
        partnerId: provider?.partnerId,
      });
      console.log(res);
      if (res?.ok) {
        authComplete(res.message, 0);
      } else setError(res.errorCode);
    };
    const code = getURIParam("code");
    if (code) channelAuth(code);
    else setError(1);
  }, [provider]);
  useEffect(() => {
    if (accountEvent?.name === "signin") {
      const url = "http://localhost:3000/www/oauth-code.html";
      window.location.href = url;
    }
  }, [accountEvent]);

  return <></>;
};

export default URLAuthenticator;
