import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "next-themes";
import { installRuntimeLoadRecovery } from "@/lib/runtimeLoadRecovery";
import App from "./App.tsx";
import "./index.css";

installRuntimeLoadRecovery();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <App />
    </ThemeProvider>
  </HelmetProvider>
);
