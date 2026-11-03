# River Guard — Rulebook

**River Guard — Tank Ops** (cabinet marquee)

Player-facing design for a playful 80s arcade cabinet: tank-vs-jets with river rescue and late-game mines. **Current rules only.** History and decisions: `river-guard-changelog.md`. Source design doc (with revision notes, frozen): `tank-jets-design.md`.

*Status: Recommended values are the v1 contract unless Debu overrides.*

*Editing rule: from Nov 2, 2026, every rule change is made here and gets an entry in `river-guard-changelog.md`; the decisions log in `river-guard-timing-v6-proposal.md` stays the master decisions list. `tank-jets-design.md` is frozen.*

---

## 1. Vision / pitch

**River Guard** puts you in the mid-screen lane as a tank operator holding the line against descending jets. One shell at a time. Below the tank, a river runs; drowning boats call you to drop into chopper mode, hook them to safety, then climb back into the fight. Survive three lives, keep three boats from drowning, and outpace a score-driven storm of jets, bombs, and mines.

---

## 2. Core loop

1. Strafe left/right in the mid lane; fire one shell upward at a time.
2. Jets step down from the top; shoot them (+100) before they hit the tank (lose a life). Jets that reach ground are removed with **no score change**.
3. Dodge bombs that step downward toward the tank.
4. After boats unlock (sticky at score ≥ `boatUnlockScore`), when a drowning boat is the active crisis, press Down → chopper → hover over the boat's column and press Down to hook → ferry to either bank → auto-return to tank (soft ceiling lifts). While you're in the tank, a bomb that falls straight onto the boat sinks it, which counts as a drowning (§4 Boats, *Bomb sink*).
5. After mines unlock (sticky at score ≥ `mineUnlockScore`), a mine may appear (never overlapping a boat crisis); jump over it. Jump is the **only** answer to a mine: Down does nothing in a mine crisis, and the chopper is for boat rescue only. Same run, **never concurrent** crises.
6. Repeat until lives or drowned-boat limit is exhausted; chase high score.

---

## 3. Playfield layout

Boxed, fixed camera. **Playfield grid: 18 columns × 14 rows**. River : sky = 3 : 9 = 1 : 3. One **row** = **one grid cell** of height. Zones by row index (0 = top):

| Zone | Rows (inclusive) | Role |
|------|------------------|------|
| **Sky** | 0–8 | Dive jets spawn on row 0 and step down; cross jets fly along row 0 from one side wall to the other. Bombs step down from their drop point. Shells travel up. |
| **Mid tank lane** | 9 | Tank left/right while in tank modes. A jumping tank is on row 8 for the whole jump (§4 Tank). |
| **Ground / mines** | 10 | Jet crash-to-ground line; mines spawn here only. Jet + mine may share a cell (separate collision checks). |
| **River** | 11–13 | The chopper flies on **row 11**. Boats spawn on **rows 12–13**. A hooked boat hangs on **row 12**, one row under the chopper (two-tile hooked sprite). The hook is by column, so the only rule that reads a river row is the bomb sink (§4 Boats). |

**Recommended defaults**

- Single screen; no scrolling.
- Left/right walls clip tank, shell, chopper. Cross jets enter and exit through the side walls (exit = removed, no score). An angled bomb (only possible from a future angled jet path) that reaches a side wall is destroyed (no score).
- Soft ceiling height is measured in **grid cells above tank lane top** (row 9): **3 cells** (ceiling at row 6) while mines are locked, **2 cells** (ceiling at row 7) once `minesUnlocked` is true (score has reached ≥ `mineUnlockScore`, default 10,000; sticky). Tied to the mine unlock, not to band letters. Never 1 cell in v1.

### Setting art

The setting should have character: the river should read as a river, the sky as a sky, and mines as spiky cacti. Scenery is **cosmetic only**: it occupies no cell, never collides, and never changes timing, input or state. Tiles are 16×16 LCD px.

**Inks.** Background (168,178,150). Full ink (34,40,32) is **only** for things that can hit, be hit or be scored: tank, chopper, shells, jets, bombs, boats (the tutorial boat is outline-only in full ink), mines, plus panel text and the timer bars. Scenery uses a fainter **scenery ink**, (138,148,122). Rule: anything drawn in scenery ink is never dangerous, and anything dangerous is never drawn in scenery ink. **Draw order:** jets and bombs always draw on top of every hit flash, burst and splash, so impact art never hides a threat.

| Zone | Look | Motion |
|---|---|---|
| Sky, rows 0–8 | A few small cloud outlines and a low sun disc in a corner, in scenery ink; mostly empty | **Static.** In the sky, motion always means a threat, so scenery never moves there. |
| Tank lane, row 9 | Plain road edge line under the tank | Static |
| Ground, row 10 | Dirt-and-grass edge, with small tufts | Static |
| River, rows 11–13 | Wavy ripple lines, sparser toward the bottom, plus reeds at the bank edges | 2-frame ripple, swapping every 720 ms (12S). Boats, the chopper and river bombs (normal bomb sprite) stay in full ink on top. |
| Banks, columns 0 and 17, rows 11–12 | **Castle towers with drawbridges** (homage to *Plane & Tank*, original art) | The drawbridge lowers when a hooked boat reaches that bank: 2 frames, 120 ms each, purely visual. The rescue resolves on arrival as before, with no delay. |

