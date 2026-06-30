import React from "react";

/** Placeholder wrapper — platform JWT auth uses manual setAuth, not ConvexProviderWithAuth. */
export const ConvexAuthBinder: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

export default ConvexAuthBinder;
