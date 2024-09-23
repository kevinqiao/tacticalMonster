import Selector from "component/common/Selector";
import { AuthCloseBtn } from "component/common/StyledComponents";
import VerifyCode from "component/common/VerifyCode";
import { useConvex } from "convex/react";
import { gsap } from "gsap";
import React, { useCallback, useEffect, useRef, useState } from "react";
import useEventSubscriber from "service/EventManager";
import { useUserManager } from "service/UserManager";
import { AuthProps } from "../SSOController";
import "../signin.css";
import useCustomAnimate from "./hook/useCustomAnimate";
import "./provider.css";
const options = [
  {
    value: "100001",
    label: "EMP 100001",
  },
  {
    value: "100002",
    label: "EMP 100002",
  },
  {
    value: "100003",
    label: "EMP 100003",
  },
];
const CustomAuthenticator: React.FC<AuthProps> = ({ provider, authInit }) => {
  const loadingRef = useRef<HTMLDivElement | null>(null);
  const maskRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLDivElement | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const { authComplete } = useUserManager();
  const [reqOpen, setReqOpen] = useState<number>(0);
  const { event } = useEventSubscriber(["signin"], ["account"]);
  console.log("custom authenticator....");
  console.log(authInit);
  const { playClose, playOpen } = useCustomAnimate({
    loadingRef,
    maskRef,
    controllerRef,
    closeBtnRef,
  });
  const convex = useConvex();

  useEffect(() => {
    if (event) {
      playOpen(null);
      setReqOpen(1);
    }
  }, [event]);
  useEffect(() => {
    console.log(authInit);
    if (authInit && authInit.open > 0) {
      setReqOpen(1);
      playOpen(null);
    } else playClose(null);
  }, [authInit]);

  const close = useCallback(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        if (authInit && authInit.open > 0) window.history.back();
        setReqOpen(0);
        tl.kill();
      },
    });
    playClose(tl);
  }, [authInit]);
  const handleComplete = (code: string) => {
    console.log(code);
    playClose(null);
  };
  const handleSelect = (empId: string) => {
    setEmployeeId(empId);
  };
  return (
    <>
      <div ref={maskRef} className="auth_mask"></div>
      <div className="auth_check">
        <div ref={loadingRef} style={{ opacity: 0, visibility: "hidden", fontSize: 30, color: "white" }}>
          Authenticating....
        </div>
      </div>
      <AuthCloseBtn ref={closeBtnRef} style={{ zIndex: 2001, opacity: 0, visibility: "hidden" }} onClick={close} />

      <div ref={controllerRef} className="signin_control">
        <div className="password-container">
          <div id="code_enter" className="keypad-panel">
            <Selector options={options} onSelect={handleSelect} />
          </div>

          <div id="key_pad" className="keypad-panel">
            {employeeId ? <VerifyCode onComplete={handleComplete} /> : <div style={{ height: 400 }}></div>}
          </div>
        </div>
      </div>
    </>
  );
};

export default CustomAuthenticator;
