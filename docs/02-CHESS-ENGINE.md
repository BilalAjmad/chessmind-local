# 🧠 02 — Chess Engine (AI Ka Dimaag)

Ye file explain karti hai ke MasterBot actually kaise sochta hai. Ye engine **scratch se likhi gayi hai** — koi Stockfish library nahi hai. ~2600 lines ka pure TypeScript hai jo browser ke andar hi chalta hai.

---

## 🧩 Engine ke 10 hisse

| Module | File | Kaam |
| --- | --- | --- |
| 1. Board | `board.ts` | Position represent karna, moves generate karna |
| 2. Types | `types.ts` | Pieces, moves, constants |
| 3. Zobrist | `zobrist.ts` | Har position ka unique ID (hash) |
| 4. Evaluation | `eval.ts` | "Kaun jeet raha hai, kitna" — number mein |
| 5. Search | `search.ts` | "Aage sochna" — best move dhundhna |
| 6. Opening book | `book.ts` | Pehle moves memorized |
| 7. Learning | `learning.ts` | Aapko padhna aur adapt karna |
| 8. Engine facade | `engine.ts` | Sab jodna — levels ka config |
| 9. SAN | `san.ts` | Moves ko human notation mein likhna |
| 10. Worker | `worker-entry.ts` | UI se messages lena, engine chalana |

---

## 1️⃣ Board representation — board ko computer kaise yaad rakhta hai

Board ek **0x88 array** mein stored hai (128 slots, 64 actual squares + 64 padding). Har square pe ek number — piece ka code:

```
White pieces: P=1, N=2, B=3, R=4, Q=5, K=6
Black pieces: 9, 10, 11, 12, 13, 14 (white + 8)
Empty square: 0
```

**0x88 trick kyun?** Isse "kya ye square board pe hai?" ek hi AND se check hota hai (`sq & 0x88 === 0`). Super fast — engine ko crore baar check karna padta hai.

Ek **move** ko 22-bit number mein pack kiya jata hai: `from | to<<8 | flags<<16 | promo<<20`. Ek integer = pura move. Memory bahut kam leti hai.

`Position` class yaad rakhta hai: piece placement, side to move, castling rights, en-passant square, halfmove clock — full FEN state. **makeMove/undoMove** instant hote hain (mutate + revert).

---

## 2️⃣ Zobrist hashing — har position ka fingerprint

Har position ke liye ek 64-bit hash banta hai: har piece har square pe ek random number se XOR hota hai. **Faida:** move karo → sirf 2 numbers XOR karo (piece gaya, piece aaya) — naya hash 2 operations mein. Ye hash **transposition table** ki key hai (neeche dekho).

---

## 3️⃣ Evaluation — "kaun jeet raha hai?"

`eval.ts` position ko **centipawns (cp)** mein number deta hai: `+150` = White 1.5 pawn aage, `-80` = Black thoda aage.

Ye **tapered evaluation** hai — do sets tables ke saath:

| Phase | Kya matter karta hai |
| --- | --- |
| **Midgame** (MG) | Piece development, center control, king safety |
| **Endgame** (EG) | Passed pawns, king activity, promotion race |

Do phases ke beech **phase weight** (remaining material) se blend hota hai. Jab queens/rooks nikal jaate hain, engine dheere-dheere endgame ki sochne lagta hai.

**Tables PeSTO style hain** (famous open-source table set): har piece type ke liye 64 numbers — "ye square pe piece kitna valuable hai". Misal: pawn center mein acha (e4/d4 = +), knight corner mein kharab, king endgame mein center mein acha.

**Extras jo hand-coded hain:**
- **Pawn structure** — doubled/isolated pawns penalty
- **Passed pawns** — rank ke hisaab se bonus (7th rank pawn = almost queen!)
- **King safety** — open files pe king, pawns ki chhat na ho to penalty
- **Bishop pair** bonus (+30cp approx)
- **Rook open files** bonus
- **Mobility** — kitne squares piece dekh sakta hai

**Mate score** ±30000 hai — engine ko pata hai checkmate sabse badi cheez hai.

---

## 4️⃣ Search — "aage sochna" (engine ka asli power)

Ye classic **iterative deepening alpha-beta** hai:

### Alpha-beta kya hai?
Simple tree search mein har move ke saare replies, unke replies... — billions of positions. Alpha-beta **pruning** se aadha (ya zyada) tree kaat deta hai: "is branch ka best result bhi mere pehle dekhe result se kharab hai? To isko poora dekhne ki zaroorat hi nahi." Same best move, 10-100x kam kaam.

### Iterative deepening
Depth 1 se shuru → best move yaad → depth 2 → ... → depth 14 tak (level pe depend). **Faida:** time limit aaye to beech mein rok do — jo best move ab tak mili wo use kar lo. Aur behtar move ordering bhi milti hai (pehli iteration ke acche moves pehle try karo → zyada pruning).

### Quiescence search
Depth khatam hone pe engine **hindi capture-chains** kharab move de sakta hai. Isliye leaf pe "quiescence" chalti hai: sirf captures/checks follow karo jab tak position "shaant" na ho jaye. Isse horizon effect kam hota hai.

