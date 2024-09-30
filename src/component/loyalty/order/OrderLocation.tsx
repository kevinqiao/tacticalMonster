import React, { useCallback, useEffect, useRef, useState } from "react";

import gsap from "gsap";
import { useOrderManager } from "../service/OrderManager";
import AddressInput from "./location/AddressInput";
import NameInput from "./location/NameInput";
import PhoneInput from "./location/PhoneInput";
import "./order.css";
const OrderLocation: React.FC = () => {
  const maskRef = useRef<HTMLDivElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const [type, setType] = useState<number>(0);
  const { order } = useOrderManager();
  const location = order?.location;
  console.log(location);
  useEffect(() => {
    type > 0 ? open() : close();
  }, [type]);

  const open = useCallback(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        tl.kill();
      },
    });
    tl.to(maskRef.current, { autoAlpha: 0.4, duration: 0.6 });
    tl.fromTo(popRef.current, { scale: 0.5, autoAlpha: 1 }, { scale: 1.0, duration: 0.6 }, "<");
    tl.play();
  }, []);
  const close = useCallback(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        tl.kill();
      },
    });
    tl.to(maskRef.current, { autoAlpha: 0, duration: 0.6 });
    tl.to(popRef.current, { scale: 0.5, autoAlpha: 0, duration: 0.6 }, "<");
    tl.play();
  }, []);

  return (
    <>
      <div style={{ position: "relative", width: "100%" }}>
        <div className="location-container">
          {location?.tableNo != null && (
            <div className="location-item" onClick={() => setType(1)}>{`Table:${location.tableNo}`}</div>
          )}
          {location?.name != null && (
            <div className="location-item" onClick={() => setType(2)}>{`Name:${location.name}`}</div>
          )}
          {location?.phone != null && (
            <div className="location-item" onClick={() => setType(3)}>{`Phone:${location.phone}`}</div>
          )}
          {location?.address != null && (
            <div className="location-item" onClick={() => setType(4)}>{`Address:${location.address}`}</div>
          )}
        </div>
      </div>
      <div ref={maskRef} className="mask" onClick={() => setType(0)}></div>
      <div ref={popRef} className="location-edit">
        <div className="location-edit-content">
          {type === 1 ? <NameInput label="Table" placeholder="请输入" onClose={() => setType(0)} /> : null}
          {type === 2 ? <NameInput label="Name" placeholder="请输入" onClose={() => setType(0)} /> : null}
          {type === 3 ? <PhoneInput label="Phone" placeholder="请输入" onClose={() => setType(0)} /> : null}
          {type === 4 ? <AddressInput label="Address" placeholder="请输入" onClose={() => setType(0)} /> : null}
        </div>
      </div>
    </>
  );
};

export default OrderLocation;
