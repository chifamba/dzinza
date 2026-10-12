import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev: `vite` serves the UI on :5173 and proxies API calls to the backend.
// Prod: the API serves the built files (frontend/dist) same-origin, so the
// client uses relative URLs everywhere and no proxy is needed.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:8000",
      "/auth": "http://localhost:8000",
    },
  },
});
