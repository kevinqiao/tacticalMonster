import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { fileURLToPath } from 'url';
import { defineConfig, type Plugin } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function manualChunks(id: string): string | undefined {
  if (!id.includes('node_modules')) {
    // Keep the app shell out of game chunks. Otherwise Rollup absorbs host modules
    // (UserManager / SharedPageData / …) into `modal-app` because TeamDeployManager
    // imports them — and the entry then modulepreloads ~1.1MB of tournament/Three.js.
    if (/[/\\]src[/\\]host[/\\]/.test(id)) return 'app-shell';
    // Keep tournament modal + tactical monster game in the same async chunk.
    // This avoids stale nested dynamic imports like PlayTacticalMonster-*.js during preview/deploy swaps.
    if (/[/\\]src[/\\]component[/\\]battle[/\\]PlayTournament\.tsx$/.test(id)) return 'modal-app';
    if (/[/\\]src[/\\]component[/\\]battle[/\\]games[/\\]tacticalMonster[/\\]/.test(id)) return 'modal-app';
    return undefined;
  }
  // Keep scheduler with React to avoid react-vendor <-> vendor circular runtime init issues.
  if (/[/\\]node_modules[/\\]scheduler[/\\]/.test(id)) return 'react-vendor';
  if (/[/\\]node_modules[/\\]use-sync-external-store[/\\]/.test(id)) return 'react-vendor';
  // Match real Three.js packages only — bare `includes('three')` can park Vite's
  // preload helper in this chunk and force every entry to download ~0.8MB.
  if (
    /[/\\]node_modules[/\\]three(?:[/\\]|$)/.test(id) ||
    /[/\\]node_modules[/\\]three-stdlib[/\\]/.test(id) ||
    /[/\\]node_modules[/\\]@react-three[/\\]/.test(id)
  ) {
    return 'three-vendor';
  }
  if (id.includes('pixi')) return 'pixi-vendor';
  if (id.includes('gsap')) return 'gsap-vendor';
  if (id.includes('convex')) return 'convex-vendor';
  if (id.includes('react-dom')) return 'react-vendor';
  if (/[/\\]node_modules[/\\]react[/\\]/.test(id)) return 'react-vendor';
  return 'vendor';
}

/** CrazyGames CDN requires relative asset URLs (`./assets/...`), not root-absolute `/assets/...`. */
const viteBase = process.env.VITE_BASE?.trim() || '/';

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';
  return {
    base: viteBase,
    // 不使用 @vitejs/plugin-react：仅用 esbuild 转 TS/JSX，source map 与控制台行号在 Chrome 里最稳定。
    // 需要 React Fast Refresh 时再装回插件并改用 npm run dev:hmr（仍可能错行）。
    plugins: [
      process.env.ANALYZE === 'true' &&
      visualizer({
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
        open: true,
      }),
    ].filter(Boolean) as Plugin[],
    resolve: {
      alias: [
        { find: /^convex\/(server|react|values|browser)$/, replacement: path.resolve(__dirname, 'node_modules/convex/$1') },
        { find: /^convex\/(.+)$/, replacement: path.resolve(__dirname, 'src/convex/$1') },
        { find: '@', replacement: path.resolve(__dirname, 'src') },
        { find: 'util', replacement: path.resolve(__dirname, 'src/util') },
        { find: 'service', replacement: path.resolve(__dirname, 'src/service') },
        { find: 'model', replacement: path.resolve(__dirname, 'src/model') },
        { find: 'component', replacement: path.resolve(__dirname, 'src/component') },
        { find: 'host', replacement: path.resolve(__dirname, 'src/host') },
        { find: 'components', replacement: path.resolve(__dirname, 'src/components') },
        { find: 'animate', replacement: path.resolve(__dirname, 'src/animate') },
      ],
      conditions: ['import', 'module', 'browser', 'default'],
    },
    optimizeDeps: {
      include: ['convex/server', 'convex/react', 'convex/values'],
      exclude: ['jsonwebtoken', 'buffer-equal-constant-time'],
      esbuildOptions: {
        sourcemap: false,
        platform: 'browser',
        jsx: 'automatic',
        jsxImportSource: 'react',
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      open: true,
      sourcemapIgnoreList: false,
      hmr: process.env.VITE_HMR === '1' ? { overlay: true } : false,
      headers: {
        // Match Netlify: allow Clerk OAuth popup to keep opener relationship.
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      },
    },
    preview: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      },
    },
    esbuild: {
      jsx: 'automatic',
      jsxImportSource: 'react',
      legalComments: 'none',
      platform: 'browser',
      sourcemap: true,
      // Strip browser console noise from production / CrazyGames packs; keep in local `vite`/`vite preview` with --mode development.
      ...(isProd ? { drop: ['console', 'debugger'] as const } : {}),
    },
    build: {
      sourcemap: true,
      minify: 'esbuild',
      rollupOptions: {
        external: (id) => {
          // Node-only packages — keep out of the browser bundle.
          if (id.includes('jsonwebtoken') || id.includes('buffer-equal-constant-time')) {
            return true;
          }
          // Never externalize `@/` (or other src aliases). Doing so leaves bare
          // `@/convex/.../service/...` specifiers in dist that browsers cannot resolve.
          // Guarded by scripts/verify-dist-runtime-imports.mjs.
          const normalized = id.replace(/\\/g, '/');
          if (
            id.startsWith('@/') ||
            id.startsWith('component/') ||
            id.startsWith('host/') ||
            id.startsWith('service/') ||
            id.startsWith('util/') ||
            id.startsWith('model/') ||
            id.startsWith('animate/') ||
            id.startsWith('components/') ||
            normalized.includes('/src/')
          ) {
            return false;
          }
          // Bare `convex/<project>/...` is aliased into src; must be bundled when imported from UI.
          if (/^convex\//.test(id) && !/^convex\/(server|react|values|browser)$/.test(id)) {
            return false;
          }
          return false;
        },
        output: {
          manualChunks,
          sourcemapExcludeSources: false,
        },
      },
    },
    css: {
      // 关闭 CSS source map，避免与 JS source map 一起在 DevTools 里干扰「点击日志跳转」的解析
      devSourcemap: false,
    },
    publicDir: 'public',
  };
});
