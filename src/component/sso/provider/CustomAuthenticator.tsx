import { useConvex } from "convex/react";
import React, { useCallback } from "react";
import { api } from "../../../convex/sso/convex/_generated/api";
import { AuthProps } from "../SSOController";
// const client = new ConvexReactClient("https://cool-salamander-393.convex.cloud");
const CustomAuthenticator: React.FC<AuthProps> = (props) => {
    const convex = useConvex();
    const login = useCallback(async () => {
        const res = await convex.action(api.service.AuthManager.authenticate, { partner: 1, data: {}, channel: 1 });
        console.log(res);
    }, [convex])
    return <>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", height: "100%", backgroundColor: "black" }}>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: 150, height: 40, backgroundColor: "red", color: "white" }} onClick={login}>
                START
            </div>
        </div>
    </>
}

export default CustomAuthenticator;
