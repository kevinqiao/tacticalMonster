import { isPlatformAuthed } from "host/service/platformAuth/platformAccessToken";
import { useUserManager } from "host/service/UserManager";

export function useMerchantAdminAuth() {
  const { user } = useUserManager();
  return {
    user,
    authed: isPlatformAuthed(user),
  };
}
