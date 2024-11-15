import CategoryHome from "component/loyalty/category/CategoryHome";
import AdditionControl from "component/loyalty/order/addition/AdditionControl";
import OrderBar from "component/loyalty/order/OrderBar";
import { useTableManager } from "component/loyalty/service/TableManager";
import TableList from "component/loyalty/table/TableList";
import gsap from "gsap";
import React, { useCallback, useEffect, useRef } from "react";
import { usePageManager } from "service/PageManager";
import { useTerminal } from "service/TerminalManager";

const SlideControl: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { openNav } = usePageManager();
  const { selectedTable } = useTableManager();
  const { width, height } = useTerminal();
  const curTabRef = useRef<number>(0);
  const openCategory = useCallback(() => {
    curTabRef.current = 1;
    gsap.to(containerRef.current, { x: -window.innerWidth, duration: 0.3 });
  }, []);
  const back = useCallback(() => {
    curTabRef.current = 0;
    gsap.to(containerRef.current, { x: 0, duration: 0.3 });
  }, []);
  useEffect(() => {
    if (!containerRef.current) return;
    if (curTabRef.current === 0) gsap.to(containerRef.current, { x: 0, duration: 0.3 });
    else gsap.to(containerRef.current, { x: -width, duration: 0.3 });
  }, [width, height]);

  return (
    <>
      <div
        style={{
          width: "100vw",
          height: "100vh",
          overflow: "hidden",
          backgroundColor: "white",
        }}
      >
        <div ref={containerRef} style={{ display: "flex", justifyContent: "flex-start", width: "200vw" }}>
          <div style={{ display: "flex", flexDirection: "column", width: "100vw", height: "100vh" }}>
            <div className="register-head">
              <div className="btn" onClick={openNav}>
                Home
              </div>
            </div>
            <div style={{ width: "100%", height: "100%", overflowY: "auto" }}>
              <TableList onSelect={openCategory} />
            </div>
          </div>
          <div style={{ position: "relative", top: 0, left: 0, width: "100vw", height: "100vh" }}>
            <div className="register-head">
              <div className="btn" onClick={back}>
                Back
              </div>
              <div style={{ color: "blue" }}>{selectedTable ? `Table ${selectedTable.no}` : ""}</div>
              <div>
                <AdditionControl />
              </div>
            </div>
            <CategoryHome reset={selectedTable?.id} />
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                width: "100%",
              }}
            >
              <OrderBar />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SlideControl;
