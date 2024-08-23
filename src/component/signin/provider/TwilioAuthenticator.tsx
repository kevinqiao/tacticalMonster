import { AuthCloseBtn } from "component/common/StyledComponents";
import { useConvex } from "convex/react";
import { gsap } from "gsap";
import { CountryCode } from "libphonenumber-js";
import React, { useCallback, useEffect, useRef, useState } from "react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import VerificationInput from "react-verification-input";
import { useUserManager } from "service/UserManager";
import { AuthProps } from "../SSOController";
import useTwilioAnimate from "./hook/useTwilioAnimate";
import "./provider.css";

const countries: CountryCode[] = ["US", "CA", "AU"];

const TwilioAuthenticator = React.memo(({ provider, authInit }: AuthProps) => {
  const [country, setCountry] = useState<string | undefined>("CA");
  const maskRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLDivElement | null>(null);
  const [phone, setPhone] = useState<string | undefined>(undefined);
  const [codeRequest, setCodeRequest] = useState<{ phone: string; time: number } | null>(null);
  const codeRef = useRef<string | null>(null);
  const { authComplete } = useUserManager();
  const convex = useConvex();

  const { playOpen, playClose } = useTwilioAnimate({
    maskRef,
    controllerRef,
    closeBtnRef,
    authInit,
  });

  useEffect(() => {
    if (!authInit) return;
    const req = localStorage.getItem("code_request");
    if (req) {
      const reqObj = JSON.parse(req);
      if (reqObj.time - Date.now() > 0) {
        setCodeRequest(reqObj);
        playOpen(null, false);
      } else {
        authInit.open > 0 ? playOpen(null, true) : playClose(null);
        localStorage.removeItem("code_request");
      }
    } else {
      authInit.open > 0 ? playOpen(null, true) : playClose(null);
    }
  }, [playOpen, authInit]);
  const signin = useCallback(() => {
    console.log(authInit);
    const req = { phone: "6475458440", time: Date.now() + 60000 };
    localStorage.setItem("code_request", JSON.stringify(req));
    gsap.to(closeBtnRef.current, { autoAlpha: 0, duration: 0.2 });
    setCodeRequest(req);
  }, []);
  const onComplete = useCallback(() => {
    console.log("complete code input:" + codeRef.current);
  }, []);
  return (
    <>
      <div ref={maskRef} className="auth_mask"></div>
      <AuthCloseBtn ref={closeBtnRef} style={{ zIndex: 2001, opacity: 0, visibility: "hidden" }} />
      <div ref={controllerRef} className="signin_control">
        {!codeRequest || codeRequest.time - Date.now() < 0 ? (
          <div className="twilio_phone_input">
            <PhoneInput
              placeholder={"enter phone number"}
              countries={countries}
              defaultCountry={country as CountryCode}
              value={phone}
              onChange={setPhone}
            />
            <div style={{ height: 70 }} />
            <div className="twilio_signup_btn" onClick={signin}>
              Sign Up
            </div>
          </div>
        ) : (
          <div className="twilio_code_input">
            <VerificationInput
              length={5}
              validChars="0-9"
              autoFocus={true}
              onChange={(v) => {
                codeRef.current = v;
              }}
              onComplete={onComplete}
            />
          </div>
        )}
      </div>
    </>
  );
});
TwilioAuthenticator.displayName = "TwilioAuthenticator";
export default TwilioAuthenticator;
