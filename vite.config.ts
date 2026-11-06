import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => ({
  base: mode === "pages" ? "/portfilio/" : "/",
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three"],
          motion: ["gsap"],
          vendor: ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
}));
