# 🔒 04 — Data & Privacy (Kya Save Hota Hai, Kahan)

---

## 📣 Ek line mein

**Koi bhi data kabhi bhi aapke browser se bahar nahi jata.** Koi server nahi, koi analytics nahi, koi telemetry nahi, koi account nahi, koi API key nahi. Network band kar do — app 100% chalti rahegi.

---

## 💾 Kya kahan save hota hai — sab `localStorage`

Browser ka `localStorage` hai — aapke device pe, aapke browser ke profile ke andar. In 6 keys ke ilawa kuch nahi:

| Key | Kya rakhta hai | Kab badalta hai |
| --- | --- | --- |
| `chessmaster.settings.v1` | Aapke settings (theme, sounds, toggles, animation) | Har settings change pe |
| `chessmaster.profile.v1` | Rating, peak, W/D/L, streak, per-level record, rating history | Har finished vs-AI game pe |
| `chessmaster.games.v1` | Last **50** games ka record (PGN, result, opening, accuracy...) | Har finished game pe |
| `chessmaster.lastLevel.v1` | Aapka aakhri chuna level (dialog mein pre-select) | Level change pe |
| `chessmaster.lastMode.v1` | vs AI ya 2 Players (pre-select) | Mode change pe |
| `chessmaster.pnp.v1` | 2-player ke players ke naam | Naam change pe |

**AI ki learning memory** bhi isi tarah browser mein persist hoti hai (learning module khud apni keys `chessmaster.learn*` use karta hai) — lines jo aapko harayi, aapka player model, style bias.

> Pura kuch milakar **chhote kilobytes** ka data hai — kuch bhi heavy nahi.

---

## 🧹 Sab delete karna ho to

### App ke andar se
- **Settings → Wipe (AI memory)** — sirf AI ki learning delete (rating/games safe)

### Browser se (poora data)
- Browser settings → site data clear, YA DevTools → Application → Local Storage → delete
- Ya console mein: `localStorage.clear()` (sirf is site ke liye)

**Kya jaata hai:** rating 1200 pe reset, games empty, settings default, AI memory clean. App waise hi chalega — bas sab naye sire se.

---

## 🔐 Privacy guarantee — technically kaise pakki hai

1. **Network calls code mein hi nahi hain** — koi `fetch`/`XMLHttpRequest`/WebSocket app code mein nahi (sirf service worker apni hi files cache karta hai offline ke liye).
2. **Static site hai** — build ke baad `out/` folder mein sirf HTML/CSS/JS files hoti hain. Host kahan bhi karo, files browser ke paas jaati hain, bas.
3. **Koi third-party script nahi** — na Google Analytics, na fonts CDN, kuch nahi. Sab local.
4. **Desktop/Android apps isi static build ko wrap karte hain** (Electron/Capacitor) — wo bhi network nahi chhedte.

---

## 🕵️ Kya developer ko dikhta hai?

Kuch nahi. Koi dashboard nahi, koi "anonymous stats" nahi. Aap developer khud ho is project mein — aap dekh sakte ho: poori codebase mein koi bahar jane wala data path **nahi hai**.

---

## 🔗 Next: [05-BUILD-PUBLISH.md](05-BUILD-PUBLISH.md) — publish kaise karein
