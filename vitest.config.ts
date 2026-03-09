import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        // 对于 React 组件测试使用 jsdom，对于纯函数测试使用 node
        environment: 'jsdom',
        setupFiles: ['./src/component/battle/games/tacticalMonster/battle3d/__tests__/setup.ts'],
        include: [
            // 只包含 battle3d 前端测试
            'src/component/battle/games/tacticalMonster/battle3d/__tests__/**/*.test.ts',
            'src/component/battle/games/tacticalMonster/battle3d/__tests__/**/*.test.tsx',
            'src/component/battle/games/tacticalMonster/battle3d/__tests__/**/*.spec.ts',
            'src/component/battle/games/tacticalMonster/battle3d/__tests__/**/*.spec.tsx',
        ],
        exclude: [
            'node_modules',
            'dist',
            '**/*.d.ts',
            '**/__tests__/setup.ts',
            '**/__tests__/testUtils.ts',
            // 排除后端 Convex 测试（需要 Convex 环境）
            'src/convex/**/*.test.ts',
            'src/convex/**/*.spec.ts',
            'src/convex/**/__tests__/**/*.ts',
            // 排除其他游戏的测试
            'src/component/battle/games/solitaireSolo/**/*.test.ts',
            'src/component/battle/games/solitaireSolo/**/*.spec.ts',
            'src/component/battle/games/solitaireSolo/**/__tests__/**/*.ts',
        ],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'src/test/',
                '**/*.d.ts',
                '**/*.config.*',
                '**/examples/**',
                '**/__tests__/**'
            ]
        }
    }
});

