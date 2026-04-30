import { usePartnerManager } from "@/service/PartnerManager";
import { User } from "@/service/UserManager";
import React, { useMemo } from "react";
import SignInWeb from "../signin/SignInWeb";
// const client = new ConvexReactClient("https://cool-salamander-393.convex.cloud");
const WebPanel1: React.FC<{ onComplete: (user: User) => void }> = ({ onComplete }) => {
    const { partner } = usePartnerManager();

    const authChannel = useMemo(() => {
        return partner?.auth_channels?.find((channel) => channel.provider === "web")
    }, [partner])
    return <>

        <div style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "red",
            pointerEvents: "auto",
        }}>
            {authChannel && <SignInWeb key="web" cid={authChannel?.cid ?? 0} onComplete={onComplete} />}

        </div>

    </>
}

export default WebPanel1;
