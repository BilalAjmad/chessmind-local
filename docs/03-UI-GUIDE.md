# 🎮 03 — UI Guide (Har Button, Har Control — Explain)

Ye file app mein **har ek button aur control** explain karti hai — kya karta hai, kab enable/disabled hota hai, kya expect karna hai.

> ✅ **v1.0.6 mein har button live-browser pe test kiya gaya hai** — sab kaam karte hain, zero console errors.

---

## 🏠 App kholte hi kya hota hai

App khulte hi **seedha New Game dialog** khulta hai (koi launch/intro page nahi — v1.0.6 mein hatayi gayi). Pehli baar: setup. Baad mein: purana game resume hota hai.

---

## 1️⃣ New Game Dialog (naya game banate waqt)

### Mode chunna (2 options)
| Button | Kya karta hai |
| --- | --- |
| **🤖 vs AI** | MasterBot ke against khelo — 4 levels, hints, coach, rating sab active |
| **👥 2 Players** | Pass & play — ek device pe do players. Naam type kar sakte ho (har player ka naam yaad rehta hai agli baar ke liye). Rating is mode mein NAHI badalti — friendly game |

### 2 Players mode ke inputs
| Field | Kaam |
| --- | --- |
| **♔ White / ♚ Black name** | Players ke naam (max 14 letters). Default "White"/"Black". Agle game mein yaad rehte hain |

### AI Difficulty (vs AI mode mein, 4 cards)
| Level | Elo | Kis liye |
| --- | --- | --- |
| 😊 **Easy** | ~800 | Seekhne wale — galtiyan karta hai, raham karta hai |
| ⚔️ **Medium** | ~1400 | Club player — solid, but beatable |
| 🔥 **Ultra Hard** | ~2000 | Full strength search — chhoti galti bhi punish karega |
| 👑 **Master** | ~2500 | Maximum power, koi raham nahi |

| Button | Kaam |
| --- | --- |
| **💡 Suggest for me** | Aapki rating + recent results dekh ke batata hai "kaunsa level aapke liye sahi hai". Sirf **advice** deta hai — khud kuch select NAHI karta. ✕ se dismiss karo |
| **Keep playing current game** | Dialog band karo, jo game chal rahi hai usme wapas (sirf jab game active hai dikhta hai) |
| **⚔️ Start Game** | Game shuru! Aapke choices (level, mode, naam) yaad rakhe jaate hain agli baar ke liye |

### Your Side (vs AI)
| Button | Kaam |
| --- | --- |
| **♔ White** | Aap White se khelo (pehla move aapka) |
| **♚ Black** | Aap Black — AI pehle khelta hai |
| **⚄ Random** | Coin toss — random side |

### Time Control (5 chips)
| Chip | Kaam |
| --- | --- |
| **Unlimited** | Koi clock nahi — sochte raho |
| **3 + 2 Blitz** | 3 min + har move pe 2 sec bonus |
| **5 min Blitz** | 5 min, koi bonus nahi |
| **10 min Rapid** | 10 min |
| **15 + 10 Classical** | 15 min + 10 sec/move |

⏰ **Time khatam = haar.** Player bar mein clock dikhta hai; <30 sec pe clock **red** ho jata hai.

---

## 2️⃣ Header (sabse upar wali bar)

| Button | Kaam |
| --- | --- |
| **♞ MasterBot Chess + ELO badge** | Logo aur aapki current rating (vs-AI games se) |
| **📊 Statistics** | Stats dialog kholta hai (neeche dekho) |
| **⚙️ Settings** | Settings dialog kholta hai (neeche dekho) |
| **➕ New** | New Game dialog kholta hai — beech mein game chhod ke nayi shuru kar sakte ho |

---

## 3️⃣ Board pe khelna

| Action | Kya hota hai |
| --- | --- |
| **Piece pe click** | Piece select → legal squares pe **dots** dikhte hain (Settings mein off kar sakte ho) |
| **Target square pe click** | Move ho jata hai — animation ke saath (Settings se speed/off) |
| **Wapas apni hi piece pe click** | Selection badal jaata hai |
| **Khaali/fixed square pe click** | Selection cancel |
| **Drag & drop** | Click ki tarah hi — piece ko pakad ke drop bhi kar sakte ho |
| **Illegal move ki koshish** | Kuch nahi hota (silent ignore) — dots hi dikhate hain kahan ja sakte ho |

