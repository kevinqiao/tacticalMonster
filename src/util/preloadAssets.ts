/**
 * Preload raster/SVG images via Image() so the browser caches decoded pixels.
 * Uses Promise.allSettled — individual failures do not block the batch.
 */
export function preloadImages(urls: string[]): Promise<void> {
  const loadOne = (url: string) =>
    new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`preload failed: ${url}`));
      img.src = url;
    });

  return Promise.allSettled(urls.map(loadOne)).then(() => undefined);
}
