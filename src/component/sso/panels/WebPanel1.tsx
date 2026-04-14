import { usePartnerManager } from "@/service/PartnerManager";
import gsap from "gsap";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import SignInWeb from "../signin/SignInWeb";
// const client = new ConvexReactClient("https://cool-salamander-393.convex.cloud");
const WebPanel1: React.FC<{ visible: number, onClose: () => void }> = ({ visible, onClose }) => {
    const { partner } = usePartnerManager();
    const containerRef = useRef<HTMLDivElement>(null);
    const maskRef = useRef<HTMLDivElement>(null);
    // const providers = useMemo(() => {
    //     return partner?.auth_channels?.map((channel) => channel.provider) ?? []
    // }, [partner])
    const authChannel = useMemo(() => {
        return partner?.auth_channels?.find((channel) => channel.provider === "web")
    }, [partner])

    const open = useCallback(() => {
        if (containerRef.current && maskRef.current) {

            const tl = gsap.timeline();

            tl.fromTo(maskRef.current,
                { autoAlpha: 0, backgroundColor: "blue" },
                { autoAlpha: 0.5, duration: 0.3 }, 0);
            tl.fromTo(containerRef.current,
                { autoAlpha: 1, x: "100%" },
                { x: 0, duration: 0.3, ease: "power2.out" }, 0);

            tl.play();
        }
    }, [])
    const onComplete = useCallback(() => {

        if (containerRef.current && maskRef.current) {

            const tl = gsap.timeline({
                onComplete: onClose
            });
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

    /** 首次挂载 visible=0 时不要执行收起动画，避免未展示就 to(x:"100%") */
    const visiblePrevRef = useRef<number | null>(null);
    useEffect(() => {
        if (visible > 0) {
            open();
        } else if (visiblePrevRef.current !== null && visiblePrevRef.current > 0) {
            onComplete();
        }
        visiblePrevRef.current = visible;
    }, [visible, open, onComplete]);
    // console.log("WebPanel1 providers:", providers);
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
            pointerEvents: "none"
        }} />

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
            {authChannel && <SignInWeb key="web" cid={authChannel?.cid ?? 0} onComplete={onComplete} />}
            {visible === 1 && <div style={{ position: "absolute", top: 0, left: 0, width: "40px", height: "40px", backgroundColor: "grey", pointerEvents: "auto" }} onClick={onComplete} />}
        </div>

    </>
}

export default WebPanel1;
