import RenderApp from "component/RenderApp";
import SSOController from "component/sso/SSOController";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import React, { useState } from "react";
import UserEventHandler from "service/handler/UserEventHandler";
import usePlatform, { PlatformProvider } from "service/PlatformManager";
import "./App.css";
import GameCenterProvider from "./service/GameCenterManager";
import { PageProvider } from "./service/PageManager";
import { UserProvider } from "./service/UserManager";
const master_client = new ConvexReactClient("https://cool-salamander-393.convex.cloud");
// const convex = new ConvexReactClient("https://shocking-leopard-487.convex.cloud");
// const convex = new ConvexReactClient("https://1252780878078152844.discordsays.com/convex-api", {
//   skipConvexDeploymentUrlCheck: true,
// });

export const FlattenedProviderTree = (providers: any): any => {
  if (providers?.length === 1) {
    return providers[0][0];
  }
  const [A, paramsA] = providers.shift();
  const [B, paramsB] = providers.shift();

  return FlattenedProviderTree([
    [
      ({ children }: { children: any }) => (
        <A {...(paramsA || {})}>
          <B {...(paramsB || {})}>{children}</B>
        </A>
      ),
    ],
    ...providers,
  ]);
};
const StyleApp = () => {
  // const { locale } = useLocalization();
  // console.log("style locale:" + locale);
  const [ssoLoaded, setSsoLoaded] = useState(false);
  const { platform } = usePlatform();
  const theme = {
    primaryColor: "#4CAF50",
    secondaryColor: "#45A049",
    backgroundColor: "#F0F0F0",
  };

  return (
    <>
      {platform && ssoLoaded && <RenderApp />}
      <SSOController onLoad={() => setSsoLoaded(true)} />
    </>
  );
};

const App: React.FC = () => {

  const Providers = FlattenedProviderTree([
    [ConvexProvider, { client: master_client }],
    [UserProvider],
    [PageProvider],
    [PlatformProvider],
    [GameCenterProvider],
    // [TerminalProvider],
  ])

  return (

    <Providers>
      <StyleApp />
      {/* <GameLauncher /> */}
      <UserEventHandler />
    </Providers>

  );
};
export default App;
