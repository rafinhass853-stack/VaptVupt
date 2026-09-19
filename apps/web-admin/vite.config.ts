import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@vaptvupt/shared-types": path.resolve(
        __dirname,
        "../../packages/shared-types/src/index.ts"
      ),
    },
  },
  server: {
    fs: {
      allow: ["../.."],
    },
  },
});