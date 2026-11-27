# gobble-run-turkey-escape

[![make.fun · turkey-run-game-01](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![rank](https://make.fun/badge/turkey-run-game-01/20221101035-stack/gobble-run-turkey-escape/rank.svg)](https://make.fun/bounty/turkey-run-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![reward](https://make.fun/badge/turkey-run-game-01/20221101035-stack/gobble-run-turkey-escape/reward.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)

**Gobble Run — The Great Thanksgiving Escape**: an original, fully offline turkey escape game. Thanksgiving is coming and you are the main course. Outrun the farmer, jump the fences, slide under the hanging carving knives, dodge the oven flames and the falling knives, and reach the forest before dinner is served.

Entered in the [make.fun bounty “Make the best turkey escape game”](https://make.fun/bounty/turkey-run-game-01).

## How it plays

- **Run** — the turkey runs on its own; you steer the escape. `↑` / `Space` / click to flap-jump, `↓` to slide, `Shift` to dash.
- **The farmer** — he chases you from behind. Every stumble lets him close in; every dash, corn cob and bush hides you. The gap meter shows how close he is, and when he winds up a lunge you had better dash or jump.
- **Three stages** — the farmyard (fences, hay bales, mud), the barn (crates, hanging carving knives) and the kitchen (the oven's flame jets, falling carving knives). Each is faster and meaner than the last.
- **Score** — distance, corn (+25), pumpkins smashed while dashing (+50), golden feathers (+150, dash recharged), and a bonus for each stage cleared. Reach the forest gate at 1,800 m and you escape.
- **Screens** — title, run with a HUD (score, distance, lives, stage, farmer gap, dash cooldown), and end screens for caught or escaped, with restart on `R`.
- **Sound** — every sound is synthesized with WebAudio: gobbles, flaps, pickups, alarms and a plucky autumn tune. `M` mutes.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No libraries, no external assets, no network requests: plain HTML and JavaScript under `game/`, all art drawn on canvas.

`main.ts` (Node 22, standard library only) hands the game in: it copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json` with the vendored make.fun library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Built with [make.fun](https://make.fun/?ref=5pkj596k&utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01).
