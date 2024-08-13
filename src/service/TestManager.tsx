import React, { createContext, useContext, useState } from "react";

interface IContextProps {
  status: number;
}

export const TestContext = createContext<IContextProps>({
  status: 0,
} as IContextProps);

export const TestProvider = ({ children }: { children: React.ReactNode }) => {
  const [status, setStatus] = useState(0);
  console.log("test provider");
  return <TestContext.Provider value={{ status }}>{children}</TestContext.Provider>;
};

export const useTestManager = () => {
  return useContext(TestContext);
};
export default TestProvider;
