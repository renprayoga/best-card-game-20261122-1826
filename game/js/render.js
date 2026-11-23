// Runeforge Duel — DOM rendering. Reads the engine state and paints the
// table: hands, rows, heroes, log and overlays. All card art is inline
// SVG, so nothing is fetched over the network.
import { cardById, suitIcon, SUITS } from './cards.js';
import { MAX_HP, MAX_MANA } from './engine.js';

const $ = (id) => document.getElementById(id);

export function cardEl(card, opts = {}) {
  const el = document.createElement('div');
  el.className = `card suit-${card.suit}`;
  el.dataset.cardId = card.id;
  const suit = SUITS[card.suit];
  let stats = '';
  if (card.kind === 'creature') {
    stats = `<div class="atk">${card.atk}</div><div class="hp">${card.hp}</div>`;
  } else {
    stats = `<div class="spell-tag">✦ SPELL ✦</div>`;
  }
  el.innerHTML = `
    <div class="suit-band">${suit.name}</div>
    <div class="cost">${card.cost}</div>
    ${opts.key ? `<div class="key-hint">${opts.key}</div>` : ''}
    <div class="art">${suitIcon(card.suit)}</div>
    <div class="name">${card.name}</div>
    <div class="text">${card.text}</div>
    ${stats}`;
  if (opts.frozen) el.classList.add('frozen');
  if (opts.justPlayed) el.classList.add('just-played');
  return el;
}

function renderMana(el, mana, manaMax) {
  el.innerHTML = '';
  for (let i = 0; i < MAX_MANA; i++) {
    if (i >= manaMax) break;
    const c = document.createElement('span');
    c.className = 'crystal' + (i < mana ? ' full' : '');
    el.appendChild(c);
  }
}

function renderHero(prefix, side) {
  $(`${prefix}-hp-fill`).style.width = `${(side.hp / MAX_HP) * 100}%`;
  $(`${prefix}-hp-text`).textContent = `${side.hp} / ${MAX_HP}`;
  const armor = $(`${prefix}-armor`);
  armor.hidden = side.armor <= 0;
  $(`${prefix}-armor-n`).textContent = side.armor;
  $(`${prefix}-deck`).textContent = `DECK ${side.deck.length}`;
  $(`${prefix}-score`).textContent = side.score;
}

function renderHand(el, side, game, ui) {
  el.innerHTML = '';
  side.hand.forEach((id, i) => {
    const card = cardById(id);
    const node = cardEl(card, { key: i + 1 });
    const check = game.canPlay(ui.who, i);
    node.classList.toggle('unplayable', !check.ok);
    node.classList.toggle('playable', check.ok);
    if (ui.selected === i) node.classList.add('selected');
    node.addEventListener('click', () => ui.onHandCard(i));
    el.appendChild(node);
  });
}

function renderFoeHand(el, side) {
  el.innerHTML = '';
  for (let i = 0; i < side.hand.length; i++) {
    const back = document.createElement('div');
    back.className = 'card-back';
    el.appendChild(back);
  }
}

function renderTable(el, side, who, game, ui) {
  el.innerHTML = '';
  for (let i = 0; i < side.table.length; i++) {
    const c = side.table[i];
    if (!c) {
      const slot = document.createElement('div');
      slot.className = 'slot';
      slot.textContent = 'EMPTY';
      el.appendChild(slot);
      continue;
    }
    const node = cardEl(c, { frozen: c.frozen, justPlayed: c.justPlayed });
    // Bolt and Frostbind both aim at the rival's side: its table cards
    // light up while a target is being chosen.
    if (ui.targeting && who === 'foe') {
      node.classList.add('targetable');
      node.addEventListener('click', () => ui.onTarget(who, i));
    }
    el.appendChild(node);
    c.justPlayed = false;
  }
}

export function render(game, ui) {
  $('foe-portrait').textContent = 'V';
  $('you-portrait').textContent = 'Y';
  renderHero('foe', game.foe);
  renderHero('you', game.you);
  renderMana($('foe-mana'), game.foe.mana, game.foe.manaMax);
  renderMana($('you-mana'), game.you.mana, game.you.manaMax);
  renderFoeHand($('foe-hand'), game.foe);
  renderHand($('you-hand'), game.you, game, ui);
  renderTable($('foe-table'), game.foe, 'foe', game, ui);
  renderTable($('you-table'), game.you, 'you', game, ui);

  // Banner + hint.
  const banner = $('banner');
  if (game.phase === 'over') banner.textContent = game.winner === 'you' ? '★ VICTORY ★' : '☠ DEFEAT ☠';
  else if (game.phase === 'combat') banner.textContent = '⚔ COMBAT ⚔';
  else if (game.active === 'you') banner.textContent = `YOUR TURN — TURN ${game.turn}`;
  else banner.textContent = 'VEX IS THINKING…';
  const hint = $('hint');
  if (ui.targeting) {
    hint.textContent = `Choose a target for ${ui.targeting.card.name} — or press Esc to cancel.`;
    hint.classList.add('targeting');
  } else {
    hint.textContent = 'Click a card to play it · Click END TURN to attack · Keys: 1–5 play · Space end turn · R restart';
    hint.classList.remove('targeting');
  }

  // Log: last three lines.
  const logEl = $('log');
  logEl.innerHTML = game.logLines.slice(-3).map((l) => `<div>${escapeHtml(l)}</div>`).join('');

  // End turn button.
  $('end-turn').disabled = !(game.phase === 'play' && game.active === 'you');

  // End overlay.
  if (game.phase === 'over') {
    const panel = document.querySelector('.end-panel');
    panel.classList.toggle('win', game.winner === 'you');
    panel.classList.toggle('lose', game.winner !== 'you');
    $('end-title').textContent = game.winner === 'you' ? 'VICTORY!' : 'DEFEAT';
    $('end-sub').textContent = game.winner === 'you'
      ? 'Vex\u2019s forge is cold. The four sigils are yours.'
      : 'Vex keeps the forge… this time. Sharpen your deck and return.';
    $('end-stats').innerHTML =
      `<span><b>${game.you.score}</b>score</span>` +
      `<span><b>${game.stats.turns}</b>turns</span>` +
      `<span><b>${game.stats.damageDealt}</b>damage dealt</span>` +
      `<span><b>${game.stats.cardsPlayed}</b>cards forged</span>`;
    $('end-screen').hidden = false;
  } else {
    $('end-screen').hidden = true;
  }
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// A floating damage/heal number over a hero portrait or a table slot.
export function floatText(who, slot, text, kind) {
  const stage = $('stage');
  let anchor;
  if (slot === null) anchor = who === 'you' ? $('you-portrait') : $('foe-portrait');
  else anchor = (who === 'you' ? $('you-table') : $('foe-table')).children[slot];
  if (!anchor) return;
  const sr = stage.getBoundingClientRect();
  const r = anchor.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'float-dmg' + (kind === 'heal' ? ' heal' : '');
  el.textContent = text;
  el.style.left = `${r.left - sr.left + r.width / 2 - 20}px`;
  el.style.top = `${r.top - sr.top - 8}px`;
  stage.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

export function flashHero(who) {
  const el = who === 'you' ? $('you-hero') : $('foe-hero');
  el.classList.remove('dmg-flash');
  void el.offsetWidth; // restart the animation
  el.classList.add('dmg-flash');
}

export function paintTitleSigils() {
  $('title-sigils').innerHTML =
    suitIcon('ember', 44) + suitIcon('frost', 44) + suitIcon('verdant', 44) + suitIcon('stone', 44);
}
