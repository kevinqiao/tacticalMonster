import { ConvexProvider, ConvexReactClient } from "convex/react";
import React, { createContext, useContext, useEffect, useState } from "react";
import { AppSessionStatus, useUserManager } from "./UserManager";

export interface Player {
  uid: string;
  token: string;
  expire: number;
  data?: { [k: string]: any };
}

export const SSA_URLS: { [k: string]: string } = {
  "solitaireArena": "https://artful-chipmunk-59.convex.cloud",
  "tacticalMonster": "https://shocking-leopard-487.convex.cloud",
  "ludo": "https://famous-mule-757.convex.cloud",
  "solitaire": "https://limitless-platypus-124.convex.cloud",
  "tournament": "https://beloved-mouse-699.convex.cloud",
};
export const SSA_AUTH_URLS: { [k: string]: string } = {
  "solitaireArena": "https://artful-chipmunk-59.convex.site",
  "tacticalMonster": "https://shocking-leopard-487.convex.site",
  "ludo": "https://famous-mule-757.convex.site",
  "solitaire": "https://limitless-platypus-124.convex.site",
  "tournament": "https://beloved-mouse-699.convex.site",
};
interface ISSAContext {
  player: any;
}

const SSAContext = createContext<ISSAContext>({
  player: null,
});



export const SSAProvider = ({ app, children }: { app: string, children: React.ReactNode }) => {

  const client = React.useMemo(() => new ConvexReactClient(SSA_URLS[app]), [app]);
  const [player, setPlayer] = useState<Player | null>(null);
  const { user, sessions, ssaAuthComplete } = useUserManager();


  useEffect(() => {
    const signin = async () => {
      const res = await fetch(SSA_AUTH_URLS[app] + "/signin", {
        method: "POST",
        body: JSON.stringify({
          access_token: user?.token,
          expire: user?.expire - Date.now()
        }),
      })
      const data = await res.json();
      // console.log("signin", app, data);
      if (data.ok) {
        ssaAuthComplete(app, data.player);
        setPlayer(data.player);
      }
    };

    if (sessions.length === 0 || player) return;
    const session = sessions.find((s) => s.app === app);
    if (session?.status === AppSessionStatus.TO_BE_SIGNED_IN) {
      session.status = AppSessionStatus.SIGNING_IN;
      signin();
    } else if (session?.status === AppSessionStatus.SIGNED_IN) {
      setPlayer(session.player);
    }

  }, [sessions, user, app]);

  useEffect(() => {
    const signout = async (uid: string, token: string) => {
      const res = await fetch(SSA_AUTH_URLS[app] + "/signout", {
        method: "POST",
        body: JSON.stringify({
          uid,
          token,
        }),
      })
      setPlayer(null);
    }
    if (sessions.length === 0 && player && app)
      signout(player.uid, player.token);

  }, [sessions, app]);

  return (
    <SSAContext.Provider value={{ player }}>
      <ConvexProvider client={client}>{children}</ConvexProvider>
    </SSAContext.Provider>
  );
};
export const useSSAManager = () => {
  const value = useContext(SSAContext);
  if (!value) {
    throw new Error("useSSAManager must be used within a SSAProvider");
  }
  return value;
};
export default SSAProvider;
