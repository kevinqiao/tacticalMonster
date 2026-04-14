import path from 'path';
import { fileURLToPath } from 'url';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, type Plugin } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function manualChunks(id: string): string | undefined {
  if (!id.includes('node_modules')) return undefined;
  if (id.includes('three') || id.includes('@react-three') || id.includes('drei')) {
    return 'three-vendor';
  }
  if (id.includes('pixi')) return 'pixi-vendor';
  if (id.includes('gsap')) return 'gsap-vendor';
  if (id.includes('convex')) return 'convex-vendor';
  if (id.includes('react-dom')) return 'react-vendor';
  if (/[/\\]node_modules[/\\]react[/\\]/.test(id)) return 'react-vendor';
  return 'vendor';
}

export default defineConfig({
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
    port: 3000,
    open: true,
    sourcemapIgnoreList: false,
    hmr: process.env.VITE_HMR === '1' ? { overlay: true } : false,
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
    legalComments: 'none',
    platform: 'browser',
    sourcemap: true,
  },
  build: {
    sourcemap: true,
    minify: 'esbuild',
    rollupOptions: {
      external: (id) => {
        if (id.includes('jsonwebtoken') || id.includes('buffer-equal-constant-time')) {
          return true;
        }
        if (id.includes('/convex/') && (id.includes('/service/') || id.includes('/dao/'))) {
          return true;
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
});
