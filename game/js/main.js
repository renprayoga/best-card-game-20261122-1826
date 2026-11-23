// Runeforge Duel — boot, input, the rival's pacing, and the deterministic
// screenshot scenes (?shot=title|play|win|loss&seed=N).
import { Game } from './engine.js';
import { cardById } from './cards.js';
import { render, floatText, flashHero, paintTitleSigils } from './render.js';
import { unlockAudio, playSound, toggleMute, isMuted } from './audio.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const SHOT = params.get('shot');
const SEED = Number(params.get('seed') || 7);
const SHOT_MODE = Boolean(SHOT);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let game = null;
let busy = false; // true while the rival takes its turn
const ui = {
  who: 'you',
  selected: -1,
  targeting: null,
  onHandCard,
  onTarget,
};

function bestScore() {
  try { return Number(localStorage.getItem('runeforge-best') || 0); } catch (_) { return 0; }
}

function saveBest(score) {
  try {
    if (score > bestScore()) localStorage.setItem('runeforge-best', String(score));
  } catch (_) { /* storage unavailable: best score is best-effort */ }
}

function refreshBestLines() {
  const best = bestScore();
  $('best-line').textContent = `Best score: ${best > 0 ? best : '—'}  ·  M mute  ·  R restart`;
  $('end-best').textContent = `Best score: ${best > 0 ? best : '—'}`;
}

function handleEvents() {
  for (const ev of game.drainEvents()) {
    if (ev.type === 'float') floatText(ev.who, ev.slot, ev.text, ev.kind);
    else if (ev.type === 'hero-hit') flashHero(ev.who);
    else if (ev.type === 'sound') playSound(ev.name);
    else if (ev.type === 'end') onGameOver();
  }
  render(game, ui);
  refreshBestLines();
}

function onGameOver() {
  saveBest(game.you.score);
  ui.targeting = null;
  ui.selected = -1;
}

function newGame(seed) {
  game = new Game(seed);
  window.__game = game; // for headless play-tests
  window.__render = () => handleEvents(); // re-render after a direct engine call
  ui.selected = -1;
  ui.targeting = null;
  busy = false;
  $('title-screen').hidden = true;
  $('end-screen').hidden = true;
  game.start();
  handleEvents();
}

// ---- input ----
function onHandCard(i) {
  if (busy || game.phase !== 'play' || game.active !== 'you') return;
  unlockAudio();
  const card = cardById(game.you.hand[i]);
  if (!card) return;
  if (game.spellNeedsTarget(card)) {
    const check = game.canPlay('you', i);
    if (!check.ok) { playSound('error'); game.log(`Cannot cast ${card.name}: ${check.why}.`); handleEvents(); return; }
    ui.targeting = { card, handIndex: i };
    ui.selected = i;
    handleEvents();
    return;
  }
  const res = game.playCard('you', i);
  if (!res.ok) {
    playSound('error');
    game.log(`Cannot play ${card.name}: ${res.why}.`);
    const node = $('you-hand').children[i];
    if (node) { node.classList.add('shake'); setTimeout(() => node.classList.remove('shake'), 320); }
  }
  ui.selected = -1;
  ui.targeting = null;
  handleEvents();
}

function onTarget(who, slot) {
  if (!ui.targeting) return;
  const { handIndex } = ui.targeting;
  ui.targeting = null;
  ui.selected = -1;
  const res = game.playCard('you', handIndex, { who, slot });
  if (!res.ok) playSound('error');
  handleEvents();
}

async function endTurnFlow() {
  if (busy || game.phase !== 'play' || game.active !== 'you') return;
  busy = true;
  ui.targeting = null;
  ui.selected = -1;
  unlockAudio();
  game.endTurn();
  handleEvents();
  if (game.phase === 'over') { busy = false; return; }
  await sleep(SHOT_MODE ? 0 : 700);
  // The rival's turn: draw, forge what it can, then the rows clash.
  game.beginTurn('foe');
  handleEvents();
  if (game.phase === 'over') { busy = false; return; }
  let guard = 0;
  while (game.aiAct() && guard++ < 12) {
    handleEvents();
    await sleep(SHOT_MODE ? 0 : 650);
    if (game.phase === 'over') break;
  }
  if (game.phase !== 'over') {
    await sleep(SHOT_MODE ? 0 : 500);
    game.clash();
    handleEvents();
  }
  if (game.phase !== 'over') {
    game.beginTurn('you');
    handleEvents();
  }
  busy = false;
}

// ---- deterministic screenshot scenes ----
function stagePlay() {
  // Four rounds in: boards are built, the clash has drawn blood, and
  // turn 5 opens mid-play with full hands on both sides.
  for (let round = 0; round < 4; round++) {
    autoPlayAffordable();
    game.endTurn();
    handleEvents();
    foeTurnSync();
    if (game.phase === 'over') return;
  }
  autoPlayAffordable();
  handleEvents();
}

function autoPlayAffordable() {
  let guard = 0;
  for (;;) {
    let idx = -1;
    for (let i = 0; i < game.you.hand.length; i++) {
      const c = cardById(game.you.hand[i]);
      if (c.kind === 'creature' && game.canPlay('you', i).ok) { idx = i; break; }
    }
    if (idx < 0 || guard++ > 8) break;
    game.playCard('you', idx);
  }
}

function foeTurnSync() {
  game.runFoeTurn();
}

function stageShot() {
  if (SHOT === 'title') return; // title overlay stays up
  newGame(SEED);
  if (SHOT === 'play') { stagePlay(); handleEvents(); }
  else if (SHOT === 'win') { stagePlay(); game.damageHero('foe', game.foe.hp, 'shot'); handleEvents(); }
  else if (SHOT === 'loss') { stagePlay(); game.damageHero('you', game.you.hp, 'shot'); handleEvents(); }
}

// ---- wiring ----
$('play-btn').addEventListener('click', () => {
  unlockAudio();
  newGame((Math.random() * 0xffffffff) >>> 0);
});
$('again-btn').addEventListener('click', () => {
  unlockAudio();
  newGame((Math.random() * 0xffffffff) >>> 0);
});
$('end-turn').addEventListener('click', () => void endTurnFlow());
$('foe-hero').addEventListener('click', () => {
  if (ui.targeting) onTarget('foe', null);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && ui.targeting) { ui.targeting = null; ui.selected = -1; handleEvents(); return; }
  if (e.key === 'm' || e.key === 'M') { const m = toggleMute(); game?.log(m ? 'Sound off.' : 'Sound on.'); if (game) handleEvents(); return; }
  if (e.key === 'r' || e.key === 'R') {
    if (game && game.phase !== 'title') { unlockAudio(); newGame((Math.random() * 0xffffffff) >>> 0); }
    return;
  }
  if (!$('title-screen').hidden) {
    if (e.key === 'Enter' || e.key === ' ') { unlockAudio(); newGame((Math.random() * 0xffffffff) >>> 0); }
    return;
  }
  if (e.key >= '1' && e.key <= '5') onHandCard(Number(e.key) - 1);
  if (e.key === ' ' || e.key === 'Enter') {
    if (!$('end-screen').hidden) { unlockAudio(); newGame((Math.random() * 0xffffffff) >>> 0); return; }
    e.preventDefault();
    void endTurnFlow();
  }
});

// ---- boot ----
paintTitleSigils();
refreshBestLines();
if (SHOT_MODE) {
  stageShot();
} else {
  game = new Game((Math.random() * 0xffffffff) >>> 0);
  window.__game = game;
  window.__render = () => handleEvents();
  render(game, ui);
}
