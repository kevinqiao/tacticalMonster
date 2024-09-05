import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
const containerClass = {
  display: "flex",
  justifyContent: "center",
  width: "100%",
  height: "100%",
  maxWidth: 500,
};
const codeClass = {
  display: "flex",
  justifyContent: "space-around",
  alignItems: "center",
  width: "100%",
  height: "60px",
};
const codeCell = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  width: "17%",
  height: "100%",
  borderStyle: "solid",
  borderRadius: "4px",
  borderWidth: "2px",
  borderColor: "black",
  fontSize: 20,
};
const padClass = {
  width: "100%",
  flexWrap: "wrap",
};
const padCell = {
  width: "30%",
  height: "60px",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  fontSize: 25,
  borderStyle: "solid",
  borderRadius: "4px",
  borderWidth: "2px",
  borderColor: "white",
  marginTop: "4px",
};
interface Props {
  // nums: number;
  // disable: boolean;
  onComplete: (code: string) => void;
}
const CodeCell: React.FC<{ codeNums: number[]; index: number }> = ({ codeNums, index }) => {
  const cellCode = useMemo(() => {
    if (codeNums.length > index) {
      return codeNums[index];
    }
  }, [codeNums]);
  useEffect(() => {
    if (cellCode) console.log(cellCode);
  }, [cellCode]);

  return <div style={codeCell}>{cellCode}</div>;
};
const VerifyCode: React.FC<Props> = ({ onComplete }) => {
  const codeRef = useRef<HTMLDivElement>(null);
  const padRef = useRef<HTMLDivElement>(null);
  const [codeNums, setCodeNums] = useState<number[]>([]);
  const addNum = useCallback((num: number) => {
    setCodeNums((pre) => {
      pre.push(num);
      return [...pre];
    });
  }, []);
  const back = useCallback(() => {
    setCodeNums((pre) => {
      pre.pop();
      return [...pre];
    });
  }, []);
  useEffect(() => {
    if (codeNums.length === 5) {
      onComplete(codeNums.join(""));
      setCodeNums([]);
    }
  }, [codeNums]);
  return (
    <div style={containerClass}>
      <div style={{ width: "90%" }}>
        <div style={{ height: 30 }} />
        <div ref={codeRef} id="code_enter" style={codeClass}>
          {[0, 1, 2, 3, 4].map((c, index) => (
            <CodeCell key={"num-" + c} codeNums={codeNums} index={index} />
          ))}
        </div>
        <div style={{ height: 30 }} />

        <div
          ref={padRef}
          id="key_pad"
          style={{ width: "100%", display: "flex", justifyContent: "space-around", flexWrap: "wrap" }}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((c, index) => (
            <div key={"pad-" + c} style={padCell} onClick={() => addNum(c)}>
              {c}
            </div>
          ))}
          <div key={"00-pad"} style={padCell} onClick={() => setCodeNums([])}>
            CLR
          </div>
          <div key={"0-pad"} style={padCell} onClick={() => addNum(0)}>
            0
          </div>
          <div key={"x-pad"} style={padCell} onClick={back}>
            {"<"}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyCode;
