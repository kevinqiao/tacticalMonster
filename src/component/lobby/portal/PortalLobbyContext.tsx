import React, { createContext, useContext } from "react";

export type PortalLobbyOfferingView = {
  tournamentId: string;
  title: string;
  gameType: string | null;
  matchType: string | null;
  sortOrder: number;
};

export type PortalLobbyView = {
  lobbyId: string;
  slug: string;
  title: string;
  isDefault: boolean;
  branding: {
    logoUrl: string;
    backgroundLandscapeUrl: string;
    backgroundPortraitUrl: string;
  };
  offerings: PortalLobbyOfferingView[];
  soloCount: number;
  multiCount: number;
  directPlayHome: boolean;
  soloTournamentId: string | null;
  multiTournamentId: string | null;
  derivedGames: string[];
};

type PortalLobbyContextValue = {
  lobby: PortalLobbyView | null;
  lobbySlug: string | null;
};

const PortalLobbyContext = createContext<PortalLobbyContextValue>({
  lobby: null,
  lobbySlug: null,
});

export const PortalLobbyProvider: React.FC<{
  lobby: PortalLobbyView | null;
  lobbySlug: string | null;
  children: React.ReactNode;
}> = ({ lobby, lobbySlug, children }) => (
  <PortalLobbyContext.Provider value={{ lobby, lobbySlug }}>
    {children}
  </PortalLobbyContext.Provider>
);

export function usePortalLobby() {
  return useContext(PortalLobbyContext);
}
