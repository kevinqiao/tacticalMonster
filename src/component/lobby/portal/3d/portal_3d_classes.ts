/** Plain class names for shadow-only CSS (no CSS Modules / no document.head injection). */
export const styles: Record<string, string> = new Proxy(
  {},
  {
    get: (_target, key: string) => key,
  }
);
