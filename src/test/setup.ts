import '@testing-library/jest-dom';

// Mock Tauri API
declare const global: typeof globalThis & { window: Window & { __TAURI__?: unknown } };
(global as any).window = (global as any).window || ({} as any);
(global as any).window.__TAURI__ = {
  invoke: async () => {},
  event: {
    listen: async () => () => {},
  },
} as any;
