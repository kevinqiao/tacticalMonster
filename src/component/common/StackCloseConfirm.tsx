import gsap from "gsap";
import React, { useCallback, useEffect, useRef } from "react";

const StackCloseConfirm: React.FC<{ onConfirm: () => void; onCancel: () => void }> = ({ onConfirm, onCancel }) => {
  const maskRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        tl.kill();
      },
    });
    tl.to(maskRef.current, { autoAlpha: 0.6, duration: 0.7 }).to(
      confirmRef.current,
      { scale: 1, autoAlpha: 1, duration: 0.7 },
      "<"
    );
    tl.play();
  }, []);
  const cancel = useCallback(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        onCancel();
        tl.kill();
      },
    });
    tl.to(maskRef.current, { autoAlpha: 0, duration: 0.1 }).to(
      confirmRef.current,
      { scale: 0, autoAlpha: 0, duration: 0.1 },
      "<"
    );
    tl.play();
  }, [onCancel]);
  return (
    <>
      <div
        ref={maskRef}
        style={{
          position: "absolute",
          margin: 0,
          border: 0,
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          opacity: 0,
          backgroundColor: "black",
        }}
      ></div>

      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          height: "100%",
        }}
      >
        <div
          ref={confirmRef}
          style={{
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",
            width: "70%",
            maxWidth: 300,
            height: "50%",
            maxHeight: 150,
            backgroundColor: "red",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              width: 100,
              height: 40,
              backgroundColor: "blue",
              borderRadius: 4,
              color: "white",
            }}
            onClick={onConfirm}
          >
            <span>Confirm</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              width: 100,
              height: 40,
              backgroundColor: "blue",
              borderRadius: 4,
              color: "white",
            }}
            onClick={cancel}
          >
            <span>Cancel</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default StackCloseConfirm;
