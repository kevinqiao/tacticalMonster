import { useConvex } from "convex/react";
import React, { useCallback } from "react";
import { useUserManager } from "service/UserManager";
import { api } from "../../../convex/sso/convex/_generated/api";
import { User } from "../../../service/UserManager";
import { AuthProps } from "../SSOController";
// const client = new ConvexReactClient("https://cool-salamander-393.convex.cloud");
const CustomAuthenticator: React.FC<AuthProps> = (props) => {
    const { authComplete } = useUserManager();
    const convex = useConvex();
    const login = useCallback(async () => {
        console.log("login");
        const res: User | null = await convex.action(api.service.AuthManager.authenticate, { partner: 1, data: {}, channel: 1 });
        console.log(res);
        if (res) {
            const expire = res.expire ? res.expire + Date.now() : 0;
            authComplete({ ...res, expire }, 1);
        }
    }, [convex])
    // console.log(user);
    return <>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", height: "100%", backgroundColor: "black", pointerEvents: "auto" }}>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: 150, height: 40, backgroundColor: "red", color: "white" }} onClick={login}>
                START
            </div>
        </div>
    </>
}

export default CustomAuthenticator;
