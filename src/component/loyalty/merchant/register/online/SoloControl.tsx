import CategoryHome from "component/loyalty/category/CategoryHome";
import AdditionControl from "component/loyalty/order/addition/AdditionControl";
import { useTableManager } from "component/loyalty/service/TableManager";
import React from "react";
import { usePageManager } from "service/PageManager";
import OrderPanel from "./OrderPanel";

const SoloControl: React.FC = () => {
  const { openNav } = usePageManager();
  const { selectedTable } = useTableManager();
  return (
    <>
      <div
        style={{
          position: "relative",
          top: 0,
          left: 0,
          display: "flex",
          justifyContent: "space-around",
          width: "100vw",
          height: "100vh",
          backgroundColor: "white",
        }}
      >
        <div style={{ width: "49%", height: "100%" }}>
          <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
            <div className="register-head">
              <div className="btn" onClick={openNav}>
                Home
              </div>
            </div>

            <div style={{ position: "relative", top: 0, left: 0, width: "100%", height: "100%", overflowY: "auto" }}>
              <CategoryHome reset={selectedTable?.id} />
            </div>
          </div>
        </div>
        <div style={{ width: "49%", height: "100%" }}>
          <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
            <div className="register-head">
              <div style={{ width: 40 }}></div>
              {selectedTable && <div>{"Table " + selectedTable?.no} </div>}
              <div>
                <AdditionControl />
              </div>
            </div>
            <div style={{ width: "100%", height: "100%", overflowY: "auto" }}>
              <OrderPanel />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SoloControl;
