# -idk.s

IDK.S — a nine-game browser arcade that lives on a placeholder domain. No build step, no backend, no dependencies. Just `index.html`, `app.js` and `style.css`.

## Games

| # | Game | Genre | Controls |
|---|------|-------|----------|
| 01 | NEON SERPENT | snake | ARROWS / WASD • SPACE pause |
| 02 | VOID BLASTERS | shmup | ← → / A D + SPACE • mouse or touch |
| 03 | STACK FRACTURE | timing | SPACE / click / tap to drop |
| 04 | DAGGERFALL UNDAUNTED | raycast dungeon | WASD move • Q/E or mouse turn • SPACE shoot • M map |
| 05 | PAPERS, PLEASE — ARSTOTZKA | inspector | A approve • D deny |
| 06 | BLOCK BREAKER | breakout | ← → / A D or move the mouse • SPACE launch |
| 07 | VECTOR STORM | asteroids | ← → turn • ↑ thrust • SPACE fire |
| 08 | MERGE // 2048 | puzzle | ARROWS / WASD • swipe on touch |
| 09 | CIPHER FLASH | memory | click / tap pads • keys 1–9 |

Global keys: `SPACE` start, `R` instant restart, `ESC` quit to arcade, `M` mute. Press `↑ ↑ ↓ ↓ ← → ← → B A` for a surprise.

## Notes

- High scores are stored per game in `localStorage` under `idk_arcade_v3`. Older saves are migrated on load, so adding a game never wipes an existing board.
- Every game is a small self-contained module in `app.js` exposing `{reset, start, togglePause, pause}`. To add another one, drop its id into the `GAMES` array and follow the same shape.
- Runs at 60fps, works offline after the first load, and respects `prefers-reduced-motion`.

## Run

Open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 8000
```