### Transposition table (TT) — 1M entries
Purani positions ka hash → best move + score + depth yaad. Same position dobara aaye (moves ke order badal ke) → instant answer cache se. 1,048,576 entries ki direct-mapped table.

### Killer moves + history heuristic
Jo moves pehle same depth pe best rahe (ya cutoff diye), unhe ordering mein aage rakha jata hai. **Move ordering search ki jaan hai** — accha order = zyada pruning = zyada depth same time mein.

### Check extensions
Check ke waqt ek extra depth — engine taktical lines ko poora dekhta hai.

---

## 5️⃣ Difficulty levels — AI kaise "Easy" hota hai

Ye engine ko slow nahi karta — **move choice** se khelta hai:

| Level | Elo ~ | Depth | Time/move | Temperature | Book |
| --- | --- | --- | --- | --- | --- |
| Easy | 800 | 2 | 0.3s | 140 | 2 plies |
| Medium | 1400 | 3 | 0.7s | 30 | 6 plies |
| Ultra Hard | 2000 | 8 | 0.85s | 0 | 12 plies |
| Master | 2500 | 14 | 1.3s | 0 | 16 plies |

**Temperature = softmax over root move scores.** Matlab: Easy level saare root moves ke scores dekhta hai, aur **probability se random pick** karta hai — accha move zyada chance se, bekaar move bhi kabhi kabhi. Isliye Easy "insaan jaisa" galti karta hai — ye fake nahi, real weak play hai.

**Ultra Hard aur Master: temperature 0** — hamesha jo best move mile wo khelte hain, koi raham nahi.

---

## 6️⃣ Opening book — pehle 2-16 moves memorized

`book.ts` mein ~200+ main opening lines hain (Sicilian, Ruy Lopez, French, Italian, Queen's Gambit, London, Caro-Kann...). Har position pe **weighted random choice**: `"e2e4:4", "d2d4:3", "g1f3:2"` — matlab e4 sabse zyada chance.

Book level ke hisaab se depth tak follow hoti hai (Easy = 2 plies, Master = 16 plies). Book khatam → search engine on.

**Aakhri 1-2 book moves hamesha search se verify hote hain** — book galat ho to engine sudhaar deta hai.

---

## 7️⃣ Adaptive learning — AI aapko YAAD rakhta hai 🧠

Ye project ka special feature hai (`learning.ts`). Vs-AI games mein, MasterBot **aapko study karta hai**:

### A. Player Model (aapki personality ka data)
Har classified move ke baad update hota hai (EWMA — recent moves zyada weight):
- **Aggression** — kitne captures/checks aap khelte ho
- **Blunder rate** — aap kitni galtiyan karte ho
- **Mistake rate, accuracy, average move time**
- **Opening plays** — aap kaunse openings khelte ho

### B. Memory Book (harayi hui lines yaad)
Agar aap kisi opening line mein AI ko **harate** ho — wo line **avoid** hoti hai agli baar. Agar aap kisi line mein **haarte** ho — AI wo line **repeat** karta hai. Ye localStorage mein persist hota hai — agli baar site kholo, AI yaad rakhta hai.

### C. Style Bias (abhi, live adapt)
Player model engine ko **style bias** deta hai:
- Aap shaky ho (high blunder rate) → AI **sharper** khelta hai — tactical complications dhone karta hai
- Aap solid ho → AI **quieter** khelta hai — slow squeeze

### D. Insights feed
Engine panel mein "what I learned" messages dikhte hain: *"You've captured 5 times in 10 moves — I'm keeping the position closed."* — real data se, fake text nahi.

**Settings → Wipe** se ye saari memory mit ja sakti hai.

---

## 8️⃣ Engine facade + move explanation

`engine.ts` sab modules ko jodta hai: book lookup → miss ho to search → level config apply → learning bias. Sath hi har AI move ke liye **chhota explanation** bhi generate hota hai: "captures your free knight on d5", "develops with tempo", "pushes a passed pawn" — engine panel aur suggestion bar mein dikhta hai.

---

## 9️⃣ SAN notation
`san.ts` moves ko standard human format mein badalta hai: `Nf3`, `exd5+`, `O-O`, `Qxf7#`. Move list aur PGN export isi se aate hain.

---

## 🔟 Web Worker
Engine **main thread pe kabhi nahi chalta** — warna UI freeze ho jata. `worker-entry.ts` messages sunta hai, engine chalata hai, result post karta hai. Isliye AI soch rahe ho bhi aap board scroll/drag kar sakte ho. UI lag zero.

---

## 📊 Engine numbers (indicative)

- Search speed: **~100k-500k+ nodes/sec** typical browser pe (device pe depend)
- Master level: depth 14 tak iterative deepening, TT ke saath
- Perft correctness: engine ke move generator **perft test** se verified (standard positions pe exact node counts)
- CI mein har push pe: `test-engine.ts` (self-play 60+ plies), `test-book.ts` (book validation), `test-learning.ts` (learning tests)

---

## 🔗 Next: [03-UI-GUIDE.md](03-UI-GUIDE.md) — har button kya karta hai
