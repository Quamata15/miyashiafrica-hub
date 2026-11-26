// Native Android/iOS shell for the store apps (#50). See docs/mobile-app.md.
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.miyashi.app",
  appName: "MIYASHI",
  webDir: "dist",
  backgroundColor: "#0A0814",
  android: { allowMixedContent: false },
  server: { androidScheme: "https" },
};

export default config;
