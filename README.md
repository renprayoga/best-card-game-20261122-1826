# Runeforge Duel

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/renprayoga/best-card-game-20261122-1826/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/renprayoga/best-card-game-20261122-1826/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

**Runeforge Duel** is an original 1v1 card duel that runs offline in a
desktop browser from static files — no network requests, no libraries, no
build step. You are the Runeforger, duelling Vex, the Cindersmith, for the
four sigils: Ember, Frost, Verdant and Stone.

Both duelists have 30 life and a mana crystal that grows by one each turn
(up to 10). Your hand holds five cards from a 30-card deck: sixteen
creatures across the four sigils — glass-cannon Ember, patient Frost,
tough Verdant, heavy Stone — and six spells that bolt, mend, draw, ward,
freeze and blast. Click a card to spend mana and forge it onto your row;
END TURN passes to Vex, then both rows clash at once: creatures trade
blows in their slots, and a lone creature hits the rival hero directly.
A creature forged this round is sick and waits for the next clash.
First hero to 0 life loses. Score comes from damage dealt, cards forged,
and a win bonus; your best score is kept between visits.

All art is inline SVG sigils and CSS, all sound is synthesized with
WebAudio (nothing copied from any commercial game).

## Controls

- **Click** — play a card · click a target for Bolt / Frostbind
- **1–5** — play a card from your hand · **Space / Enter** — end turn
- **R** — restart · **M** — mute · **Esc** — cancel targeting

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Or hand it in the way the bounty does:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Files

- `game/` — the playable game as static files (`index.html` + `css/` +
  ES modules under `game/js/`: `cards.js` the card pool and sigils,
  `rng.js` seeded shuffle, `deck.js` deck and drawing, `ai.js` the
  rival's heuristics, `engine.js` the rules, `render.js` DOM painting,
  `audio.js` synthesized sound, `main.js` input and screenshot scenes)
- `screenshots/` — 4 real renders of the game's own code (headless Chrome,
  1280×800): the cover mid-duel, the title screen, the victory screen,
  and the defeat screen
- `main.ts` — the Node 22 entrypoint that writes `dossier.json`
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged
