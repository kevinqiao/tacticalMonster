/**
 * Apple PassKit env (Campaign Convex). Missing certs → passkit_not_configured.
 *
 * Required for signing:
 *   PASSKIT_PASS_TYPE_ID, PASSKIT_TEAM_ID
 *   PASSKIT_SIGNER_CERT_PEM, PASSKIT_SIGNER_KEY_PEM
 *   PASSKIT_WWDR_CERT_PEM
 * Optional:
 *   PASSKIT_SIGNER_KEY_PASSPHRASE
 *   PASSKIT_WEB_SERVICE_URL (default: CONVEX_SITE_URL + "/passkit")
 *   PUBLIC_APP_ORIGIN (QR deep link origin)
 * APNs (pass updates):
 *   PASSKIT_APNS_KEY_PEM, PASSKIT_APNS_KEY_ID, PASSKIT_APNS_TEAM_ID
 */

export type PasskitSigningConfig = {
  passTypeIdentifier: string;
  teamIdentifier: string;
  signerCertPem: string;
  signerKeyPem: string;
  signerKeyPassphrase?: string;
  wwdrCertPem: string;
  webServiceUrl: string;
  publicAppOrigin: string;
};

export type PasskitApnsConfig = {
  keyPem: string;
  keyId: string;
  teamId: string;
};

function env(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v || undefined;
}

function normalizePem(pem: string): string {
  return pem.replace(/\\n/g, "\n").trim();
}

export function isPasskitConfigured(): boolean {
  return Boolean(
    env("PASSKIT_PASS_TYPE_ID") &&
      env("PASSKIT_TEAM_ID") &&
      env("PASSKIT_SIGNER_CERT_PEM") &&
      env("PASSKIT_SIGNER_KEY_PEM") &&
      env("PASSKIT_WWDR_CERT_PEM")
  );
}

export function getPasskitSigningConfig(): PasskitSigningConfig | null {
  if (!isPasskitConfigured()) return null;
  const site = env("CONVEX_SITE_URL")?.replace(/\/+$/, "");
  const webServiceUrl =
    env("PASSKIT_WEB_SERVICE_URL")?.replace(/\/+$/, "") ||
    (site ? `${site}/passkit` : undefined);
  if (!webServiceUrl) return null;
  const publicAppOrigin =
    env("PUBLIC_APP_ORIGIN")?.replace(/\/+$/, "") || "http://localhost:3000";
  return {
    passTypeIdentifier: env("PASSKIT_PASS_TYPE_ID")!,
    teamIdentifier: env("PASSKIT_TEAM_ID")!,
    signerCertPem: normalizePem(env("PASSKIT_SIGNER_CERT_PEM")!),
    signerKeyPem: normalizePem(env("PASSKIT_SIGNER_KEY_PEM")!),
    signerKeyPassphrase: env("PASSKIT_SIGNER_KEY_PASSPHRASE"),
    wwdrCertPem: normalizePem(env("PASSKIT_WWDR_CERT_PEM")!),
    webServiceUrl,
    publicAppOrigin,
  };
}

export function getPasskitApnsConfig(): PasskitApnsConfig | null {
  const keyPem = env("PASSKIT_APNS_KEY_PEM");
  const keyId = env("PASSKIT_APNS_KEY_ID");
  const teamId = env("PASSKIT_APNS_TEAM_ID") || env("PASSKIT_TEAM_ID");
  if (!keyPem || !keyId || !teamId) return null;
  return { keyPem: normalizePem(keyPem), keyId, teamId };
}

export function passkitPassTypeId(): string | undefined {
  return env("PASSKIT_PASS_TYPE_ID");
}
