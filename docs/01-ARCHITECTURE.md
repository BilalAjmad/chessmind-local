# 🏗️ 01 — Architecture (Poori App Ka Structure)

Ye file explain karti hai ke app kaise bani hai, kaunsa folder kya karta hai, aur data kaise flow hota hai.

---

## 🧰 Tech stack (kya cheezein use hui hain)

| Technology | Kaam |
| --- | --- |
| **Next.js 16 (React)** | App ka framework — ek hi page ka app hai (SPA-style) |
| **TypeScript** | Saara code type-safe — bug kam hote hain |
| **Tailwind CSS** | Styling — colors, layout, sab CSS utility classes se |
| **shadcn/ui** | Ready-made UI components (Button, Dialog, Switch, Tabs...) |
| **Framer Motion** | Animations — piece movement, dialogs |
| **Web Worker** | Chess engine isme chalta hai (alag thread) — UI smooth rehta hai |
| **Bun** | Package manager + build tool (npm ki jagah — fast hai) |
| **Electron** | Windows/macOS/Linux desktop installers banane ke liye |
| **Capacitor** | Android APK banane ke liye |
| **PWA** | Browser se phone pe install ho sakti hai (manifest + service worker) |

**Koi backend nahi hai. Koi database server nahi hai. Koi API call nahi hoti.** Sab kuch browser ke andar.

---

## 📁 Folder map — har file ka kaam

```
masterbot-chess/
├─ src/                        ← SAARA app code
│  ├─ app/
│  │  ├─ page.tsx              ← MAIN PAGE — app yahan se start hoti hai,
│  │  │                           seedha New Game dialog + board ke saath
│  │  ├─ layout.tsx            ← HTML skeleton, fonts, PWA register
│  │  └─ globals.css           ← Colors, board themes, scrollbar styles
│  │
│  ├─ components/
│  │  ├─ chess/                ← GAME ke UI components (sab):
│  │  │  ├─ board.tsx          ← 8×8 board + squares + click/drag handling
│  │  │  ├─ pieces.tsx         ← Chess pieces ke SVG (cburnett style)
│  │  │  ├─ player-bar.tsx     ← Board ke upar/neeche ka bar (naam, clock, captured pieces)
│  │  │  ├─ eval-bar.tsx       ← Board ke side mein vertical eval bar (+2.3 etc.)
│  │  │  ├─ move-list.tsx      ← Move history table + eval graph (line chart)
│  │  │  ├─ game-controls.tsx  ← Neeche wale buttons (undo, hint, resign, PGN...)
│  │  │  ├─ suggestion-bar.tsx ← Board ke neeche "Which move should I play?" bar
│  │  │  ├─ engine-panel.tsx   ← AI ka panel (level, thinking status, learning feed)
│  │  │  ├─ new-game-dialog.tsx← Naya game banane ka popup (mode, level, side, time)
│  │  │  ├─ game-over-dialog.tsx ← Game khatam hone ka popup (result + stats)
│  │  │  ├─ promotion-dialog.tsx ← Pawn last rank pe pahunche to piece chunne ka popup
│  │  │  ├─ stats-dialog.tsx   ← Rating chart, record, game history (3 tabs)
│  │  │  ├─ settings-dialog.tsx← Settings popup (themes, toggles, wipe memory)
│  │  │  └─ brand.tsx          ← Knight logo
│  │  ├─ ui/                   ← shadcn/ui ke generic components (35+ files)
│  │  └─ pwa-register.tsx      ← Service worker register karta hai (offline PWA)
│  │
│  ├─ hooks/
│  │  └─ use-chess-game.ts     ← ⭐ GAME KA BRAIN (1300 lines) — saara game
│  │                              logic, state, AI coordination yahan
│  │
│  └─ lib/
│     ├─ chess/                ← ⭐ CHESS ENGINE (AI ka dimaag):
│     │  ├─ types.ts           ← Piece codes, move encoding, constants
│     │  ├─ board.ts           ← Position class — board representation,
│     │  │                        move generation, check detection, FEN
│     │  ├─ search.ts          ← Alpha-beta search + quiescence + TT + killers
│     │  ├─ eval.ts            ← Position evaluation (PeSTO tables)
│     │  ├─ book.ts            ← Opening book (main lines, weighted random)
│     │  ├─ learning.ts        ← Adaptive learning (player model + memory book)
│     │  ├─ engine.ts          ← Engine facade — levels, book+search combine
│     │  ├─ san.ts             ← SAN notation (Nf3, exd5, O-O...)
│     │  ├─ zobrist.ts         ← Zobrist hashing (TT ke liye position IDs)
│     │  └─ worker-entry.ts    ← Web Worker ka entry — messages handle karta hai
│     ├─ storage.ts            ← localStorage se save/load (settings, profile, games)
│     ├─ sounds.ts             ← Sound effects (WebAudio se generate, koi file nahi!)
│     ├─ openings.ts           ← Opening names detect karna (by move sequence)
│     └─ utils.ts              ← Chhote helpers (cn() etc.)
│
├─ public/                     ← Static assets (build mein direct copy hote hain)
│  ├─ chess-worker.js          ← COMPILED engine worker (bun run worker se banta hai)
│  ├─ manifest.json            ← PWA manifest (install karne ke liye)
│  ├─ sw.js                    ← Service worker (offline caching)
│  ├─ icons/                   ← Har size ka app icon
│  └─ pieces/                  ← Piece SVG images
│
├─ electron/                   ← Desktop app (Windows/macOS/Linux)
│  └─ main.cjs                 ← Electron main process — website ko window mein kholta hai
├─ android/                    ← (Capacitor sync karne pe banta hai) Android project
├─ .github/workflows/          ← CI: har push pe tests + release builds (GitHub Actions)
├─ scripts/                    ← Dev/test scripts:
│  ├─ gen-icons.mjs            ← Icons regenerate
│  ├─ test-engine.ts           ← Engine self-tests (CI bhi yahi chalata hai)
│  ├─ test-book.ts             ← Opening book validation
│  ├─ test-learning.ts         ← Learning system tests
│  └─ perft.ts                 ← Move generation correctness test (perft)
│
├─ docs/                       ← 👈 YE DOCUMENTATION FOLDER
├─ package.json                ← Project info, scripts, dependencies
├─ next.config.ts              ← Next.js config (static export mode)
├─ electron-builder.yml        ← Desktop installer config (exe, dmg, AppImage, deb)
├─ capacitor.config.ts         ← Android app config
└─ tailwind.config.ts          ← Theme config
```

