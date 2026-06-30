import React, { useEffect, useState } from "react";

import type { RegisteredPortalGameType } from "@/convex/portal/convex/data/portalGameRegistry";
import { portalLaunchPath } from "@/host/util/portalPathParse";

import { partnerAdminErrorMessage, partnerAdminSuccessMessage } from "./partnerAdminHelpers";
import {
  usePartnerAdminMutations,
  usePartnerPortalConfig,
} from "./usePartnerAdmin";

type PartnerAdminPortalGamesPanelProps = {
  partnerId: number;
};

const PartnerAdminPortalGamesPanel: React.FC<PartnerAdminPortalGamesPanelProps> = ({
  partnerId,
}) => {
  const config = usePartnerPortalConfig(partnerId);
  const { updatePartnerPortalConfig } = usePartnerAdminMutations();
  const [portalKey, setPortalKey] = useState("");
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!config) return;
    setPortalKey(config.portalKey ?? "");
    setSelectedGames(config.portalGames ?? []);
  }, [config]);

  const toggleGame = (gameType: string) => {
    setSelectedGames((prev) =>
      prev.includes(gameType) ? prev.filter((g) => g !== gameType) : [...prev, gameType]
    );
  };

  const onSave = async () => {
    try {
      await updatePartnerPortalConfig({
        partnerId,
        portalKey: portalKey.trim(),
        portalGames: selectedGames,
      });
      setNote(partnerAdminSuccessMessage("portalSaved"));
    } catch (e) {
      setNote(partnerAdminErrorMessage(e));
    }
  };

  if (config === undefined) {
    return <p className="merchant-note">Loading…</p>;
  }
  if (config === null) {
    return <p className="merchant-note">Partner not found or access denied.</p>;
  }

  const registryGames = config.registryGames ?? [];

  return (
    <>
      <p className="merchant-note">
        Enable <code>portal</code> under profile enabled contexts before saving. Launch URLs use{" "}
        <code>/portal/&#123;key&#125;/&#123;game&#125;</code>.
      </p>
      <label className="merchant-field">
        Portal key
        <input
          value={portalKey}
          onChange={(e) => setPortalKey(e.target.value)}
          placeholder="my-partner"
          autoComplete="off"
        />
      </label>
      <fieldset className="merchant-field">
        <legend>Portal games</legend>
        {registryGames.map((gameType) => (
          <label key={gameType} style={{ display: "block", marginBottom: 6 }}>
            <input
              type="checkbox"
              checked={selectedGames.includes(gameType)}
              onChange={() => toggleGame(gameType)}
            />{" "}
            {gameType}
          </label>
        ))}
      </fieldset>
      {portalKey.trim() && selectedGames.length > 0 ? (
        <ul className="merchant-note">
          {selectedGames.map((gameType) => (
            <li key={gameType}>
              <code>{portalLaunchPath(portalKey.trim().toLowerCase(), gameType as RegisteredPortalGameType)}</code>
            </li>
          ))}
        </ul>
      ) : null}
      <button type="button" className="merchant-btn" onClick={() => void onSave()}>
        Save portal config
      </button>
      {note ? <p className="merchant-note">{note}</p> : null}
    </>
  );
};

export default PartnerAdminPortalGamesPanel;

