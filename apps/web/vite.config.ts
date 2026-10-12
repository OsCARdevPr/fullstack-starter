import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // The router plugin must run before the React plugin. It (re)generates src/routeTree.gen.ts.
  plugins: [tanstackRouter({ target: "react", autoCodeSplitting: true }), react(), tailwindcss()],
  // `@/*` comes from tsconfig.json `paths`, so the alias is declared in one place.
  resolve: { tsconfigPaths: true },
  // One .env at the repository root serves the API and the web app (only VITE_* reaches the browser).
  envDir: "../..",
  server: {
    port: 5173,
    // Same origin in development as in production (nginx), so auth cookies stay first-party.
    proxy: { "/api": "http://localhost:3000" },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
