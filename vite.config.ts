import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom')) return 'vendor-react-dom';
            if (id.includes('react-router')) return 'vendor-router';
            if (id.includes('react/') || id.includes('react-is') || id.includes('react-helmet')) return 'vendor-react';
            if (id.includes('@radix-ui')) return 'vendor-radix';
            if (id.includes('recharts') || id.includes('d3-') || id.includes('victory')) return 'vendor-charts';
            if (id.includes('framer-motion')) return 'vendor-motion';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('leaflet') || id.includes('react-leaflet')) return 'vendor-map';
            if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) return 'vendor-forms';
            if (id.includes('@tanstack')) return 'vendor-query';
            if (id.includes('date-fns')) return 'vendor-date';
            if (id.includes('cmdk') || id.includes('sonner') || id.includes('vaul') || id.includes('embla')) return 'vendor-misc-ui';
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
}));
