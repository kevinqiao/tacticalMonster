import NavPage from "component/NavPage";
import StackController from "component/StackController";
import MainMenu from "component/menu/MainMenu";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { gsap } from "gsap";
import MotionPathPlugin from "gsap/MotionPathPlugin";
import React from "react";
import { PageProvider } from "./service/PageManager";
import { TerminalProvider } from "./service/TerminalManager";
import { UserProvider } from "./service/UserManager";
// Register the plugin once globally
gsap.registerPlugin(MotionPathPlugin);
// gsap.registerPlugin(TransformPlugin);

const convex = new ConvexReactClient("https://dazzling-setter-839.convex.cloud");
function TgApp() {
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

  const Providers = FlattenedProviderTree([
    [TerminalProvider],
    [PageProvider],
    [ConvexProvider, { client: convex }],
    [UserProvider],
    // [TelegramAuthProvider],
    // [EventProvider],
  ]);
  return (
    <Providers>
      <MainMenu />
      <NavPage />
      <StackController />
    </Providers>
  );
}

export default TgApp;
