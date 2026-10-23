import "@testing-library/jest-dom/vitest";

/**
 * jsdom does not implement ResizeObserver, which Radix tooltip positioning
 * relies on when it runs. Provide a no-op stand-in so components that use the
 * shared Tooltip can render in tests.
 */
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!("ResizeObserver" in globalThis)) {
  (globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver = ResizeObserverStub;
}
