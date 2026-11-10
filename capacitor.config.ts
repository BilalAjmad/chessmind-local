import type { CapacitorConfig } from "@capacitor/cli";

// Android wrapper for ChessMind Local — bundles the static web build (out/)
// into a real APK that runs 100% offline in the system WebView.
// One-time:  bun install && bun run build && bunx cap add android
// Then:      bun run cap:sync  →  bunx cap open android  →  Build > Build APK(s)
const config: CapacitorConfig = {
  appId: "app.chessmind.local",
  appName: "ChessMind Local",
  webDir: "out",
  android: {
    // keep the WebView from zooming / pulling to refresh mid-game
    allowMixedContent: false,
  },
};

export default config;
