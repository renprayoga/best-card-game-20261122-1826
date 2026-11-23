// Runeforge Duel — the rules engine. No DOM here: it owns the state and
// returns plain event lists, so the same code runs in the browser and in a
// headless Node test. One round: draw, play cards, END TURN passes to the
// rival, then both rows clash at once (a creature forged this round is
// sick and waits for the next clash).
import { cardById } from './cards.js';
import { buildDeck, drawCards, TABLE_LIMIT } from './deck.js';
import { mulberry32 } from './rng.js';
import { pickCreature, pickSpell } from './ai.js';

export const MAX_HP = 30;
export const MAX_MANA = 10;

function freshSide(name, rand) {
  return {
    name, hp: MAX_HP, armor: 0, mana: 0, manaMax: 0,
    deck: buildDeck(rand), hand: [], table: Array(TABLE_LIMIT).fill(null),
    fatigue: 0, score: 0,
  };
}

export class Game {
  constructor(seed) {
    this.seed = seed >>> 0;
    this.rand = mulberry32(this.seed);
    this.events = []; // { type, ... } drained by the renderer
    this.logLines = [];
    this.phase = 'title'; // title | play | combat | over
    this.active = 'you';
    this.turn = 0;
    this.winner = null;
    this.stats = { turns: 0, damageDealt: 0, cardsPlayed: 0, spellsCast: 0 };
    this.you = freshSide('You', this.rand);
    this.foe = freshSide('Vex', this.rand);
    this.log('The duel begins. Four sigils, one forge, no mercy.');
  }

  log(msg) {
    this.logLines.push(msg);
    if (this.logLines.length > 40) this.logLines.shift();
    this.events.push({ type: 'log', msg });
  }

  start() {
    this.phase = 'play';
    this.turn = 1;
    drawCards(this, 'you', 4, (m) => this.log(m));
    drawCards(this, 'foe', 4, (m) => this.log(m));
    this.beginTurn('you');
    this.started = true; // later beginTurn('you') calls count a new round
    this.log('Your turn — forge a card, then END TURN to attack.');
  }

  beginTurn(who) {
    const side = this[who];
    this.active = who;
    if (who === 'you' && this.started) this.turn += 1;
    side.manaMax = Math.min(MAX_MANA, side.manaMax + 1);
    side.mana = side.manaMax;
    drawCards(this, who, 1, (m) => this.log(m));
    if (who === 'you') this.stats.turns += 1;
    this.events.push({ type: 'turn', who });
  }

  // ---- damage ----
  damageHero(who, n, source) {
    const side = this[who];
    let left = n;
    if (side.armor > 0) {
      const absorbed = Math.min(side.armor, left);
      side.armor -= absorbed;
      left -= absorbed;
      if (absorbed > 0) this.events.push({ type: 'float', who, slot: null, text: `-${absorbed} armor`, kind: 'heal' });
    }
    if (left > 0) {
      side.hp = Math.max(0, side.hp - left);
      this.events.push({ type: 'float', who, slot: null, text: `-${left}`, kind: 'dmg' });
      this.events.push({ type: 'hero-hit', who });
      if (who === 'foe') this.stats.damageDealt += left;
    }
    if (source !== 'fatigue') this.events.push({ type: 'sound', name: left > 0 ? 'hit' : 'block' });
    this.checkEnd();
  }

  damageCreature(who, slot, n) {
    const side = this[who];
    const c = side.table[slot];
    if (!c) return;
    c.hp -= n;
    this.events.push({ type: 'float', who, slot, text: `-${n}`, kind: 'dmg' });
    if (c.hp <= 0) {
      side.table[slot] = null;
      this.events.push({ type: 'sound', name: 'die' });
      this.log(`${c.name} shatters into sparks.`);
    }
  }

  healHero(who, n) {
    const side = this[who];
    const healed = Math.min(n, MAX_HP - side.hp);
    side.hp += healed;
    this.events.push({ type: 'float', who, slot: null, text: `+${healed}`, kind: 'heal' });
    this.events.push({ type: 'sound', name: 'heal' });
  }

  checkEnd() {
    if (this.phase === 'over') return;
    if (this.foe.hp <= 0 && this.you.hp <= 0) this.endGame('you'); // simultaneous death: the challenger takes the tie
    else if (this.foe.hp <= 0) this.endGame('you');
    else if (this.you.hp <= 0) this.endGame('foe');
  }

