import '@testing-library/jest-dom';

// Mock Tauri API
global.window = global.window || ({} as any);
global.window.__TAURI__ = {
  invoke: async () => {},
  event: {
    listen: async () => () => {},
  },
} as any;
