import React, { FunctionComponent, lazy, Suspense, useEffect, useState } from "react";
import { usePageManager } from "service/PageManager";
import { usePartnerManager } from "service/PartnerManager";
import { getURIParam } from "util/PageUtils";
import "./signin.css";
export interface AuthenticatorHandle extends HTMLDivElement {
  someMethod(): void;
}

export interface AuthProvider {
  partnerId: number;
  app: string;
  name: string;
  path: string;
  channelId: number;
  params?: { [k: string]: string };
}
export interface AuthInit {
  open: number;
  redirectURL: string;
  afterSignedURL: string;
  params?: { [k: string]: string };
}
export interface AuthProps {
  provider?: AuthProvider;
  authInit?: AuthInit;
}
// gsap.registerPlugin(MotionPathPlugin);
const SSOController: React.FC = () => {
  // const { user } = useUserManager();
  const { partner } = usePartnerManager();
  const { app } = usePageManager();
  const [provider, setProvider] = useState<any>(null);
  console.log("sso controller");
  // console.log(user);

  useEffect(() => {
    if (!partner || !app) return;
    let channelId = 0;
    if (getURIParam("c")) channelId = Number(getURIParam("c"));
    const auth: { channels: number[]; role: number } | undefined = partner.auth[app.name];
    if (auth) {
      const cid = channelId > 0 ? channelId : auth.channels[0];
      const channel = partner.channels.find((c) => c.id === cid);
      if (channel && partner.authProviders) {
        const pro = partner.authProviders.find((a) => a.name === channel.provider);
        if (pro) {
          setProvider({
            ...pro,
            partnerId: partner.pid,
            app: app.name,
            channelId: cid,
            params: channel.data,
          });
        }
      }
    }
  }, [partner, app]);

  if (!provider) return null;
  const SelectedComponent: FunctionComponent<AuthProps> = React.memo(lazy(() => import(`${provider.path}`)));

  return (
    <>
      {provider ? (
        <Suspense fallback={<></>}>
          <SelectedComponent provider={provider} />
        </Suspense>
      ) : null}
    </>
  );
};

export default SSOController;
