import { useConvex } from "convex/react";
import gsap from "gsap";
import React, { useEffect, useMemo, useRef } from "react";
import { usePageManager } from "service/PageManager";
import { TelegramWebApp, usePlatform } from "service/PlatformManager";
import { useUserManager } from "service/UserManager";
import { api } from "../../../convex/sso/convex/_generated/api";
import { AuthProps } from "../SSOController";
// const client = new ConvexReactClient("https://cool-salamander-393.convex.cloud");
const TelegramAuthenticator: React.FC<AuthProps> = ({ onLoad }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { authComplete } = useUserManager();
    const { sdk, platform } = usePlatform();
    const { authReq } = usePageManager();
    const convex = useConvex();
    const isInTelegram = useMemo(() => {
        const telegramSdk = sdk as TelegramWebApp;
        if (telegramSdk?.initDataUnsafe.user) {
            return true;
        }
        return false;
    }, [sdk])

    const close = () => {
        gsap.set(document.body, { backgroundColor: "transparent" });
        gsap.to(containerRef.current, { autoAlpha: 0, duration: 0.3, ease: "power2.inOut" });
    }
    const open = () => {
        gsap.set(document.body, { backgroundColor: "black" });
        gsap.to(containerRef.current, { autoAlpha: 1, duration: 0.3, ease: "power2.inOut" });
    }

    useEffect(() => {
        console.log("TelegramAuthenticator", "onloading");
        onLoad();
    }, [onLoad])
    useEffect(() => {

        if (authReq) {
            open();
        } else {
            close();
        }
    }, [authReq])
    useEffect(() => {
        const verifyTelegram = async () => {
            if (isInTelegram && platform?.pid) {
                const telegramSdk = sdk as TelegramWebApp;
                console.log("TelegramAuthenticator", "telegramSdk", telegramSdk.initData);
                const u = await convex.action(api.service.TelegramAuthenticator.authenticate, { platformId: platform.pid, initData: telegramSdk.initData });
                console.log("TelegramAuthenticator ", u);
                if (u) {
                    authComplete(u, 1);
                }
            }
        }
        verifyTelegram();
    }, [isInTelegram, platform])


    return (
        <>
            <div ref={containerRef} style={{ position: "absolute", top: 0, left: 0, display: "flex", justifyContent: "center", alignItems: "center", width: "100%", height: "100%", opacity: 0, pointerEvents: "auto" }}>

                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: 150, height: 40, backgroundColor: "red", color: "white" }}>
                    {isInTelegram ? "in telegram" : "outside of telegram"}
                </div>

            </div>
        </>
    )
}

export default TelegramAuthenticator;
