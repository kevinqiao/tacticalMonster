/**
 * battle3d 前端测试设置文件
 * 包含 Mock 配置
 */

import { vi } from "vitest";

// Mock GSAP
vi.mock("gsap", () => ({
    default: {
        registerPlugin: vi.fn(),
        to: vi.fn(() => ({
            kill: vi.fn(),
            pause: vi.fn(),
            isActive: vi.fn(() => false),
            duration: vi.fn(() => 1000),
        })),
        set: vi.fn(),
        timeline: vi.fn(() => ({
            to: vi.fn(),
            kill: vi.fn(),
            pause: vi.fn(),
            isActive: vi.fn(() => false),
            duration: vi.fn(() => 1000),
        })),
    },
}));

// Mock Convex
vi.mock("convex/react", () => ({
    useQuery: vi.fn(),
    useMutation: vi.fn(),
    useConvex: vi.fn(() => ({
        mutation: vi.fn(),
        query: vi.fn(),
    })),
}));
