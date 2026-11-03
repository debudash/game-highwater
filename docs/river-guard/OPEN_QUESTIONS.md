# Open questions for Debu (implementation, Nov 3, 2026)

The rulebook and level-1 doc leave these points open. Each one was given a working answer so the
game is playable. Please confirm or override.

## New on-screen strings (need approval, rulebook §3 "Any new approved string must fit")
| String | Where | Why |
|---|---|---|
| `RIVER GUARD` | Title overlay, before the first run | The game needs a start screen; the first key press is consumed, like the resume press |
| `GAME OVER` | Game-over overlay | §5 ends the run but names no message |
| `SCORE nnnnnn` / `BEST  nnnnnn` | Game-over overlay | §5 "Local best score on game over (Recommended)" |
| `PRESS ANY KEY` (reused) | Title and game-over overlays | Same meaning as the approved resume prompt: waiting for any key |
| `+200` | Side panel, jump clear | Matches `+100` for the +200 mine clear; not yet in the approved list |

## Behaviour the spec leaves open
1. **Normal (non-tutorial) boat drowning message:** shows `BOAT LOST` (approved for level 1).
   `TRY AGAIN` is not shown, because the boat doesn't replay.
2. **No pinned crisis label outside level 1.** §3 allows one, but no string is approved for
   normal boats or mines.
3. **Tap over a held key:** tapping Right while Left is held moves right once; then Left carries
   on, with its hold repeat restarting from that tick.
4. **River bomb on ground row 10 when SkyPolicy turns on later in a crisis:** removed along with
   bombs on rows 11–13, treating every river-bound bomb as "in the river" (§4 Boats item 4).
5. **Restart key:** any key, accepted 1 s after game over, so a held Fire doesn't skip the screen.
6. **Invulnerability blink:** the tank alternates with an outline frame every 120 ms while
   invulnerable. The spec has no invulnerability cue; the tank never disappears, so the
   "dangerous things stay in full ink" rule holds.
7. **Sound:** the spec has no audio. Synthesized LCD beeps play on game events, cosmetic only;
   **M** toggles mute (not a game input, §7).
8. **Mine-hit look:** uses the jet-hit wreck and flash (the spec defines jet-hit and bomb-hit looks only).
