import { gsap } from "gsap";
import React, { useEffect, useRef } from "react";
import "../register.css";
const Modifier: React.FC = () => {
  const discountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        tl.kill();
      },
    });
  }, []);

  return (
    <>
      <div ref={discountRef} className="active-container">
        <div className="active-content">Modifier</div>
      </div>
    </>
  );
};

export default Modifier;
