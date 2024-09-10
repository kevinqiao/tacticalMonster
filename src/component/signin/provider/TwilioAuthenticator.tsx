import { AuthCloseBtn } from "component/common/StyledComponents";
import VerifyCode from "component/common/VerifyCode";
import { useConvex } from "convex/react";
import { gsap } from "gsap";
import { CountryCode } from "libphonenumber-js";
import React, { useCallback, useEffect, useRef, useState } from "react";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { usePageManager } from "service/PageManager";
import { usePartnerManager } from "service/PartnerManager";
import { useUserManager } from "service/UserManager";
import { api } from "../../../convex/_generated/api";
import { AuthProps } from "../SSOController";
import useTwilioAnimate from "./hook/useTwilioAnimate";
import "./provider.css";

const countries: CountryCode[] = ["US", "CA", "AU"];

const TwilioAuthenticator = React.memo(({ provider, authInit }: AuthProps) => {
  const [country, setCountry] = useState<string | undefined>("CA");
  const maskRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLDivElement | null>(null);
  const { partner } = usePartnerManager();
  const { openPage } = usePageManager();
  const [phone, setPhone] = useState<string | undefined>(undefined);
  const [phoneReady, setPhoneReady] = useState(false);
  const [codeRequest, setCodeRequest] = useState<{ phone: string; seconds: number } | null>(null);
  const codeRef = useRef<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const { authComplete } = useUserManager();
  const convex = useConvex();

  const { playOpen, playClose } = useTwilioAnimate({
    maskRef,
    controllerRef,
    closeBtnRef,
  });
  useEffect(() => {
    setSeconds(codeRequest ? codeRequest.seconds : 0);
    const interval = setInterval(() => {
      setSeconds((prev: number) => {
        if (prev > 0) {
          localStorage.setItem("code_request", JSON.stringify({ phone, seconds: prev - 1 }));
          return prev - 1;
        } else {
          localStorage.removeItem("code_request");
          clearInterval(interval);
          return 0;
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [codeRequest]);
  useEffect(() => {
    if (!authInit) return;
    const req = localStorage.getItem("code_request");
    if (req) {
      const reqObj = JSON.parse(req);
      if (reqObj?.seconds > 0) {
        setCodeRequest(reqObj);
        setPhone(reqObj.phone);
      }
    }
    authInit.open > 0 ? playOpen(null, true) : playClose(null);
  }, [playOpen, authInit]);

  const sumbit = useCallback(async () => {
    if (!phone || !isValidPhoneNumber(phone) || !partner) return;
    const req = { phone, seconds: 60 };
    const res = await convex.action(api.auth.twilio.requestCode, { partner: partner?.pid, phone });
    console.log(res);
    localStorage.setItem("code_request", JSON.stringify(req));
    gsap.to(closeBtnRef.current, { autoAlpha: 0, duration: 0.2 });
    setCodeRequest(req);
  }, [phone, partner, convex]);

  const onComplete = useCallback(() => {
    console.log("complete code input:" + codeRef.current);
  }, []);
  const close = useCallback(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        if (authInit?.cancelPage) openPage(authInit.cancelPage);
        tl.kill();
      },
    });
    playClose(tl);
  }, [authInit]);
  useEffect(() => {
    if (phone && isValidPhoneNumber(phone)) setPhoneReady(true);
    else setPhoneReady(false);
  }, [phone]);

  return (
    <>
      <div ref={maskRef} className="auth_mask"></div>
      {authInit?.cancelPage ? (
        <AuthCloseBtn ref={closeBtnRef} style={{ opacity: 0, visibility: "hidden" }} onClick={close} />
      ) : null}
      <div ref={controllerRef} className="signin_control">
        <div className="twilio_phone_input">
          <div style={{ height: 15 }} />
          <div style={{ display: "flex", width: "100%", justifyContent: "space-around" }}>
            <PhoneInput
              placeholder={"enter phone number"}
              countries={countries}
              defaultCountry={country as CountryCode}
              value={phone}
              onChange={setPhone}
            />
            <div
              className={phoneReady && seconds === 0 ? "twilio_signup_btn" : "twilio_signup_btn btn_disable"}
              onClick={sumbit}
            >
              <span style={{ fontSize: 10 }}>Submit({seconds})</span>
            </div>
          </div>
          <div style={{ height: 15 }} />
          {phoneReady && codeRequest ? (
            <div className="twilio_phone_input">
              <div style={{ height: 35 }}>Please Check SMS for Verification Code</div>
              <div className="twilio_code_input">
                <VerifyCode onComplete={onComplete} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
});
TwilioAuthenticator.displayName = "TwilioAuthenticator";
export default TwilioAuthenticator;