**Boat timer bar.** A drowning boat shows its drown timer as a thin bar in full ink, drawn in the **top 2 px of the boat's own cell** (above the hull), so it never spills into the chopper's row 11 or a neighbouring cell. It is a readout, not an object: no collision, no cell, no effect on timing. Length = 16 px × (time left ÷ that boat's `drownTimerMs`), rounded **up** to whole pixels, so it is full (16 px) at spawn, never reaches 0 px while the boat is still afloat, and shrinks by 1 px per 1/16 of the timer (585 ms per px in band B, 463 ms in band E). It follows the boat (including a dropped boat on row 12). While the boat is **hooked** the timer is paused and the bar is **hidden**; on a drop it reappears at the same length. It disappears with the boat on rescue, drowning or bomb sink. The level-1 tutorial boat shows it too. Draw order: the chopper, jets, bombs and river bombs draw on top of it.

**Mine timer bar.** A mine shows `mineLifetimeMs` the same way: the same 2 px full-ink bar in the top of the mine's own cell (ground row 10), same length rule (16 px × time left ÷ 4,200, rounded up; 262.5 ms per px). It is full from the mine's first sprout frame and vanishes on the tick the mine ends (expiry, jump clear or hit), so it is never shown during the 360 ms shrink-back. Jets and bombs passing through the cell draw on top of it. **Art constraint for both bars:** the boat and cactus sprites keep the top 2 px of their cell empty so the bar never overlaps them.

**Mines as cacti.** A mine is drawn as a **spiky cactus growing out of ground row 10**, in full ink. It sprouts over 3 frames of 120 ms each (360 ms). It is **lethal from its first frame**, and that frame already shows spikes, so a sprout never looks harmless. When its lifetime expires it shrinks back over the same 3 frames, but it's no longer lethal once expiry fires.

### Screen and panel layout (Debu, Nov 2, 2026, W-A)

All sizes are in LCD px, the unit of the 16×16 tiles (*Setting art*). Panel sizes are §9 *Panel layout defaults*.

- **Glyph cell:** text uses one fixed-width LCD font. Each character is a **5×7 px** glyph in a **6×8 px** cell, so there is 1 px of spacing to its right and 1 px below. A space, a digit, `:`, `/`, `+` and the arrow glyphs ◀ ▶ ▲ ▼ each take one cell. A string of n characters is 6n px wide.
- **Canvas:** **416 × 248 px**, made up as follows.
  - **Top status panel:** x 0–415, y 0–23. It is 24 px tall: a 4 px margin, text row 1 (8 px), text row 2 (8 px) and a 4 px margin. It has 4 px side margins, so its text area is 408 px = **68 cells** wide. Top-panel cell column c starts at x = 4 + 6c. Row 1's glyphs start at y 4 and row 2's at y 12 (Debu, Nov 3, 2026, A).
  - **Playfield:** x 0–287, y 24–247. That is 18 × 16 = 288 px wide and 14 × 16 = 224 px tall.
  - **Side message panel:** x 288–415, y 24–247. It is 128 px wide (8 tiles), the same height as the playfield. Its 4 px side margins give a text area of 120 px = **20 cells**. Its 4 lines sit on a 16 px pitch, one per grid row 0–3 (Debu, Nov 3, 2026, S-A). In each line the glyph row starts 4 px below the line's top. Text is left-aligned: side-panel cell column c starts at x = 292 + 6c (Debu, Nov 3, 2026, A).
- **Display (Debu, Nov 3, 2026, S-A):** the canvas is drawn at the largest whole-number scale that fits the window, with nearest-neighbour scaling, centred, with the background ink around it.
- **Top-panel fields** are at fixed cell columns, so nothing shifts when a value changes. Row 1 has a 2-cell gap between fields:
  - `SCORE`: cols 0–11, 12 cells. `SCORE`, a space, then the score right-aligned in 6 digits with no leading zeros. 6 digits holds `scoreMax` = 999,999 (Debu, Nov 3, 2026, S-A).
  - `LIVES`: cols 14–20, 7 cells. `LIVES`, a space, one digit (Debu, Nov 3, 2026, S-A). Lives are never more than 3, because nothing adds a life.
  - `DROWNED`: cols 23–33, 11 cells. `DROWNED n/3`, where n is 0–3.
  - `FUEL`: cols 36–48, 13 cells. Cols 36–39 show the caption `FUEL` and col 40 is a space (Debu, Nov 2, 2026, F-A). Cols 41–48 hold the 8 segments, one cell each. The caption shows whenever the meter does, and is blank whenever the meter is blank.
  - `TUTORIAL`: row 2, cols 0–24, 25 cells. Slot 1 is cols 0–8 (9 cells, for example `SAFE BOAT`), cols 9–10 are a gap, and slot 2 is cols 11–24 (14 cells, for example `LAST LIFE SAFE`). The field has no caption.
- **Fit check:**
  - Top row 1 is 12 + 2 + 7 + 2 + 11 + 2 + 13 = **49 cells** out of 68, with `FUEL ` and the 8 segments filling the 13-cell `FUEL` field exactly (4 + 1 + 8).
  - Top row 2 is **25** out of 68.
  - On one line the top panel would need 49 + 2 + 25 = 76 cells, which is more than 68, which is why `TUTORIAL` has its own row.
  - Side panel: the longest approved string, `PRESS DOWN: CHOPPER`, is **19 cells** out of 20. Every other approved side-panel string is shorter: `FLY TO THE BOAT` 15, `LAST LIFE SAFE` 14, `TUTORIAL BOAT` and `LEVEL 1 CLEAR` 13, `PRESS DOWN: HOOK` 16, `FLY TO A BANK` 13, `+500 RESCUE` 11, `SPACE: FIRE` 11, `BOAT SUNK`, `BOAT LOST`, `LIFE LOST` and `TRY AGAIN` 9, `MOVE ◀ ▶` 8, `+100` 4.
  - The side panel's 4 lines take 4 × 16 = 64 px of its 224.
  - `PRESS ANY KEY` is 13 cells = 78 px, which fits the 288 px playfield for the centred overlay.
  - Any new approved string must fit: at most 20 cells on the side panel, and at most the field width on the top panel.

### Top status panel

A two-row panel **above the playfield** (row 1: `SCORE`, `LIVES`, `DROWNED`, `FUEL`; row 2: `TUTORIAL`; *Screen and panel layout*), as wide as the playfield plus the side panel. Like the side panel, it is **not part of the grid**: nothing collides with it or enters it, and it never changes timing, input or game state. It is always visible, in every level.

| Field | Shows | Updates |
|-------|-------|---------|
| `SCORE` | Current score, at most `scoreMax` = 999,999: a gain that would pass it leaves the score at 999,999 (score = min(score + points, `scoreMax`)) | The same tick it changes |
| `LIVES` | Lives left, as one digit | The same tick a life is lost |
| `DROWNED` | Drowned boats as `n/3` | The same tick a counted drowning happens. Uncounted tutorial drownings never change it. |
| `FUEL` | The chopper's remaining flight budget (§9 *Chopper flight timer*) as a meter of **8 segments**. Full = the boat crisis's budget, 9,920 ms, so one segment is 1,240 ms. Lit segments = time left ÷ 1,240, rounded **up**, so the last segment stays lit until the budget runs out (≤ 0). Shown only while `Crisis == Boat`, so the player sees the fuel before pressing Down; blank otherwise (no crisis, or a mine crisis, where there is no chopper). All 8 segments empty means the budget is spent and Down won't work until the boat crisis ends. | Every tick while `PlayerMode ∈ Chopper*` (the only time it drains); set to full the tick a boat crisis starts; blanked the tick the boat crisis ends |
| `TUTORIAL` | Which tutorial aids are active right now, by short label (for example `SAFE BOAT`). Blank when none are active. | The same tick an aid turns on or off |

A **tutorial aid** is a level-specific exception that relaxes a normal rule in the player's favour while it is on, for example a tutorial boat whose drownings don't count. **Scripted content is not an aid** (Debu, Nov 2, 2026, issue 9 A): a level's script (which jets or boats appear, when and where, including a scripted boat outside the crisis scheduler) changes what happens, not the rules, so it has no `TUTORIAL` label. Every aid a level uses must be listed in that level's doc, along with its `TUTORIAL` label, so the player can always see when the normal rules are relaxed.

### Side message panel

A separate panel to the **right of the playfield**, the same height as the 14 rows. It is **not part of the grid**: nothing collides with it, nothing enters it, and it never changes timing, input or game state. All game interaction messages appear here (tutorial prompts, score popups, status text), for every level, not just level 1. Score popups go here, not on the playfield. Score, lives, drowned count and tutorial aids are shown in the **top status panel**, not here.

**Layout (Recommended)**

| Block | Content | Behaviour |
|-------|---------|-----------|
| Messages | 4 text lines | Pinned lines first (top), then transient lines, newest first. |

**Message rules**

1. **Transient** messages (for example `+100`, `+500 RESCUE`, `LIFE LOST`, `BOAT SUNK`) are timed in ticks, game-wide (Debu, Nov 2, 2026, M-A). A transient raised on tick E (in the step that resolves its event, §9 *Tick order*) is drawn on tick E and the 15 ticks after it, E + 1 to E + 15. It is gone on tick E + 16. That is `msgHoldMs` = 960 ms = 16S.
   - **Pausing:** the hold counts ticks, not wall time. While the tab is hidden, and during the `PRESS ANY KEY` pause, no ticks run (§9 *Tick length*), so a showing transient is frozen. It is still drawn, and it resumes with the same number of ticks left.
   - **Repeat:** if the same string is raised again while it is still showing, it is not added as a second line. The existing line restarts its hold from the new tick E′ (drawn E′ to E′ + 15, gone on E′ + 16) and moves to the newest-transient position (Debu, Nov 3, 2026, S-A).
2. **Pinned** messages stay until the condition that raised them ends (for example `TUTORIAL BOAT` while the tutorial boat exists). At most **two** pinned lines: one crisis label (at most one crisis exists, Crisis XOR) and one tutorial step prompt. That always leaves at least 2 lines for transients.
3. If a new message would exceed 4 lines, the **oldest transient** is dropped: the bottom transient line (rule 4). A pinned line is never dropped by a transient.
4. Messages raised in the same tick appear in the order the events resolve in the §9 tick order, top to bottom (for example `BOAT LOST` above `TRY AGAIN`, and `+500 RESCUE` above `LEVEL 1 CLEAR`). That group goes above every transient from an earlier tick, so "newest first" orders ticks, and within a tick lines keep their resolution order. A repeat (rule 1) takes its place in the group of its new tick. (Debu, Nov 3, 2026, rules 3–4 order, A.)
5. Messages never pause play and never take input. The one exception is the `PRESS ANY KEY` resume prompt after a hidden tab (§9 *Tick length*). It is not a panel message: it is a centred overlay on the playfield, outside these panel rules, and it is shown only while the game is already paused.

Approved strings: level 1's set is listed in `river-guard-level1.md` *Approved panel strings*. `BOAT SUNK` (transient, shown when a bomb sinks a boat; §4 Boats) is an approved string.


---

## 4. Entities & rules

### Tank

- Starts centered on lane row 9 with **3 lives**.
- Left/right only in tank modes; boxed X bounds.
- One shell at a time.
- Hit by jet or bomb → −1 life; **invulnMs = 960** (16S, from the impact tick). While invulnerable, a bomb that reaches the tank **passes through** and keeps falling, and so does a dive jet: it shares the tank's cell for that step with no effect on either, then steps on to ground row 10 and is removed with no score. It stays shootable the whole way under the normal Shell rules. A vulnerable tank is not hit by a jet that a shell kills on the same tick (point-blank, §4 Shell). **Simultaneous hits:** at most one life is lost per tick. The first tank hit in step 5 makes the tank TankInvuln at once; every other jet, bomb or mine reaching the tank that tick passes through (jets and bombs keep their paths, a mine is not removed and its crisis goes on). The first is picked by a fixed priority: **mine, then bomb, then jet** (§9 *Tick order* step 5). If lives remain, respawn at the column picked by the **Respawn safety rule** (§8).
- **Jump** (Phase 4+): clears mines; ships with mines, not Phase 1. Available only once `minesUnlocked` is true (score ≥ `mineUnlockScore`), not tied to any band letter. **Cooldown:** after landing, Jump is ignored for `jumpCooldownMs` = 240 ms (4S, 4 ticks): the cooldown starts on the landing tick and Jump is accepted again on the 5th tick after it (§9 *Tick order*). **Airtime:** `jumpAirtimeMs` = 480 (8S). The timer starts in step 1 of the takeoff tick `J` and ticks that same tick, so it expires in step 2 of `J+7`: the tank is airborne for the step-5 checks of ticks `J` to `J+6` (7 ticks) and lands on `J+7`. **Airborne ticks:** it is airborne for hit checks on **7 ticks (420 ms)** and lands on the 8th timer tick. This is intended and follows the pause rule (a timer started in step 1 ticks that same tick). **Jump rows:** the tank is on **row 8** for the whole jump airtime, from the takeoff tick (step 1) through the last airborne tick, and is back on row 9 from step 2 of the tick the airtime expires (landing). While airborne, a jet or bomb that reaches its row-8 cell hits it normally, by the same cell after step 3 or by a **swap** (the tank's cell at the start of the tick and after step 2, against the threat's cell before and after step 3; only a takeoff can swap, with a threat stepping down from row 8 to row 9). The point-blank and one-life-per-tick rules apply. Mines can't hit an airborne tank; jump clear still applies (§4 Mines). **Hit mid-jump:** a hit while airborne ends the jump: the airtime timer is discarded, there is no landing and no jump cooldown starts. The wreck stays on row 8 in its column through the 420 ms impact lock, until the respawn places the tank on row 9 by the §8 Respawn safety rule. The wreck is TankInvuln, so nothing collides with it (invariant 24). A mine under it is not hit (invulnerable and on row 8), not jump-cleared and pays no +200 (it is no longer TankJump). A clear earlier in the same jump has already removed the mine. Jump stays blocked while TankInvuln (960 ms from impact).
- **Down** → chopper **only if** `Crisis == Boat` (no idle-chopper cheese). Down does nothing with no crisis or in a mine crisis. Cannot shell while chopper (in-flight shell may continue — see Shell).

#### Impact pacing

(Moved from `river-guard-level1.md`, Debu, Nov 2, 2026, issue 7 A; game-wide.) All values are seed multiples (S = 60 ms). Frames 1 and 4 in the impact sheet are ordinary game states, not timed frames; only the flash and burst are timed.

| Sequence | Flash (3×3 invert) | Burst (5×5 star) | Wreck hold | Total | Tank control |
|---|---|---|---|---|---|
| Shell hits jet | 1S = 60 | 2S = 120 | — | **180 ms** | **Never locked.** The shell is consumed on hit, so the tank may move and fire again on the very next tick. |
| Jet hits tank | 1S = 60 | 2S = 120 | 4S = 240 | **`impactLockMs` = 420 ms** (7S) | **Locked** for all 420 ms (inputs ignored, not buffered). **Invulnerability 960 ms (16S) starts on the impact tick**, so the tank can't be hit during the lock. At 420 ms (`T_r`) it respawns at the lane centre or the nearest safe column (§8 *Respawn safety rule*), still invulnerable for **540 ms**, of which **480 ms is controllable**: the first tick input is allowed is `T_r + 1`, and the 8 ticks `T_r + 1` to `T_r + 8` are 480 ms (Debu, Nov 2, 2026, issue 14 A). Invulnerability ends 960 ms after impact. |

Why these numbers:
- The jet-kill animation is visual only: the burst occupies no cell, never blocks a shell, and never collides.
- 180 ms is shorter than the tightest dive-jet step (band E, 255 ms) and bomb step (band E, 233 ms), but longer than the band-E cross step (142 ms), so a cross jet can step into a burst cell before the burst clears. **Rule (Debu, Nov 2, 2026, timing v6):** jets and bombs always draw on top of every hit flash and burst (§3), and the burst never collides, so a threat is never hidden and no other overlap rule is needed.
- The 420 ms lock is shorter than a shell's 540 ms flight from the lane to the top of the sky (9 cells × 60 ms), which is the "never outlasts a shell's travel" check. It's also about 1.6 jet steps in band E, so the player loses less than two jet moves of control per death.
- One frame at 60 ms equals one shell step. The flash is the shortest readable LCD blink. The burst holds for two steps so it registers as a hit.

Decided (Debu, Nov 2): invulnerability is **960 ms (16S) total, starting on the impact tick**. It covers the 420 ms lock and the respawn, leaving **540 ms** of protection after respawn, **480 ms** of it under the player's control (ticks `T_r + 1` to `T_r + 8`). That's ample against a typical ~200 ms human reaction time. Shorter values (480 or 600) were considered and rejected.

#### Bomb hits the tank

(Moved from `river-guard-level1.md`, Debu, Nov 2, 2026, issue 7 A.) **Its own look, same timing (Debu, Nov 2).** A bomb hit doesn't reuse the jet-hit art, but it keeps the same timing, so the lock, invulnerability and respawn rule behave the same for every death.

| Frame | Bomb hit look | Time |
|---|---|---|
| Flash | 1×3 vertical invert, the tank cell plus the 2 cells above it (the bomb's fall line) | 1S = 60 |
| Burst | Upward splash fan, 3 wide by 3 tall, above the tank cell (cosmetic, no collision, clipped at the edges) | 2S = 120 |
| Wreck | Cratered tank, a different sprite from the jet-hit wreck | 4S = 240 |
| **Total** | Tank **locked `impactLockMs` = 420 ms**; invulnerability 960 ms from the impact tick; respawn at +420 by the §8 Respawn safety rule | **420** |

Draw order: jets and bombs always draw **on top of** the flash and the splash, so a threat stepping into those cells during the 120 ms burst stays visible. For a tank on lane row 9 the flash covers rows 7–9 and the splash rows 6–8 (Debu, Nov 2, 2026, issue 15: the level-1 text said rows 6–8 for both). The same rule covers every hit flash and burst (§3). New sprites: bomb flash, splash fan, and the cratered tank.

### Shell

- One active max; discrete vertical steps (Recommended).
- **Press only:** each new Fire press fires one shell if no shell is active and firing is allowed (a Tank mode, outside the impact lock). Holding Fire never fires again. A press while a shell is active is discarded, not buffered. A Fire held through the impact lock or across a mode change never fires; it needs a new press (as for Up and Down, unlike Left/Right).
- **Path and pace (lane → row 0 in `L · S` = 540 ms, 9 cells):** Fire places the shell in the tank's current cell as it stands in tick step 1, whatever its row: lane row 9 on the lane, row 8 while airborne in TankJump. The tank is on row 8 for the whole jump (§4 Tank). **Move and fire, Jump + Fire:** step 1 applies Left/Right, then Jump, then Fire (§9 *Tick order*). An Up (Jump) and Fire on one tick start the shell on row 8 in the column after the move; if the Jump is refused, Fire uses the tank's actual cell. Left/Right applies before Fire, so with both pressed on one tick the shell starts in the tank's column after this tick's move; a move blocked by a wall leaves the tank, and so the shell, in its current column. Its step timer fires every S = 60 ms from the fire tick. From lane row 9 it enters row 8 one step after firing and row 0 nine steps (540 ms) after firing; from row 8 it reaches row 0 one step sooner (8 steps, 480 ms). Its column never changes. A step up from row 0 removes it (exit, no score). Shell steps happen in tick step 3 with the threat steps (§9 *Tick order*).
- **Hit test, checked in tick step 5:** a shell hits a jet when, after step 3, (a) they share a cell, or (b) they **swapped cells** in step 3: the shell's cell before step 3 is the jet's cell after it and the jet's cell before step 3 is the shell's cell after it (they passed through each other). Positions are compared only before and after step 3, so the order in which things move inside step 3 never changes a hit.
  - Dive jet: the swap is the shell and the jet in one column, the jet one row above the shell, both stepping on the same tick (the shell up, the jet down).
  - Cross jet: it stays on row 0, so a shell meets it only on row 0, by (a) after either one steps.
  - **Near miss:** a jet leaving a cell as the shell enters it, or entering the cell the shell just left (including a shell exiting up from row 0), is a **miss**, because the jet is visibly not where the shell is. Only (a) and (b) are hits. **Intended, do not special-case:** a Jump + Fire under a jet on row 8 that steps down to row 9 that tick is a near miss for the shell, and the tank is hit by the takeoff swap.
  - A jet removed in step 3 (ground row 10, a wall exit) is gone before step 5 and can't be hit that tick, so a jet's ground-crash tick never scores.
- Hits first overlapping jet → +100; consumed. If (a) or (b) holds for several jets on one tick, it hits the one that spawned first (one shell, one kill).
- **Point-blank:** shell hits resolve before jet–tank hits in tick step 5. A jet that the shell kills on the tick it reaches the tank's cell (by entering it, or by a swap that would land it there) dies with +100 and never costs a life. Only that one jet is saved against: a bomb, or a second jet, reaching the tank on that tick still hits.
- Ignores bombs, boats, mines, chopper.
- On Down: in-flight shell **continues**; can still hit jets during chopper; still the one active shell until hit or exit.

### Jets

Every jet, in every band, takes **one of two paths**, chosen at spawn and fixed for its life:

| Path | Spawn | Movement | Leaves the board |
|------|-------|----------|------------------|
| **Dive** | Random column on row 0 | One row down per jet step (§6), same column | Shot (+100); hits tank (−1 life, jet removed); passes through an invulnerable tank (§4 Tank); reaches ground row 10 (removed, no score) |
| **Cross** | Column 0 or the last column on row 0, side 50/50 | One column toward the opposite wall per **cross step**; stays on row 0 | Shot (+100); steps past the opposite wall (removed, no score). Never reaches the lane, so it can't hit the tank or chopper directly. |

- **Path choice:** cross with probability `jetCrossChance` (default **0.5**), else dive. Same in every band.
- **Cross step:** `jetCrossStepMs = round(jetStepMs × D / W)`, where W = number of columns and **D = dive length = 10** (jet steps from row 0 to removal at ground row 10). A crossing lasts W cross steps, so both paths stay on screen for the same time (within rounding: 4 ms apart in band C, 6 ms in band E, equal elsewhere) and jet density doesn't change. At 18 columns this is 5/9 × jet step. **Rounding: round half up** (`Math.round`), applied to the table's rounded jet step. Cross steps: A 400, B 400, C 283, D 200, E 142. Under SkyPolicy, use the rescue jet step in the same formula: B 1067, C 634, D 377, E 224 (A same as B).
- **Jets ignore each other:** a cross jet may pass through a cell holding another jet. If a shell reaches a cell with two jets, or meets several jets on one tick under the §4 Shell hit test, it hits the one that spawned first (one shell, one kill).
- May drop several bombs (Phase 2+), only while on screen; see Bombs.

### Bombs

- Destroy tank on contact (−1 life). Step down per §6 bomb intervals.
- **Drops: several bombs per jet, only while on screen.** A jet may drop **more than one bomb** during its flight, at random moments, but **only while it is on screen** (inside the 18×14 frame). This applies to dive and cross jets alike.
- **Guaranteed first drop (band A rule; Phase 2+):** the **first jet of a run** always drops exactly **one guaranteed bomb**. Its cell is chosen uniformly (seeded) from the cells the jet will enter on screen on rows 0–8: 9 cells for a dive jet, W = 18 for a cross jet. There is no roll for that cell. Every other cell rolls `bombDropChance` as usual. The normal drop limits still apply: if the jet is shot, crashes or exits before that cell, or SkyPolicy is active on that tick, the guaranteed bomb is lost and nothing replaces it. Later jets get no guarantee.
  1. **Drop opportunity:** each tick a jet enters a cell on rows 0–8 (including its spawn cell) is one opportunity. The game rolls the band's `bombDropChance` (§6) independently for each one (seeded). A hit drops one bomb into the cell directly below the jet. At most one bomb per opportunity. **Drop columns are random per drop:** each roll is independent, so the column (and, for dive jets, the row) of every drop is wherever the jet happens to be on a successful roll. Any on-screen column can get a bomb, and no column is preferred.
  2. **Opportunities per jet:** a dive jet gets up to 9 (rows 0–8). A cross jet gets up to W (one per column; 18 at 18 columns). A dive jet on lane row 9 doesn't roll, because a bomb there would start on ground row 10 and vanish at once.
  3. **On screen only:** no rolls and no drops once a jet has been shot, has crashed on row 10, or has stepped past a side wall. There is no arming delay and no other row or column window.
  4. **SkyPolicy:** no rolls while SkyPolicy is active (§9: no new drops). Skipped opportunities are lost, not deferred.
- **Fall:** each bomb travels **straight down** from its drop point until it reaches **ground row 10 and vanishes** (no score), except in the boat's column during a boat crisis while the player is in a Tank mode, where it falls on into the river (§4 Boats, *Bomb sink*). If it reaches the tank, the **tank is destroyed** (−1 life, same hit sequence as a jet). Bombs are independent of each other and of their jet. Bombs from one dive jet share its column but never overlap, since they all move at the same bomb step and the jet, which steps slower, stays behind them.
- **Jet shot:** bombs already dropped keep falling. Bombs not yet dropped are lost.
- **Per-jet bomb cap (Phase 2+):** a jet drops at most `bombsPerJetMax[band]` bombs over its whole flight: A **no cap**, B **2**, C **3**, D **4**, E **5**. On each drop opportunity, if the jet's bombs dropped so far (guaranteed drop included) already equal the **current** band's cap, there is no roll and no drop. The cap follows the active band (§6), so a jet still on screen when the active band rises can drop again, and a jet already at or over a lower new cap drops nothing more; bombs already dropped are never removed. Band A stays uncapped so level 1 keeps its guaranteed drop plus about 1.7 extra bombs. Why: uncapped per-cell rolls give about 4.5 bombs per dive jet and 9.0 per cross jet in band E, which with about 5.4 jets on screen can leave no dodgeable column. The cap bounds an unshot band-E sky at about 27 bombs per wave (5.4 × 5), and shooting jets early still lowers it. Phase 5 sim check: in band E, a column safe under the §8 respawn rule should exist on almost every tick; report the share of ticks with none.
- **Bomb path rule:** once dropped, a bomb travels in a **straight line from its drop point** to the tank lane and on to the ground, **independent of the jet**. It keeps falling whether the jet keeps flying, is shot, crashes, or has already left the screen. Its path is fixed at the drop tick and never follows the jet afterwards.
- **v1 direction:** straight down (90°) in the drop column. A cross jet moves horizontally, which doesn't give the bomb any sideways movement, so its bomb also falls straight down. A dive jet falls in the same column as its bomb, but bomb steps are always shorter than jet steps (§6), so the bomb stays ahead and they never share a cell.
- **No drifting bombs:** a bomb never drifts or changes direction during its fall. If a future jet path moves at an angle, a bomb released from it falls along that angle as a fixed straight line set at the drop tick. No v1 jet moves at an angle, so every v1 bomb falls straight down.
- Reach ground without tank → cleared, except the bomb-sink case (§4 Boats). (Side wall → destroyed applies only to a future angled bomb.)
- **Warning time (notes only):** a cross-jet bomb appears on row 1 and takes 8 bomb steps to reach the lane: A/B 5,280, C 3,736, D 2,640, E 1,864 ms, against a one-cell dodge that is immediate on a press (a held key repeats every 120 ms). A dive jet on row 8 may drop straight into lane row 9, so that bomb has no warning of its own, but its column has already been threatened by its jet for 8 jet steps (E 2,040 ms).
- Jump does not reliably dodge bombs — strafe.
- **Soft-ceiling contact (Phase 3+):** bomb Y stops at ceiling row. Never enter lane/ground while SkyPolicy active. Bombs already below the ceiling when SkyPolicy turns on are removed on that tick only on the **first** turn-on of each boat crisis (§9 SkyPolicy item 0); on later turn-ons they keep falling at rescue pace to ground row 10 and vanish there, never entering the river. This is the one exception to "continues to the tank lane"; once SkyPolicy lifts, the bomb resumes the same straight path.

### Boats

- **Sticky unlock:** `boatsUnlocked = true` once score **≥ `boatUnlockScore`** (§9 tunables); never re-locks if score later dips.
- **Max one** drowning boat entity. Spawn only when `Crisis == None` (and XOR / sticky allow).
- **Spawn cell:** a random column 2–15 and a random row 12 or 13 (seeded). **Bomb-free column:** the column must have no falling bomb on rows 1–10, checked after that tick's threat steps and drops. If no column 2–15 qualifies, the spawn stays pending and retries every tick (§6 Crisis scheduler).
- Only drowning boats in v1; unhooked timer **`drownTimerMs[band]`**: A/B **9,360** (A only for the level-1 tutorial boat; same formula, p = 1), C **8,596**, D **7,954**, E **7,414** (worst hook 4,560 = `8S + 4X·S`, notice plus a chopper flight across 17 columns, + `80S/√p`), taken from the band at the moment the boat spawns and fixed for that boat; pauses while hooked; **resumes** on unhook (e.g. Up-while-hooked).
- Timer expires (never hooked **or** dropped mid-rescue then timeout) → **+1 drowned boat** (same counter); boat removed; `Crisis → None`; if the player is in the chopper (`ChopperFree`; a hooked boat can't drown because its timer is paused), **PlayerMode → Tank** at current X, lane row 9, the same tick, exactly like a rescue (SkyPolicy lift + stampede); three drowned (drown timeouts and bomb sinks together) → game over (`GameOverReason.DrownedBoats`).
- A dropped boat (Up while hooked, or flight budget spent) stays on **row 12** in the chopper's column.
- **Bomb sink.** A bomb can sink a drowning boat **only by a direct hit on the boat's cell, and only while `PlayerMode ∈ {Tank, TankJump, TankInvuln}`**.
  1. **Into the river:** on the tick a bomb steps onto ground row 10, it falls on into the river only if `Crisis == Boat`, the boat is unhooked, the bomb is in the boat's column, the player is in a Tank mode, **and the bomb was dropped after the boat spawned** (backstop; the bomb-free spawn column already makes this true). Otherwise it vanishes as usual.
  2. A river bomb keeps its straight path and the bomb step of the active band (live, since the player is in a Tank mode). River fall from ground row 10: to row 12 is 2 steps (A/B 1,320, C 934, D 660, E 466 ms), to row 13 is 3 steps (1,980 / 1,401 / 990 / 699).
  3. **Sink:** on the tick a river bomb enters the boat's cell, the bomb and the boat are removed. This counts **exactly like a drowning**: `DROWNED` +1, `Crisis → None`, flight budget discarded, the crisis scheduler restarts from 0, it counts as a boat for the alternation, and the third drowned boat (by either cause) ends the game. Side panel: transient `BOAT SUNK`. The tutorial boat is the exception (non-counting loss, replays; level-1 doc).
  4. A river bomb vanishes (no score) if it would step below row 13, if `Crisis` leaves Boat, or if SkyPolicy turns on (§9 SkyPolicy item 0).
  5. **Lane first:** a non-invulnerable tank in the bomb's column is hit and the bomb is used up, so it never reaches the boat. An invulnerable tank lets it pass (§4 Tank).
  6. **Same tick** (§9 *Tick order*: input, timers, threat steps, respawn, hits, spawns): Down on the tick a bomb would reach the boat resolves first (step 1), so SkyPolicy clears the bomb and the boat is safe. If the drown timer expires on the tick a river bomb would reach the boat, the drowning resolves first (step 2), the river bomb vanishes because `Crisis` left Boat (item 4), and it counts as one drowning.
  7. No sink is possible while hooked or during a rescue: no bomb enters the river while `PlayerMode ∈ Chopper*`, and any bomb already in the river is removed when SkyPolicy turns on (item 4 above). Mines never meet a river bomb (Crisis XOR). Jets never enter the river.
  8. **Fairness:** with the bomb-free spawn column, the earliest possible sink is 3 bomb steps after spawn (a dive jet on row 8 dropping into row 9): A/B 1,980, C 1,401, D 990, E 699 ms, all above the 480 ms notice time. After a return from the chopper, held threats start at the ceiling: a held bomb on row 7 needs 5 bomb steps to row 12 (E 1,165 ms); a held jet must first step to row 8 and drop, then 3 bomb steps (E 255 + 699 = 954 ms).
- Rescue to either bank → +500; boat cleared; `Crisis → None`; **PlayerMode → Tank** at current X (soft ceiling lifts + stampede).

### Mines

- **Sticky unlock:** `minesUnlocked = true` once score **≥ `mineUnlockScore`** (§9 tunables; inclusive — locked for implementer clarity).
- **Max one** mine entity. Same run as rescue; **XOR** with boat crisis (§6). Lifetime **mineLifetimeMs = 4200** (`5H·S` with H = 14).
- Spawn only when `Crisis == None` and mines unlocked.
- **Spawn column:** chosen uniformly at random from the ground columns `c` with `|c − tankCol| ≥ mineMinGapCols` (5). `tankCol` is the player's current column on the spawn tick, whatever the mode (Tank, TankJump or TankInvuln; the player is never in the chopper with no crisis, invariant 25); during the 420 ms impact lock it is the impact column. On the 18-wide grid at least 9 columns always qualify (worst case: player at column 8 leaves 0–3 and 13–17), so the set is never empty. The roll happens once; the mine never moves afterwards, even if the player walks toward it.
- **Clear predicates (exact):**
  - **Jump clear:** `PlayerMode == TankJump` (after this tick's tank hits, which resolve first) and tank column overlaps mine column → mine removed; `Crisis → None`; no life loss; **+200**. The clear happens in tick step 5 on the first tick the airborne tank (row 8) is in the live mine's column, and it removes the mine, so a mine pays at most once: staying over it on later airborne ticks or jumping again finds no mine. A mine that expires in step 2 of a tick is gone before step 5, so a jump over it on its expiry tick gets no clear and no +200. If a jet or bomb hits the airborne tank on the tick it first reaches the mine's column, the hit resolves first (§9 step 5): life lost, mine stays live, no +200. A jet killed point-blank by the shell that tick is not a hit, so the clear still happens.
  - **Expire:** lifetime elapsed → mine removed; `Crisis → None`.
  - **Hit:** non-invuln tank on ground (row 9; an airborne tank on row 8 is never hit by a mine) overlaps mine (not jump-clear) → −1 life; mine removed; `Crisis → None`.
- Avoid: **jump is the only answer to a mine**. Down is ignored while `Crisis == Mine`. Otherwise stay out of its column until it expires.

### Chopper

- One transform, one job: **boat rescue**. The chopper can be entered only while `Crisis == Boat`.
- **Manual hook:** hover in the drowning boat's column and **press Down** to hook (column overlap; the boat's row doesn't matter). It is a press, not a hold: holding Down while flying across does not hook. Down anywhere else in the chopper does nothing. **Entry Down never hooks:** the Down press that enters the chopper from Tank does only that, even when the tank is in the boat's column; hooking needs a new Down press on a later tick, and a held Down never re-triggers. Ferry to either end.
- Up → `PlayerMode.Tank` at current X (when not auto-returned by rescue or by the boat drowning).
- **Flight timer:** every chopper flight draws from a per-boat-crisis flight budget (9,920 ms); when it runs out the chopper is forced back to Tank. No refill until the crisis ends. See §9 *Chopper flight timer*.
- **Combat rule:** the chopper is **never** hit by jets or bombs. See §9 *Chopper combat rule*.
- **SkyPolicy + lethality:** see §9. Soft ceiling, rescue slow, no life loss, and no new spawns/drops apply **only** while `PlayerMode ∈ Chopper* ∧ Crisis == Boat`. Since Down enters the chopper only in a boat crisis and every end of a boat crisis while flying returns the player to Tank, that is every chopper flight (invariant 25). The **only** fail state unique to the chopper is the **drowning-boat timer**.

### Terminology

- **Boat** (not “bot”).

---

## 5. Scoring, lives & game-over

| Event | Effect |
|-------|--------|
| Jet destroyed by shell | +100 |
| Jet reaches ground | No score change; jet removed |
| Jet / bomb / mine hits tank | −1 life |
| Jet / bomb vs chopper | Never a hit; no life loss (§9 *Chopper combat rule*) |
| Chopper flight budget runs out | No score/life change; forced to Tank at current X (hooked boat dropped) |
| Mine jump-cleared (§4 Mines) | +200 (once per mine; none on the mine's expiry tick) |
| Boat rescued | +500 |
| Drowning boat timer expires (incl. after drop/unhook) | +1 drowned boat |
| Bomb sinks boat (direct hit, Tank modes only; §4 Boats) | +1 drowned boat (same counter); `BOAT SUNK` |
| Lives = 0 | Game over — `Lives` |
| Drowned boats = 3 (timeouts and sinks together) | Game over — `DrownedBoats` |

- Start: 3 lives, 0 drowned, score 0. Same-frame both → prefer `Lives` if lives hit 0, else `DrownedBoats`.
- **Restart (Debu, Nov 2, 2026):** a restart after game over always begins a new run at level 1 (`river-guard-level1.md`, tick 0), with the Start values above. **A restart is a fresh run (Debu, Nov 2, 2026):** all run state resets to its start value: score 0 (so band A), lives 3, drowned boats 0, `boatsUnlocked` and `minesUnlocked` false (so the soft ceiling is back at 3 cells), the first-jet flag (the run's first jet again gets the guaranteed drop), `Crisis` None with the crisis-scheduler timer at 0 and no pending boat, the jet-spawner accumulator at 0, no jets, bombs, shell, boat or mine on the board, no flight budget, `rescueClearUsed` false, `PlayerMode` Tank at (8, 9) with no impact lock, invulnerability or jump cooldown, every step and cosmetic timer cleared, the side panel empty, and the level-1 script state (tutorial prompts, `SAFE BOAT`, dive-jet state) at its tick-0 values. **New seed (Debu, Nov 2, 2026, SD-A):** every run, restarts included, starts from a fresh random seed taken from the platform's random source; nothing from the previous run's seed is reused. (The rulebook has no fixed-seed test mode, so none is defined here.) Only the local best score carries over. A run that clears level 1 carries on into normal play with its score and lives (`river-guard-level1.md`, *After `LEVEL 1 CLEAR`*).
- Local best score on game over (Recommended).

---

## 6. Difficulty curve

Score bands only (primary). **No “time alive” secondary.** Jets and bombs get **progressively faster** (step intervals), not spawn/drop rate alone. **Active band: live from score, frozen while in the chopper.**
1. In Tank, TankJump and TankInvuln the active band is the band of the current score, updated on the tick the score changes.
2. On the tick Down puts the player into `ChopperFree` (boat rescue; the only chopper flight), the active band is **frozen** at its value on that tick. It stays frozen through ChopperFree and ChopperHooked, whatever the score does (shell kills still score).
3. On the tick the player returns to any Tank mode (Up, rescue reaching a bank, flight budget spent, or the boat drowning while the player is flying), the active band is recomputed from the current score, so it may jump one or more bands at once. The return stampede and the §8 respawn rule use the recomputed band.
4. Every band-indexed value reads the active band: jet spawn and step, bomb step, `bombDropChance`, `bombsPerJetMax`, rescue pace, `respawnFloorMs`, `crisisIntervalMs`. `drownTimerMs` is already fixed per boat at spawn.
5. Not band-indexed, so not frozen: score display, sticky unlocks (`boatsUnlocked`, `minesUnlocked`) and everything tied to them, including the soft ceiling (§9 SkyPolicy item 1 still moves it to row 7 if mines unlock mid-rescue).
6. A new Down later in the same crisis freezes again at the band current on that tick.

**Playfield:** 18×14 grid; row = 1 cell.

### Numeric difficulty table (Recommended arcade defaults)

| Band | Score | Jet spawn ms | Jet step ms | Bomb drop chance (per drop opportunity, §4) | Bomb step ms | Soft ceiling cells above lane (set by mine unlock, not band) | Rescue pace fraction |
|------|-------|--------------|-------------|------------------|--------------|-------------------------------|----------------------|
| A | 0–1,999 | 1333 | 720 | 0 (P1) / 0.10 after P2; first jet of the run has one guaranteed drop (§4) | 660 | **3** (tutorial boat only; mines locked) | **0.375** (tutorial boat only; p = 1) |
| B | 2,000–4,999 | 1333 | 720 | 0.15 | 660 | **3** | **0.375** |
| C | 5,000–14,999 | 943 | 509 | 0.30 | 467 | **3** below 10,000; **2** from 10,000 (default `mineUnlockScore`) | **0.446** |
| D | 15,000–29,999 | 667 | 360 | 0.45 | 330 | **2** (mines unlocked) | **0.530** |
| E | ≥ 30,000 | 471 | 255 | 0.50 | 233 | **2** (mines unlocked) | **0.631** |

**Timing source (`river-guard-timing-v6-proposal.md`):** seed `S = 60 ms` (a literal), W = 18, H = 14, dive length D = 10, band ramp `p` = A 1, B 1, C √2, D 2, E 2√2. Jet spawn `40·D·S/(W·p)` = `400S/(W·p)`, jet step `12S/p`, bomb step `11S/p`, rescue pace fraction `(3/8)√p`, each rounded to the nearest ms (or 3 decimals). Spawn is set so about 5.4 jets are on screen in every band; difficulty ramps through speed. The bomb drop chance and soft ceiling columns are not from the timing proposals: drop chance is per drop opportunity with the §4 guaranteed first drop and `bombsPerJetMax` cap, and the ceiling follows `minesUnlocked`.

**Rescue pace:** `rescuePaceFraction` is a **fraction of band combat pace**, `(3/8)√p`: 0.375 (A/B) … 0.631 (E). Band A's value applies only to the level-1 tutorial boat. Threats move slower ⇒ longer step interval:

`rescueStepMs = round(bandStepMs / rescuePaceFraction)`, computed from the unrounded step and fraction (closed form: rescue jet step `1920 / p^1.5`, rescue bomb step `1760 / p^1.5`). Using the rounded table values instead shifts C jet to 1141, D bomb to 623 and E bomb to 369; the values below are the contract.

| Band | Jet combat step | Rescue jet step | Bomb combat step | Rescue bomb step |
|------|-----------------|-----------------|------------------|------------------|
| A (tutorial boat only) | 720 | 1920 | 660 | 1760 |
| B | 720 | 1920 | 660 | 1760 |
| C | 509 | 1142 | 467 | 1047 |
| D | 360 | 679 | 330 | 622 |
| E | 255 | 404 | 233 | 370 |

- **Sticky unlocks:** boats at ≥ `boatUnlockScore`; mines at ≥ `mineUnlockScore`. Flags stay true for the run. Flags may flip mid-frame from scoring; boat/mine **spawn attempts** run only on their spawn-scheduler ticks when `Crisis == None` (no instant forced spawn on the unlock frame).
- **Crisis scheduler: one timer for boats and mines; crisis type is set by unlock score, never by band or level.**
  1. The timer counts only while `Crisis == None` and restarts from 0 each time a crisis ends (rescue, drown, bomb sink, or any mine end). When it reaches `crisisIntervalMs`, that is one spawn attempt (a scheduler tick), and the timer restarts. **Pending boat:** if the attempt picks a boat and no bomb-free spawn column exists (§4 Boats), the attempt stays pending and retries every tick, still as a boat; the timer stays at `crisisIntervalMs` until the boat spawns.
  2. On a tick: neither unlocked → nothing. Only `boatsUnlocked` → boat. Only `minesUnlocked` (possible only if the tunables put `mineUnlockScore` below `boatUnlockScore`) → mine. Both unlocked → alternate, and the **first crisis *picked* after `minesUnlocked` turns true is a mine**; after that mine, boat, mine, boat… A pick uses the unlock flags as they stand at that moment. **Pending boat across the unlock:** a boat already picked and pending (item 1) when mines unlock stays a boat and spawns when a bomb-free column opens; it is not cancelled or turned into a mine. The next pick after that boat's crisis ends is the mine.
  3. Mines therefore appear as soon as the score reaches `mineUnlockScore`, whatever the band (default 10,000, mid band C).
  4. `crisisIntervalMs` (`200S/p`; Phase 5 may tune): B **12,000**, C **8,485**, D **6,000**, E **4,243** ms; band A uses 12,000 (p = 1), reachable only if a tunable puts an unlock below 2,000. The interval speeds up by band like jets and bombs; only the crisis *type* ignores band.
  5. At most one boat and one mine (XOR below). The level-1 tutorial boat is scripted and not a scheduler tick.
- Data object: `DifficultyTable` — no scattered magic numbers.

### Hard rule — Crisis XOR

`Crisis` ∈ `{None, Boat, Mine}` — never Boat∧Mine. At most one boat entity and one mine entity.

| Condition | Effect |
|-----------|--------|
| `Crisis == Boat` OR (`PlayerMode ∈ Chopper*` ∧ `Crisis == Boat`) | No mine spawns; **clear** any on-screen mine |
| `Crisis == Mine` | No drowning boat spawn |
| Crisis clears | Other may appear again if sticky-unlocked |

---

## 7. Controls

| Input | Tank / TankInvuln | TankJump | Chopper |
|-------|-------------------|----------|---------|
| Left / Right | Move lane: each press one column at once; held, one more every `tankMoveMs` (120 ms hold rate) | Strafe the same way (press at once, hold every 120 ms), on row 8 for the whole jump | Fly river: at most one column per 240 ms free / 480 ms hooked, for taps and holds alike (no fast tapping, §7) |
| Fire | Shell if none active, **per new press** (holding never re-fires; a press with a shell active is discarded) | Same | — |
| Up | **Jump**: mines only (Phase 4+); **forbidden in TankInvuln**; ignored while the jump cooldown (240 ms after landing) is running | Ignored (not re-entrant) | From free: Tank at X. From hooked: **unhook/drop** → ChopperFree (timer resumes; later drown still +1) |
| Down | **Only if `Crisis == Boat` and flight budget > 0** → ChopperFree | **Ignored** until land | ChopperFree in the drowning boat's column: **hook**. Otherwise ignored (including while hooked) |

**Key bindings (keyboard):** each input in the table above is one physical key.

| Key | Input | Meaning |
|-----|-------|---------|
| Left arrow / Right arrow | Left / Right | Move the tank on the lane (or while airborne) or fly the chopper, by the press-and-hold rules below |
| Up arrow | Up | Tank modes: Jump (with its gates). Chopper*: leave the chopper (free) or unhook (hooked) (*Up = Jump*, below) |
| Down arrow | Down | Tank modes: enter the chopper (boat crisis only). ChopperFree: hook over the boat (*One action per Down press*, below) |
| Space | Fire | Fire one shell, by the Fire rules (§4 Shell: press only, no buffering, same-frame presses merge, §9 *Tick length*) |

- No other key is a game input. Any key still resumes after a hidden tab (§9 *Tick length*).
- The binding changes only which key is which input. Every rule written for Left, Right, Up, Down and Fire applies unchanged to its key.
- **Prompt key names:** on-screen prompts (side panel, overlays) name the key for each action. Space is always written as the word `SPACE` (for example `SPACE: FIRE`). The arrow glyphs ◀ ▶ ▲ ▼ may stand only for the arrow keys with the same direction, so ▲ always means the Up arrow (Jump, or leave/unhook in the chopper) and is **never** used for Fire.

**Left/Right press and hold:** applies in Tank modes (lane and airborne) at `tankMoveMs` = 120 ms (2 ticks), and in the chopper at its step, 240 ms free and 480 ms hooked (4 and 8 ticks).
- A **new press** on tick `P` moves one column at once in step 1 of `P`, however recently the last move happened. **Fast tapping:** tapping can reach one column per tick (60 ms) and beat the hold rate; this is intended. `tankMoveMs` and the chopper rates govern only the held repeat. **Tank only:** the chopper is capped at its rate (next bullet).
- While the key stays **held**, it moves one more column on `P + r`, `P + 2r`, … (`r` = the rate in ticks), in step 1 of those ticks. The repeat counts from the press tick. A **release** stops it, and a later press is a new press.
- **Opposite direction while holding:** the newest press wins. It is a new press, so it moves at once and restarts the repeat from its tick in its direction. The older key is ignored while the newer one is held.
- **Catch-up:** a press carried by catch-up is applied on the first tick run (§9 *Tick length*) and its repeat counts from that tick. Held state is read on every tick, so a 5-tick frame can repeat inside the frame.
- **Walls:** a move into a wall does nothing (no column change). The repeat timing goes on, so holding against a wall stays put, and pressing away moves at once.
- **Chopper cap:** in Chopper* modes the chopper moves at most once per current rate `r` (4 ticks free, 8 hooked). A new press on tick `P` moves at once only if `P − L ≥ r`, where `L` is the tick of the chopper's last move. Otherwise it is remembered as a **pending move** and made on the first tick where `t − L ≥ r`.
  - There is at most one pending move, and a newer press replaces it, so the latest direction wins (newest-press rule).
  - Releasing the key does not cancel it (it is a remembered press, not a hold).
  - A held key repeats on ticks `L + r`. A move made by a pending press counts as the last move.
  - **Rate change:** `L` is kept across a hook (free → hooked) or a drop (hooked → free), and the check uses the rate in force on the tick of the check. So right after a hook the next move waits until 8 ticks after the last move, and right after a drop until 4.
  - **Entering the chopper:** a Down from Tank starts with no chopper move yet, so the first chopper move is allowed at once (from the next tick, since the entering tick's step 1 has already used Left/Right in Tank).
  - A pending move is discarded when the player leaves the chopper.
  - With this cap the chopper timing holds: worst hook 4,560 = `8S + 4X·S` (17 columns at 240), flight budget 9,920 (`4X·S + 8F·S + 2,000`), and the level-1 checks (13 × 240 drop, 13 × 480 ferry).
- **Both directions:** if Left and Right are both newly pressed on the same tick and **both are held when the tick reads the keys**, neither is newer and (likewise if both were pressed and both released within one frame, so neither is held at the tick) there is no horizontal move (tank or chopper) on that tick or on any later tick while both stay held. A new press of either key during this ends the tie: by the newest-press rule it moves at once in its direction.
- **Release with the other key held:** when one of two held Left/Right keys is released, after a same-tick tie or after the newer key overrode the older, the still-held key acts as a **new press on the release tick**. It moves at once in Tank modes, or under the chopper cap in Chopper* modes, and its hold repeat restarts from that tick. A key counts as released on a tick only if it is not held when that tick reads it, so a release and re-press inside one frame is just a press.
- **At most one column per tick:** all new presses that land on one tick, real or from a release, are resolved together. If they point the same way there is one move; if they disagree it is the both-directions tie (no move while both are held). So rapid alternate releases and presses can never move more than one column per tick.
- **Same-frame presses:** repeated presses of one button between two frames count as one new press, for Left, Right, Up, Down and Fire alike. Whether it is held or a tap is read on the tick (§9 *Tick length*).
- **Held through the lock or a mode change:** a Left/Right key held through the impact lock, or across a change between Tank modes and Chopper* (Down into the chopper, Up out of it, a rescue at the bank, a drowning while flying, a budget-out return), acts as a **new press on the first tick movement is allowed**. It follows the new mode's rules: in Tank modes it moves at once; in the chopper it is subject to the chopper cap, and the first chopper move is immediate. Its hold repeat restarts from that tick.
  - **Impact lock:** the lock started on the impact tick `I` expires in step 2 of `I+7` = `T_r`, so step 1 of `T_r` is still locked, and the respawn places the tank in step 4 of `T_r`. The first allowed tick is `T_r + 1`, so a held key never moves the tank off its safe respawn column on the respawn tick.
  - **Mode change:** a change in step 1 (Down, Up, a rescue by a move) comes after that tick's Left/Right, and a change in step 2 (drowning while flying, budget out) comes after step 1. Either way the first allowed tick is the next one.
  - Changes inside Tank modes (takeoff, landing, end of invulnerability) and inside the chopper (hook, drop) are not mode changes here: holds simply continue, and the chopper cap handles the hook and drop rate.
  - This is for Left/Right only. A held Up never re-triggers (§7 Up = Jump); Down and Fire are presses.

**One action per Down press:** like Up, each Down press does one action, chosen by `PlayerMode` at the start of step 1. In Tank it enters the chopper and never also hooks, even over the boat's column. In ChopperFree it hooks when over the boat. A held Down never re-triggers. **Down + Up on one tick:** In Chopper* modes Down is resolved before Up. In Tank modes Down comes after Up (Jump) and Fire (*Fire vs chopper-entry Down*, below), and the order of Down and Up there changes nothing, because they can never both act. If Down takes effect that tick (a hook, or entering the chopper from Tank), that tick's Up is ignored entirely: no unhook, no leaving, no Jump. If Down has no effect (already hooked, not over the boat, or Down refused in Tank), Up applies normally. In Tank modes the two can't both act anyway: Down needs `Crisis == Boat` and Jump needs `Crisis ≠ Boat`. **Fire vs chopper-entry Down:** in Tank modes step 1 runs Left/Right, then Up (Jump), then Fire, then Down. A Fire and a Down on the same tick fire a shell from the tank's cell (after the move) and then enter the chopper. The shell keeps flying as any in-flight shell does: the rescue-start clear removes only jets and bombs, and SkyPolicy lets the shell continue and score.

**Up = Jump:** there is no separate Jump key; Jump is the Up arrow in Tank modes. Each Up press does exactly one action, chosen by `PlayerMode` at the start of §9 step 1: Chopper* → leave the chopper (free) or unhook (hooked), Tank/TankInvuln → Jump (with its gates). A press that returns the player to Tank never also jumps on that tick, and holding Up does nothing more: the next Jump needs a new press. **Chopper move before Down and Up:** in Chopper* modes step 1 applies Left/Right first, then Down (hook), then Up. The hook checks the chopper's column after the move, so Down pressed while moving onto the boat's column hooks it, and Down while moving off it does not. If the move brings a hooked chopper to a bank, the rescue happens (+500, crisis over, back to Tank by the existing rules), and that tick's Up is consumed and does nothing (no unhook, no Jump). Otherwise Up acts at the chopper's new column: ChopperFree → Tank there, and ChopperHooked → the boat is dropped there on row 12.

No boat crisis ⇒ Down ignored (no transform, no SkyPolicy); this includes a mine crisis, where jump is the only answer. Flight budget spent for this crisis ⇒ Down ignored.

---

## 8. PlayerMode × Crisis state machine

### Enums

- `PlayerMode`: `Tank` | `TankJump` | `ChopperFree` | `ChopperHooked` | `TankInvuln`
- `Crisis`: `None` | `Boat` | `Mine`
- **SkyPolicy active (derived):** `PlayerMode ∈ {ChopperFree, ChopperHooked} ∧ Crisis == Boat`  
  (Soft ceiling + rescue step + no life loss + no new jet spawns + no new bomb drops.) Down enters the chopper only when `Crisis == Boat`, and rescue or drowning returns the player to Tank, so this equals `PlayerMode ∈ Chopper*` (invariant 25); the formal definition is kept.
- `rescueClearUsed` (bool, per boat crisis): false when a boat crisis starts; set true on the first SkyPolicy turn-on in that crisis (§9 SkyPolicy item 0).

### Respawn safety rule

Applies to every respawn after a life loss (a tank hit by a jet, bomb or mine; the chopper is never hit) when lives remain. The respawn tick `T_r` is impact + `impactLockMs` (420 ms; §4 Tank *Impact pacing*). Invulnerability (`invulnMs` = 960 from the impact tick) ends at `T_r + 540`.

1. **Target column:** lane centre, column 8 (the left of the two middle columns), row 9.
2. **Safe for 3 threat steps, with a band floor:** a column `c` is **unsafe** if any existing dive jet or bomb is predicted to occupy (row 9, column `c`) at a time ≤ `T_r + max(3 × that threat's current step ms, respawnFloorMs[band])`. Prediction uses each threat's live step interval (the active band's timing, §6) and fixed path. Cross jets stay on row 0 and never count. Bombs or jets that don't exist yet at `T_r` aren't predicted. **A live mine's column is also unsafe**: mines never move, so if a mine exists at `T_r` its column is unsafe for the whole window, even if the mine would expire inside it.
3. **Band floor, `respawnFloorMs`** (gets harder toward E): A **900** (15S), B **840** (14S), C **780** (13S), D **720** (12S), E **660** (11S). The floor is the remaining invulnerability (540) plus a reaction margin of 360, 300, 240, 180 or 120 ms (6S down to 2S). In band A that margin equals 3 held-repeat moves at the 120 ms hold rate (tapping is faster). At the default steps, 3 threat steps are longer than the floor in every band (tightest: band E bomb, 3 × 233 = 699 vs 660; band E jet 765), so at default tuning the 3 steps always set the window and the floor is a backstop that binds only if Phase 5 makes a step shorter than floor ÷ 3. **The floor is kept on purpose as a dormant safety net:** it does nothing at default tuning, and it protects the player if a later tuning pass speeds threats up. Phase 5 should not remove it just because it never binds.
4. **Search order:** 8, then 9, 7, 10, 6, 11, 5 and so on, alternating outward to the walls. The first safe column wins.
5. **No safe column:** pick the column whose earliest predicted threat arrives latest. A live mine counts as a threat arriving at `T_r`, so its column ranks last. Ties go to the earlier column in the search order.
6. The check runs **once, on the respawn tick**, after that tick's threat steps. The column is never re-chosen.

### Transitions (Recommended)

| From | Input / event | Guard | To | Notes |
|------|---------------|-------|-----|-------|
| Tank | Down | Crisis == Boat ∧ flightBudgetMs > 0 | ChopperFree | SkyPolicy on (on the crisis's first Down, clear all jets and bombs below the ceiling; on later Downs remove only river bombs; §9 SkyPolicy item 0); flight timer runs |
| Tank | Up (Jump) | minesUnlocked ∧ Crisis ≠ Boat ∧ not Invuln ∧ no jump cooldown running | TankJump | Phase 4+ |
| TankJump | land | — | Tank | Jump cooldown starts (`jumpCooldownMs`) |
| TankJump | column overlap mine | Crisis == Mine | Tank | Jump clear; Crisis → None |
| ChopperFree | Down pressed | Crisis == Boat ∧ chopper column == boat column | ChopperHooked | Manual hook; drown timer pauses |
| ChopperFree | Up | — | Tank | If SkyPolicy was on, lift + stampede |
| ChopperHooked | reach left/right river end | — | **Tank** | +500; Crisis → None; boat cleared; SkyPolicy lift + stampede |
| ChopperHooked | Up | — | ChopperFree | Unhooks (drop); timer resumes. Crisis stays Boat; SkyPolicy stays on. If timer later expires → +1 drowned (same as never-rescued) |
| ChopperFree | drown timer expires | Crisis == Boat | **Tank** | +1 drowned; boat removed; Crisis → None; at current X, lane row 9; SkyPolicy lift + stampede; band recomputed; no life loss, so no respawn rule. ChopperHooked can't get this event: the timer is paused while hooked |
| Any tank* | jet/bomb/mine hit | not invuln; mine hit ≠ jump-clear | TankInvuln | −1 life; if lives 0 → game over; respawn per §8 Respawn safety rule, lane Y |
| TankInvuln | timer end (960 ms from impact) | — | Tank | |
| TankInvuln | Down | Crisis == Boat ∧ flightBudgetMs > 0 | ChopperFree | Same Down gate and the same item-0 rule |
| ChopperFree | flight budget hits 0 | — | Tank | At current X, lane row 9. Crisis unchanged. If Crisis == Boat: SkyPolicy lift + stampede |
| ChopperHooked | flight budget hits 0 | — | Tank | Boat dropped in place (row 12, current column); drown timer resumes; Crisis stays Boat; at current X, lane row 9; SkyPolicy lift + stampede |
| Crisis None | crisis scheduler tick picks Boat (§6) | boatsUnlocked ∧ Crisis None ∧ a bomb-free spawn column exists (else pending, retry each tick) | Crisis Boat | Max one boat |
| Crisis None | crisis scheduler tick picks Mine (§6) | minesUnlocked ∧ Crisis None | Crisis Mine | Max one mine |
| Crisis Boat | rescued, drowned or sunk by a bomb | — | None | Rescue forces Tank; a drowning while flying forces Tank (row above); a sink happens only in Tank modes and counts as a drowning |
| Crisis Mine | expire / jump clear / hit | — | None | |

Illegal: Down with Crisis None or Mine (Down → chopper needs Crisis Boat); Down with flight budget 0; Down during TankJump; Up (Jump) during TankInvuln; Up (Jump) during TankJump; Crisis Boat∧Mine; life loss under SkyPolicy (`Chopper* ∧ Crisis == Boat`); two boats or two mines.

---

## 9. River-rescue timing / sky management

### SkyPolicy (soft ceiling + slowed descent)

**Active iff** `PlayerMode ∈ Chopper* ∧ Crisis == Boat`:

0. **Rescue-start clear (once per crisis):** on the **first** tick SkyPolicy turns on in a boat crisis, every jet and bomb **below** the ceiling row (lane, ground and river rows included) is removed, no score. Threats on or above the ceiling row stay. A per-crisis flag `rescueClearUsed` is set on that tick and reset when the next boat crisis starts; it is set even if nothing was removed (for example the tutorial boat). **On every later turn-on in the same crisis** (Down after Up, after a forced return, or after a hooked drop) nothing on rows 0–10 is removed: jets and bombs already below the ceiling keep their straight paths at rescue step ms (§6) and are removed on reaching ground row 10, no score; they can't cost a life (item 4) and can't enter the river. Bombs already on river rows 11–13 are removed on every turn-on, no score. This closes the Down/Up exploit: repeated Down presses gain nothing after the first.
1. Jets/bombs stop at soft-ceiling row: 3 cells above lane (row 6) while mines are locked, 2 cells (row 7) once `minesUnlocked` (§3). If mines unlock mid-rescue, the ceiling moves to row 7 and threats held at row 6 may step down one more row at rescue pace. Never enter lane/ground. Cross jets are on row 0, above any ceiling, and keep crossing at rescue pace.
2. Above ceiling, step using **rescue step ms** from §6 (`rescuePaceFraction` 0.375→0.631).
3. No new jet spawns; no new bomb drops; shell continues and may score.
4. No bomb/jet life loss vs player.

**Not active** when `Crisis ≠ Boat`. No chopper linger exists: rescue and a drowning while flying both return the player to Tank, a sink can't happen while flying, and there is no mine flyover, so SkyPolicy equals `PlayerMode ∈ Chopper*` (invariant 25).

### Return stampede (Recommended)

When SkyPolicy lifts (rescue bank → Tank, Up from Chopper* while Crisis was Boat, a forced return when the budget runs out, or the boat drowning while the player is flying), threats stacked at the ceiling line **do not** all take a full-pace step on the same tick:

- **Stagger:** sort by X ascending; on resume tick `t`, only threats with index `i` where `i % 3 == t % 3` may take their first post-lift step; then normal cadence.
- Alternate (rejected primary): hard cap of 3 stepping on first tick — stagger preferred for readability.

### Chopper flight timer

Each boat crisis gets one **flight budget**, set when the crisis starts (`Crisis None → Boat`). A mine crisis has no flight budget: the chopper is for boat rescue only and Down is ignored while `Crisis == Mine`.

| Crisis | `flightBudgetMs` |
|--------|------------------|
| Boat (rescue) | **9920** (worst run 7,920 + 2,000 guard) |

1. The budget counts down **only while** `PlayerMode ∈ Chopper*`. It does not count down in Tank, TankJump, or TankInvuln.
2. **No refill until the crisis ends.** Up → Tank and Down again later in the same crisis continues from the remaining budget; it does not reset.
3. Budget hits 0 while ChopperFree → forced `Tank` at current X (lane row 9). Crisis unchanged (the boat keeps drowning).
4. Budget hits 0 while ChopperHooked → boat dropped where it is, drown timer resumes from where it paused, forced `Tank` at current X. Crisis stays Boat.
5. With budget 0, Down is ignored for the rest of that crisis.
6. When the boat crisis ends (rescue, drown or bomb sink) the budget is discarded; the next boat crisis gets a fresh one. A rescue or drowning while flying returns the player to Tank on the same tick, so a discarded budget never belongs to a chopper in flight.
7. If Crisis == Boat when the forced return happens, SkyPolicy lifts and the return stampede applies.

Why: the boat budget closes the hook-and-hover stall (drown timer paused + frozen sky forever).

### Chopper combat rule

**The chopper is never hit.** The chopper flies only in a boat crisis, under SkyPolicy (§9 SkyPolicy): threats stop at the soft ceiling, and any already below it on a later Down fall to ground row 10 at rescue pace and vanish without touching the chopper.

- **Tick order:** see §9 *Tick order*. A tank moving out of a threat's column on the same tick it arrives avoids the hit; moving into it is a hit. The same order applies to the bomb sink (§4 Boats item 6).

### Chopper lethality

- **Boat rescue (SkyPolicy on), the only chopper use:** no life loss; drown timer is the only rescue-era fail state.
- After return to Tank, full lethality resumes.

### Tick order

Every simulation tick resolves in this fixed order.

**Tick length:** every tick covers a fixed `dt` = **60 ms** (= S), independent of the render frame rate. On a slow frame the game runs the missed ticks back to back (fixed-timestep accumulator), so nothing ever moves more than one step in a tick. The tick index `t` (0 at level start, +1 per tick) is the `t` used by the return stampede stagger.

- **Step intervals that aren't multiples of 60:** every threat-step mover and spawner (the shell, dive and cross jets, bombs, their rescue steps, the jet spawner) keeps a **step accumulator** in ms. It starts at 0 on the tick the entity appears (the spawner at level start) and gains 60 on each later tick; when it reaches the current interval, the entity takes one step and the interval is subtracted, carrying the remainder. The average rate is exact and single gaps are whole ticks (a 509 ms band-C jet steps after 480 or 540 ms). Every interval in this doc is ≥ 60 ms (smallest: shell 60, band-E cross step 142, band-E rescue cross step 224, band-E bomb 233), so at most one step per tick is ever due. The player's hold-repeat rates (tank 120, chopper 240 free / 480 hooked) are whole ticks (2, 4, 8) and need no remainder; in Tank modes a new press always moves at once, while the chopper never moves faster than its rate (§7). The shell's accumulator gains nothing on its fire tick, so it is on its start row in that tick's step 5 and steps every tick after, as §4 Shell says. 
- **Speed change mid-flight:** when a mover's step interval changes from `oldInterval` to `newInterval` (rescue pace on or off, a band change), its accumulator is rescaled at that moment: `acc = min(floor(acc × newInterval / oldInterval), newInterval − 1)`, in integer ms (round down, then cap one ms below a full step). It keeps its fraction of progress toward the next step and can never owe a step. A change in steps 1–2 applies before that tick's step 3 gain. A change in step 5 (a band change from a shell kill) applies after that tick's steps, so the new interval first counts on the next tick. Several changes in one tick (for example Down in step 1 and a budget-out return in step 2) are applied one after another, each with its own rounding. The shell's interval (60) never changes. 
- **Held-back counters:** while a threat can't step because it is held at the soft ceiling or waiting for its return-stampede stagger slot, or the jet spawner is blocked by SkyPolicy, its counter keeps gaining 60 per tick but is **capped at interval − 1**, just below one step.
  - When the block lifts, it steps or spawns **exactly once on the first allowed tick**.
  - If its counter was at the cap at the start of that tick, the remainder after the step is **0**. Otherwise the normal carry applies. No burst is possible.
  - **First allowed tick:** a block that lifts in step 1 or 2 (SkyPolicy lifting on Up, a rescue, a budget-out or drowning return) allows the step in step 3 of the same tick, subject to the stagger slot. A block that lifts in step 5 (the ceiling moving down when mines unlock from a score change) allows it in step 3 of the next tick.
  - A capped counter is rescaled by the speed-change rule and stays capped, since the rescale caps at `newInterval − 1`.
- **Countdown timers** (step 2) lose 60 per tick and expire at ≤ 0, so a duration that isn't a multiple of 60 lasts until the next whole tick: drown timer C 8,596 → 8,640 ms, D 7,954 → 7,980, E 7,414 → 7,440; flight budget 9,920 → 9,960; crisis interval C 8,485 → 8,520, E 4,243 → 4,260. The listed values stay the contract; these are their tick-exact effects.
- **Catch-up limits:** each animation frame adds the real time since the previous frame to a frame accumulator `frameAcc` (ms), then runs `n = min(floor(frameAcc / 60), 5)` ticks and subtracts `60 · n`. If `frameAcc` is still ≥ 60 after that (only possible when `n` = 5), the backlog is dropped: `frameAcc = frameAcc mod 60`, keeping only the part of a tick. Dropped time never happens in game terms: every game timer and step accumulator is tick-based, so they stay in step with each other and only the wall clock runs ahead.
- **Hidden tab:** while the tab/document is hidden the game is paused and runs no ticks.
- **Resume:** on becoming visible the game **stays paused** and shows `PRESS ANY KEY` as a **centred overlay on the playfield**, drawn in the existing LCD style (original sprites/font). It is outside the side-panel rules (§3). No ticks run until a key press.
  - Any keyboard key counts, game keys included.
  - The resuming press is **consumed**: it is not game input, so it can't move, jump, fire or drop.
  - The first tick runs on the next frame after that press, with no backlog: `frameAcc` is reset to 0 and the previous frame time is set to the press time, so neither the hidden nor the paused time is caught up.
  - Keys pressed while hidden or paused, other than the resuming press, are discarded.
  - The resuming key, if it is a game key held down, is ignored until it is released. Other game keys held at resume follow the held-through rules: Left/Right acts as a new press on the first tick; Up, Down and Fire need a new press.
  - Only "tab/document hidden" pauses: a window that loses focus but stays visible keeps running.
- **Inputs:** a button press that happened since the last frame is applied in step 1 of the **first** tick run in that frame. If the frame runs 0 ticks, the press carries over to the next tick that runs. A press is applied exactly once, even if the button was released within the same frame.
- **Same-frame presses:** all presses of one button (Left, Right, Up, Down or Fire) since the last frame merge into **one new press**, applied on that frame's first tick, or carried with any later presses of that button if 0 ticks run. So each button gives at most one new press per tick.
  - Presses of different buttons stay separate presses on the same tick and are resolved by the step-1 order and the tie rules (§7). Left and Right both pressed in one frame are the same-tick tie.
  - **Held state** is read on the tick. A merged press whose button is held at the tick is one press, held (press, release, press). One whose button is released by then is one press, a tap.
  - A release and re-press of a key that was already held counts as a new press (it moves, jumps or fires again if allowed).
  - **Same-frame Left + Right, one released:** if both were pressed in one frame but only one is still held when the tick reads the keys, the held key moves as a new press (at once in Tank modes, under the chopper cap in the chopper). The released one is a tap that is ignored: no move its way and no tie. A tie needs both keys held at the tick. **Two opposite taps:** if Left and Right were both pressed and both released within one frame, so neither is held at the tick, there is no move, as for a tie. In the chopper neither tap sets the remembered move. This doesn't conflict with "latest direction wins", which applies to presses on different ticks or to one press over an earlier remembered move; two same-tick opposite taps have no latest, and an existing remembered move is left as it was.
- A press applied on a tick that is inside the 420 ms impact lock is ignored, like any input in the lock (not buffered). Cosmetic timers (ripple, drawbridge, cactus sprout and shrink frames, `msgHoldMs`) never change game state, so they are not placed here.

1. **Input and player movement.** Left/Right (tank or chopper move), Fire (new shell; a new press only, discarded if a shell is active, never repeated by holding), Up (leave the chopper or unhook in Chopper*; Jump in Tank modes, chosen by `PlayerMode` at the start of step 1, one action per press), Down (into the chopper; hook). Results apply at once: SkyPolicy turning on (with the §9 SkyPolicy item 0 clear), a hook pausing the drown timer, a drop resuming it, a hooked chopper reaching a bank (rescue → Tank), band freeze or recompute. Inputs are ignored during the 420 ms impact lock. **Left/Right:** Left and Right newly pressed on the same tick move nothing while both stay held (§7). When one of two held keys is released, the other acts as a new press on that tick. A key held through the impact lock or across a Tank ↔ Chopper* change acts as a new press on the first tick movement is allowed (`T_r + 1` after a hit; the tick after a mode change) (§7). Otherwise every new press moves one column at once, whatever the time since the last move, in Tank modes (fast tapping can reach one column per tick); in Chopper* modes a press moves only once the chopper rate (4 / 8 ticks) has passed since its last move, else it waits as one pending move (§7); a held key repeats every `tankMoveMs` (Tank modes) or chopper step (240 / 480 ms), counted from the press tick (§7). **Chopper input order:** Left/Right, then Down (hook, checked at the new column), then Up. **Down:** one action per press, by the mode at the start of step 1; the Down that enters the chopper never also hooks (a new press is needed). **Down + Up:** in Chopper* modes Down resolves before Up (in Tank modes they can't both act); if Down took effect (a hook, or entering the chopper), that tick's Up is ignored; otherwise Up applies normally. A move that reaches a bank while hooked rescues, and that tick's Up does nothing. **Tank input order:** Left/Right, then Up (Jump) (if allowed: grounded, no cooldown running, not TankInvuln, plus the §7 gates), then Fire, then Down (enter the chopper), so a shell fired on a takeoff tick starts on row 8 in the new column, and one fired with a refused Jump starts in the tank's actual cell. Every guard reads the state as it stands at that point in step 1 (for example the Down gate reads `flightBudgetMs` from before this tick's step 2).
2. **Timers tick down by `dt` and expire**, in this order: flight budget (§9 *Chopper flight timer*), drown timer, mine lifetime, jump airtime (`jumpAirtimeMs`, TankJump → Tank on landing), jump cooldown (`jumpCooldownMs`, started by a landing), `invulnMs` (TankInvuln → Tank), impact lock (marks the respawn as due), crisis scheduler timer (§6). A timer expires on the tick its remaining time reaches ≤ 0, so at the start of every tick each live timer has remaining > 0.
   - **Pause rule:** a timer ticks in step 2 only if it is running at the end of step 1. A timer paused at the end of step 1 (for example a drown timer paused by a hook on this tick) keeps its value from the start of the tick, which is > 0. A timer started or resumed after step 1 (a drown timer resumed by a budget-out drop in step 2, a jump cooldown started by a landing in step 2, a timer of an entity spawned in step 6, or the crisis scheduler restarting when a crisis ends) first ticks on the next tick.
3. **Threat and shell steps.** The shell takes any step its step timer allows (§4 Shell; it continues during the chopper and is never held by the soft ceiling), and jets and bombs take any steps their step timers allow (rescue pace and soft ceiling under SkyPolicy, return stampede stagger), jets spawn, bombs drop on the cells jets enter (§4 Bombs), river bombs continue (§4 Boats), and jets and bombs are removed at ground row 10, below row 13 or past a wall, and a shell stepping up from row 0 is removed. All moves are compared from before step 3 to after it, so their order inside step 3 never changes an outcome.
4. **Respawn placement.** On the respawn tick `T_r`, the tank is placed by the §8 Respawn safety rule, after this tick's threat steps.
5. **Collisions and hits**, in this order: (i) shell vs jet (§4 Shell hit test: same cell, or swapped cells in step 3; +100; one kill), then (ii) tank hits: jet or bomb vs tank and mine hit (one counts, priority below), then (iii) jump clear (mine removed, `Crisis → None`, +200), only if the tank is still TankJump after (ii), then (iv) bomb sink (§4 Boats). **Hit before clear:** an airborne tank hit on the tick it first reaches a live mine's column loses the life, and the mine stays live: no clear, no +200, and the crisis goes on. The hit ends the jump, so that jump can never clear it later. Invulnerable passes (§4 Tank). **Point-blank:** a jet the shell kills in (i) is gone before (ii), so it never hits the tank: +100, no life lost. Bombs can't be shot, so a bomb reaching the tank on that tick still hits it, and so does any other jet the shell did not kill. **Simultaneous hits:** in (ii) the first tank hit costs one life and makes the tank TankInvuln immediately; every other jet, bomb or mine reaching the tank that tick passes through as for an invulnerable tank (invariant 24). **Priority:** the hit that counts is a **mine** if one hits, else a **bomb**, else a **jet**. A counted mine is removed and ends the mine crisis exactly as a normal mine hit (`Crisis → None`). A counted bomb or jet is removed. Every other threat passes through: bombs keep falling, to ground row 10 or into the river under the §4 Boats bomb-sink rule, and jets keep falling to ground row 10. There is at most one mine. Between two bombs (or two jets), the one that spawned first counts. It matters only on a takeoff, where one can reach the tank by a swap and another in the row-8 cell, and then it only decides which one stays on screen. In one cell they share a path, so the outcome is the same.
6. **Crisis spawns.** A crisis scheduler attempt that is due (or a pending boat) spawns its boat or mine, using the bomb-free column check (§4 Boats) and the mine spawn column (§4 Mines) against the positions after steps 3–5.

Consequences: moving out of a threat's column on the tick it arrives avoids the hit, and moving into it is a hit. A hook on the drown timer's expiry tick saves the boat. A mine never hits or is jump-cleared on its expiry tick. On the tick invulnerability ends, that tick's hits apply. A shell and a jet that pass through each other in step 3 still collide. A shell in flight keeps stepping and scoring during the chopper and during the impact lock. A shell fired on a tick is in the cell the tank had in step 1 for that tick's step 5 (on a jump's landing tick that is still the airborne cell, since landing is step 2), so it hits a dive jet passing through an invulnerable tank in that cell, whether it was already there or enters it that tick. With a vulnerable tank the same shot kills a jet entering the tank's cell before it can hit (point-blank, step 5).

### Hard invariants (unit-testable)

1. While SkyPolicy: no jet or bomb **enters** a row below the ceiling from on or above it. On the first SkyPolicy tick of each boat crisis none is below the ceiling (SkyPolicy item 0); on later turn-ons any already below keep falling at rescue pace and are removed at ground row 10. No bomb is on river rows 11–13 while SkyPolicy is active.
2. While SkyPolicy: no bomb/jet–player life loss.
3. While SkyPolicy: no new jet spawns; no new bomb drops.
4. Never `Crisis.Boat && Crisis.Mine`.
5. Down ignored unless `Crisis == Boat` (so ignored with no crisis and in a mine crisis); Down ignored during TankJump. In the chopper, Down hooks only when ChopperFree in the boat's column during a boat crisis, and does nothing otherwise. No hook happens without a Down press.
6. Soft ceiling cells ∈ {2, 3} only (never 1): 3 iff `minesUnlocked` is false, 2 iff true; SkyPolicy only when Crisis == Boat. Jump is legal only when `minesUnlocked`.
7. Band E `rescuePaceFraction` = 0.631 (`(3/8)√p`) and < 1.0.
8. Ground jet remove ⇒ score unchanged.
9. Sticky unlocks never clear mid-run.
10. At most one boat entity and one mine entity.
11. Boat bank rescue ⇒ PlayerMode Tank ∧ Crisis None ∧ SkyPolicy off.
12. Mine jump/expire/hit predicates match §4 (column overlap or lifetime/hit).
13. A life is lost only in a Tank mode, never in the chopper; every life loss with lives left ⇒ TankInvuln, placed at lane row 9 at `T_r` in the column given by the §8 Respawn safety rule (a tank hit while airborne stays on row 8 as a wreck until then). Every respawn column is safe by that rule unless no safe column exists.
14. The chopper is never hit: while `PlayerMode ∈ Chopper*`, no jet or bomb changes lives or is removed by contact with the chopper.
15. `flightBudgetMs` decreases only while `Chopper*`; never increases mid-crisis; reset only when a new boat crisis starts (9920). A mine crisis has no budget, and Down is ignored in it.
16. Budget 0 ⇒ PlayerMode ∉ Chopper* and Down ignored until Crisis → None.
17. A cross jet's row is always 0; it never enters the lane or ground.
18. A bomb's direction never changes after the drop tick, whatever its jet does. In v1 its column never changes.
19. Bombs are dropped only by an on-screen jet, on a tick it enters a cell on rows 0–8, at most one per such tick; never while SkyPolicy is active; never after the jet is shot, crashed or exited; never when the jet's drops so far equal the current band's `bombsPerJetMax`.
20. A bomb is on rows 11–13 only if `Crisis == Boat`, the boat is unhooked, `PlayerMode ∈ {Tank, TankJump, TankInvuln}`, the bomb is in the boat's column, and it was dropped after the boat spawned.
21. A hooked boat is never sunk; no boat is sunk while `PlayerMode ∈ Chopper*`.
22. A sink counts exactly like a drown-timer expiry (`DROWNED` +1, `Crisis → None`), and never twice in one tick.
23. A boat spawns only in a column with no falling bomb on rows 1–10.
24. While `PlayerMode == TankInvuln`, no jet, bomb or mine changes lives or removes itself on contact with the tank; jets and bombs keep their paths.
25. `PlayerMode ∈ Chopper*` ⇒ `Crisis == Boat`. So SkyPolicy ⇔ `PlayerMode ∈ Chopper*`.
26. Each tick resolves in the §9 *Tick order*: input, timers, threat steps, respawn, hits, spawns. A timer paused at the end of step 1 does not tick that tick; at the start of every tick every live timer has remaining > 0, so a boat is never hooked or dropped with 0 ms left.
27. Timer expiries resolve before threat steps and hits: no mine hits or is jump-cleared on its expiry tick, and a boat whose drown timer expires is gone before any river bomb steps or sinks.
28. At most one shell exists. It starts on the fire tick in the tank's cell as it stands in step 1 after that tick's Left/Right move and Jump and before that tick's Down (row 9 on the lane, row 8 while airborne, including the takeoff tick; a shell fired on the tick the player enters the chopper starts from the tank's cell) and moves up exactly one row per 60 ms shell step, column fixed, until it hits or exits above row 0. Its steps happen only in tick step 3, in every PlayerMode.
29. A shell hits a jet on a tick if and only if after step 3 they share a cell or they swapped cells in step 3; any other meeting (a near miss) is a miss. Each hit removes exactly one jet (the earliest-spawned of those that qualify) and the shell, and adds exactly +100. A jet removed in step 3 is never hit that tick.
30. Within step 5, shell–jet hits resolve before any jet or bomb vs tank hit: a jet a shell kills on a tick never changes lives on that tick. A shell never removes a bomb, so it never prevents a bomb hit.
31. Every tick is exactly 60 ms of game time, whatever the frame rate. No entity takes more than one step per tick, and every step interval is ≥ 60 ms. Over any run, an entity with a constant interval `I` that is never held takes `floor(60·k / I)` steps in its first `k` ticks after appearing.
32. Jump is accepted only when no jump cooldown is running. A landing on tick `T` starts a 240 ms cooldown that first ticks on `T+1` and expires in step 2 of `T+4`, so Jump is ignored on ticks `T+1` to `T+4` and accepted from `T+5`. The cooldown never gates any other input.
33. At most one life is lost per tick. On a tick with a tank hit, exactly one threat is consumed by it (removed; for a mine, also `Crisis → None`); every other threat reaching the tank that tick is unchanged by the contact. The consumed threat is the mine if one hits, else a bomb, else a jet; ties go to the one that spawned first.
34. A step accumulator is always an integer in [0, current interval − 1] at the end of every tick and right after every interval change; an interval change never causes a step by itself. A held-back threat or blocked spawner sits at most at interval − 1, takes exactly one step or spawn on its first allowed tick, and then has remainder 0 if it was capped, so it never takes two steps in a row from built-up time.
35. Game time advances only in whole 60 ms ticks, at most 5 per animation frame and none while the tab is hidden. Every button press is applied in step 1 of exactly one tick: the first tick run at or after the frame it happened in. All presses of one button applied on the same tick merge into one new press, so each button gives at most one new press per tick. After a hidden tab no tick runs until a key press, which is consumed (never game input), and the first tick then starts with `frameAcc` = 0.
36. `PlayerMode == TankJump` ⇔ the tank is on row 8 (from takeoff in step 1 to landing in step 2); every other Tank mode is on row 9, except the wreck of a tank hit while airborne, which stays on row 8 in TankInvuln until the respawn at `T_r` (§4 Tank). A mine never hits a tank on row 8. A jet or bomb hits a vulnerable airborne tank by the same cell or a takeoff swap.
37. Every +200 comes from exactly one jump clear, which removes its mine in the same step 5; so each mine pays +200 at most once, and never on its expiry tick. Tank hits resolve before the jump clear: on a tick with a tank hit there is no jump clear.
38. Each Up press does exactly one action, chosen by `PlayerMode` at the start of step 1 (Chopper*: leave or unhook; Tank modes: Jump). An Up press that leaves the chopper never also starts a Jump, and a held Up never repeats a Jump. In Chopper* modes Left/Right applies before Down, and Down before Up; a hook is checked at the column after the move; an Up on a tick whose move made a rescue does nothing. In every mode an Up on a tick where Down took effect (a hook, or entering the chopper) does nothing. Each Down press likewise does one action, by the mode at the start of step 1: the Down that enters the chopper never also hooks, and a held Down never re-triggers.
39. In Tank modes the tank moves at most one column per tick, only in step 1, and only on a new-press tick (every new press moves, however soon after the last move) or on a held-repeat tick `P + k·2` (`k` ≥ 1) of the current newest press `P`. It never moves while Left and Right are both held from presses on the same tick. If both were pressed in one frame but only one is held at the tick, that one moves and the released tap is ignored. If both were pressed and released in one frame, nothing moves and no chopper remembered move is set. The release of one of two held keys counts as a new press of the other on that tick, and all new presses on one tick resolve to at most one move. A key held through the impact lock or a Tank ↔ Chopper* change counts as a new press on the first tick movement is allowed; the tank never moves on its respawn tick `T_r`. The chopper moves at most one column per tick, in step 1, and never sooner than its current rate (4 ticks free, 8 hooked) after its previous move. The first move after entering the chopper is the exception: it is allowed at once.
40. A shell is created only in step 1 of a tick with a new Fire press, when no shell is active and the player is in a Tank mode outside the impact lock. A held Fire never creates a shell, and a discarded press is never applied later.

### Tuning goals (playtest / Phase 5 — not Phase 3 pass/fail gates)

- Typical skilled rescue ≈ 4.5–7 s wall-clock at 18 columns (segments: drop 1.2–2 / ferry ~2.4, up to 3.8 / return 0.5–1 / first shell 0.5).
- Early bands feel generous; band E feels tight but fair.
- “Lowest jet still shootable after a clean return” — tuning, not hard CI.

### Exact timer defaults (v1 contract; Phase 5 may tune)

| Tunable | Default |
|---------|---------|
| `invulnMs` | 960 (16S literal, from the impact tick) |
| `impactLockMs` | 420 (`7S`; inputs ignored from the impact tick `I`; the lock expires in step 2 of `I + 7` = `T_r`, the respawn tick; §4 Tank *Impact pacing*, §7) |
| `respawnFloorMs` | Per band: A 900, B 840, C 780, D 720, E 660 (§8 Respawn safety rule). Dormant at default tuning (3 threat steps always longer); kept as a safety net |
| `drownTimerMs` | Per band, fixed at boat spawn: A/B 9,360 (A: tutorial boat only), C 8,596, D 7,954, E 7,414 |
| `mineLifetimeMs` | 4200 (`5H·S`, H = 14) |
| `jumpAirtimeMs` | 480 (`8S`; 8 timer ticks, so 7 airborne ticks on row 8 (420 ms) and landing on the 8th, §4 Tank) |
| `tankMoveMs` | 120 (`2S`; **hold-repeat rate only**: a held Left/Right moves one column per 120 ms on the lane and while airborne; every new press moves at once, so tapping can be faster, §7) |
| `jumpCooldownMs` | 240 (`4S`; Jump ignored for 4 ticks after landing, §4 Tank) |
| `boatUnlockScore` | 2000 (score points; sticky, inclusive; = start of band B; lower for demos) |
| `mineUnlockScore` | 10000 (score points; sticky, inclusive; lower for demos) |
| `mineMinGapCols` | 5 (`⌈W/4⌉`, W = 18; minimum column distance between a new mine and the tank, §4 Mines) |
| `crisisIntervalMs` | Per band (`200S/p`): B 12,000, C 8,485, D 6,000, E 4,243 (§6 Crisis scheduler; per band) |
| `bombDropChance` | Per band from §6, rolled **per drop opportunity** (each cell entered on rows 0–8), not per jet. Subject to `bombsPerJetMax`. |
| `bombsPerJetMax` | Per band: A none, B 2, C 3, D 4, E 5 (§4 Bombs, per-jet cap; checked against the active band, §6) |
| `msgHoldMs` | 960 (`16S`; a transient is drawn on its event tick E and on E + 1 to E + 15, and is gone on E + 16; §3 *Side message panel* rule 1) |

### Panel layout defaults (Debu, Nov 2, 2026, W-A; §3 *Screen and panel layout*)

| Tunable | Default |
|---------|---------|
| `glyphPx` | 5 × 7 (one character's glyph) |
| `glyphCellPx` | 6 × 8 (glyph plus 1 px spacing to the right and below; fixed width) |
| `canvasPx` | 416 × 248 (playfield 288 × 224 + side panel 128 wide + top panel 24 tall) |
| `topPanelHeightPx` | 24 (2 text rows of 8 + 4 px margins above and below) |
| `sidePanelWidthPx` | 128 (8 tiles; 120 px = 20 cells of text) |
| `panelMarginPx` | 4 (left and right margins of both panels; top and bottom margins of the top panel) |
| `sidePanelLinePitchPx` | 16 (4 lines, one per grid row 0–3) |
| `scoreMax` | 999,999 (6 digits; a gain past it leaves the score at 999,999) |

---

## 10. Locked defaults

| Topic | Decision |
|-------|----------|
| Down / soft ceiling | **Gated on a boat crisis** (ignored with no crisis or a mine crisis); SkyPolicy for boat rescue |
| Unlocks | **Sticky** ≥ `boatUnlockScore` boats, ≥ `mineUnlockScore` mines (both inclusive; defaults in §9 tunables) |
| Grid / row | **18×14** (sky 0–8, lane 9, ground 10, river 11–13); row = 1 cell |
| Numeric bands | §6 table; active band live from score, frozen from Down until back in a Tank mode |
| Late rescue pace | **0.631 × band combat pace** (band E; `(3/8)√p`) |
| PlayerMode × Crisis | §8 chart |
| Return stampede | **X-stagger** resume |
| Chopper lethality | **None**: the chopper is boat-rescue only, always under SkyPolicy, and never hit |
| Chopper flight timer | Per boat crisis: **9,920 ms** (no mine budget); counts only in chopper; no refill until crisis ends; expiry forces Tank (hooked boat dropped) |
| Rescue success / drown while flying | **Bank → Tank**; a drowning while flying also → Tank at current X, same tick (no post-crisis chopper linger) |
| Shell on Down | Continues; can hit jets |
| Ground crash | No score change |
| Boat XOR mine | Hard; max one each |
| Mine answer | **Jump only** (no chopper mine flyover); jump clear by column overlap, §4 |
| Jump | With mines (Phase 4); mid-lane hop on the Up arrow (§7) |
| Jet paths | **Dive or cross**, every band; `jetCrossChance` 0.5; cross step = jet step × 10 / W (D = 10) |
| Bomb drops | **Several per jet**; one roll of `bombDropChance` per cell entered on rows 0–8; the run's first jet also has one guaranteed drop at a random cell; at most `bombsPerJetMax` per jet (A none, B 2, C 3, D 4, E 5; current band); on screen only; none under SkyPolicy; undropped bombs lost if the jet is shot |
| Bombs | Straight line from the drop point, independent of the jet; never drift. v1: straight down. |
| Bomb sinks boat | Direct hit on the boat's cell, only in Tank modes; counts as a drowning; `BOAT SUNK`; boats spawn in a bomb-free column; the first rescue start in each crisis clears everything below the ceiling; later Downs don't |
| Time alive difficulty | **None** |
| Band mid-rescue | Frozen at Down, recomputed on return to a Tank mode (§6 Active band) |
| Up while hooked | Allowed (unhook/drop). Dropped boat that then times out → **+1 drowned** (same counter; 3 = game over) |
| Crisis spawn interval | One crisis timer; type by unlock score only (§6 Crisis scheduler). `crisisIntervalMs` B 12,000, C 8,485, D 6,000, E 4,243 ms (`200S/p`); interval per band |
| Mine-aware respawn | A live mine's column is unsafe for the whole respawn check, and it ranks last when no column is safe (§8 items 2 and 5) |

---

## 11. Phased ship order

### Phase 1 — Core combat (first playable)

**In scope:** 18×14 grid (or equivalent lane physics), tank left/right, one shell, jets (dive and cross paths, band A numbers), +100 kill, ground remove no score change, 3 lives, jet–tank life loss, `invulnMs = 960`, **top status panel** (§3: score and lives) and **side message panel** (§3: `+100` popups), game over on 0 lives, restart.

**Explicitly OUT of Phase 1 code**

- Soft ceiling / rescue pace / SkyPolicy
- Chopper, boats, drowning timer, river gameplay
- Mines, jump
- Bombs (all path types)
- Crisis director / XOR
- Sticky unlock flags (not needed yet)
- Angled anything; dual bomb paths
- High-score persistence (optional defer to Phase 5)

**Acceptance**

- [ ] Hard invariants 17 (cross jets stay on row 0) and 24 (invulnerable tank) hold under tests.
- [ ] Move, fire one shell, destroy jets for +100.
- [ ] A shell fired from the lane is in the tank's cell on the fire tick, enters row 8 one 60 ms step later and row 0 at 540 ms, then exits with no score.
- [ ] A shell and a dive jet that swap cells on one tick (jet one row above, both step) count as a hit: +100, both removed.
- [ ] Fixed tick: game time advances exactly 60 ms per tick at any frame rate; a frame that takes 180 ms runs 3 ticks back to back. A band-C dive jet (509 ms) steps after gaps of 480 or 540 ms, takes exactly `floor(60k/509)` steps in its first k ticks and never steps twice in one tick.
- [ ] Same-frame presses: three Fire presses in one frame fire at most one shell; press, release, press of Left in one frame moves one column and then repeats while held; press and release moves one column with no repeat; Left and Right pressed in one frame and both held is the tie (no move).
- [ ] Catch-up: a 500 ms frame runs 5 ticks and drops the rest (`frameAcc` becomes 500 − 300 = 200, then 200 mod 60 = 20); hiding the tab for 10 s and coming back advances game time by 0 and shows `PRESS ANY KEY` until a key press, which does not fire, move or jump, and play resumes from the next frame with no backlog; a Fire pressed and released inside one frame fires once on that frame's first tick, and a press in a frame that runs 0 ticks fires on the next tick.
- [ ] Held through the lock: holding Left from before a hit to after respawn leaves the tank on its respawn column on `T_r` and moves it left at once on `T_r + 1`, then every 2 ticks. Held across Down: the chopper's first move is on the tick after entering. Held across Up out of the chopper: the tank moves at once on the next tick. A held Up never jumps again.
- [ ] Release with the other key held: holding Left then also Right (moves right), then releasing Right moves left at once on the release tick and repeats every 2 ticks from there; releasing one key of a same-tick tie moves the other way at once; alternating releases and presses never move more than one column per tick.
- [ ] Two opposite taps: Left and Right both pressed and released within one frame give no move (tank or chopper), and set no remembered chopper move.
- [ ] Same-frame Left + Right, one released: Left tapped and Right pressed and held within one frame moves right once at once, then repeats; Left causes no move and no tie.
- [ ] Both directions: Left and Right pressed on the same tick give no move while both are held (tank and chopper); a fresh press of one of them moves at once.
- [ ] Fast tapping: tapping Left on consecutive ticks moves the tank one column every tick (60 ms), faster than holding (120 ms).
- [ ] Left/Right press and hold: a press moves on its tick; holding moves again every 2 ticks (120 ms); release stops; pressing the opposite way while holding moves at once the new way; holding into a wall stays put; a press carried by catch-up moves on the frame's first tick.
- [ ] Fire is press-only: holding Fire fires once; a press while a shell is in flight does nothing, even after that shell is gone; holding Fire through a hit and respawn fires nothing until a new press.
- [ ] Left/Right and Fire on one tick: the shell starts in the column after the move; pushing into a wall and firing starts it in the current column.
- [ ] A shell meeting two jets on one tick (same cell or swap) kills only the one that spawned first; the other flies on.
- [ ] A dive jet that steps onto ground row 10 on a tick is removed in step 3 and is never shot on that tick (score unchanged).
- [ ] Near miss: a cross jet stepping out of the row-0 cell the shell enters that tick, or into the cell a shell just left (including a shell exiting up from row 0), is not hit; the shell flies on or exits, score unchanged.
- [ ] Point-blank: firing on the tick a dive jet enters a vulnerable tank's cell, or a shell that swaps with a jet landing on the tank, kills the jet (+100) with no life lost; a bomb or a second jet reaching the tank that tick still costs a life.
- [ ] Ground-reach jets removed; score unchanged.
- [ ] Jets take both paths: dive jets fall in their column; cross jets fly row 0 wall to wall and are removed on exit with no score change.
- [ ] Three deaths end the run; score visible.
- [ ] Top panel shows score and lives outside the grid; side panel shows `+100` for 960 ms; nothing in either panel affects play.

### Phase 2 — Bombs (straight)

- Straight bombs only, dropped by dive and cross jets; bomb step ms from table; tank hit −1 life.
- A bomb keeps falling after its jet is shot, crashes, or exits the screen.
- No drifting diagonal bombs (§4 Bombs).

**Acceptance**

- [ ] Straight bombs threaten; ground clear works.
- [ ] A bomb dropped by a cross jet still reaches the lane after the jet has exited.
- [ ] No bomb ever changes column during its fall.
- [ ] A jet can drop more than one bomb; each drop happens on a cell it enters on rows 0–8 while on screen; at most one per cell.
- [ ] No drops after a jet is shot, crashed or exited; bombs already dropped keep falling.
- [ ] In bands B–E no jet drops more than the current band's `bombsPerJetMax`; band A jets are uncapped.
- [ ] The run's first jet drops its guaranteed bomb on its chosen cell unless it was shot, crashed or exited first; no later jet gets a guarantee.
- [ ] Survive by strafing (no river/mines).
- [ ] Hard invariants 18–19 hold under tests (19's SkyPolicy clause is checked again in Phase 3).

### Phase 3 — River & chopper

- Sticky boats unlock ≥ `boatUnlockScore`; Crisis Boat; Down gated; SkyPolicy (ceiling 3 cells while mines are locked); rescue pace fractions; manual hook (Down over the boat's column); +500; bank → Tank; drown×3 game over; stampede rule; hard invariants; bomb sink (§4 Boats), bomb-free spawn column, rescue-start clear (§9 SkyPolicy item 0), `BOAT SUNK` message.
- ~4.5–7 s typical rescue feel = **tuning goal**, not CI gate.
- Top panel: `DROWNED n/3` and the `TUTORIAL` aids field. Side panel: `+500 RESCUE` and drown messages; two pinned lines (crisis label + tutorial step prompt, used by level 1).

**Acceptance**

- [ ] No boats before sticky unlock; max one boat.
- [ ] Down with Crisis None does nothing.
- [ ] Hard invariants 1–16 and 19–40 hold under tests (mine stubs OK for XOR / max-one).
- [ ] Rescue awards 500; forces Tank; three drown timeouts end run.
- [ ] A boat that drowns while the player is in ChopperFree (never hooked, or dropped by Up) returns the player to Tank at the current column, lane row 9, on the same tick; `DROWNED` +1; SkyPolicy lifts with the stampede; the player is never in the chopper with Crisis None or Mine.
- [ ] Up from hooked unhooks (Recommended); stampede stagger applies on SkyPolicy lift.
- [ ] Boat flight budget 9,920 ms: expiry while hooked drops the boat and forces Tank; Up/Down doesn't refill it.
- [ ] A bomb sinks a boat only by entering its cell while the player is in a Tank mode; never while hooked or during a rescue; the sink adds 1 to `DROWNED`, ends the crisis and shows `BOAT SUNK`.
- [ ] Boats never spawn in a column with a falling bomb; a blocked spawn retries each tick; a bomb dropped before the boat spawned never sinks it.
- [ ] On the first Down of a boat crisis, every jet and bomb below the ceiling is removed with no score.
- [ ] On a later Down in the same crisis, threats below the ceiling are not removed: they fall at rescue pace, vanish at row 10 and never hurt the chopper; any river bomb is removed.
- [ ] Spamming Down/Up during one boat crisis removes nothing after the first Down.
- [ ] Tick order: a hook pressed on the drown timer's expiry tick saves the boat, which is paused with its remaining time from before that tick (> 0); a later Up resumes from that value. A budget-out drop on any tick leaves the drown timer unticked on that tick.
- [ ] Held-back counters: a jet held at the ceiling for 5 s, after a rescue ending in step 1, steps once in step 3 of its stagger slot tick and then again one full combat step later (remainder 0); the spawner blocked through a rescue spawns exactly one jet on the tick the rescue ends; a ceiling that moves down on a score in step 5 lets held threats step on the next tick.
- [ ] Speed change: a band-B dive jet with accumulator 500 (of 720) when rescue pace starts has 1,333 (of 1,920); if rescue pace lifts on the same tick it returns to 499; no step is taken because of a change.
- [ ] Down with budget > 0 on a tick where the budget then runs out gives a one-tick flight: ChopperFree in step 1, forced back to Tank in step 2, same tick; Down with budget 0 is ignored.
- [ ] A bomb passes through an invulnerable tank.
- [ ] Simultaneous hits: two threats reaching a vulnerable tank on one tick cost exactly one life. Mine + bomb: the mine is removed, `Crisis → None`, the bomb falls on to row 10. Bomb + jet: the bomb is removed, the jet falls on to row 10. Two bombs in the boat's column during a boat crisis: one is removed, the other falls into the river and can sink the boat.
- [ ] A dive jet passes through an invulnerable tank, crashes on row 10 with no score, and can still be shot on the way.
- [ ] Firing while a dive jet shares the invulnerable tank's cell (or enters it that tick) kills it in that tick's step 5: +100, no life change.
- [ ] A shell fired before Down keeps stepping during the chopper, can kill a jet above the ceiling for +100, and the band stays frozen.
- [ ] The `FUEL` meter shows 8 lit segments when a boat crisis starts, drains only while flying (1,240 ms per segment), keeps its last segment lit until the budget runs out (≤ 0, §9 *Tick length*), shows all empty after a forced return, and is blank with no crisis or during a mine crisis.
- [ ] A mine's timer bar starts at 16 px on its first sprout frame, shrinks over 4,200 ms, and vanishes the tick the mine ends, before the shrink-back.
- [ ] A drowning boat's timer bar starts at 16 px, shrinks with its drown timer, never shows 0 px while afloat, hides while hooked and reappears at the same length on a drop.

### Phase 4 — Mines

- Sticky mines ≥ `mineUnlockScore`; jump; XOR; ceiling 2 cells for boat SkyPolicy once `minesUnlocked` (score ≥ `mineUnlockScore`; mid band C at the default); jump is the only answer to a mine (no chopper flyover); clear predicates §4.

**Acceptance**

- [ ] XOR holds; mine cleared if boat crisis starts.
- [ ] No forced rescue+mine overlap.
- [ ] Jump clears a mine via column overlap: +200 once, mine removed, `Crisis → None`; staying over the column or a second jump scores nothing more; a jump over the mine on its expiry tick scores nothing.
- [ ] Down does nothing while `Crisis == Mine`: no chopper, no SkyPolicy, `FUEL` blank.
- [ ] Fire while the jumping tank is on row 8 starts the shell on row 8 in the tank's column; it reaches row 0 at 480 ms (8 steps), not 540.
- [ ] Chopper cap: tapping in ChopperFree moves at most once per 4 ticks (hooked: 8); a tap too soon moves on the first allowed tick, and a later opposite tap replaces it; the first move after entering the chopper is immediate; after a hook the next move waits 8 ticks from the last move.
- [ ] Chopper move before Down: ChopperFree one column from the boat with Left/Right toward it and Down on one tick hooks; moving off the boat's column with Down does not hook.
- [ ] Chopper move before Up: hooked chopper one column from a bank with Left/Right toward it and Up on one tick rescues (+500, Tank, crisis over) with no unhook and no Jump; hooked Up + move elsewhere drops the boat on row 12 at the new column; ChopperFree Up + move returns to Tank at the new column.
- [ ] Fire + Down on one tick in a boat crisis: a shell starts in the tank's cell (after any move), then the player is in ChopperFree on row 11; the first-Down rescue-start clear leaves the shell, which keeps flying and can score.
- [ ] Entry Down: Down in Tank with the tank in the boat's column enters ChopperFree over the boat but does not hook; holding Down does not hook; a new Down press on a later tick hooks.
- [ ] Down + Up on one tick: in ChopperFree over the boat, Down hooks and Up is ignored (still hooked); in ChopperFree off the boat, Up returns to Tank; while hooked, Down does nothing and Up unhooks; in Tank during a boat crisis, Down enters the chopper and Up is ignored (no Jump).
- [ ] Up = Jump: Up in Tank jumps (when allowed); Up in ChopperFree returns to Tank and does not jump on that tick or while held afterwards; a new Up press is needed to jump; Up in ChopperHooked unhooks, including on a tick the chopper reaches a bank.
- [ ] Jump cooldown: after landing on tick T, Jump on T+1 to T+4 is ignored and on T+5 starts a jump; Down, Fire and moves work during the cooldown.
- [ ] Airborne ticks: a Jump on tick J puts the tank on row 8 for the step-5 checks of J to J+6 (7 ticks, 420 ms) and lands it on row 9 in step 2 of J+7, where the jump cooldown starts.
- [ ] Jump + Fire on one tick (with Left/Right): the shell starts on row 8 in the new column and reaches row 0 at 480 ms; with Jump refused (cooldown, TankInvuln, already airborne) it starts in the tank's actual cell.
- [ ] Jump + Fire under a dive jet on row 8 that steps to row 9 on that tick: the shell misses (near miss, no +100) and the tank is hit by the takeoff swap (−1 life, jet removed).
- [ ] Hit vs clear: a bomb hitting the airborne tank on the tick it first enters a live mine's column costs one life, and the mine stays live (no +200, `Crisis == Mine`); the respawn avoids the mine's column; the mine later expires normally. If the shell kills the jet point-blank on that tick instead, the clear happens (+200).
- [ ] Hit mid-jump: a bomb hitting the airborne tank costs one life and ends the jump. No landing, no cooldown; the wreck stays on row 8 through the lock and is passed through by everything; a mine under it is neither hit nor cleared (no +200); the tank respawns on row 9 at `T_r`; Jump is ignored until invulnerability ends.
- [ ] Jump rows: the tank is on row 8 from the takeoff tick through the last airborne tick and on row 9 from the landing tick; a dive jet or bomb stepping from row 8 to row 9 on the takeoff tick (swap) or into the airborne cell hits it (−1 life); moving into the mine's column on the landing tick is a mine hit; a mine never hits while airborne.
- [ ] A Jump pressed on a mine's expiry tick still starts, but the mine expires (step 2) before any jump clear or hit (step 5): no clear, no life loss.

### Phase 5 — Polish

- Tune table; juice; local high score; side-panel polish (mode/crisis text, final message wording, styling).
- Setting art is **not** deferred here: static scenery and castles ship in Phase 1, river ripples and the drawbridge in Phase 3, and cactus mines in Phase 4 (§3 Setting art).

---

## 12. Out of scope for v1

- Multiplayer, accounts, online boards.
- Power-ups, multi-shot, extra lives.
- Scrolling / bosses / fuel / ammo.
- Full sky freeze; 1-cell soft ceiling.
- Separate mines stage; concurrent boat+mine.
- Time-alive difficulty modifier.
- Idle chopper / SkyPolicy without boat crisis.
- Post-crisis chopper linger (rescue and drowning both return to Tank).

---

## 13. Playtest revisit points

Open items only; the current rules are in §10.

| Item | v1 rule (§10) | May revisit |
|------|---------------|-------------|
| Up while hooked | Allowed (unhook/drop) | Forbid Up while hooked only if playtest hates the drop option |
| Crisis spawn interval | `crisisIntervalMs` per band | Phase 5 tune |
