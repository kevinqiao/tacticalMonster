import { DiscordSDK } from "@discord/embedded-app-sdk";
import { useConvex } from "convex/react";
import React, { useEffect, useRef } from "react";
import { useUserManager } from "service/UserManager";
const DISCORD_CLIENT_ID = "1252780878078152844";
const DiscordProvider = () => {
  const convex = useConvex();
  const { authComplete } = useUserManager();
  const discordSDKRef = useRef<any>();
  console.log("discord provider");
  useEffect(() => {
    const startDiscordAuth = async () => {
      try {
        const discordSdk = new DiscordSDK(DISCORD_CLIENT_ID);
        await discordSdk.ready();
        discordSDKRef.current = discordSdk;

        // Authenticate with Discord client (using the access_token)
        // const auth = await discordSdk.commands.authenticate({
        //   access_token,
        // });
      } catch (err) {
        console.log(err);
      }
    };

    startDiscordAuth();
  }, []);
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

export default DiscordProvider;
