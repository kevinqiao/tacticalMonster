import { useConvex } from "convex/react";
import React, { useCallback } from "react";
import { useUserManager } from "service/UserManager";
import { api } from "../../../convex/sso/convex/_generated/api";
import { User } from "../../../service/UserManager";
import { AuthProps } from "../SSOController";
// const client = new ConvexReactClient("https://cool-salamander-393.convex.cloud");
const CustomAuthenticator: React.FC<AuthProps> = (props) => {
    const { user, authComplete } = useUserManager();
    const convex = useConvex();
    const login = useCallback(async (cuid: string) => {

        const res: User | null = await convex.action(api.service.AuthManager.authenticate, { partner: 1, data: { cuid }, cid: "1" });
        if (res) {
            authComplete(res, 1);
        }
    }, [convex])

    return <>
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
    </>
}

export default CustomAuthenticator;
