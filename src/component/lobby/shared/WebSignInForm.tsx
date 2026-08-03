import React, { useState } from "react";

import type { User } from "host/service/UserManager";

import { useWebSignIn } from "./useWebSignIn";
import { type WebSignInStaffGate } from "./webSignInHelpers";

import "../campaign/merchant/merchant.css";

type WebSignInFormProps = {
  staffGate?: WebSignInStaffGate;
  partnerId?: number;
  onSuccess?: (user: User) => void;
  title?: string;
  description?: string;
  defaultAccountId?: string;
  defaultPassword?: string;
  accountIdLabel?: string;
  submitLabel?: string;
};

const WebSignInForm: React.FC<WebSignInFormProps> = ({
  staffGate = "none",
  partnerId,
  onSuccess,
  title = "登录",
  description,
  defaultAccountId = "",
  defaultPassword = "",
  accountIdLabel = "accountId",
  submitLabel,
}) => {
  const { signIn, busy, error } = useWebSignIn({ staffGate, partnerId, onSuccess });
  const [accountId, setAccountId] = useState(defaultAccountId);
  const [password, setPassword] = useState(defaultPassword);

  return (
    <section className="merchant-card">
      <h2>{title}</h2>
      {description ? <p className="merchant-note">{description}</p> : null}
      <label className="merchant-field">
        {accountIdLabel}
        <input
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          autoComplete="username"
        />
      </label>
      <label className="merchant-field">
        密码
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </label>
      <button
        type="button"
        className="merchant-btn"
        disabled={busy}
        onClick={() => void signIn(accountId, password)}
      >
        {busy ? "登录中…" : submitLabel ?? "登录"}
      </button>
      {error ? (
        <p className="merchant-note" style={{ color: "#b91c1c", marginTop: 12 }} role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
};

export default WebSignInForm;
