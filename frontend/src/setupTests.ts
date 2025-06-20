// setupTests.ts
import "@testing-library/jest-dom";
import { vi } from "vitest";

// This will work for both Jest and Vitest
const isVitest = typeof import.meta !== "undefined";

// Enhance Vitest's expect with jest-dom matchers
if (isVitest) {
  // Add any Vitest-specific setup here
}

// Mock TinyMCE editor
vi.mock("tinymce", () => {
  return {
    default: {
      init: vi.fn(),
      remove: vi.fn(),
      get: vi.fn(() => ({
        setContent: vi.fn(),
        getContent: vi.fn(() => "<p>Test content</p>"),
      })),
    },
  };
});

// Setup mock for window.matchMedia
window.matchMedia =
  window.matchMedia ||
  function () {
    return {
      matches: false,
      addListener: function () {},
      removeListener: function () {},
      addEventListener: function () {},
      removeEventListener: function () {},
      dispatchEvent: function () {
        return false;
      },
    };
  };

// Setup mock for ResizeObserver which is not available in test environment
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock for react-router-dom
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...(actual as typeof import('react-router-dom')),
    useNavigate: () => vi.fn(),
    useParams: () => ({}),
    useLocation: () => ({
      pathname: "/",
      search: "",
      hash: "",
      state: null,
      key: "default",
    }),
  };
});

// Define a global mock for Vite env
if (typeof window !== "undefined") {
  Object.defineProperty(window, "import", {
    value: {
      meta: {
        env: {
          DEV: true,
          MODE: "test",
          PROD: false,
        },
      },
    },
    writable: true,
  });
}
