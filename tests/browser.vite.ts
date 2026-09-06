import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: { alias: { "@": `${process.cwd()}/src` } },
  define: { "import.meta.env.VITE_CONVEX_URL": JSON.stringify("https://example.convex.cloud") },
  server: { host: "127.0.0.1", port: 5189 },
});
