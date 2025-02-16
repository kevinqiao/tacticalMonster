

import GameLauncher from "component/launcher/GameLanucher";
import RenderApp from "component/RenderApp";
import SSOController from "component/sso/SSOController";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import React from "react";
import { TerminalProvider } from "service/TerminalManager";
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
  const theme = {
    primaryColor: "#4CAF50",
    secondaryColor: "#45A049",
    backgroundColor: "#F0F0F0",
  };

  const Providers = FlattenedProviderTree([
    [TerminalProvider],
    // [LocalizationProvider],
    // [ThemeProvider, { theme }],
    // [PartnerProvider],
  ]);
  console.log("style app...");
  return (
    <Providers>
      <div style={{ position: "absolute", top: 0, left: 0, width: "100vw", height: "100vh" }}>
        <RenderApp />
      </div>
    </Providers>
  );
};

const App: React.FC = () => {

  const Providers = FlattenedProviderTree([
    [ConvexProvider, { client: master_client }],
    [UserProvider],
    [PageProvider],

  ]);

  return (

    <Providers>
      <StyleApp />
      <SSOController />
      <GameLauncher />
    </Providers>

  );
};
export default App;