  endGame(winner) {
    this.phase = 'over';
    this.winner = winner;
    if (winner === 'you') {
      this.you.score += 100;
      this.log('VICTORY! Vex yields the forge.');
      this.events.push({ type: 'sound', name: 'win' });
    } else {
      this.log('DEFEAT. Vex keeps the forge… this time.');
      this.events.push({ type: 'sound', name: 'lose' });
    }
    this.events.push({ type: 'end', winner });
  }

  // ---- playing cards ----
  canPlay(who, handIndex) {
    const side = this[who];
    const card = cardById(side.hand[handIndex]);
    if (!card) return { ok: false, why: 'no such card' };
    if (card.cost > side.mana) return { ok: false, why: 'not enough mana' };
    if (card.kind === 'creature' && side.table.every(Boolean)) return { ok: false, why: 'your row is full' };
    return { ok: true, card };
  }

  // For spells: does this one need the player to pick a target?
  spellNeedsTarget(card) {
    return card.effect === 'bolt' || card.effect === 'freeze';
  }

  playCard(who, handIndex, target) {
    const side = this[who];
    const check = this.canPlay(who, handIndex);
    if (!check.ok) return check;
    const card = check.card;
    if (card.kind === 'spell' && this.spellNeedsTarget(card) && !target) {
      return { ok: false, why: 'needs-target', card };
    }
    side.hand.splice(handIndex, 1);
    side.mana -= card.cost;
    if (card.kind === 'creature') {
      const slot = side.table.findIndex((t) => !t);
      side.table[slot] = { ...card, hp: card.hp, maxHp: card.hp, frozen: false, sick: true, justPlayed: true };
      this.log(`${side.name} forges ${card.name} (${card.atk}/${card.hp}) onto the row.`);
      this.events.push({ type: 'sound', name: 'play' });
      if (who === 'you') { this.stats.cardsPlayed += 1; this.you.score += 5; }
    } else {
      this.castSpell(who, card, target);
      if (who === 'you') { this.stats.spellsCast += 1; this.you.score += 5; }
    }
    this.events.push({ type: 'render' });
    return { ok: true, card };
  }

  castSpell(who, card, target) {
    const side = this[who];
    const foeSide = who === 'you' ? this.foe : this.you;
    this.log(`${side.name} casts ${card.name}!`);
    this.events.push({ type: 'sound', name: 'spell' });
    if (card.effect === 'bolt') {
      if (target.slot === null) this.damageHero(target.who, card.power, 'spell');
      else this.damageCreature(target.who, target.slot, card.power);
    } else if (card.effect === 'mend') {
      this.healHero(who, card.power);
    } else if (card.effect === 'draw') {
      drawCards(this, who, card.power, (m) => this.log(m));
    } else if (card.effect === 'ward') {
      side.armor += card.power;
      this.events.push({ type: 'float', who, slot: null, text: `+${card.power} armor`, kind: 'heal' });
      this.log(`${side.name} raises a ${card.power}-armor ward.`);
    } else if (card.effect === 'nova') {
      for (let i = foeSide.table.length - 1; i >= 0; i--) {
        if (foeSide.table[i]) this.damageCreature(who === 'you' ? 'foe' : 'you', i, card.power);
      }
    } else if (card.effect === 'freeze') {
      const t = foeSide.table[target.slot];
      if (t) {
        t.frozen = true;
        this.log(`${t.name} is frozen solid — it skips its next attack.`);
        this.events.push({ type: 'float', who: target.who, slot: target.slot, text: 'FROZEN', kind: 'heal' });
      }
    }
    this.checkEnd();
  }

