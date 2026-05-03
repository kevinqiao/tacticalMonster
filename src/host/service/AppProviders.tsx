import { ConvexProvider, ConvexReactClient } from "convex/react";
import React from "react";
import BootLoadingOverlay from "../BootLoadingOverlay";
import PartnerProvider from "./PartnerManager";
import { ModalProvider } from "./ModalManager";
import { PageProvider } from "./PageManager";
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

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <ConvexProvider client={master_client}>
            <PartnerProvider>
                <UserProvider>
                    <SharedPageDataProvider>
                        <PageProvider>
                            <BootLoadingOverlay />
                            <ModalProvider>{children}</ModalProvider>
                        </PageProvider>
                    </SharedPageDataProvider>
                </UserProvider>
            </PartnerProvider>
        </ConvexProvider>
    );
};
