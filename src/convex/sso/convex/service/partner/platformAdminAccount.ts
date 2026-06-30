/** Fixed platform operator login id (web cid=0). */

export const PLATFORM_ADMIN_EMAIL = "admin";



/** Dev default; override in Convex env `PLATFORM_ADMIN_PASSWORD`. */

export const PLATFORM_ADMIN_PASSWORD_DEFAULT = "admin";



export function resolvePlatformAdminPassword(): string {

  return process.env.PLATFORM_ADMIN_PASSWORD?.trim() || PLATFORM_ADMIN_PASSWORD_DEFAULT;

}



export function verifyPlatformAdminCredentials(username: string, password: string): boolean {

  const login = username.trim().toLowerCase();

  if (login !== PLATFORM_ADMIN_EMAIL) return false;

  return password === resolvePlatformAdminPassword();

}



export function platformAdminWebCredentials() {

  return {

    email: PLATFORM_ADMIN_EMAIL,

    password: resolvePlatformAdminPassword(),

  };

}

