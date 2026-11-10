// ─── Preload: minimal, safe bridge (no Node APIs exposed to the page) ────────
const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("masterbotDesktop", {
  isDesktop: true,
  platform: process.platform,
  version: process.env.npm_package_version || "1.0.0",
});
