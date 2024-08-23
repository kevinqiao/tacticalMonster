import Alert from "component/common/Alert";
import GlobalStyle from "component/common/GlobalStyle";
import Head from "component/common/Head";
import RenderApp from "component/RenderApp";
import SSOController from "component/signin/SSOController";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import React, { useMemo } from "react";
import { EventProvider } from "service/EventManager";
import { LocalizationProvider } from "service/LocalizationManager";
import PartnerProvider from "service/PartnerManager";
import { TerminalProvider } from "service/TerminalManager";
import { ThemeProvider } from "styled-components";
import { PageProvider } from "./service/PageManager";
import { UserProvider } from "./service/UserManager";

const convex = new ConvexReactClient("https://dazzling-setter-839.convex.cloud");
// const convex = new ConvexReactClient("https://1252780878078152844.discordsays.com/convex-api", {
//   skipConvexDeploymentUrlCheck: true,
// });
const MainApp = () => {
  console.log("main app...");
  const render = useMemo(
    () => (
      <>
        <div style={{ position: "relative", top: 0, left: 0, width: "100vh", height: "100vw" }}>
          {/* <NavPage /> */}
          <RenderApp />
        </div>
        <SSOController />
      </>
    ),
    []
  );

  return <>{render}</>;
};

const FlattenedProviderTree = (providers: any): any => {
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
    // [SceneProvider],
    [PageProvider],
    [EventProvider],
    [TerminalProvider],
    [ThemeProvider, { theme }],
    [UserProvider],
    [PartnerProvider],
  ]);
  console.log("style app...");
  return (
    <Providers>
      <Head />
      <GlobalStyle />
      <div style={{ position: "relative", top: 0, left: 0, width: "100vh", height: "100vw" }}>
        <RenderApp />
      </div>
      <Alert />
    </Providers>
  );
};

const App: React.FC = () => {
  const Providers = FlattenedProviderTree([[ConvexProvider, { client: convex }], [LocalizationProvider]]);
  console.log("app....");
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Providers>
        <StyleApp />
      </Providers>
    </div>
  );
};
export default App;
