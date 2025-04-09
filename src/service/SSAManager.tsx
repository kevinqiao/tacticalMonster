import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useUserManager } from "./UserManager";

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
  updatePlayer: (player: any) => void;
}

const SSAContext = createContext<ISSAContext>({
  player: null,
  updatePlayer: () => { },
});
export const SSASignIn = ({ app, children }: { app: string, children: React.ReactNode }) => {
  const { user, sessions } = useUserManager();
  const { updatePlayer } = useSSAManager();
  useEffect(() => {
    const session = sessions[app];
    if (!session && user?.token) {
      sessions[app] = { token: "", status: 0 };
      fetch(SSA_AUTH_URLS[app] + "/signin", {
        method: "POST",
        body: JSON.stringify({
          access_token: user.token,
        }),
      }).then(async res => {
        const data = await res.json();
        console.log("data", app, data)
        updatePlayer(data);
        // updateSession(app, { token: data.token, status: 1 });
      }).catch(err => {
        console.log("error", app, err)
      }).finally(() => {
        console.log("finally", app)
      });
    }

  }, [user, sessions]);
  return (
    <>
      {children}
    </>
  )

}


export const SSAProvider = ({ app, children }: { app: string, children: React.ReactNode }) => {
  const [player, setPlayer] = useState<any>(null);
  const updatePlayer = useCallback((player: any) => {
    console.log("updatePlayer", player)
    setPlayer(player);
  }, [setPlayer]);

  return (
    <SSAContext.Provider value={{ player, updatePlayer }}>{children}
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
