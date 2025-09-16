import { useConvex } from "convex/react";
import gsap from "gsap";
import React, { useCallback, useEffect, useRef } from "react";
import { usePageManager } from "service/PageManager";
import { usePlatform } from "service/PlatformManager";
import { useUserManager } from "service/UserManager";
import { api } from "../../../convex/sso/convex/_generated/api";
import { User } from "../../../service/UserManager";
import { AuthProps } from "../SSOController";
// const client = new ConvexReactClient("https://cool-salamander-393.convex.cloud");
const WebAuthenticator: React.FC<AuthProps> = ({ onLoad }) => {

    const { user, authComplete } = useUserManager();
    const { platform } = usePlatform();
    const { loadingBG, authReq, cancelAuth } = usePageManager();
    const containerRef = useRef<HTMLDivElement>(null);
    const maskRef = useRef<HTMLDivElement>(null);
    const convex = useConvex();
    const login = useCallback(async (cuid: string) => {
        console.log("WebAuthenticator", "platform", platform);
        if (platform?.pid) {
            const res: User | null = await convex.action(api.service.WebAuthenticator.authenticate, { platformId: platform.pid, data: { cuid }, cid: "1" });
            console.log("WebAuthenticator", "res", res);
            if (res) {
                authComplete(res, 1);
            }
        }
    }, [convex, platform])


    const open = useCallback(() => {
        if (containerRef.current && maskRef.current) {

            const tl = gsap.timeline();
            if (loadingBG.status === 1) {
                tl.to(loadingBG.ele, { autoAlpha: 0, duration: 0, ease: "power2.out" }, ">")
            }
            tl.fromTo(maskRef.current,
                { autoAlpha: 0, backgroundColor: "blue" },
                { autoAlpha: 0.5, duration: 0.3 }, 0);
            tl.fromTo(containerRef.current,
                { autoAlpha: 1, x: "100%" },
                { x: 0, duration: 0.3, ease: "power2.out" }, 0);

            tl.play();
        }
    }, [loadingBG])
    const close = useCallback(() => {
        if (containerRef.current && maskRef.current) {

            const tl = gsap.timeline();
            tl.to(maskRef.current, {
                autoAlpha: 0,
                duration: 0.3
            }, 0);
            tl.to(containerRef.current, {
                x: "100%",
                duration: 0.3,
                ease: "power2.in"
            }, 0);

            tl.play();
        }
    }, [])
    useEffect(() => {
        onLoad();
    }, [])
    useEffect(() => {
        console.log("authReq", authReq);
        if (authReq) {
            open();
        } else {
            close();
        }
    }, [authReq])


    return <>
        <div style={{ position: "absolute", top: 0, left: 0, zIndex: 2000, width: "100%", height: "100%", backgroundColor: "transparent", pointerEvents: "none", overflow: "hidden" }}>
            {/* 遮罩层 */}
            <div ref={maskRef} style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                backgroundColor: "black",
                opacity: 0,
                overflow: "hidden",
                pointerEvents: "auto"
            }} onClick={cancelAuth

            } />

            {/* 滑动面板 */}
            <div ref={containerRef} style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: "40%",
                height: "100%",
                minWidth: 350,
                maxWidth: 500,
                pointerEvents: "auto",
                overflow: "hidden",
                opacity: 0,
                zIndex: 1
            }}>
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", height: "100%", backgroundColor: "white", pointerEvents: "auto" }}>
                    <div style={{ width: 400, display: "flex" }}>
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: 150, height: 40, backgroundColor: "red", color: "white" }} onClick={() => login("11111")}>
                            Player1
                        </div>
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: 150, height: 40, backgroundColor: "red", color: "white" }} onClick={() => login("22222")}>
                            Player2
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </>
}

export default WebAuthenticator;
