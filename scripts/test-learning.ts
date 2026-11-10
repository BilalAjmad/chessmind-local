// ─── Learning system tests ───────────────────────────────────────────────────
import {
  newLearningState, createSession, observePlayerMove, consultMemory,
  memoryBadMoves, computeStyleBias, learnFromGame, memoryLineCount,
} from "../src/lib/chess/learning";

let failures = 0;
function check(name: string, cond: boolean, extra = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✓" : "✗"} ${name}${extra ? " — " + extra : ""}`);
}

// ── player modeling reacts to blunders in real time ──
{
  const s = newLearningState();
  const sess = createSession();
  for (let i = 0; i < 10; i++) {
    observePlayerMove(s, sess, {
      ply: i + 1,
      classification: i % 2 === 0 ? "blunder" : "good",
      isCapture: false,
      isCheck: false,
      timeSpentMs: 1200,
    });
  }
  check("session counts blunders", sess.blunders === 5, `${sess.blunders}`);
  check("insight fired on 3rd blunder",
    s.insights.some((i) => i.kind === "pattern" && i.text.includes("three slips")));
  check("model blunder rate rose", s.player.blunderRate > 0.2, s.player.blunderRate.toFixed(3));
  const bias = computeStyleBias(s, 30, sess);
  check("bias turns aggressive vs blunderer", bias !== null && bias.aggression > 0.3,
    bias ? `${bias.aggression.toFixed(2)} (${bias.label})` : "null");
}

// ── Master (temperature 0) never gets a style bias ──
{
  const s = newLearningState();
  const sess = createSession();
  const bias = computeStyleBias(s, 0, sess);
  check("no bias at Master", bias === null);
}

// ── memory: learns a line, then replays it ──
{
  const s = newLearningState();
  const sess = createSession();
  const game = ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5"];
  // AI is white, player loses twice with the same line
  for (let g = 0; g < 2; g++) {
    learnFromGame(s, sess, {
      uciMoves: game, playerColor: "b", result: "loss",
      opening: "Ruy Lopez", playerAccuracy: 55, blunders: 3, mistakes: 1,
      avgMoveTimeMs: 4000,
    });
  }
  check("book learned 3 AI positions", memoryLineCount(s) === 3, `${memoryLineCount(s)}`);
  check("stats recorded", s.book["e2e4 e7e5"]?.["g1f3"]?.w === 2);

  const consult = consultMemory(s, ["e2e4", "e7e5"]);
  check("memory replays winning line", consult.move === "g1f3", `${consult.move}`);
  check("consult has detail", (consult.detail ?? "").includes("2W"));

  const first = consultMemory(s, []);
  check("memory replays first move", first.move === "e2e4", `${first.move}`);

  // player now WINS twice, then loses focus and the AI wins 4 more with it
  for (let g = 0; g < 2; g++) {
    learnFromGame(s, sess, {
      uciMoves: game, playerColor: "b", result: "win",
      opening: "Ruy Lopez", playerAccuracy: 90, blunders: 0, mistakes: 0,
      avgMoveTimeMs: 9000,
    });
  }
  const consult2 = consultMemory(s, ["e2e4", "e7e5"]);
  check("mixed results → no confident replay", consult2.move === null, `${consult2.move}`);
  for (let g = 0; g < 4; g++) {
    learnFromGame(s, sess, {
      uciMoves: game, playerColor: "b", result: "win",
      opening: "Ruy Lopez", playerAccuracy: 90, blunders: 0, mistakes: 0,
      avgMoveTimeMs: 9000,
    });
  }
  // g1f3 now 2W 6L → (2-7.2)/8 = -0.65 → avoid-list
  const bad = memoryBadMoves(s, ["e2e4", "e7e5"]);
  check("bad moves include g1f3", bad.has("g1f3"));
  check("review insight about the loss",
    s.insights.some((i) => i.kind === "review" && i.text.includes("avoid-list")));
}

// ── draw handling ──
{
  const s = newLearningState();
  const sess = createSession();
  learnFromGame(s, sess, {
    uciMoves: ["d2d4", "d7d5"], playerColor: "w", result: "draw",
    opening: "Queen's Pawn", playerAccuracy: 80, blunders: 0, mistakes: 0,
    avgMoveTimeMs: null,
  });
  check("draw recorded", s.book["d2d4"]?.["d7d5"]?.d === 1);
  check("player model games=1", s.player.games === 1);
  const consult = consultMemory(s, []);
  check("1 draw is not enough confidence", consult.move === null, `${consult.move}`);
}

// ── quiet player gets complications bias ──
{
  const s = newLearningState();
  const sess = createSession();
  for (let g = 0; g < 4; g++) {
    // 20 quiet, careful moves per game
    for (let i = 0; i < 20; i++) {
      observePlayerMove(s, sess, {
        ply: i + 1, classification: "good",
        isCapture: false, isCheck: false, timeSpentMs: 15000,
      });
    }
    learnFromGame(s, sess, {
      uciMoves: ["g1f3", "g8f6", "g2g3"], playerColor: "w", result: "loss",
      opening: "Réti", playerAccuracy: 85, blunders: 0, mistakes: 0,
      avgMoveTimeMs: 15000,
    });
  }
  check("aggression model is low", s.player.aggression < 0.35, s.player.aggression.toFixed(2));
  const bias = computeStyleBias(s, 30, createSession());
  check("quiet player → complication bias", bias !== null && bias.aggression > 0,
    bias ? bias.label : "null");
}

console.log(failures === 0 ? "\nALL LEARNING TESTS PASSED" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
