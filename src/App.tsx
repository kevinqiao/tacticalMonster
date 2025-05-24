

import RenderApp from "component/RenderApp";
import SSOController from "component/sso/SSOController";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import React, { useState } from "react";
import usePlatform, { PlatformProvider } from "service/PlatformManager";
import { TerminalProvider } from "service/TerminalManager";
import "./App.css";
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
  const { platform } = usePlatform();
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

  return (
    <Providers>
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}>
        {platform && <RenderApp />}
      </div>
    </Providers>
  );
};

const App: React.FC = () => {
  const [ssoLoaded, setSsoLoaded] = useState(false);
  const Providers = FlattenedProviderTree([
    [ConvexProvider, { client: master_client }],
    [UserProvider],
    [PageProvider],
    [PlatformProvider],

  ]);
  console.log("App", ssoLoaded)
  return (

    <Providers>

      {ssoLoaded && <StyleApp />}
      <SSOController onLoad={() => setSsoLoaded(true)} />
      {/* <GameLauncher /> */}

    </Providers>

  );
};
export default App;
