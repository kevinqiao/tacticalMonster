import { useConvex } from "convex/react";
import React, { useEffect } from "react";
import { usePartnerManager } from "service/PartnerManager";
import { useUserManager } from "service/UserManager";
import { api } from "../../../convex/_generated/api";
import { AuthProps } from "../SSOController";
const TelegramProvider: React.FC<AuthProps> = ({ provider }) => {
  // const { authTgbot } = useAuthorize();
  const { authComplete } = useUserManager();
  const { partner } = usePartnerManager();
  const convex = useConvex();
  useEffect(() => {
    if (!provider) return;
    const src = "https://telegram.org/js/telegram-web-app.js";
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = async () => {
      // console.log(`${src} has been loaded.`);
      if (!window.Telegram || !window.Telegram.WebApp) return;
      const telegramData = window.Telegram.WebApp.initData;
      console.log(telegramData);
      // const res = await authTgbot(telegramData);
      // console.log(res);
      const res = await convex.action(api.authoize.authorize, {
        data: { authData: telegramData },
        channelId: provider.channel,
        partnerId: provider.partnerId,
      });
      if (res.ok) {
        authComplete(res.message, 0);
      }
    };
    script.onerror = () => {
      console.error(`Error loading ${src}`);
    };

    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, [provider]);

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          height: "100vh",
          backgroundColor: "black",
        }}
      >
        <div style={{ fontSize: "20px", color: "blue" }}>Authenticating...</div>
      </div>
    </>
  );
};

export default TelegramProvider;
