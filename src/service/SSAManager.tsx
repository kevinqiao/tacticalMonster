import { ConvexProvider, ConvexReactClient } from "convex/react";
import React, { useEffect, useState } from "react";
import { useUserManager } from "./UserManager";

const SSA_URLS: { [k: string]: string } = {
  "tacticalMonster": "https://shocking-leopard-487.convex.cloud",
};
const SSA_AUTH_URLS: { [k: string]: string } = {
  "tacticalMonster": "https://shocking-leopard-487.convex.site",
};

export const SSAManager = ({ app, children }: { app: string, children: React.ReactNode }) => {
  const { user, sessions } = useUserManager();
  useEffect(() => {
    if (user?.token) {
      const session = sessions[app];
      if (!session) {
        fetch(SSA_AUTH_URLS[app] + "/signin", {
          method: "POST",
          body: JSON.stringify({
            access_token: user.token,
          }),
        }).then(res => res.json()).then(data => {
          console.log(user)
          sessions[app] = data.token;
          console.log("signin", data);
          console.log("sessions", sessions);
        });
      }
    }
  }, [user, sessions]);
  return (
    <>
      <>{children}</>
    </>
  );
};
export const SSAProvider = ({ app, children }: { app: string, children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
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