  // ---- the clash: both rows strike at once, once per round ----
  // Each slot fights simultaneously: two creatures trade blows, a lone
  // creature hits the rival hero. A creature forged this round is sick
  // and waits for the next clash; a frozen one thaws instead of striking.
  clash() {
    this.phase = 'combat';
    this.log('The rows clash!');
    const pendingEnd = [];
    for (let i = 0; i < TABLE_LIMIT; i++) {
      const a = this.you.table[i];
      const d = this.foe.table[i];
      const aWasFrozen = Boolean(a && a.frozen);
      const dWasFrozen = Boolean(d && d.frozen);
      if (aWasFrozen) { a.frozen = false; this.log(`${a.name} thaws out, too cold to strike.`); }
      if (dWasFrozen) { d.frozen = false; this.log(`${d.name} thaws out, too cold to strike.`); }
      const aStrikes = a && !aWasFrozen && !a.sick;
      const dStrikes = d && !dWasFrozen && !d.sick;
      if (a && d) {
        if (aStrikes || dStrikes) this.log(`${a.name} (${a.atk}) clashes with ${d.name} (${d.atk}).`);
        if (aStrikes) {
          d.hp -= a.atk;
          this.events.push({ type: 'float', who: 'foe', slot: i, text: `-${a.atk}`, kind: 'dmg' });
        }
        if (dStrikes) {
          a.hp -= d.atk;
          this.events.push({ type: 'float', who: 'you', slot: i, text: `-${d.atk}`, kind: 'dmg' });
        }
        if (aStrikes || dStrikes) this.events.push({ type: 'sound', name: 'hit' });
        if (d.hp <= 0) { this.foe.table[i] = null; this.log(`${d.name} shatters into sparks.`); }
        if (a.hp <= 0) { this.you.table[i] = null; this.log(`${a.name} shatters into sparks.`); }
      } else if (a && aStrikes) {
        this.log(`${a.name} hits Vex directly for ${a.atk}!`);
        pendingEnd.push(['foe', a.atk]);
      } else if (d && dStrikes) {
        this.log(`${d.name} hits you directly for ${d.atk}!`);
        pendingEnd.push(['you', d.atk]);
      }
    }
    // Face damage lands together, so a double knockout is a real tie.
    for (const [who, n] of pendingEnd) this.applyFaceDamage(who, n);
    // Survivors shake off their sickness: next clash they strike.
    for (const side of [this.you, this.foe]) {
      for (const c of side.table) if (c) c.sick = false;
    }
    this.phase = 'play';
    this.checkEnd();
    this.events.push({ type: 'render' });
  }

  // Face damage with armor, without ending the game mid-clash.
  applyFaceDamage(who, n) {
    const side = this[who];
    let left = n;
    if (side.armor > 0) {
      const absorbed = Math.min(side.armor, left);
      side.armor -= absorbed;
      left -= absorbed;
      if (absorbed > 0) this.events.push({ type: 'float', who, slot: null, text: `-${absorbed} armor`, kind: 'heal' });
    }
    if (left > 0) {
      side.hp = Math.max(0, side.hp - left);
      this.events.push({ type: 'float', who, slot: null, text: `-${left}`, kind: 'dmg' });
      this.events.push({ type: 'hero-hit', who });
      this.events.push({ type: 'sound', name: 'hit' });
      if (who === 'foe') this.stats.damageDealt += left;
    } else {
      this.events.push({ type: 'sound', name: 'block' });
    }
  }

  // ---- the rival's turn, one action at a time ----
  aiAct() {
    if (this.phase === 'over') return null;
    const idx = pickCreature(this);
    if (idx >= 0) {
      const card = cardById(this.foe.hand[idx]);
      this.playCard('foe', idx);
      return `Vex forges ${card.name}.`;
    }
    const spell = pickSpell(this);
    if (spell) {
      const card = cardById(this.foe.hand[spell.index]);
      this.playCard('foe', spell.index, spell.target);
      return `Vex casts ${card.name}.`;
    }
    return null;
  }

  // The player ends the turn: validation only — the caller drives the
  // rival's turn (beginTurn, aiAct loop, clash, beginTurn) so the browser
  // can pace it with delays. runFoeTurn does the same steps at once.
  endTurn() {
    if (this.phase !== 'play' || this.active !== 'you') return false;
    return true;
  }

  runFoeTurn() {
    if (this.phase === 'over') return;
    this.beginTurn('foe');
    let guard = 0;
    while (this.aiAct() && guard++ < 12) { if (this.phase === 'over') return; }
    if (this.phase === 'over') return;
    this.clash();
    if (this.phase === 'over') return;
    this.beginTurn('you');
  }

  // Drain and clear the event queue.
  drainEvents() {
    const out = this.events;
    this.events = [];
    return out;
  }
}
