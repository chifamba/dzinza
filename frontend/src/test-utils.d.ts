// src/test-utils.d.ts
import { vi } from "vitest";

// Extend the global namespace to include vi
declare global {
  var vi: typeof vi;
  interface Window {
    vi: typeof vi;
  }
}
