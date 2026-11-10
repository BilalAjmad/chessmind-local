// ─── MasterBot Chess — desktop shell (Electron main process) ──────────────────
// Loads the static build in out/ and serves it from an in-process HTTP server
// so the service worker, the engine worker and the PWA manifest all behave
// exactly as they do in a browser. Zero network: everything is local files.

const { app, BrowserWindow, shell } = require("electron");
const path = require("path");
const http = require("http");
const fs = require("fs");

const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "out");
const PORT = 0; // pick any free port

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};

let server = null;

function startStaticServer() {
  return new Promise((resolve, reject) => {
    server = http.createServer((req, res) => {
      try {
        const url = new URL(req.url, "http://localhost");
        let p = decodeURIComponent(url.pathname);
        if (p.endsWith("/")) p += "index.html";
        let file = path.normalize(path.join(OUT_DIR, p));
        if (!file.startsWith(OUT_DIR)) file = path.join(OUT_DIR, "index.html");
        if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
          // SPA-ish fallback: any unknown path serves the game shell
          file = path.join(OUT_DIR, "index.html");
        }
        const ext = path.extname(file).toLowerCase();
        res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
        fs.createReadStream(file).pipe(res);
      } catch {
        res.writeHead(500);
        res.end("internal error");
      }
    });
    server.listen(PORT, "127.0.0.1", () => resolve(server.address().port));
    server.on("error", reject);
  });
}

function createWindow(port) {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 940,
    minHeight: 640,
    backgroundColor: "#fafaf9",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // open external links in the system browser, never inside the game
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  win.loadURL(`http://127.0.0.1:${port}/`);
  return win;
}

// single-instance: a second launch focuses the running game
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      const port = await startStaticServer();
      createWindow(port);
    } catch (err) {
      console.error("failed to start local server:", err);
      app.quit();
    }
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0 && server) {
        createWindow(server.address().port);
      }
    });
  });

  app.on("window-all-closed", () => {
    if (server) server.close();
    app.quit();
  });
}
