import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    allowedHosts: ["choreatic-unsombre-winnifred.ngrok-free.dev", "localhost"],
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      "/mappls-api": {
        target: "https://apis.mappls.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mappls-api/, ""),
      },
    },
  },
});
