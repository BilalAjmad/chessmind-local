# ❓ 06 — FAQ & Troubleshooting

---

## 🎮 Gameplay

**Q: AI ki baari mein main move kar sakta hoon?**
Nahi — board lock ho jaata hai jab tak AI soch raha hai. "MasterBot is thinking..." dikhata hai.

**Q: Undo ne sirf mera move wapas kiya, AI ka nahi?**
Undo **move-pair** wapas karta hai (aapka + AI ka dono) — taake phir aapki hi baari ho. Agar AI abhi move nahi kari thi to sirf aapka move jata hai.

**Q: 2 Players mein rating kyun nahi badli?**
Friendly games rating ko nahi chhedte — sirf vs-AI games counting hote hain. Ye jaan-bujh ke hai.

**Q: Draw offer kiya, AI ne turant reject kar diya.**
AI position dekh ke decide karta hai — agar wo behtar hai ya balanced to "Play on!" bolega. Asli disadvantage mein accept karega.

**Q: Hint mein kyun kabhi "Play e4" jaisa simple move suggest hota hai?**
Engine current position ka **real best move** batata hai — kabhi wohi simple hota hai. Fake "accha lag raha hai" move nahi.

**Q: Maine purani position dekhi (arrows se), move nahi kar pa raha.**
Sahi hai — history view read-only hai. **⏭ Live button** dabao, phir khelo.

**Q: Board flip (F) 2 Players mein kyun nahi hai?**
Pass & play mein board fixed rehta hai (White neeche) — device pass karna asaan. Flip sirf vs-AI mein hai.

---

## 🧠 AI / Engine

**Q: Easy level kabhi-kabhi bekaar move kyun karta hai?**
Temperature-based random choice — Easy "insaan jaisi" galtiyan jaan-bujh ke karta hai. Ultra Hard/Master mein ye 0 hai — wo kabhi galti nahi karte.

**Q: Master level bahut strong hai, jeet ka koi chance?**
Engine depth limited hai (browser mein) aur opening book memorized hai — aam strong club player Master ko hara sakta hai endgames mein. Zinda raho, counterattack karo, aur 50-move/threefold rules yaad rakho.

**Q: AI kaise yaad rakhta hai mujhe?**
Har game ke baad: aapki openings, win/loss lines, blunder patterns. Agli game mein book choices aur style bias isi data se badalta hai. **Settings → Wipe** se sab bhool jaata hai.

**Q: Engine kitna fast hai?**
~100k-500k+ nodes/sec (device pe depend). Master level ~1.3s/move average.

---

## 💾 Data

**Q: Rating kahan save hoti hai? Browser delete ho gaya?**
`localStorage` — browser/phone ka data delete hua to rating/games/settings sab gaya. Naya start 1200 se. (Chrome login sync se site data sync hota hai kabhi kabhi — same account pe wapas aa sakta hai.)

**Q: Kya mera data kisi server pe jata hai?**
**Nahi. Zero network calls.** Detail: [04-DATA-PRIVACY.md](04-DATA-PRIVACY.md).

---

## 🛠️ Build / Dev problems

**`bun run dev` → "port 3000 already in use"**
Purana server zinda hai: `fuser -k 3000/tcp` (Linux) ya `npx kill-port 3000`, phir dobara chalao.

**`bun install` fail ho raha hai**
Bun update karo (`bun upgrade`), ya npm use karo: `npm install`.

**Build ke baad worker missing (`chess-worker.js` 404)**
`bun run worker` chalao — build command ye khud karta hai (`bun run build` = worker + next build), lekin agar sirf `next build` chalaya tha to worker nahi bana hoga.

**TypeScript errors `tsc --noEmit` pe**
`bun install` dobara — purane node_modules se types missing hote kabhi kabhi.

**Electron window khali aa rahi hai**
`bun run build` pehle chalao — Electron `out/` folder kholta hai; build ke bina folder hi nahi hai.

**Android APK build fail**
Android Studio + SDK updated hona chahiye. `bun run cap:sync` phir `cap:open` → SDK prompt accept karo.

**Icons galat/blurry**
`bun run icons` — regenerate hote hain `build/` aur `public/icons/` mein.

---

## 🧪 Release se pehle test checklist

- [ ] Naya game — har mode (vs AI Easy/Medium/Ultra/Master, 2 Players)
- [ ] Dono sides (White/Black/Random)
- [ ] Har time control (Unlimited, 3+2, 5, 10, 15+10)
- [ ] Move karo: click-click + drag-drop
- [ ] Castling, en passant, promotion (auto-queen ON + OFF dono)
- [ ] Hint (H), Flip (F), arrows, Home/End
- [ ] Undo, draw offer, resign
- [ ] Copy PGN + Download PGN — PGN kisi chess tool mein kholo
- [ ] Game over: checkmate + resign + timeout — Rematch + New settings
- [ ] Stats: 3 tabs, rating graph
- [ ] Settings: 6 themes, 7 toggles, animation slider, Wipe
- [ ] Mobile viewport (390px) pe sab upar wala
- [ ] `bun run build` clean + `out/` kholo local static server se
- [ ] Console mein **zero errors** (DevTools)

> v1.0.6 release mein ye poora checklist automated browser testing se pass hua hai. ✅

---

## 🔙 [Docs index](README.md)
