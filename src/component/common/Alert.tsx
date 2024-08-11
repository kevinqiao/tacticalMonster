import gsap from "gsap";
import React, { useCallback, useEffect, useRef } from "react";
import useEventSubscriber from "service/EventManager";
import { usePartnerManager } from "service/PartnerManager";

const Alert: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const maskRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLDivElement>(null);
  const { event } = useEventSubscriber([], ["alert"]);
  const { partner } = usePartnerManager();
  // useEffect(() => {
  //   if (partner) cancel();
  // }, [partner]);
  useEffect(() => {
    if (event) open();
  }, [event]);

  const open = useCallback(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        tl.kill();
      },
    });
    tl.to(containerRef.current, { autoAlpha: 1, duration: 0.1 })
      .to(maskRef.current, { autoAlpha: 0.6, duration: 0.7 }, ">")
      .to(confirmRef.current, { scale: 1, autoAlpha: 1, duration: 0.7 }, "<");
    tl.play();
  }, []);

  const cancel = useCallback(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        tl.kill();
      },
    });
    tl.to(maskRef.current, { autoAlpha: 0, duration: 0.4 })
      .to(confirmRef.current, { scale: 0.4, autoAlpha: 0, duration: 0.4 }, "<")
      .to(containerRef.current, { autoAlpha: 0, duration: 0.1 }, ">");
    tl.play();
  }, []);

  return (
    <>
      <div
        ref={maskRef}
        style={{
          position: "absolute",
          zIndex: 90000,
          margin: 0,
          border: 0,
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          opacity: 0,
          visibility: "hidden",
          backgroundColor: partner ? "black" : "blue",
        }}
      ></div>

      <div
        ref={containerRef}
        style={{
          position: "absolute",
          zIndex: 90002,
          top: 0,
          left: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          height: "100%",
          opacity: 0,
          visibility: "hidden",
        }}
        onClick={cancel}
      >
        <div
          ref={confirmRef}
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            alignItems: "center",
            width: "70%",
            maxWidth: 300,
            height: "70%",
            maxHeight: 150,
            backgroundColor: "red",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "60%",
              width: "100%",
              color: "white",
            }}
          >
            {event?.data}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              width: 100,
              height: 40,
              backgroundColor: "blue",
              marginBottom: 5,
              borderRadius: 4,
              color: "white",
            }}
            onClick={cancel}
          >
            <span>Ok</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default Alert;
