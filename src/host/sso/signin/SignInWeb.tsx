import { api } from "@/convex/sso/convex/_generated/api";
import { User } from "host/service/UserManager";
import { useConvex } from "convex/react";
import React, { useCallback } from "react";
// const client = new ConvexReactClient("https://cool-salamander-393.convex.cloud");
const SignInWeb: React.FC<{ cid: number, onComplete: (user: User) => void }> = ({ cid, onComplete }) => {
    const convex = useConvex();
    const login = useCallback(async (email: string) => {

        const res: User | null = await convex.action(api.service.AuthManager.authenticate, { cid, data: { email, password: "12345" } });
        console.log("WebAuthenticator", "res", res);
        if (res) {
            // authComplete(res, 1);
            onComplete(res);
        }
    }, [convex, onComplete])


    return (
        <>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", height: "100%", backgroundColor: "white", pointerEvents: "auto" }}>
                <div style={{ width: 400, display: "flex" }}>
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: 150, height: 40, backgroundColor: "red", color: "white" }} onClick={() => login("kevin1@gmail.com")}>
                        Player1
                    </div>
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: 150, height: 40, backgroundColor: "red", color: "white" }} onClick={() => login("kevin2@gmail.com")}>
                        Player2
                    </div>
                </div>
            </div>
        </>
    )
}

export default SignInWeb;