**Special moves automatic samajhta hai:** castling (king ko 2 square le jao), en passant (dots dikhenge), promotion (neeche dekho).

### Promotion (pawn last rank pe)
| Jab auto-promote ON hai | Seedha Queen ban jaata hai |
| --- | --- |
| **Jab OFF hai** | Ek chhota dialog aata hai: ♛ Queen / ♜ Rook / ♝ Bishop / ♞ Knight — jo chuno wo ban jaata hai. Ya **Cancel** se move wapas |

---

## 4️⃣ Board ke aas-paas

### Player Bars (upar + neeche)
| Element | Kaam |
| --- | --- |
| **Naam + title** | Upar: AI/opperating player. Neeche: aap (vs AI) ya dono players (2-player) |
| **⏱ Clock** | Time control laga ho to countdown. Baari kiski = wo highlighted |
| **captured pieces** | Jo pieces khaaye gaye wo dikhate hain + material advantage (+3 etc.) |
| **🔴 red dot** | Check mein ho to king pe red highlight + bar pe ishara |

### Eval Bar (board ke left/right)
Vertical bar: **White ka hissa neeche se upar bharta hai**. +2.3 likha ho to White 2.3 pawns aage. Bar 50/50 = balanced. Mate dikhane pe full bar + "M5" (mate in 5).

### Suggestion Bar (board ke neeche)
| Button/State | Kaam |
| --- | --- |
| **💡 "Which move should I play?"** | Engine aapke liye best move nikalta hai — move + kyun + eval dikhata hai, aur board pe **green arrow** |
| **✕ (dismiss)** | Suggestion band karo |
| **"Move suggestions appear here..."** | Aapki baari nahi hai — tab tak ye passive message |
| **Spinner "Engine is finding..."** | 0.5-2 sec engine soch raha hai |

### Engine Panel (side column, vs AI only)
AI ka card: level + title, thinking status (depth/nodes live), "from book" badge jab opening book se khel raha ho, aur **learning feed** — AI jo seekh raha hai wo messages mein dikhta hai.

---

## 5️⃣ Game Controls (neeche wali button row)

### Game buttons
| Button | Kab enabled | Kya karta hai |
| --- | --- | --- |
| **🔄 New game** | Hamesha | New Game dialog kholta hai |
| **↩️ Undo** | Game chal rahi + moves hain + AI soch nahi raha + live view pe | Aakhri **move-pair** wapas (aapka + AI ka move). 2-player mein ek move. Toast dikhta hai agar kuch wapas karne ko nahi |
| **💡 Hint** | Aapki baari + live view | Suggestion bar mein best move + arrow |
| **🤝 Offer draw** | Game chal rahi + pehle se offered nahi | AI ko draw offer — wo position dekh ke **accept/decline** karta hai (aam taur par decline jab uski behtar ho). 2-player mein opponent turant accept/decline kar sakta hai |
| **🏳️ Resign** | Game chal rahi | Game haarna — Game Over dialog aata hai |
| **🔄 Flip board** | vs AI mode | Board palat jaata hai (aap side badal ke dekh sakte ho). 2-player mein **hidden** — board wahi rehta hai (pass & play ke liye sahi) |
| **📋 Copy PGN** | Hamesha | Pura game PGN format mein clipboard pe — kahin bhi paste karo (chess.com, lichess analysis...) |
| **💾 Download PGN** | Hamesha | `.pgn` file download — `masterbot-game-2026-11-10.pgn` jaisa naam |

### Navigation buttons (purani positions dekhna)
| Button | Kaam |
| --- | --- |
| **⏮ First (Home)** | Shuruaati position pe jao |
| **◀ Prev (←)** | Ek move peeche |
| **▶ Next (→)** | Ek move aage |
| **⏭ Live (End)** | Current (latest) position pe wapas |

> View history mein ho to "**viewing 12/30**" jaisa label dikhta hai. **Is state mein board sirf dikhata hai — move nahi kar sakte** (cheating nahi!). Live pe wapas aao, phir khelo.

---

## 6️⃣ Move List + Eval Graph (side column)

