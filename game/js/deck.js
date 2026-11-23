// Runeforge Duel — deck construction and drawing.
// A deck is 30 cards: every pool card once, plus a second copy of the
// eight cheapest creatures so the early game always has something to play.
import { CARD_POOL } from './cards.js';
import { shuffle } from './rng.js';

export const DECK_SIZE = 30;
export const HAND_LIMIT = 10;
export const TABLE_LIMIT = 5;

export function buildDeck(rand) {
  const deck = CARD_POOL.map((c) => c.id);
  const cheap = CARD_POOL.filter((c) => c.kind === 'creature' && c.cost <= 2).map((c) => c.id);
  for (const id of cheap) deck.push(id);
  return shuffle(deck, rand);
}

export function drawCards(state, who, n, log) {
  const side = state[who];
  for (let i = 0; i < n; i++) {
    if (side.deck.length === 0) {
      // Fatigue: an empty deck still hurts, a little more each time.
      side.fatigue += 1;
      state.damageHero(who, side.fatigue, 'fatigue');
      log(`${side.name} takes ${side.fatigue} fatigue damage — the deck is empty!`);
      continue;
    }
    const id = side.deck.pop();
    if (side.hand.length >= HAND_LIMIT) {
      log(`${side.name}'s hand is full — a card burns away.`);
      continue;
    }
    side.hand.push(id);
  }
}
