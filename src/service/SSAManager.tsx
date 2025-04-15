import { ConvexProvider, ConvexReactClient } from "convex/react";
import React, { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { AppSessionStatus, useUserManager } from "./UserManager";

export const SSA_URLS: { [k: string]: string } = {
  "tacticalMonster": "https://shocking-leopard-487.convex.cloud",
  "ludo": "https://famous-mule-757.convex.cloud",
  "solitaire": "https://limitless-platypus-124.convex.cloud",
};
export const SSA_AUTH_URLS: { [k: string]: string } = {
  "tacticalMonster": "https://shocking-leopard-487.convex.site",
  "ludo": "https://famous-mule-757.convex.site",
  "solitaire": "https://limitless-platypus-124.convex.site",
};
interface ISSAContext {
  player: any;
}

const SSAContext = createContext<ISSAContext>({
  player: null,
});
export const SSASignIn = ({ app, children }: { app: string, children: React.ReactNode }) => {
  const { user, sessions, ssaAuthComplete, ssaSignOut } = useUserManager();

  const signin = useCallback(async () => {
    const res = await fetch(SSA_AUTH_URLS[app] + "/signin", {
      method: "POST",
      body: JSON.stringify({
        access_token: user.token,
      }),
    })
    const data = await res.json();
    if (data.ok) {
      ssaAuthComplete(app, data.player);
    }
  }, [app, user, ssaAuthComplete]);

  const signout = useCallback(async (uid: string, token: string) => {
    await fetch(SSA_AUTH_URLS[app] + "/signout", {
      method: "POST",
      body: JSON.stringify({
        uid,
        token,
      }),
    })
    ssaSignOut(app);
  }, [app, ssaSignOut]);


  useEffect(() => {
    const session = sessions.find((s) => s.app === app);
    if (!session)
      return;
    if (!user?.uid || !user?.token) {
      if (session.player && session?.status === AppSessionStatus.TO_BE_SIGNED_OUT) {
        console.log("signout", session);
        session.status = AppSessionStatus.SIGNING_OUT;
        const { uid, token } = session.player;
        signout(uid, token);
      }
    } else if (session?.status === AppSessionStatus.TO_BE_SIGNED_IN) {
      session.status = AppSessionStatus.SIGNING_IN;
      signin();
    }

  }, [sessions, user, app]);

  return <>{children}</>;
}


export const SSAProvider = ({ app, children }: { app: string, children: React.ReactNode }) => {

  const client = React.useMemo(() => new ConvexReactClient(SSA_URLS[app]), [app]);
  const { user, sessions } = useUserManager();
  const player = useMemo(() => {
    const session = sessions.find((s) => s.app === app);
    console.log("session", session);
    return session?.player;
  }, [user, sessions, app]);

  console.log("player", player, sessions);

  return (
    <SSAContext.Provider value={{ player }}>
      <ConvexProvider client={client}><SSASignIn app={app}>{children}</SSASignIn></ConvexProvider>
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
