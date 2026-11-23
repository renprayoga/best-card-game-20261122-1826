// Runeforge Duel — synthesized sound effects. No audio files, no network:
// every effect is a short WebAudio oscillator burst, created only after a
// user gesture (AudioContext stays suspended until then).
let ctx = null;
let muted = false;

export function unlockAudio() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { ctx = null; }
  }
  if (ctx && ctx.state === 'suspended') void ctx.resume();
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

export function isMuted() { return muted; }

function tone(freq, dur, type = 'sine', vol = 0.12, when = 0) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

const SOUNDS = {
  play: () => { tone(520, 0.12, 'triangle', 0.14); tone(780, 0.14, 'triangle', 0.1, 0.06); },
  spell: () => { tone(880, 0.1, 'sine', 0.12); tone(1320, 0.16, 'sine', 0.1, 0.07); },
  hit: () => { tone(180, 0.14, 'sawtooth', 0.14); tone(120, 0.12, 'square', 0.07, 0.02); },
  block: () => { tone(300, 0.08, 'triangle', 0.08); },
  die: () => { tone(420, 0.2, 'sawtooth', 0.1); tone(210, 0.24, 'sawtooth', 0.1, 0.08); },
  heal: () => { tone(660, 0.12, 'sine', 0.1); tone(990, 0.18, 'sine', 0.09, 0.08); },
  win: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.13, i * 0.12)); },
  lose: () => { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.24, 'sawtooth', 0.08, i * 0.13)); },
  error: () => { tone(140, 0.12, 'square', 0.08); },
};

export function playSound(name) {
  const fn = SOUNDS[name];
  if (fn) fn();
}
