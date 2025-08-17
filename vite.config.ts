import { defineConfig } from "vite";
import path from "path";

// This file ensures Vite uses ESM instead of CJS
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
