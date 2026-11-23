// Runeforge Duel — the card pool: every card's identity, cost and text.
// Four original sigils, each with its own stat character:
//   Ember  — high attack, fragile.  Frost — balanced, control.
//   Verdant — tough, slow.        Stone — heavy, expensive.

export const SUITS = {
  ember:   { name: 'EMBER',   color: '#c33d12', dark: '#8a2408', blurb: 'Burn fast, hit hard.' },
  frost:   { name: 'FROST',   color: '#2a6fd0', dark: '#123a7a', blurb: 'Cold patience, cold steel.' },
  verdant: { name: 'VERDANT', color: '#3d8a3a', dark: '#1d5a1a', blurb: 'Roots hold. Thorns answer.' },
  stone:   { name: 'STONE',   color: '#6a6f7d', dark: '#3a3e4a', blurb: 'Nothing moves a mountain.' },
};

// Inline SVG sigil marks (no font dependency, no network).
export function suitIcon(suit, size = 56) {
  const s = SUITS[suit];
  const inner = {
    ember: `<path d="M28 4 L48 30 L28 52 L8 30 Z" fill="${s.color}" stroke="#fff" stroke-width="2"/><path d="M28 14 L40 30 L28 42 L16 30 Z" fill="#ffd97a"/>`,
    frost: `<g stroke="${s.color}" stroke-width="4" stroke-linecap="round"><line x1="28" y1="6" x2="28" y2="50"/><line x1="9" y1="17" x2="47" y2="39"/><line x1="47" y1="17" x2="9" y2="39"/></g><circle cx="28" cy="28" r="7" fill="#d8ecff" stroke="${s.color}" stroke-width="2"/>`,
    verdant: `<path d="M28 6 C44 18 46 36 28 50 C10 36 12 18 28 6 Z" fill="${s.color}" stroke="#fff" stroke-width="2"/><path d="M28 12 L28 46" stroke="#d8ffd0" stroke-width="2"/>`,
    stone: `<path d="M28 5 L50 17 L50 39 L28 51 L6 39 L6 17 Z" fill="${s.color}" stroke="#fff" stroke-width="2"/><path d="M28 15 L40 23 L40 35 L28 43 L16 35 L16 23 Z" fill="#dfe3ee"/>`,
  }[suit];
  return `<svg viewBox="0 0 56 56" width="${size}" height="${size}" aria-hidden="true">${inner}</svg>`;
}

// id, name, suit, kind, cost, atk, hp, text. Spells have atk/hp null.
export const CARD_POOL = [
  // Ember creatures — glass cannons.
  { id: 'cinder-imp',    name: 'Cinder Imp',     suit: 'ember', kind: 'creature', cost: 1, atk: 2, hp: 1, text: 'Small, quick, and already on fire.' },
  { id: 'flame-hound',   name: 'Flame Hound',    suit: 'ember', kind: 'creature', cost: 2, atk: 3, hp: 2, text: 'It hunts in a pack of sparks.' },
  { id: 'pyre-drake',    name: 'Pyre Drake',     suit: 'ember', kind: 'creature', cost: 4, atk: 5, hp: 4, text: 'A young dragon with old grudges.' },
  { id: 'inferno-golem', name: 'Inferno Golem',  suit: 'ember', kind: 'creature', cost: 6, atk: 7, hp: 7, text: 'The forge itself, given legs.' },
  // Frost creatures — even, patient.
  { id: 'frost-sprite',  name: 'Frost Sprite',   suit: 'frost', kind: 'creature', cost: 1, atk: 1, hp: 2, text: 'A snowflake that learned to bite.' },
  { id: 'glacier-wolf',  name: 'Glacier Wolf',   suit: 'frost', kind: 'creature', cost: 2, atk: 2, hp: 3, text: 'Its howl freezes the air solid.' },
  { id: 'ice-revenant',  name: 'Ice Revenant',   suit: 'frost', kind: 'creature', cost: 3, atk: 4, hp: 3, text: 'It remembers every winter.' },
  { id: 'blizzard-wyrm', name: 'Blizzard Wyrm',  suit: 'frost', kind: 'creature', cost: 5, atk: 6, hp: 5, text: 'A storm with teeth.' },
  // Verdant creatures — walls that bite back.
  { id: 'thorn-sprout',  name: 'Thorn Sprout',   suit: 'verdant', kind: 'creature', cost: 1, atk: 1, hp: 3, text: 'Do not step on the garden.' },
  { id: 'bramble-stag',  name: 'Bramble Stag',   suit: 'verdant', kind: 'creature', cost: 2, atk: 3, hp: 3, text: 'Antlers of living briar.' },
  { id: 'grove-guardian',name: 'Grove Guardian', suit: 'verdant', kind: 'creature', cost: 4, atk: 4, hp: 6, text: 'The forest stands its ground.' },
  { id: 'ancient-treant',name: 'Ancient Treant', suit: 'verdant', kind: 'creature', cost: 6, atk: 6, hp: 8, text: 'Older than the mountain it guards.' },
  // Stone creatures — slow avalanches.
  { id: 'pebble-golem',  name: 'Pebble Golem',   suit: 'stone', kind: 'creature', cost: 1, atk: 2, hp: 2, text: 'Small rocks, big attitude.' },
  { id: 'granite-boar',  name: 'Granite Boar',   suit: 'stone', kind: 'creature', cost: 2, atk: 3, hp: 3, text: 'Charges like a landslide.' },
  { id: 'obsidian-knight', name: 'Obsidian Knight', suit: 'stone', kind: 'creature', cost: 4, atk: 5, hp: 5, text: 'Black glass, sharp edges.' },
  { id: 'mountain-titan',name: 'Mountain Titan', suit: 'stone', kind: 'creature', cost: 7, atk: 8, hp: 8, text: 'When it walks, the map changes.' },
  // Spells — one clear job each.
  { id: 'ember-bolt',    name: 'Ember Bolt',     suit: 'ember', kind: 'spell', cost: 2, atk: null, hp: null, text: 'Deal 4 damage to any target.', effect: 'bolt', power: 4 },
  { id: 'frost-mend',    name: 'Frost Mend',     suit: 'frost', kind: 'spell', cost: 2, atk: null, hp: null, text: 'Restore 8 life to your hero.', effect: 'mend', power: 8 },
  { id: 'verdant-draw',  name: 'Verdant Bloom',  suit: 'verdant', kind: 'spell', cost: 1, atk: null, hp: null, text: 'Draw 2 cards.', effect: 'draw', power: 2 },
  { id: 'stone-ward',    name: 'Stone Ward',     suit: 'stone', kind: 'spell', cost: 2, atk: null, hp: null, text: 'Gain 6 armor.', effect: 'ward', power: 6 },
  { id: 'ember-nova',    name: 'Ember Nova',     suit: 'ember', kind: 'spell', cost: 4, atk: null, hp: null, text: 'Deal 2 damage to all enemy creatures.', effect: 'nova', power: 2 },
  { id: 'frostbind',     name: 'Frostbind',      suit: 'frost', kind: 'spell', cost: 3, atk: null, hp: null, text: 'Freeze an enemy creature: it skips its next attack.', effect: 'freeze', power: 1 },
];

export function cardById(id) {
  return CARD_POOL.find((c) => c.id === id);
}

// A creature's value for the AI: stats per mana, biased to attack.
export function cardValue(card) {
  if (card.kind === 'spell') return card.cost * 2 + 3;
  return (card.atk * 1.4 + card.hp) / Math.max(1, card.cost);
}
