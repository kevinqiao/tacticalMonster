import { ConvexProvider, ConvexReactClient } from "convex/react";
import React, { createContext, useContext, useEffect, useMemo } from "react";
import { useUserManager } from "./UserManager";

const SSA_URLS: { [k: string]: string } = {
  "tacticalMonster": "https://shocking-leopard-487.convex.cloud",
  "ludo": "https://famous-mule-757.convex.cloud",
  "solitaire": "https://limitless-platypus-124.convex.cloud",
};
const SSA_AUTH_URLS: { [k: string]: string } = {
  "tacticalMonster": "https://shocking-leopard-487.convex.site",
  "ludo": "https://famous-mule-757.convex.site",
  "solitaire": "https://limitless-platypus-124.convex.site",
};
interface ISSAContext {
  credentials: { uid: string; token: string } | null
}

const SSAContext = createContext<ISSAContext>({
  credentials: null,
});
export const SSAManager = ({ app, children }: { app: string, children: React.ReactNode }) => {

  const { user, sessions, updateSession } = useUserManager();
  // const [credentials, setCredentials] = useState<{ uid: string; token: string } | null>(null);
  const credentials = useMemo(() => {
    const session = sessions[app];
    if (!session || session.status === 0) {
      return null;
    }
    return { uid: user.uid, token: session.token };
  }, [sessions, user, app]);
  // console.log("credentials", app, credentials)
  useEffect(() => {
    const session = sessions[app];
    // console.log("session", app, session)
    if (!session && user?.token) {
      sessions[app] = { token: "", status: 0 };
      fetch(SSA_AUTH_URLS[app] + "/signin", {
        method: "POST",
        body: JSON.stringify({
          access_token: user.token,
        }),
      }).then(res => res.json()).then(data => {
        console.log("data", app, data)
        updateSession(app, { token: data.token, status: 1 });
      });
    }

  }, [user, sessions, updateSession]);
  return (
    <>
      <SSAContext.Provider value={{ credentials }}>{children}</SSAContext.Provider>
    </>
  );
};

export const useSSAManager = () => {
  return useContext(SSAContext);
};
export const SSAProvider = ({ app, children }: { app: string, children: React.ReactNode }) => {

  const client = new ConvexReactClient(SSA_URLS[app]);
  return (
    <>
      <ConvexProvider client={client}>
        <SSAManager app={app}>{children}</SSAManager>
      </ConvexProvider>
    </>
  );
};
export default SSAManager;
