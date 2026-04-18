import { useModalManager } from "@/service/ModalManager";
import { useSharedValue } from "@/service/SharedPageDataManager";
import { useEffect, useState } from "react";

const Header: React.FC = () => {
    const lobbyHeadDimension = useSharedValue("lobby.head.dimension");
    // console.log("lobbyHeadDimension", lobbyHeadDimension);
    if (lobbyHeadDimension == null) return null;
    return (
        <div id="header" style={{ width: lobbyHeadDimension.width, height: lobbyHeadDimension.height, backgroundColor: "transparent" }}></div>
    )
}

const Content: React.FC = () => {
    const [dimension, setDimension] = useState<{ lw: number; rw: number; height: number } | null>(null);
    const lobbyContentDimension = useSharedValue("lobby.content.dimension");
    const { openModal } = useModalManager();


    useEffect(() => {
        if (lobbyContentDimension == null) return;
        const { width, height } = lobbyContentDimension;
        const ratio = width / height;
        const w = ratio < 1.6 ? width * 0.9 : height * 1.6 * 0.9;
        const h = w / 1.6;
        setDimension({ lw: w * 0.6, rw: w * 0.4, height: h });
    }, [lobbyContentDimension])

    return (
        <div id="content" style={{ display: "flex", justifyContent: "space-around", alignItems: "center", width: lobbyContentDimension?.width, height: lobbyContentDimension?.height, backgroundColor: "white" }}>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: dimension?.lw, height: dimension?.height, marginLeft: "30px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%", height: "60%" }}>
                    <div style={{
                        width: "60%", height: "100%", backgroundColor: "yellow", transform: "scale(0.95)",
                        transformOrigin: "top left"
                    }}></div>
                    <div style={{
                        width: "40%", height: "100%", backgroundColor: "purple", transform: "scale(0.95)",
                        transformOrigin: "top right"
                    }}></div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", width: "100%", height: "40%" }}>
                    <div style={{
                        width: "40%", height: "100%", backgroundColor: "purple", transform: "scale(0.95)",
                        transformOrigin: "bottom left"
                    }}></div>
                    <div style={{
                        width: "60%", height: "100%", backgroundColor: "red", transform: "scale(0.95)",
                        transformOrigin: "bottom right"
                    }}></div>
                </div>
            </div>
            <div style={{ position: "relative", width: dimension?.rw, height: dimension?.height, backgroundColor: "red", marginRight: "50px" }}>
                <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", position: "absolute", bottom: 0, left: 0, width: "100%", height: "60px" }}>
                    <div style={{ cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", width: "80px", height: "45px", backgroundColor: "blue", color: "white" }} onClick={() => openModal("join_tournament", undefined, { name: "swipeRight", args: { width: "30%" } })}>JOIN</div>
                    <div style={{ cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", width: "80px", height: "45px", backgroundColor: "green", color: "white" }}>RECORD</div>
                </div>
            </div>

        </div >
    )
}

const LandscapeContent: React.FC = () => {
    return (
        <>
            <Header />
            <Content />
            {/* <Footer /> */}
            <div style={{ position: "relative", top: -10, display: "flex", justifyContent: "space-around", alignItems: "flex-start", width: "100%", height: "300px" }}>
                <div style={{ width: "25%", maxWidth: 250, height: 150, backgroundColor: "red" }}></div>
                <div style={{ width: "25%", maxWidth: 250, height: 150, backgroundColor: "blue" }}></div>
                <div style={{ width: "25%", maxWidth: 250, height: 150, backgroundColor: "green" }}></div>
            </div>
        </>
    )
}
export default LandscapeContent;