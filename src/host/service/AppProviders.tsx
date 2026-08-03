import { ConvexProvider, ConvexReactClient } from "convex/react";
import React from "react";
import BootLoadingOverlay from "../BootLoadingOverlay";
import ClerkAuthShell from "../sso/ClerkAuthShell";
import ConvexAuthBinder from "./platformAuth/ConvexAuthBinder";
import { EmbedAuthGateProvider } from "./platformAuth/EmbedAuthGateProvider";
import EmbedAuthBridge from "./platformAuth/EmbedAuthBridge";
import { PartnerSessionGuard } from "./platformAuth/PartnerSessionGuard";
import { PlatformAuthProvider } from "./platformAuth/PlatformAuthProvider";
import PartnerProvider from "./PartnerManager";
import { MockRewardedAdOverlay } from "./ads/rewarded/MockRewardedAdOverlay";
import { AudioProvider } from "./audio/AudioProvider";
import { ModalProvider } from "./ModalManager";
import { PageProvider } from "./PageManager";
import { MaintenanceGate } from "./platformStatus/MaintenanceGate";
import { SharedPageDataProvider } from "./SharedPageDataManager";
import { UserProvider } from "./UserManager";
/** Vite 使用 import.meta.env，同时支持 REACT_APP_ 前缀以保持兼容性 */
export function getConvexClient(): ConvexReactClient {
    const convexUrl =
        import.meta.env.VITE_CONVEX_URL ||
        import.meta.env.REACT_APP_CONVEX_URL ||
        "https://cool-salamander-393.convex.cloud";
    return new ConvexReactClient(convexUrl);
}

const master_client = getConvexClient();

export { master_client as ssoConvexClient };

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <ConvexProvider client={master_client}>
            <PlatformAuthProvider>
                <PartnerProvider>
                    <UserProvider>
                        <EmbedAuthGateProvider>
                            <ClerkAuthShell>
                                <EmbedAuthBridge />
                                <PartnerSessionGuard />
                                <ConvexAuthBinder>
                                <SharedPageDataProvider>
                                    <PageProvider>
                                        <AudioProvider>
                                            <BootLoadingOverlay />
                                            <MockRewardedAdOverlay />
                                            <MaintenanceGate>
                                              <ModalProvider>{children}</ModalProvider>
                                            </MaintenanceGate>
                                        </AudioProvider>
                                    </PageProvider>
                                </SharedPageDataProvider>
                            </ConvexAuthBinder>
                        </ClerkAuthShell>
                        </EmbedAuthGateProvider>
                    </UserProvider>
                </PartnerProvider>
            </PlatformAuthProvider>
        </ConvexProvider>
    );
};