import React, { createContext, useContext } from "react";

import { type MerchantEmbeddedRoute, merchantRouteHref } from "./merchantEmbeddedNav";

type MerchantEmbeddedNavContextValue = {
  navigate: (route: MerchantEmbeddedRoute) => void;
};

const MerchantEmbeddedNavContext = createContext<MerchantEmbeddedNavContextValue | null>(null);

export const MerchantEmbeddedNavProvider: React.FC<{
  navigate: (route: MerchantEmbeddedRoute) => void;
  children: React.ReactNode;
}> = ({ navigate, children }) => (
  <MerchantEmbeddedNavContext.Provider value={{ navigate }}>
    {children}
  </MerchantEmbeddedNavContext.Provider>
);

export function useMerchantEmbeddedNav() {
  return useContext(MerchantEmbeddedNavContext);
}

type MerchantNavLinkProps = {
  route: MerchantEmbeddedRoute;
  children: React.ReactNode;
  className?: string;
};

/** In merchant SPA (embedded or /campaign/merchant): button + stack navigate. Else: shareable `<a>`. */
export const MerchantNavLink: React.FC<MerchantNavLinkProps> = ({
  route,
  children,
  className,
}) => {
  const embedded = useMerchantEmbeddedNav();

  if (embedded) {
    return (
      <button
        type="button"
        className={className ?? "merchant-link-btn"}
        onClick={() => embedded.navigate(route)}
      >
        {children}
      </button>
    );
  }

  return (
    <a href={merchantRouteHref(route)} className={className}>
      {children}
    </a>
  );
};
