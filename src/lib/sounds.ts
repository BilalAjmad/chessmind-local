// ─── Synthesized sounds via Web Audio (no external files) ───────────────────

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

interface ToneOpts {
  freq: number;
  duration: number;
  volume?: number;
  type?: OscillatorType;
  delay?: number;
  sweepTo?: number;
}

function tone({
  freq,
  duration,
  volume = 0.15,
  type = "sine",
  delay = 0,
  sweepTo,
}: ToneOpts): void {
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, t0 + duration);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

function noise(duration: number, volume = 0.1, delay = 0, freq = 2000): void {
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const len = Math.floor(ac.sampleRate * duration);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  }
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = freq;
  const gain = ac.createGain();
  gain.gain.value = volume;
  src.connect(filter).connect(gain).connect(ac.destination);
  src.start(t0);
}

export const sounds = {
  /** standard piece move: soft wooden thock */
  move() {
    noise(0.06, 0.18, 0, 900);
    tone({ freq: 220, duration: 0.06, volume: 0.05, type: "triangle" });
  },
  /** capture: sharper knock */
  capture() {
    noise(0.09, 0.28, 0, 1400);
    tone({ freq: 160, duration: 0.08, volume: 0.09, type: "square" });
    tone({ freq: 90, duration: 0.1, volume: 0.07, type: "sine", delay: 0.02 });
  },
  /** check: alert double tone */
  check() {
    tone({ freq: 660, duration: 0.09, volume: 0.09, type: "triangle" });
    tone({ freq: 880, duration: 0.11, volume: 0.09, type: "triangle", delay: 0.09 });
  },
  /** castle: two quick moves */
  castle() {
    noise(0.05, 0.15, 0, 900);
    noise(0.05, 0.15, 0.08, 700);
  },
  /** promotion: rising arpeggio */
  promote() {
    tone({ freq: 440, duration: 0.08, volume: 0.08, type: "triangle" });
    tone({ freq: 554, duration: 0.08, volume: 0.08, type: "triangle", delay: 0.07 });
    tone({ freq: 659, duration: 0.1, volume: 0.08, type: "triangle", delay: 0.14 });
    tone({ freq: 880, duration: 0.14, volume: 0.09, type: "triangle", delay: 0.21 });
  },
  /** game start */
  start() {
    tone({ freq: 523, duration: 0.1, volume: 0.07, type: "triangle" });
    tone({ freq: 659, duration: 0.12, volume: 0.07, type: "triangle", delay: 0.1 });
  },
  /** win: fanfare */
  win() {
    tone({ freq: 523, duration: 0.12, volume: 0.09, type: "triangle" });
    tone({ freq: 659, duration: 0.12, volume: 0.09, type: "triangle", delay: 0.11 });
    tone({ freq: 784, duration: 0.2, volume: 0.1, type: "triangle", delay: 0.22 });
    tone({ freq: 1046, duration: 0.3, volume: 0.1, type: "triangle", delay: 0.34 });
  },
  /** loss: descending */
  lose() {
    tone({ freq: 392, duration: 0.16, volume: 0.08, type: "triangle" });
    tone({ freq: 311, duration: 0.18, volume: 0.08, type: "triangle", delay: 0.15 });
    tone({ freq: 233, duration: 0.3, volume: 0.09, type: "triangle", delay: 0.32 });
  },
  /** draw */
  draw() {
    tone({ freq: 440, duration: 0.14, volume: 0.07, type: "triangle" });
    tone({ freq: 440, duration: 0.2, volume: 0.07, type: "triangle", delay: 0.16 });
  },
  /** low time tick */
  tick() {
    tone({ freq: 1200, duration: 0.03, volume: 0.05, type: "square" });
  },
  /** illegal action */
  illegal() {
    tone({ freq: 180, duration: 0.09, volume: 0.08, type: "sawtooth" });
  },
  /** button click */
  click() {
    tone({ freq: 800, duration: 0.03, volume: 0.04, type: "square" });
  },
};

export type SoundName = keyof typeof sounds;

export function playSound(name: SoundName, enabled: boolean): void {
  if (!enabled) return;
  try {
    sounds[name]();
  } catch {
    /* audio unavailable */
  }
}

/** unlock audio on first user gesture */
export function primeAudio(): void {
  getCtx();
}