| Element | Kaam |
| --- | --- |
| **Move table** | Har move number ke saath SAN (1. e4 e5 2. Nf3...). Current view move **highlighted**. Click karke us position pe jao |
| **Eval graph** | Poori game ki eval line-chart — upar White jeet raha, neeche Black. Click karke us move pe jao. Mistake/blunder **dots** alag rang mein |
| **Opening name** | Jo opening khel rahe ho wo (Ruy Lopez, Sicilian...) |
| **"N moves · viewing X/Y"** | Kitne moves hue + kahan dekh rahe ho |

---

## 7️⃣ Game Over Dialog (game khatam hone pe)

| Element | Kaam |
| --- | --- |
| **Trophy/Handshake/Flag icon** | Jeet / draw / haar |
| **Result + reason** | "You won! by checkmate" / "Draw by threefold repetition" etc. |
| **Stats cards** | Aapki **accuracy %**, **mistakes**, **blunders** (2-player: dono players ke alag-alag cards) |
| **± Elo** | Rating change: +12 ya -8 (2-player friendly games mein NAHI badalta) |
| **🔄 Rematch** | Same settings se turant nayi game |
| **⚙️ New settings** | New Game dialog kholo — naya level/mode/side chuno |
| **📋 Copy game PGN** | Game ka PGN copy |

**Game kaise khatam hota hai:** checkmate, stalemate, resign, time out, draw agreement, threefold repetition, 50-move rule, insufficient material — **sab rules poori tarah implement hain**.

---

## 8️⃣ Statistics Dialog (📊 header se)

**4 summary cards:** Rating · Peak rating · Streak (W3/L2) · Win rate %

**3 tabs:**
| Tab | Kya hai |
| --- | --- |
| **Rating** | SVG line chart — rating history (har finished vs-AI game ke baad ek point) |
| **Record** | W/D/L counts + **har level ke against alag record** (Easy: 5W 1L...) |
| **Games** | Last 50 games ki list — result dot, opponent, opening, moves, accuracy, date |

> Sab data local hai — browser delete/ho to sab jata hai (Wipe bhi kar sakte ho).

---

## 9️⃣ Settings Dialog (⚙️ header se)

### Board Theme (6 themes)
Walnut (classic) · Tournament Green · Slate & Stone · Midnight Neon · Coral Beach · Cherry Wood — click karo, turant lag jaata hai, yaad rehta hai.

### Toggles (7)
| Setting | Default | Kya karta hai |
| --- | --- | --- |
| **🔊 Sound effects** | ON | Move/capture/check/result sounds (WebAudio se generate — koi file nahi) |
| **👁 Show legal moves** | ON | Selected piece ki legal squares pe dots |
| **Coordinates** | ON | Board ke kinare a-h, 1-8 |
| **Evaluation bar** | ON | Side mein eval bar dikhana |
| **Highlight last move** | ON | Aakhri move ke from/to squares pe halka rang |
| **Live coach analysis** | ON | Har move classify karna (best/blunder...) + accuracy |
| **Auto-promote to queen** | OFF | Promotion dialog skip — seedha Queen |

### Piece Animation slider
**0 (Off) — 400ms**. Kitni der piece slide karta hai. 0 = instant.

### 🧠 AI Memory — Wipe button
MasterBot ki **saari learning delete** karta hai (aapki openings jo usne yaad rakhi, style read, memory book). Profile/rating SAFE rehte hain — sirf AI ki memory jaati hai. Ek baar click — confirm ki zaroorat nahi, seedha wipe + toast.

---

## ⌨️ Keyboard Shortcuts

| Key | Kaam |
| --- | --- |
| **H** | Hint request (💡 button jaisa) |
| **F** | Board flip |
| **← / →** | Pichla / agla move view |
| **Home / End** | First / live position |

---

## 📱 Mobile pe kya alag hai

- Layout ek column mein stack hota hai (board upar, side column neeche)
- Board height viewport ke hisaab se **auto-fit** hota hai — scroll karke rank-1 tak pahunch sakte ho
- 2-player mode mein board **fixed** rehta hai (White neeche) — device pass karo
- Sab dialogs mobile-friendly (scrollable, full-width)
- PWA: browser menu → "Install app" → icon home screen pe, offline chalta hai

---

## 🔗 Next: [04-DATA-PRIVACY.md](04-DATA-PRIVACY.md) — data kahan save hota hai
