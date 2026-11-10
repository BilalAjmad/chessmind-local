# 🚀 05 — Build & Publish (Step By Step)

Ye file batati hai: dev mein kaise chalayein, production build kaise banayein, aur **kaise publish karein** — web (free hosting), desktop installers, Android APK.

---

## 🛠️ Requirements (ek baar)

| Tool | Kahan se | Kya kaam |
| --- | --- | --- |
| **Bun** | [bun.sh](https://bun.sh) | `curl -fsSL https://bun.sh/install | bash` — package manager + builder |
| **Node.js 20+** | nodejs.org | Electron/Capacitor ke liye (Bun bhi chahiye sath) |
| **Git** | git-scm.com | Version control + GitHub push |

npm bhi chalega (commands 1:1 translate: `bun install` → `npm install`), lekin Bun recommended hai.

---

## 🏃 1. Dev mein chalana

```bash
bun install        # dependencies (ek baar, ~1 min)
bun run dev        # http://localhost:3000
```

Hot reload on — code badlo, browser pe turant dikhega.

### Useful commands

| Command | Kaam |
| --- | --- |
| `bun run dev` | Dev server (localhost:3000) |
| `bun run build` | Production build → `out/` folder (static site) |
| `bun run worker` | Sirf engine worker rebuild (`public/chess-worker.js`) |
| `bun run typecheck` | TypeScript errors check |
| `bun run lint` | ESLint |
| `bun run icons` | Saare icons regenerate (knight SVG se) |
| `bun run scripts/test-engine.ts` | Engine self-tests |
| `bun run scripts/test-book.ts` | Opening book validation |
| `bun run scripts/test-learning.ts` | Learning system tests |

---

## 🌐 2. Web pe publish karna (SABSE AASAN — 2 minute)

Build static files deta hai (`out/` folder). **Koi bhi static hosting chalega:**

### Option A: Vercel (recommended)
1. GitHub pe repo push karo (neeche Git section)
2. [vercel.com](https://vercel.com) → **Add New Project** → repo import karo
3. Framework: **Next.js** khud detect hoga. Build command: `bun run build`, Output: `out`
4. **Deploy** — free, HTTPS, global CDN. Har git push pe auto-deploy!

### Option B: Netlify
1. [netlify.com](https://netlify.com) → Add new site → Git
2. Build command: `bun run build` · Publish directory: `out`
3. Deploy.

### Option C: GitHub Pages (bilkul free)
1. Settings → Pages → Source: GitHub Actions
2. Repo mein `.github/workflows/` mein deploy workflow (CI file already hai project mein — release workflow dekho)
3. Ya manually: `bun run build` → `out/` folder ko `gh-pages` branch pe push karo

### Option D: Koi bhi server
```bash
bun run build
# out/ folder ko kahi bhi rakh do — nginx, Apache, S3, Cloudflare Pages...
```

**Publish hone ke baad:** mobile users browser se **install** kar sakte hain (PWA):
- **Android (Chrome):** menu ⋮ → "Install app"
- **iPhone (Safari):** Share → "Add to Home Screen"

---

## 🖥️ 3. Desktop installers (Windows / macOS / Linux)

Electron same website ko native window mein wrap karta hai:

```bash
bun run electron:dev     # test: desktop window mein app kholo
bun run electron:dist    # installers banao
```

`electron-builder.yml` mein sab configured hai. `dist/` folder mein output milega:

| File | Platform |
| --- | --- |
| `ChessMind-Local-Setup-x.x.x-x64.exe` | **Windows** installer (NSIS) |
| `ChessMind-Local-x.x.x-arm64.dmg` | **macOS** Apple Silicon |
| `ChessMind-Local-x.x.x-x64.dmg` | **macOS** Intel |
| `...x86_64.AppImage` + `...amd64.deb` | **Linux** |

**Code signing nahi hai** (free project): macOS pe pehli baar right-click → Open karna padega ("unidentified developer" ek baar puchega), Windows SmartScreen → "More info → Run anyway". Normal hai unsigned apps ke liye.

---

## 🤖 4. Android APK

Capacitor static build ko Android app banata hai:

```bash
# Ek baar setup (agar android/ folder nahi hai):
bunx cap add android

bun run cap:sync       # build + android project sync
bun run cap:open       # Android Studio mein kholo
```

Android Studio se:
1. **Build → Build Bundle(s)/APK(s) → Build APK(s)**
2. `android/app/build/outputs/apk/debug/app-debug.apk` ready — seedha install ho jata hai kisi bhi Android phone pe (unknown sources allow karke)

**Play Store ke liye:** signed release APK/AAB chahiye hoga (Android Studio → Generate Signed Bundle).

---

## 🏷️ 5. Automatic releases (GitHub Actions)

CI already set hai (`.github/workflows/`):

- **CI workflow:** har push pe — typecheck + engine tests + book tests + production build. Fail hui cheez merge nahi hone degi.
- **Release workflow:** `v*` tag push karo → engine tests → web/desktop/Android sab builds → **GitHub Releases pe automatically upload**:

```bash
# version bump package.json mein pehle karо
git commit -am "v1.0.6"
git tag v1.0.6
git push origin main --tags
```

> ⚠️ Desktop/Android builds CI pe Ubuntu runner se hoti hain — Windows .exe aur macOS .dmg dono Linux pe cross-build hote hain (electron-builder support karta hai). macOS signing nahi hai to .dmg unsigned hoga (upar bataya — ek baar manual open).

---

## 📦 6. Git + GitHub pe daalna (pehli baar)

```bash
cd chessmind-local
git init
git add .
git commit -m "ChessMind Local v1.0.7"
# GitHub pe naya repo banao (github.com/new — naam: chessmind-local)
git remote add origin https://github.com/YOUR-USERNAME/chessmind-local.git
git branch -M main
git push -u origin main
```

Push ke baad Vercel/Netlify connect karo → **live site ready.**

> `.gitignore` already set hai — `node_modules`, `out`, `dist` push nahi honge.

---

## ✅ Publish checklist (ek nazar mein)

- [ ] `bun run build` bina error chalta hai
- [ ] `bun run scripts/test-engine.ts` — "ALL ENGINE TESTS PASSED"
- [ ] `package.json` mein sahi version
- [ ] README.md mein GitHub username sahi (`your-username` replace karo)
- [ ] Vercel/Netlify pe deploy ho gaya
- [ ] Phone pe test: install PWA, offline chalao
- [ ] (optional) `git tag v1.0.7` → auto release builds

---

## 🔗 Next: [06-FAQ.md](06-FAQ.md) — problems aur fixes
