import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  define: {
    global: "globalThis",
  },
  resolve: {
    alias: {
      // Required for some starknet/starkzap dependencies
      buffer: "buffer",
      // Stub out starkzap's optional confidential-computing peer dep
      "@fatsolutions/tongo-sdk": path.resolve("./src/stubs/tongo-sdk.js"),
    },
  },
  optimizeDeps: {
    include: ["buffer"],
  },
});
