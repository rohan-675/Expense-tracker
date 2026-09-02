import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  build: {
    rollupOptions: {
      output: {
        // Split heavy, infrequently-needed libraries into their own chunks
        // instead of bundling everything into one ~1.1MB file. Combined with
        // the route-level lazy-loading in App.jsx, this means a first-time
        // visitor loading /dashboard doesn't have to download the PDF/export
        // tooling used only by the Reports page.
        manualChunks: {
          vendor_react: ["react", "react-dom", "react-router-dom"],
          vendor_charts: ["recharts"],
          vendor_pdf: ["jspdf", "jspdf-autotable"]
        }
      }
    }
  }
});
