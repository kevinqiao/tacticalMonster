import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    react({
      // React Fast Refresh 默认启用，不需要显式配置
    }),
  ],
  resolve: {
    alias: [
      // 优先匹配 Convex 官方包的子路径（必须放在前面）
      { find: /^convex\/(server|react|values|browser)$/, replacement: path.resolve(__dirname, 'node_modules/convex/$1') },
      // 其他 convex/* 路径指向 src/convex
      { find: /^convex\/(.+)$/, replacement: path.resolve(__dirname, 'src/convex/$1') },
      // 其他别名
      { find: '@', replacement: path.resolve(__dirname, 'src') },
      { find: 'util', replacement: path.resolve(__dirname, 'src/util') },
      { find: 'service', replacement: path.resolve(__dirname, 'src/service') },
      { find: 'model', replacement: path.resolve(__dirname, 'src/model') },
      { find: 'component', replacement: path.resolve(__dirname, 'src/component') },
      { find: 'components', replacement: path.resolve(__dirname, 'src/components') },
      { find: 'animate', replacement: path.resolve(__dirname, 'src/animate') },
    ],
    // 防止 Vite 尝试解析 Node.js 核心模块
    conditions: ['import', 'module', 'browser', 'default'],
  },
  // 使用 optimizeDeps 预构建 Convex
  optimizeDeps: {
    include: ['convex/server', 'convex/react', 'convex/values'],
    // 排除 Node.js 专用的包，这些包不应该在浏览器中构建
    exclude: ['jsonwebtoken', 'buffer-equal-constant-time'],
    // 预构建时禁用 source map，让浏览器直接使用源文件
    esbuildOptions: {
      sourcemap: false,  // 预构建依赖不需要 source map，使用原始文件
      // 配置平台为浏览器，避免处理 Node.js 模块
      platform: 'browser',
    },
  },
  server: {
    port: 3000,
    open: true,
    // 确保 source map 正确提供
    sourcemapIgnoreList: false,
    // 强制禁用 HMR 缓存，确保 source map 正确更新
    hmr: {
      overlay: true,
    },
  },
  // 开发模式 source map 配置
  // Vite 在开发模式下使用 esbuild 转换 TS/JSX，需要确保 source map 正确
  esbuild: {
    // 开发模式下启用 source map，确保浏览器能正确显示源文件位置
    sourcemap: 'inline',  // 使用内联 source map
    legalComments: 'none',
    // 确保包含源文件内容
    sourcesContent: true,
    // 排除 Node.js 核心模块，避免处理服务器端代码
    platform: 'browser',
  },
  build: {
    sourcemap: true,  // 生产环境也生成 source map
    // 使用 'inline' 或 'hidden' 来确保 source map 正确关联
    minify: 'esbuild',  // 使用 esbuild 而不是 terser，更好的 source map 支持
    rollupOptions: {
      // 排除 Convex 服务器端代码，这些不应该被打包到客户端
      external: (id) => {
        // 排除 jsonwebtoken 及其依赖，它们是 Node.js 专用包
        if (id.includes('jsonwebtoken') || id.includes('buffer-equal-constant-time')) {
          return true;
        }
        // 排除 Convex 服务器端代码
        if (id.includes('/convex/') && (id.includes('/service/') || id.includes('/dao/'))) {
          return true;
        }
        return false;
      },
      output: {
        // 保持代码分割
        manualChunks: undefined,
        // 确保 source map 文件名正确
        sourcemapExcludeSources: false,
      },
    },
  },
  // Vite 默认就有很好的 source map 支持
  css: {
    devSourcemap: true,
  },
  // 复制 public 目录下的静态资源（Vite 默认会复制 public 目录）
  publicDir: 'public',
});

