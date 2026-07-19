"use node";

import { PKPass } from "passkit-generator";

import type { Doc } from "../../_generated/dataModel";
import type { PasskitSigningConfig } from "./passkitEnv";

/** Minimal 1×1 PNG (icon fallback when partner logo missing). */
const PLACEHOLDER_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

function hexToRgbTuple(hex: string): string {
  const h = hex.replace("#", "").trim();
  if (h.length === 3) {
    const r = parseInt(h[0]! + h[0]!, 16);
    const g = parseInt(h[1]! + h[1]!, 16);
    const b = parseInt(h[2]! + h[2]!, 16);
    return `rgb(${r}, ${g}, ${b})`;
  }
  if (h.length >= 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if ([r, g, b].every((n) => Number.isFinite(n))) return `rgb(${r}, ${g}, ${b})`;
  }
  return "rgb(37, 99, 235)";
}

function rewardLabel(snapshot: Doc<"coupons">["rewardSnapshot"]): string {
  if (snapshot.displayText?.trim()) return snapshot.displayText.trim();
  if (snapshot.itemLabel?.trim()) return snapshot.itemLabel.trim();
  return "Coupon";
}

function redeemBarcodeMessage(origin: string, code: string): string {
  const url = new URL(`${origin}/partner/operation`);
  url.searchParams.set("view", "redeem");
  url.searchParams.set("code", code.trim().toUpperCase());
  return url.toString();
}

export type BuildApplePassArgs = {
  coupon: Doc<"coupons">;
  authToken: string;
  organizationName: string;
  brandPrimary?: string;
  brandBackground?: string;
  brandText?: string;
  logoPng?: Buffer | null;
  config: PasskitSigningConfig;
};

export async function buildAppleWalletPassBuffer(args: BuildApplePassArgs): Promise<Buffer> {
  const { coupon, authToken, organizationName, config } = args;
  const label = rewardLabel(coupon.rewardSnapshot);
  const issued = coupon.status === "issued" && Date.now() <= coupon.expiresAt;
  const statusLabel =
    coupon.status === "redeemed"
      ? "Redeemed"
      : coupon.status === "void"
        ? "Voided"
        : coupon.status === "expired" || Date.now() > coupon.expiresAt
          ? "Expired"
          : "Ready";

  const bg = hexToRgbTuple(args.brandBackground ?? "#f1f5f9");
  const fg = hexToRgbTuple(args.brandText ?? "#0f172a");
  const labelColor = hexToRgbTuple(args.brandPrimary ?? "#2563eb");

  const icon = args.logoPng && args.logoPng.length > 0 ? args.logoPng : PLACEHOLDER_PNG;
  const logo = icon;

  const buffers: Record<string, Buffer> = {
    "icon.png": icon,
    "paula.r@example.org": icon,
    "logo.png": logo,
    "paula.r@example.org": logo,
  };

  const pass = new PKPass(
    buffers,
    {
      wwdr: Buffer.from(config.wwdrCertPem),
      signerCert: Buffer.from(config.signerCertPem),
      signerKey: Buffer.from(config.signerKeyPem),
      signerKeyPassphrase: config.signerKeyPassphrase,
    },
    {
      formatVersion: 1,
      passTypeIdentifier: config.passTypeIdentifier,
      teamIdentifier: config.teamIdentifier,
      serialNumber: coupon.couponId,
      organizationName,
      description: label,
      logoText: organizationName.slice(0, 32),
      foregroundColor: fg,
      backgroundColor: bg,
      labelColor,
      authenticationToken: authToken,
      webServiceURL: config.webServiceUrl,
    }
  );

  // Setting type resets fields — do this before pushing field content.
  pass.type = "storeCard";
  pass.setExpirationDate(new Date(coupon.expiresAt));
  pass.setRelevantDate(new Date(coupon.expiresAt));

  pass.primaryFields.push({
    key: "reward",
    label: "OFFER",
    value: label,
  });

  pass.secondaryFields.push({
    key: "status",
    label: "STATUS",
    value: statusLabel,
  });

  if (issued) {
    pass.secondaryFields.push({
      key: "code",
      label: "CODE",
      value: coupon.code,
    });
    pass.setBarcodes({
      message: redeemBarcodeMessage(config.publicAppOrigin, coupon.code),
      format: "PKBarcodeFormatQR",
      messageEncoding: "iso-8859-1",
      altText: coupon.code,
    });
  } else {
    pass.auxiliaryFields.push({
      key: "note",
      label: "NOTE",
      value: "This coupon is no longer redeemable.",
    });
  }

  pass.backFields.push({
    key: "expires",
    label: "Expires",
    value: new Date(coupon.expiresAt).toLocaleString(),
  });

  if (coupon.usageRulesSnapshot?.trim()) {
    pass.backFields.push({
      key: "rules",
      label: "Usage rules",
      value: coupon.usageRulesSnapshot.trim(),
    });
  }

  pass.backFields.push({
    key: "couponId",
    label: "Reference",
    value: coupon.couponId,
  });

  return pass.getAsBuffer();
}