---

## 🔄 Data flow — ek move click se AI reply tak

Ye sabse important diagram hai. Jab aap board pe piece click karke move karte ho:

```
1. CLICK        aap square pe click karte ho
                 ↓
2. board.tsx    click detect → selected piece + legal target squares dikhata hai
                 ↓
3. page.tsx     onMove(from, to) call hota hai
                 ↓
4. use-chess-   tryMove() chalata hai:
   game.ts      • move legal hai? check karo (engine se)
                • promotion? → promotion dialog dikhao, ruk jao
                • legal → position update karo, move list mein add karo
                • sound bajao (capture/check/move)
                • move classify karo (best/blunder/etc — live coach)
                 ↓
5. Worker       agar vs AI mode hai aur ab AI ki baari hai:
   message      worker.postMessage({ type:"search", fen, moves, level, ... })
                 ↓
6. chess-       Web Worker (alag thread):
   worker.js    • opening book check karo — line mili? book move return
                • warna: iterative deepening alpha-beta search chalao
                • level ke hisaab se depth/time/temperature lagao
                • adaptive learning ka bias apply karo
                 ↓
7. postMessage  worker se reply: { bestMove, score, depth, nodes, pv }
                 ↓
8. use-chess-   AI ka move apply karo:
   game.ts      • animation ke liye position update
                • checkmate/stalemate/draw detect karo
                • AI ki learning update karo (yaad rakho kya chala)
                 ↓
9. UI update    React re-render — board, move list, eval bar, sab refresh
```

**Poora round trip aam taur par 0.3–1.3 seconds leta hai (level pe depend).**

---

## 🧠 State management — kaun sambhalta hai kya

Koi Redux/Zustand nahi hai. Sab kuch **ek hook** (`useChessGame`) mein hai, jo React state use karta hai:

| State | Kahan | Kya hai |
| --- | --- | --- |
| Board position | `useChessGame` | Current position + full move history |
| View position | `useChessGame` | Kabhi purani position dekhte ho (arrows se) — `viewPly` |
| AI thinking | `useChessGame` | `aiThinking` flag + live search info |
| Settings | `useChessGame` → localStorage | Theme, sounds, toggles |
| Profile | localStorage | Rating, wins/losses, streak |
| Games | localStorage | Last 50 games ka record (PGN ke saath) |
| AI memory | localStorage | Opening lines jo aapko harayi, aapka player model |

---

## 🔌 Web Worker protocol (UI ↔ Engine messages)

Worker koi React code nahi janta — sirf messages se baat hoti hai:

**UI → Worker:**
| Message | Matlab |
| --- | --- |
| `{type:"search", fen, moves, level, seed, styleBias, bookAvoid}` | "AI ki is position mein best move batao" |
| `{type:"analyze", fen, moves, depth}` | "Is position ko analyze karo (hint/coach ke liye)" |
| `{type:"newGame"}` | "Naya game — memory reset karo session ke liye" |
| `{type:"ping"}` | "Zinda ho?" (connection test) |

**Worker → UI:**
| Message | Matlab |
| --- | --- |
| `{type:"result", id, bestMove, score, depth, nodes, pv, fromBook}` | "Ye move hai, itni depth dekhi, ye score" |
| `{type:"info", id, depth, nodes, timeMs}` | "Abhi itni depth tak pahuncha..." (live progress) |
| `{type:"pong"}` | "Zinda hoon" |

---

## 🎨 Design language

App ka look **"tournament hall"** style hai: dark background, flat colors, ek hi accent color, koi gradient/glass/glow nahi. **Board hero hai** — baaki sab chup-chaap peeche. Ye jaan-bujh ke aisa hai taake long games mein aankh na thake.

---

## 🔗 Next: [02-CHESS-ENGINE.md](02-CHESS-ENGINE.md) — AI ka dimaag kaise kaam karta hai
