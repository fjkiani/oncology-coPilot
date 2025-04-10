import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { Buffer } from 'buffer';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      'buffer': 'buffer',
    },
  },
  define: {
    'global.Buffer': Buffer,
  },
  base: "./",
});
