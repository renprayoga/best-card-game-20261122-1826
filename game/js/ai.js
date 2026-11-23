// Runeforge Duel — the rival's brain: Vex plays by cheap, readable rules.
// No search tree, no simulation: one pass over the hand, one pass over the
// table. Every choice is a single heuristic score, so a turn costs O(n).
import { cardById, cardValue } from './cards.js';

// Pick the best affordable creature, if any. Returns the hand index or -1.
export function pickCreature(state) {
  const foe = state.foe;
  let best = -1;
  let bestScore = 0;
  foe.hand.forEach((id, i) => {
    const card = cardById(id);
    if (card.kind !== 'creature') return;
    if (card.cost > foe.mana) return;
    if (foe.table.every(Boolean)) return;
    const score = cardValue(card) + (card.cost === foe.mana ? 0.4 : 0);
    if (score > bestScore) { bestScore = score; best = i; }
  });
  return best;
}

// Pick a spell to cast now, if the board calls for one. Returns { index, target }
// or null. Target is { who: 'you'|'foe', slot: number|null } — slot null = hero.
export function pickSpell(state) {
  const foe = state.foe;
  const you = state.you;
  let best = null;
  let bestScore = 0;
  foe.hand.forEach((id, i) => {
    const card = cardById(id);
    if (card.kind !== 'spell' || card.cost > foe.mana) return;
    let score = 0;
    let target = null;
    if (card.effect === 'bolt') {
      const lethal = you.hp + you.armor <= card.power;
      const big = you.table.reduce((m, t) => Math.max(m, t ? t.atk + t.hp : 0), 0);
      if (lethal) { score = 10; target = { who: 'you', slot: null }; }
      else if (big >= 7) { score = 5; target = { who: 'you', slot: you.table.findIndex((t) => t && t.atk + t.hp === big) }; }
      else if (foe.mana - card.cost < 2 && you.hp <= 12) { score = 3; target = { who: 'you', slot: null }; }
      // Mana that would otherwise rot: spend it on the rival's face.
      else { score = 2.5; target = { who: 'you', slot: null }; }
    } else if (card.effect === 'mend') {
      if (foe.hp <= 16) { score = 6; target = { who: 'foe', slot: null }; }
    } else if (card.effect === 'draw') {
      if (foe.hand.length <= 3) { score = 4; target = { who: 'foe', slot: null }; }
    } else if (card.effect === 'ward') {
      if (foe.armor === 0 && foe.hp <= 20) { score = 4; target = { who: 'foe', slot: null }; }
    } else if (card.effect === 'nova') {
      if (you.table.filter(Boolean).length >= 2) { score = 6; target = { who: 'you', slot: null }; }
    } else if (card.effect === 'freeze') {
      const big = you.table.reduce((m, t) => Math.max(m, t ? t.atk : 0), 0);
      if (big >= 4) { score = 5; target = { who: 'you', slot: you.table.findIndex((t) => t && t.atk === big) }; }
    }
    if (score > bestScore) { bestScore = score; best = { index: i, target }; }
  });
  return best;
}
