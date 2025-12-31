import { usePartnerManager } from "@/service/PartnerManager";
import gsap from "gsap";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { usePageManager } from "service/PageManager";
import SignInWeb from "../signin/SignInWeb";
// const client = new ConvexReactClient("https://cool-salamander-393.convex.cloud");
const WebPanel1: React.FC = () => {
    const { partner } = usePartnerManager();
    const { loadingBG, authReq, cancelAuth } = usePageManager();
    const containerRef = useRef<HTMLDivElement>(null);
    const maskRef = useRef<HTMLDivElement>(null);
    const providers = useMemo(() => {
        return partner?.auth_channels?.map((channel) => channel.provider) ?? []
    }, [partner])
    const getAuthChannel = useCallback((provider: string) => {
        return partner?.auth_channels?.find((channel) => channel.provider === provider)
    }, [partner])

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
        console.log("authReq", authReq);
        if (authReq) {
            open();
        } else {
            close();
        }
    }, [authReq])

    console.log("WebPanel1 providers:", providers);
    return <>
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
            {getAuthChannel("web") && <SignInWeb key="web" cid={getAuthChannel("web")?.cid ?? 0} />}
        </div>

    </>
}

export default WebPanel1;
