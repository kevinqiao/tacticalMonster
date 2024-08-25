import { ClerkProvider, SignIn, useAuth, useClerk } from "@clerk/clerk-react";
import { AuthCloseBtn } from "component/common/StyledComponents";
import { useConvex } from "convex/react";
import React, { useEffect, useMemo, useRef } from "react";
import { useUserManager } from "service/UserManager";
import { buildNavURL } from "util/PageUtils";
import { api } from "../../../convex/_generated/api";
import { AuthProps } from "../SSOController";
import "../signin.css";
import useClerkAnimate from "./hook/useClerkAnimate";

const AuthorizeToken: React.FC<AuthProps> = ({ provider, authInit }) => {
  const loadingRef = useRef<HTMLDivElement | null>(null);
  const maskRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLDivElement | null>(null);
  const { signOut } = useClerk();
  const { getToken, isSignedIn } = useAuth();
  const { authComplete } = useUserManager();

  useClerkAnimate({
    loadingRef,
    maskRef,
    controllerRef,
    closeBtnRef,
    authInit,
  });
  const convex = useConvex();
  console.log(authInit);
  useEffect(() => {
    const channelAuth = async () => {
      const t: string | null = await getToken();
      console.log("token:" + t);
      if (t !== null && provider) {
        const res = await convex.action(api.authoize.authorize, {
          data: { jwttoken: t },
          channelId: provider.channelId,
          partnerId: provider.partnerId,
        });
        if (res?.ok) {
          signOut();
          authComplete(res.message, 1);
        }
      }
    };
    if (provider) channelAuth();
  }, [provider]);
  const afterSignedURL = useMemo(() => {
    if (authInit && provider) {
      const { app, name } = authInit.afterSignedPage;
      const params = authInit.afterSignedPage.params
        ? { ...authInit.afterSignedPage.params, redirect: "1", partner: provider.partnerId + "" }
        : { redirect: "1", partner: provider.partnerId + "" };
      const url = buildNavURL({ app, name, params });
      return url;
    }
  }, [authInit, provider]);
  console.log(afterSignedURL);

  return (
    <>
      <div ref={maskRef} className="auth_mask"></div>
      <div className="auth_check">
        <div ref={loadingRef} style={{ opacity: 0, visibility: "hidden", fontSize: 30, color: "white" }}>
          Authenticating....
        </div>
      </div>
      <AuthCloseBtn ref={closeBtnRef} style={{ zIndex: 2001, opacity: 0, visibility: "hidden" }} />
      <div ref={controllerRef} className="signin_control">
        {!isSignedIn ? (
          <SignIn key={afterSignedURL} redirectUrl={afterSignedURL} afterSignInUrl={afterSignedURL} />
        ) : null}
      </div>
    </>
  );
};

const ClerkAuthenticator: React.FC<AuthProps> = (props) => {
  return (
    <ClerkProvider publishableKey="pk_test_bGVuaWVudC1sb3VzZS04Ni5jbGVyay5hY2NvdW50cy5kZXYk">
      <AuthorizeToken {...props} />
    </ClerkProvider>
  );
};
export default ClerkAuthenticator;
