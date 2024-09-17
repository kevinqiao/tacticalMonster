import { AuthCloseBtn } from "component/common/StyledComponents";
import VerifyCode from "component/common/VerifyCode";
import { useConvex } from "convex/react";
import { gsap } from "gsap";
import { CountryCode } from "libphonenumber-js";
import React, { useCallback, useEffect, useRef, useState } from "react";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
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
  const inputContainerRef = useRef<HTMLDivElement | null>(null);
  const verifyContainerRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLDivElement | null>(null);
  const { partner } = usePartnerManager();
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
  useEffect(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        tl.kill();
      },
    });
    if (phoneReady && codeRequest) {
      openVerify();
    } else {
      openInput();
    }
    tl.play();
  }, [codeRequest, phoneReady]);
  useEffect(() => {
    if (phone && isValidPhoneNumber(phone)) setPhoneReady(true);
    else setPhoneReady(false);
  }, [phone]);

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

  const openVerify = useCallback(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        tl.kill();
      },
    });
    tl.to(verifyContainerRef.current, { x: "-100%", duration: 0.7 });
    tl.to(inputContainerRef.current, { x: "-100%", duration: 0.7 }, "<");
    tl.play();
  }, []);

  const openInput = useCallback(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        tl.kill();
      },
    });
    tl.to(inputContainerRef.current, { x: 0, duration: 0.7 });
    tl.to(verifyContainerRef.current, { x: 0, duration: 0.7 }, "<");
    tl.play();
  }, []);

  return (
    <>
      <div ref={maskRef} className="auth_mask"></div>
      <AuthCloseBtn ref={closeBtnRef} style={{ opacity: 0, visibility: "hidden" }} onClick={() => authInit?.cancel()} />
      <div ref={controllerRef} className="signin_control">
        <div className="twilio_container">
          <div className="twilio_content">
            <div ref={inputContainerRef} className="twilio_phone_input">
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
              <div className="twilio_signup_btn" onClick={openVerify}>
                <span style={{ fontSize: 10 }}>Verify({seconds})</span>
              </div>
            </div>

            <div ref={verifyContainerRef} className="twilio_phone_input">
              <div
                style={{ cursor: "pointer", height: 40, width: "100%", backgroundColor: "blue", color: "white" }}
                onClick={openInput}
              >
                Please Check SMS for Verification Code({seconds})
              </div>
              <div className="twilio_code_input">
                <VerifyCode onComplete={onComplete} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});
TwilioAuthenticator.displayName = "TwilioAuthenticator";
export default TwilioAuthenticator;
