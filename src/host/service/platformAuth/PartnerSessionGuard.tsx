import React, { useEffect, useRef } from "react";

import { usePartnerManager } from "../PartnerManager";
import { useUserManager } from "../UserManager";
import { useHistoryLocationKey } from "../useHistoryLocationKey";
import { isPlatformAuthed } from "./platformAccessToken";
import {
  sessionPartnerMatchesUrlPartner,
  shouldEnforceUrlPartnerSession,
} from "./sessionPartnerMatch";

/** Clears platform session when embed/login partner does not match URL-resolved partnerPid. */
export function PartnerSessionGuard() {
  const { partnerPid, partnerResolveReady } = usePartnerManager();
  const { user, authReady, logout } = useUserManager();
  const locationKey = useHistoryLocationKey();
  const clearingRef = useRef(false);

  useEffect(() => {
    if (!authReady || !partnerResolveReady) return;
    if (!shouldEnforceUrlPartnerSession()) return;
    if (!isPlatformAuthed(user)) return;
    if (sessionPartnerMatchesUrlPartner(user, partnerPid)) return;
    if (clearingRef.current) return;

    clearingRef.current = true;
    console.warn("[PartnerSessionGuard] session partner mismatch — signing out", {
      urlPartnerPid: partnerPid,
      sessionPartner: user?.partner,
      uid: user?.uid,
    });
    void logout().finally(() => {
      clearingRef.current = false;
    });
  }, [authReady, partnerResolveReady, user, partnerPid, logout, locationKey]);

  return null;
}
