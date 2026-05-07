import { ModalProp } from "host/service/ModalManager";
import type { User } from "host/service/UserManager";
import { useUserManager } from "host/service/UserManager";
import React, { useCallback, useMemo } from "react";

import avatarPlaceholderUrl from "../../../tactical/control/head/assets/avatar-placeholder.svg?url";
import "./casualPlayerProfileModal.css";

function avatarPhotoUrlFromUser(u: User | null): string | undefined {
  if (!u) return undefined;
  const d = (u.data ?? null) as Record<string, unknown> | null;
  const raw = d?.["imageUrl"] ?? d?.["avatar"] ?? d?.["picture"] ?? d?.["photoUrl"];
  if (typeof raw === "string" && raw.trim().length > 0) {
    return raw.trim();
  }
  const uAny = u as { picture?: string; imageUrl?: string; avatar?: string };
  for (const v of [uAny.picture, uAny.imageUrl, uAny.avatar]) {
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return undefined;
}

function levelFromUser(u: User | null): number {
  const lv = u?.data?.level;
  return typeof lv === "number" && !Number.isNaN(lv) ? Math.min(999, Math.max(0, Math.floor(lv))) : 1;
}

function profileDisplayName(u: User): string {
  if (typeof u.name === "string" && u.name.trim()) return u.name.trim();
  if (typeof u.email === "string" && u.email.trim()) return u.email.trim();
  const d = u.data as Record<string, unknown> | undefined;
  const dn = d?.["displayName"] ?? d?.["username"] ?? d?.["nickName"];
  if (typeof dn === "string" && dn.trim()) return dn.trim();
  return u.uid ? `玩家 ${u.uid.slice(0, 8)}…` : "玩家";
}

const CasualPlayerProfileModal: React.FC<ModalProp> = ({ visible, close }) => {
  const { user, cancelAuth, logout } = useUserManager();

  const u = useMemo(() => (user?.uid ? (user as User) : null), [user]);
  const photoUrl = useMemo(() => avatarPhotoUrlFromUser(u), [u]);
  const resolvedAvatar = useMemo(() => photoUrl || avatarPlaceholderUrl, [photoUrl]);
  const level = useMemo(() => levelFromUser(u), [u]);
  const displayName = useMemo(() => (u ? profileDisplayName(u) : ""), [u]);

  const signOut = useCallback(() => {
    cancelAuth();
    logout();
    close();
  }, [cancelAuth, logout, close]);

  if (!visible) return null;

  return (
    <div className="cpp">
      <header className="cpp__header">
        <h2 className="cpp__title" id="casual-profile-modal-title">
          个人资料
        </h2>
        <button type="button" className="cpp__close" onClick={close} aria-label="关闭">
          ×
        </button>
      </header>

      {user?.uid && u ? (
        <>
          <div className="cpp__hero">
            <div className="cpp__avatar">
              <img src={resolvedAvatar} alt="" draggable={false} />
            </div>
            <p className="cpp__name">{displayName}</p>
            <p className="cpp__meta">等级 {level}</p>
            {u.uid ? <p className="cpp__uid">UID {u.uid}</p> : null}
          </div>
          <button type="button" className="cpp__logout" onClick={signOut}>
            登出
          </button>
        </>
      ) : (
        <p className="cpp__guestHint">未登录</p>
      )}
    </div>
  );
};

export default CasualPlayerProfileModal;
