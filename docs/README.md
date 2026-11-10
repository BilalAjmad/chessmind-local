# 📚 ChessMind Local — Documentation (START HERE)

Ye folder poori project ki documentation hai — **har cheez explain ki gayi hai**, simple English mein, taake koi bhi (aap ya koi naya developer) poori app samajh sake bina ek bhi line code padhe.

---

## 🗂️ What is this project?

**ChessMind Local** ek complete chess game hai jiske andar **real AI engine** built-in hai.

- **100% offline** — koi server nahi, koi account nahi, koi API key nahi
- 4 AI levels (~800 se ~2500 Elo tak): Easy, Medium, Ultra Hard, Master
- **2 Players mode** — ek hi device pe do dost khel sakte hain (pass & play)
- Live coach: hints, move ratings, eval bar, eval graph
- Ratings, stats, game history — sab browser ke andar saved
- Har platform pe chalta hai: browser, Windows, macOS, Linux, Android, iOS (PWA)

---

## 📖 Docs index — kya kahan hai

| File | Kya explain karta hai |
| --- | --- |
| **[01-ARCHITECTURE.md](01-ARCHITECTURE.md)** | Poori app ka structure — kaunsa folder kaam kya karta hai, data kaise flow hota hai, ek move click se AI reply tak kaise travel karta hai |
| **[02-CHESS-ENGINE.md](02-CHESS-ENGINE.md)** | AI ka dimaag — alpha-beta search, evaluation, opening book, adaptive learning, difficulty levels — sab deep explain |
| **[03-UI-GUIDE.md](03-UI-GUIDE.md)** | **Har button, har control, har dialog** — kya karta hai, kab enable hota hai, keyboard shortcuts |
| **[04-DATA-PRIVACY.md](04-DATA-PRIVACY.md)** | Kya data save hota hai, kahan save hota hai (localStorage), privacy guarantee, kaise wipe karein |
| **[05-BUILD-PUBLISH.md](05-BUILD-PUBLISH.md)** | Kaise chalayein, kaise build karein, kaise **publish karein** (web, desktop, Android) — step by step |
| **[06-FAQ.md](06-FAQ.md)** | Common problems aur unke fixes, testing checklist |

---

## ⚡ 60-second summary (agar bas jaldi mein samajna ho)

1. **Frontend** = React + Next.js (TypeScript). Ek hi page — `src/app/page.tsx` — jo seedha game kholta hai.
2. **AI engine** = khud likha hua chess engine (`src/lib/chess/`) jo ek **Web Worker** mein chalta hai — isliye UI kabhi freeze nahi hota.
3. **Data** = sab kuch browser ke `localStorage` mein (settings, rating, games, AI ki memory). Kuch bhi internet pe nahi jata.
4. **Build** = `bun run build` static site bana deta hai (`out/` folder) — use kahi bhi host kar do. Electron desktop installers aur Android APK isi pe built hain.

---

## 🔄 Version history (short)

| Version | Kya badla |
| --- | --- |
| 1.0.0–1.0.3 | Core game, engine, coach, stats, desktop/Android packaging |
| 1.0.4 | Launch film page + video downloads |
| 1.0.5 | Clean release zip |
| **1.0.6** | **Launch film page removed — game seedha khulta hai, scroll fix, ye poora docs folder** |
| **1.0.7** | **Rebranded: MasterBot Chess → ChessMind Local** — new name, new package, updated docs, new installer names |
