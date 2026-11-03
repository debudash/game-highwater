# River Guard — Changelog

History for `river-guard-rulebook.md` (current rules). Every dated revision note and the document-status note from `tank-jets-design.md`, verbatim, in the order they were written (all dated Nov 2, 2026), followed by Debu's decisions log copied verbatim from `river-guard-timing-v6-proposal.md`. Section numbers (§) are the same in the rulebook and in `tank-jets-design.md`. Notes describe the rules as they stood when written; later entries may supersede earlier ones, and the rulebook is the current word.

*Editing rule: from Nov 2, 2026, every rule change is made in `river-guard-rulebook.md` and gets an entry here; the decisions log in `river-guard-timing-v6-proposal.md` stays the master decisions list. `tank-jets-design.md` is frozen.*

---

## Revision notes

1. **Rulebook:** §4 Entities & rules, §5 Scoring, §7 Controls, §8 State machine, §9 Timing / tick order / invariants / tunables, §10 Locked defaults, §11 Phased ship order  
   *Revision (Nov 2, 2026): issue 1 (chopper safety) resolved with the chopper flight timer and chopper combat rule (§4 Chopper, §5, §7, §8, §9, §10, §11). Issues 2–4 from the review still open.*

2. **Rulebook:** §13 Deferred product calls  
   *Document status: **FINAL** (design-review iter 3). Recommended values are the v1 contract unless Debu overrides. Remaining Debu calls are deferred (§13), not blockers.*

3. **Rulebook:** §2 Core loop, §4 Entities & rules, §6 Difficulty curve, §9 Timing / tick order / invariants / tunables, §10 Locked defaults, §11 Phased ship order  
   *Revision (Nov 2, 2026): unlock thresholds are now named tunables `boatUnlockScore` (default 5,000) and `mineUnlockScore` (default 10,000) in §9; §2, §4, §6 rules, §10 and §11 refer to them by name. Band table score ranges unchanged. Open: band-tied rules (B/C boat ceiling, D/E mine rules, jump) assumed the old 2,000 / 30,000 unlocks and need review.*

4. **Rulebook:** §3 Playfield layout, §11 Phased ship order  
   *Revision (Nov 2, 2026): added the side message panel (§3), a new UI element outside the 18×16 / 12×16 playfield for all interaction messages. Phase plan: panel and score popups in Phase 1, crisis and rescue messages plus pinned lines in Phase 3, wording and styling in Phase 5 (§11). Level 1 tutorial boat label and lighter ink are in `river-guard-level1.md`.*

5. **Rulebook:** §3 Playfield layout, §4 Entities & rules, §9 Timing / tick order / invariants / tunables, §10 Locked defaults, §11 Phased ship order  
   *Revision (Nov 2, 2026): jets now take a dive or cross path in every band (§3, §4 Jets, §10, §11). Bomb path rule added: a bomb travels a straight line from its drop point to the lane, independent of its jet (§4 Bombs, §9 invariants 17–18). Drop timing defined. Phase 2.1 drifting angled bombs flagged for Debu; recommendation is to drop them.*

6. **Rulebook:** §3 Playfield layout, §4 Entities & rules, §9 Timing / tick order / invariants / tunables, §10 Locked defaults, §11 Phased ship order  
   *Revision (Nov 2, 2026): Debu removed Phase 2.1 drifting diagonal bombs. Bombs fall in a fixed straight line from the drop point and never drift; v1 bombs fall straight down (§3, §4 Bombs, §9 invariant 18, §10, §11 Phase 2).*

7. **Rulebook:** §4 Entities & rules, §10 Locked defaults  
   *Revision (Nov 2, 2026): Debu replaced the proposed bomb drop window with free drops: a jet drops whenever it wants during its flight, the bomb falls straight down to the ground row and vanishes, a tank hit destroys the tank, and a jet shot before dropping has no bomb (§4 Bombs). No drop-window invariant, tunables, §10 row or Phase 2 check.*

8. **Rulebook:** §4 Entities & rules, §6 Difficulty curve, §9 Timing / tick order / invariants / tunables, §10 Locked defaults, §11 Phased ship order  
   *Revision (Nov 2, 2026): jets may drop several bombs, rolled per drop opportunity (each cell entered on rows 0–7) and only while on screen (§4 Jets and Bombs, §6 column header, §9 invariant 19 and `bombDropChance`, §10, §11 Phase 2). "One bomb per jet" removed. Balance flag: per-cell rolls multiply bomb counts; see §4.*

9. **Rulebook:** §4 Entities & rules  
   *Revision (Nov 2, 2026): §4 Bombs states that drop columns are random per drop (independent roll per drop opportunity). Level 1 now uses a guaranteed drop at a random column plus per-cell rolls; see `river-guard-level1.md`.*

10. **Rulebook:** §3 Playfield layout, §4 Entities & rules, §6 Difficulty curve, §9 Timing / tick order / invariants / tunables, §11 Phased ship order  
   *Revision (Nov 2, 2026): the soft ceiling height (3 → 2 cells) and jump are now tied to `minesUnlocked` (score ≥ `mineUnlockScore`, default 10,000) instead of bands D/E. Updated: §3 soft ceiling, §4 Jump, §6 band table ceiling column, §9 SkyPolicy item 1 and invariant 6, §11 Phase 3 and Phase 4. Jump was already gated on `minesUnlocked` in the transition table; now stated explicitly. At the default the ceiling change falls mid band C (10,000), not at a band boundary. Still open from the earlier note: B/C boat-tied rules vs `boatUnlockScore`.*

11. **Rulebook:** §4 Entities & rules, §6 Difficulty curve, §10 Locked defaults, §11 Phased ship order  
   *Revision (Nov 2, 2026): added the guaranteed first drop as a normal band A rule (§4 Bombs, §6 band A row, §10 Bomb drops, §11 Phase 2 check). The first jet of a run drops one bomb at a random cell, no roll; it is lost if the jet goes first. Level 1's guaranteed bomb is this rule, not a scripted exception.*

12. **Rulebook:** §6 Difficulty curve, §9 Timing / tick order / invariants / tunables *(sections inferred; note names none)*  
   *Revision (Nov 2, 2026): `boatUnlockScore` default changed from 5,000 to **2,000** (Debu), so normal boats start at band B. Band B's soft ceiling, rescue pace and boat spawn interval now apply again; the earlier open note about B/C boat rules is resolved.*

13. **Rulebook:** §2 Core loop, §4 Entities & rules, §7 Controls, §9 Timing / tick order / invariants / tunables, §11 Phased ship order  
   *Revision (Nov 2, 2026): auto-hook replaced with a **manual hook** (Debu): hover in the boat's column and press Down (§2, §4 Chopper, §7 controls and transitions, §9 invariant 5, §11 Phase 3).*

14. **Rulebook:** §3 Playfield layout, §11 Phased ship order  
   *Revision (Nov 2, 2026): added the **top status panel** (§3) for `SCORE`, `LIVES`, `DROWNED` and active `TUTORIAL` aids, and defined a tutorial aid. The side panel's status block moved there. The side panel now allows two pinned lines (crisis label + tutorial step prompt). §11 Phase 1 and Phase 3 updated.*

15. **Rulebook:** §4 Entities & rules, §8 State machine  
   *Revision (Nov 2, 2026): added the §8 **Respawn safety rule** (Debu): respawn at lane centre or the nearest column no existing bomb or dive jet can reach within max(3 of its steps, the band floor `respawnFloorMs`, 900 in A down to 660 in E). Replaces keep-X respawn (§4 Tank, §8 transitions, invariant 13). `invulnMs` is now 960 everywhere.*

16. **Rulebook:** §3 Playfield layout  
   *Revision (Nov 2, 2026): added §3 **Setting art** (Debu): a sky that reads as sky, a rippling river, a ground edge, castle towers with drawbridges on both banks from the start, and mines drawn as growing spiky cacti. New scenery ink; scenery is cosmetic only and never moves in the sky.*

17. **Rulebook:** §3 Playfield layout  
   *Revision (Nov 2, 2026): tutorial ink dropped; the tutorial boat is outline-only in full ink (Debu). §3 Setting art inks updated.*

18. **Rulebook:** §4 Entities & rules, §9 Timing / tick order / invariants / tunables, §10 Locked defaults, §11 Phased ship order  
   *Revision (Nov 2, 2026): Debu added a per-jet bomb cap, `bombsPerJetMax`: A none, B 2, C 3, D 4, E 5, checked against the current band on each drop opportunity, guaranteed drop included (§4 Bombs, §9 invariant 19 and tunables, §10 Bomb drops, §11 Phase 2 check). Replaces the §4 balance flag. Band A and level 1 unchanged.*

19. **Rulebook:** §8 State machine, §13 Deferred product calls  
   *Revision (Nov 2, 2026): Debu closed design-review issues 2–4. Their contents weren't recorded anywhere; all open findings in the saved critique and grill reviews are already resolved. The one dangling reference (§8 respawn, mines) is now the §13 open item *Mine-aware respawn*.*

20. **Rulebook:** §4 Entities & rules, §6 Difficulty curve, §9 Timing / tick order / invariants / tunables, §10 Locked defaults, §11 Phased ship order  
   *Revision (Nov 2, 2026): Debu approved the timing v5 numbers for four stale values: grid 18×16 (§6, §10, §11 Phase 1), boat flight budget 9,920 ms and mine flyover budget 2,160 ms (§4, §9 table, invariant 15, §10, §11 checks), and a per-band drown timer A/B 9,360 (A covers the level-1 tutorial boat), C 8,596, D 7,954, E 7,414, fixed at boat spawn (§4 Boats, §9 tunables). Older revision notes keep their original numbers.*

21. **Rulebook:** §3 Playfield layout, §4 Entities & rules, §6 Difficulty curve, §8 State machine, §9 Timing / tick order / invariants / tunables, §10 Locked defaults, §11 Phased ship order, §13 Deferred product calls  
   *Revision (Nov 2, 2026): Debu approved **all of timing v5** (`river-guard-timing-proposal.md`) and it is now the design doc's timing. Changed: §3 grid line 12 × 16 → 18 × 16; §4 Jets cross-step example (dropped the 12-column 525 case); §4 Mines and §9 tunables `mineLifetimeMs` 5000 → 4800; §6 table jet spawn 1800/1600/1200/900/700 → 1200/1200/849/600/424, jet step 700/700/500/350/250 → 720/720/509/360/255, bomb step 650/650/480/320/220 → 660/660/467/330/233, rescue pace 0.35/0.45/0.55/0.60 → `(3/8)√p` 0.375/0.446/0.530/0.631, band A given 0.375 and ceiling 3 for the tutorial boat only; v5 formula note added; rescue step table ≈2000/1857, 1111/1067, 636/582, 417/367 → 1920/1760, 1142/1047, 679/622, 404/370, plus a band A row; §6 boat spawn intervals ~12/8/6/5 s → 12,000/8,485/6,000/4,243 ms; §8 respawn floor explanation corrected (the 3 steps set the window in every band at v5); §9 SkyPolicy item 2 and invariant 7 (0.60 floor → 0.631); §9 tuning goal and §11 Phase 3 rescue target ~5 s → ~4.5–7 s; §10 late rescue pace 0.60 → 0.631; §13 boat spawn row updated, with v5's crisis-type rule (boats only B–D, E alternates Mine/Boat) logged as open. Kept, not from v5: bomb drop chance per drop opportunity with `bombsPerJetMax`, and the mine-tied soft ceiling. Older revision notes keep their original numbers.*

22. **Rulebook:** §6 Difficulty curve, §8 State machine, §9 Timing / tick order / invariants / tunables, §13 Deferred product calls  
   *Revision (Nov 2, 2026): Debu set crisis scheduling: one crisis timer for boats and mines, crisis type chosen by unlock score only, never band or level; boats only until mines unlock, then alternate starting with a mine (§6 Crisis scheduler, §8 transitions, §9 `crisisIntervalMs`, §13). Replaces v5's "boats only B–D, E alternates". `crisisIntervalMs` stays per band (Debu).*

23. **Rulebook:** §4 Entities & rules, §6 Difficulty curve, §9 Timing / tick order / invariants / tunables, §10 Locked defaults, §13 Deferred product calls  
   *Revision (Nov 2, 2026): Debu chose to freeze the band in the chopper. New §6 *Active band* rule: live from score in Tank modes, frozen from the Down tick until return to any Tank mode (boat rescue and mine flyover), then recomputed; all band-indexed values read it; unlocks and the soft ceiling are score-driven and not frozen. Updated §4 bomb cap wording, §9 `bombsPerJetMax`, §10 Numeric bands, §13 Band mid-rescue.*

24. **Rulebook:** §8 State machine, §9 Timing / tick order / invariants / tunables  
   *Revision (Nov 2, 2026): Debu chose to **keep `respawnFloorMs` as a dormant safety net**. At v5 it never binds, since 3 threat steps exceed the floor in every band (tightest is band E bomb, 699 vs 660). Added a note to §8 Respawn safety rule item 3 and the §9 tunables row. No values changed.*

25. **Rulebook:** §8 State machine, §13 Deferred product calls  
   *Revision (Nov 2, 2026): Debu settled §13 **Mine-aware respawn**. The §8 Respawn safety rule now treats a live mine's column as unsafe for the whole window (item 2), and in the no-safe-column fallback it ranks last because its threat arrives at `T_r` (item 5). This closes the gap where a respawn on a mine column during invulnerability, when Jump is forbidden, could cost a second life.*

26. **Rulebook:** §4 Entities & rules  
   *Revision (Nov 2, 2026): Debu set cross-step rounding to **round half up** (§4 Jets). The halves C 254.5, E 127.5 and rescue D 339.5 become 255, 128 and 340. Cross steps and rescue cross steps are now listed.*

27. **Rulebook:** §3 Playfield layout, §4 Entities & rules, §5 Scoring, §6 Difficulty curve, §8 State machine, §9 Timing / tick order / invariants / tunables, §10 Locked defaults, §11 Phased ship order  
   *Revision (Nov 2, 2026): Debu approved **timing v6** (`river-guard-timing-v6-proposal.md`, decisions log D1–D14) and it is now the design doc's timing. Grid 18 × 16 → **18 × 14** (river : sky = 1 : 3): sky rows 0–7 → 0–8, lane 8 → 9, ground 9 → 10, river 10–15 → 11–13 (chopper row 11, boats rows 12–13, hooked boat row 12, towers rows 11–12); soft ceiling rows 5/6 → 6/7 (still 3 / 2 cells). `S = 60` is now a literal; 960 ms values (`invulnMs`, `msgHoldMs`) written 16S. Jet spawn 1200/1200/849/600/424 → `40·D·S/(W·p)` 1333/1333/943/667/471; cross step `× 9 / W` → `× D / W` with D = 10: 360/360/255/180/128 → 400/400/283/200/142, rescue 960/571/340/202 → 1067/634/377/224; dive drop opportunities 8 → 9; band E uncapped bombs per dive jet 4.0 → 4.5. `mineLifetimeMs` 4800 → **4200** (`5H·S`, Debu D5 = B). Checked at 4200: worst walk to a mine across the board 2,040 + 480 notice = 2,520 (jump reach) and 480 notice + 2,160 flyover budget = 2,640 both fit, and the crisis timer runs only while `Crisis == None`, so the band-E interval (4,243) never overlaps a mine. Jet and bomb steps, rescue pace, drown timers, flight budgets, crisis intervals and floors unchanged. New: **bomb sinks boat** (§4 Boats: direct hit only, Tank modes only, bombs dropped after the boat spawned; counts exactly like a drowning; transient `BOAT SUNK`, no new counter), bomb-free boat spawn column with per-tick retry (§4 Boats, §6 Crisis scheduler, §8), rescue-start clear below the ceiling (§9 SkyPolicy item 0, invariant 1), bombs pass an invulnerable tank (§4 Tank), draw order (§3), bomb warning notes (§4 Bombs), invariants 20–23, §5, §10 and §11 Phase 3 checks. Older revision notes keep their original numbers.*

28. **Rulebook:** §4 Entities & rules, §9 Timing / tick order / invariants / tunables  
   *Revision (Nov 2, 2026): Debu chose the mine spawn column: uniformly random among columns at least `mineMinGapCols` = 5 (`⌈W/4⌉`) from the player's column (§4 Mines, §9 tunables). Previously unspecified in the design doc (the v6 proposal listed the 5-column gap).*

29. **Rulebook:** §6 Difficulty curve  
   *Revision (Nov 2, 2026): Debu settled the pending-boat vs. mine-unlock conflict (§6 Crisis scheduler item 2): a boat already picked and waiting for a bomb-free column stays a boat; the first crisis **picked** after the unlock is the mine.*

30. **Rulebook:** §4 Entities & rules  
   *Revision (Nov 2, 2026): Debu settled jets vs. the invulnerable tank: a dive jet passes through, like a bomb (§4 Tank, §4 Jets table, invariant 24, Phase checks). One rule: nothing touches the tank while it blinks.*

31. **Rulebook:** §4 Entities & rules, §8 State machine, §9 Timing / tick order / invariants / tunables, §10 Locked defaults  
   *Revision (Nov 2, 2026): Debu closed the Down/Up exploit found by the independent review (`river-guard-review.md`, fix 2): the §9 SkyPolicy item 0 rescue-start clear now fires only on the **first** Down of each boat crisis (`rescueClearUsed`). Later Downs leave below-ceiling threats to finish their fall at rescue pace, harmlessly, and remove only river bombs. Updated §4 Bombs, §4 Boats item 7, §8 Down transition, invariant 1, §10, Phase 3 checks.*

32. **Rulebook:** §3 Playfield layout  
   *Revision (Nov 2, 2026): Debu chose a **boat timer bar** to make the drown timer visible (review fix 1, first of three timers; §3 Boat timer bar, ink rule, Phase checks). Cosmetic readout only; no rule or timing change.*

33. **Rulebook:** §3 Playfield layout  
   *Revision (Nov 2, 2026): Debu chose a `FUEL` meter in the top status panel to make the chopper flight budget visible (review fix 1, second of three timers; §3 Top status panel, Phase checks). Readout only; no rule or timing change.*

34. **Rulebook:** §3 Playfield layout  
   *Revision (Nov 2, 2026): Debu chose the boat's timer bar for mines too (review fix 1, third of three timers; §3 Mine timer bar, ink rule, Phase checks). A wilting cactus was rejected because it would look harmless while still lethal. Review fix 1 is complete: every hidden timer is now on screen.*

35. **Rulebook:** §2 Core loop, §3 Playfield layout, §4 Entities & rules, §5 Scoring, §6 Difficulty curve, §7 Controls, §8 State machine, §9 Timing / tick order / invariants / tunables, §10 Locked defaults, §11 Phased ship order  
   *Revision (Nov 2, 2026): Debu cut the **chopper mine flyover** (independent review fix 3, part 1). Jump is the only answer to a mine; the chopper is for boat rescue only and can never be hit. Down → chopper now needs `Crisis == Boat`; the 2,160 ms mine flight budget, flyover clear, chopper combat over mines and chopper-hit respawn are removed. Touched: §2 item 5, §3 Mine timer bar and `FUEL` meter (boat only, 1,240 ms per segment, blank otherwise), §4 Tank Down, §4 Mines clear predicates and Avoid, §4 Chopper, §5 table, §6 Active band items 2–3, §7 Controls, §8 SkyPolicy note, Respawn safety rule, transitions and Illegal list, §9 SkyPolicy *Not active*, Chopper flight timer, Chopper combat rule, Chopper lethality, invariants 5, 12–15, §10 rows, §11 Phase 3 and Phase 4 checks.*

36. **Rulebook:** §4 Entities & rules, §6 Difficulty curve, §8 State machine, §9 Timing / tick order / invariants / tunables, §10 Locked defaults, §11 Phased ship order, §12 Out of scope  
   *Revision (Nov 2, 2026): Debu settled **drown while flying** (A): if the boat's drown timer expires while the player is in the chopper, the player returns to Tank at the current column, lane row 9, on the same tick, exactly like a rescue (SkyPolicy lift + stampede, band recomputed, no respawn rule). With sinks impossible in the chopper and the flyover cut, the chopper never exists outside a boat crisis (new invariant 25). Touched: §4 Boats drown bullet, §4 Mines spawn column (airborne clause removed), §4 Chopper, §6 Active band item 3, §8 SkyPolicy note and transitions (new ChopperFree drown row, Crisis Boat end row), §9 SkyPolicy *Not active*, Return stampede trigger list, Chopper flight timer item 6, invariant 25, §10 Rescue success row, §11 Phase 3 checks, §12.*

37. **Rulebook:** §4 Entities & rules, §9 Timing / tick order / invariants / tunables, §11 Phased ship order  
   *Revision (Nov 2, 2026): Debu set **timer expiry in the tick** (A): input first, then timers, then threat steps, then hits; a hook on the drown timer's expiry tick saves the boat. New §9 *Tick order* lists all six steps (input; timers in a fixed order with a pause rule; threat steps; respawn placement; hits; crisis spawns), placing every game-state timer: flight budget, drown timer, mine lifetime, jump airtime, `invulnMs`, impact lock, crisis scheduler. Respawn placement and crisis spawns keep their existing positions (after threat steps). Updated §4 Boats item 6, §9 Chopper combat rule tick-order bullet, invariants 26–27, §11 Phase 3 and Phase 4 checks. Shell steps are not yet placed (open).*

38. **Rulebook:** §4 Entities & rules, §9 Timing / tick order / invariants / tunables, §11 Phased ship order  
   *Revision (Nov 2, 2026): Debu set **shell timing** (A): shells step in tick step 3 with the threats, shell–jet hits are checked in step 5, and a shell and a jet that swap cells on one tick (pass through each other) still count as a hit; one shell, one kill, earliest-spawned jet first, +100. The shell's spawn cell and pace are now written into §4 Shell from timing v6 (`L · S` = 540 ms, 9 cells: tank's cell on the fire tick, one row per 60 ms). Updated §4 Shell, §4 Jets two-jet line, §9 *Tick order* steps 3 and 5 and consequences (the "not yet placed" marker is gone), invariants 28–29, §11 Phase 1 and Phase 3 checks. Still open: the spawn row for Fire at the jump apex (row 8) and the column when Left/Right and Fire share a tick; a jet leaving a cell as the shell enters it (or entering the cell a shell just left) is not a hit under the swap rule; and the order inside step 5 when one jet is both shot and reaches the tank on the same tick.*

39. **Rulebook:** §4 Entities & rules, §9 Timing / tick order / invariants / tunables, §11 Phased ship order  
   *Revision (Nov 2, 2026): Debu settled the **point-blank shot** (A): in tick step 5 shell–jet hits resolve before jet–tank hits, so a jet shot on the tick it reaches the tank dies (+100) and no life is lost. Bombs are not shootable and other jets are not covered: they still hit. Updated §4 Shell (new point-blank bullet), §4 Tank, §9 *Tick order* step 5 (internal order; open marker removed) and consequences, new invariant 30, §11 Phase 1 check and Phase 3 invariant range.*

40. **Rulebook:** §4 Entities & rules, §11 Phased ship order  
   *Revision (Nov 2, 2026): Debu settled the **near miss** (A): a jet leaving a cell as the shell enters it, or entering the cell the shell just left (including a shell leaving row 0), is a miss; a hit is only the same cell after step 3 or a swap. Updated §4 Shell (open marker removed), invariant 29, §11 Phase 1 check.*

41. **Rulebook:** §4 Entities & rules, §9 Timing / tick order / invariants / tunables, §11 Phased ship order  
   *Revision (Nov 2, 2026): Debu settled **fire mid-jump** (A): a shell starts in the tank's actual cell in tick step 1, whatever its row, so a shell fired while the tank is on row 8 in TankJump reaches row 0 in 480 ms instead of 540. Updated §4 Shell path bullet, §9 *Tick order* consequences (the shell starts in the tank's step-1 cell, so on a landing tick it starts on the airborne row), invariant 28, §11 Phase 1 wording and a Phase 4 check. Still open: which TankJump ticks put the tank on row 8, and how the airborne tank collides with jets and bombs.*

42. **Rulebook:** §4 Entities & rules, §11 Phased ship order  
   *Revision (Nov 2, 2026): Debu settled **move and fire** (A): in tick step 1 Left/Right applies before Fire, so the shell starts in the tank's column after this tick's move (a wall-blocked move keeps the current column). Updated §4 Shell path bullet (open marker removed), invariant 28, §11 Phase 1 check. Still open: whether Jump pressed on the same tick as Fire raises the tank to row 8 before the shell spawns.*

43. **Rulebook:** §9 Timing / tick order / invariants / tunables, §11 Phased ship order  
   *Revision (Nov 2, 2026): Debu set the **tick length** (A): a fixed 60 ms simulation tick (= S), independent of frame rate, with missed ticks run back to back (fixed-timestep accumulator); nothing moves more than one step per tick. This closes the earlier tick-length question. Intervals that aren't multiples of 60 use a per-entity step accumulator that carries the remainder (exact average rate); countdown timers expire on the first tick they reach ≤ 0, so non-multiple durations round up to the next 60 ms. All intervals in the doc checked ≥ 60 ms. Updated §9 *Tick order* (new *Tick length* block), new invariant 31, §11 Phase 1 check and Phase 3 invariant range. Still open: accumulator behaviour when an interval changes mid-flight or a threat is held at the ceiling; a catch-up cap, hidden-tab pause and which catch-up tick gets a press.*

44. **Rulebook:** §4 Entities & rules, §7 Controls, §9 Timing / tick order / invariants / tunables, §11 Phased ship order  
   *Revision (Nov 2, 2026): Debu added the **jump cooldown** from timing v6 (A): after landing, Jump is ignored for `jumpCooldownMs` = 240 ms (4S, 4 ticks). Added to §4 Tank Jump, §7 controls and transitions, §9 *Tick order* step 2 (right after jump airtime; starts on the landing tick, first ticks the next tick), §9 tunables, invariant 32, §11 Phase 4 check and Phase 3 invariant range.*

45. **Rulebook:** §4 Entities & rules, §9 Timing / tick order / invariants / tunables, §11 Phased ship order  
   *Revision (Nov 2, 2026): Debu settled **simultaneous hits** (A): at most one life is lost per tick; the first tank hit in step 5 makes the tank TankInvuln at once and every other jet, bomb or mine reaching it that tick passes through (jets and bombs keep their paths; a mine is not removed). Updated §4 Tank, §9 *Tick order* step 5, invariant 33, §11 Phase 3 check and invariant range. Still open: which kind counts as first (mine, bomb or jet), since it decides which threat is removed and whether a mine hit ends the mine crisis; within one kind the order makes no difference.*

46. **Rulebook:** §9 Timing / tick order / invariants / tunables, §11 Phased ship order  
   *Revision (Nov 2, 2026): Debu settled **speed change mid-flight** (A): on an interval change the step accumulator is rescaled `acc = min(floor(acc × new / old), new − 1)` in integer ms, so progress is kept in proportion and no step is ever owed. Updated §9 *Tick length*, new invariant 34, §11 Phase 3 check and invariant range. Still open: accumulator behaviour while a threat is held at the soft ceiling, and the jet spawner's accumulator while SkyPolicy blocks spawns.*

47. **Rulebook:** §9 Timing / tick order / invariants / tunables, §11 Phased ship order  
   *Revision (Nov 2, 2026): Debu set the **catch-up limits** (A): at most 5 ticks per animation frame, with any further backlog dropped (`frameAcc mod 60` kept); the game pauses while the tab is hidden and resumes without catching up the hidden time; a press since the last frame applies on the first tick run in that frame and carries over if none runs. Updated §9 *Tick length* (open marker removed), new invariant 35, §11 Phase 1 check and Phase 3 invariant range.*

48. **Rulebook:** §3 Playfield layout, §4 Entities & rules, §7 Controls, §11 Phased ship order  
   *Revision (Nov 2, 2026): Debu set the **jump rows** (A): the tank is on row 8 for the whole jump airtime (takeoff tick through the last airborne tick) and lands back on row 9 in step 2 of the tick the airtime expires. Jets and bombs reaching its row-8 cell hit it normally (same cell or swap; point-blank and one-life-per-tick rules apply); mines can't hit it while airborne. Updated §3 lane row, §4 Tank Jump, §4 Shell (open marker removed), §4 Mines hit predicate, §7 controls, invariant 36, §11 Phase 4 check and Phase 3 invariant range. The airtime value (480 ms in timing v6) is still not in this doc. Still open: what a hit does to a jump in progress.*

49. **Rulebook:** §4 Entities & rules, §9 Timing / tick order / invariants / tunables, §11 Phased ship order  
   *Revision (Nov 2, 2026): Debu set the **Jump + Fire order** (A): in step 1 the tank applies Left/Right, then Jump (if allowed), then Fire, so a same-tick Jump + Fire shell starts on row 8 in the new column; with Jump refused, Fire uses the tank's actual cell. Updated §4 Shell, §9 *Tick order* step 1, invariant 28, §11 Phase 4 check.*

50. **Rulebook:** §4 Entities & rules, §5 Scoring, §9 Timing / tick order / invariants / tunables, §11 Phased ship order  
   *Revision (Nov 2, 2026): Debu added the **mine jump bonus** (review fix 3 part 2, A): +200 for each jump clear of a live mine (airborne tank on row 8 in the mine's column in step 5). The jump clear already removes the mine and ends the crisis, so a mine pays once; a mine expiring in step 2 of a tick can't be cleared or paid that tick. Updated §4 Mines jump clear, §5 scoring table, §9 *Tick order* step 5, invariant 37, §11 Phase 4 check and Phase 3 invariant range.*

51. **Rulebook:** §4 Entities & rules, §9 Timing / tick order / invariants / tunables, §11 Phased ship order  
   *Revision (Nov 2, 2026): Debu set the **simultaneous hit priority** (A): mine, then bomb, then jet; ties between two bombs or two jets go to the one that spawned first (it only decides which one stays on screen). A counted mine ends the crisis like a normal mine hit; passed-through bombs keep falling, including into the river in the boat's column. Updated §4 Tank, §9 *Tick order* step 5 (open marker removed), invariant 33, §11 Phase 3 check.*

52. **Rulebook:** §4 Entities & rules, §11 Phased ship order  
   *Revision (Nov 2, 2026): Debu settled the **hit mid-jump** (A): the hit ends the jump (airtime discarded, no landing, no cooldown); the wreck stays on row 8 in its column through the impact lock until the normal respawn puts the tank on row 9. The wreck is TankInvuln, so nothing collides with it and a mine under it is neither hit nor cleared. Updated §4 Tank Jump (open marker removed), invariants 13 and 36, §11 Phase 4 check.*

53. **Rulebook:** §4 Entities & rules, §11 Phased ship order  
   *Revision (Nov 2, 2026): Debu kept **Jump + Fire vs a descending jet** as intended (A): with the jet on row 8 stepping to row 9 on the takeoff tick, the shell misses (near miss) and the tank is hit by the takeoff swap; no special case. Added a note to §4 Shell near miss and a §11 Phase 4 check.*

54. **Rulebook:** §4 Entities & rules, §7 Controls, §9 Timing / tick order / invariants / tunables  
   *Revision (Nov 2, 2026): Debu added **`jumpAirtimeMs` = 480 (8S)** and **`tankMoveMs` = 120 (2S)** from timing v6 to §9 tunables, and wired them into §4 Tank Jump, §7 controls and §9 *Tick order* step 2. Tick-exact: a jump taking off on tick J is airborne for the step-5 checks of J to J+6 and lands in step 2 of J+7. Not defined: when a held Left/Right repeats versus a tap.*

55. **Rulebook:** §4 Entities & rules, §7 Controls, §8 State machine, §9 Timing / tick order / invariants / tunables, §11 Phased ship order  
   *Revision (Nov 2, 2026): Debu moved **Jump to the Up arrow** (review fix 3 part 3, A). Each Up press does one action, chosen by `PlayerMode` at the start of step 1: Chopper* → leave or unhook (unchanged), Tank modes → Jump. A press that returns the player to Tank never also jumps that tick, and a new press is needed to jump. The separate Jump input is removed. Updated §7 controls table (Jump row removed, Up row), §7 Up = Jump rule, §8 transitions and Illegal list, §9 *Tick order* step 1 and the tank input order (now 'Up (Jump)'), §4 Shell, invariant 38, §11 Phase 4 check and Phase 3 invariant range. Still open: chopper Left/Right vs Up order on one tick.*

56. **Rulebook:** §4 Entities & rules, §9 Timing / tick order / invariants / tunables, §11 Phased ship order  
   *Revision (Nov 2, 2026): Debu chose **hit before clear** (B): in §9 step 5 the tank hits (ii) resolve before the jump clear (iii), so an airborne tank hit on the tick it first reaches a live mine's column loses the life and the mine stays live (no clear, no +200, crisis continues); the hit ends the jump, so it can't clear the mine later. Updated §9 *Tick order* step 5 sub-order, §4 Mines jump clear, invariant 37, §11 Phase 4 check.*

57. **Rulebook:** §7 Controls, §9 Timing / tick order / invariants / tunables, §11 Phased ship order  
   *Revision (Nov 2, 2026): Debu set the **chopper move vs Up** order (A): in Chopper* modes step 1 applies Left/Right first, then Up; a move that reaches the bank while hooked rescues, and that tick's Up does nothing (no unhook, no Jump). Otherwise Up acts at the new column. Updated §7 Up = Jump rule (open marker removed), §9 *Tick order* step 1, invariant 38, §11 Phase 4 check.*

58. **Rulebook:** §7 Controls, §9 Timing / tick order / invariants / tunables, §11 Phased ship order  
   *Revision (Nov 2, 2026): Debu set **held vs tapped Left/Right** (A): a new press moves one column at once in step 1; a held key repeats one column every `tankMoveMs` (120 ms, 2 ticks) counted from the press tick; release stops it; the newest press wins. The chopper uses the same rule at its timing v6 step (240 free / 480 hooked). Updated §7 (new press-and-hold rule), §9 *Tick order* step 1, invariant 39, §11 Phase 1 check and Phase 3 invariant range. Still open: fast tapping under the rate, both directions pressed on one tick, resuming the older held key, a key held through the lock or a mode change.*

59. **Rulebook:** §7 Controls, §9 Timing / tick order / invariants / tunables, §11 Phased ship order  
   *Revision (Nov 2, 2026): Debu set the **chopper move vs Down** order (A): in Chopper* modes step 1 applies Left/Right, then Down (hook), then Up; the hook checks the chopper's column after the move. Updated §7 chopper order rule, §9 *Tick order* step 1, invariant 38, §11 Phase 4 check. Still open: Down and Up on the same chopper tick, and whether the Down that enters the chopper can also hook on that tick.*

60. **Rulebook:** §4 Entities & rules, §9 Timing / tick order / invariants / tunables, §11 Phased ship order  
   *Revision (Nov 2, 2026): Debu confirmed **airborne ticks** (A): `jumpAirtimeMs` = 480 gives 7 airborne ticks (takeoff J through J+6 on row 8, 420 ms) and a landing in step 2 of J+7; intended, from the pause rule. Stated in §4 Tank Jump and the §9 tunables row; new §11 Phase 4 check.*

61. **Rulebook:** §4 Entities & rules, §7 Controls, §8 State machine, §9 Timing / tick order / invariants / tunables, §11 Phased ship order  
   *Revision (Nov 2, 2026): Debu chose **fast tapping** (B): every new Left/Right press moves one column at once, whatever the time since the last move, so tapping can reach one column per tick and beat the 120 ms hold rate (intended). `tankMoveMs` is now the hold-repeat rate only. The chopper follows the same press rule, so taps beat its 240 / 480 hold rates too. Updated §4 Bombs warning-time line, §7 controls table and press-and-hold rule (open item removed), §8 band-floor note, §9 *Tick length*, §9 step 1, §9 tunables, invariant 39, §11 Phase 1 check.*

62. **Rulebook:** §7 Controls, §9 Timing / tick order / invariants / tunables, §11 Phased ship order  
   *Revision (Nov 2, 2026): Debu set **both directions on one tick** (A): if Left and Right are newly pressed on the same tick (both held, neither newer), there is no horizontal move (tank or chopper) while both stay held; a fresh press of one ends the tie. Updated §7 press-and-hold rule, §9 step 1, invariant 39, §11 Phase 1 check. Still open: what the remaining held key does when the other is released (the older-key-resumes question).*

63. **Rulebook:** §7 Controls, §9 Timing / tick order / invariants / tunables, §11 Phased ship order  
   *Revision (Nov 2, 2026): Debu made **fast tapping tank-only** (A): in Chopper* modes a press moves at once only if the chopper's rate (4 ticks free, 8 hooked) has passed since its last move; otherwise it is one pending move (latest direction wins, not cancelled by release, discarded on leaving the chopper) made on the first allowed tick. The last-move tick is kept across hook and drop and checked against the current rate; the first move after entering the chopper is immediate. The approved worst hook 4,560, flight budget 9,920 and level-1 checks hold again. Updated §7 controls table and press-and-hold rule, §9 *Tick length* and step 1, invariant 39, §11 Phase 1 and Phase 4 checks.*

64. **Rulebook:** §7 Controls, §9 Timing / tick order / invariants / tunables, §11 Phased ship order  
   *Revision (Nov 2, 2026): Debu set **release with the other key held** (A): when one of two held Left/Right keys is released, the still-held key acts as a new press on the release tick (moves at once in Tank modes, under the chopper cap in the chopper) and restarts its hold repeat; all new presses on one tick resolve to at most one move. Updated §7 press-and-hold rule (open item narrowed), §9 step 1, invariant 39, §11 Phase 1 check.*

65. **Rulebook:** §7 Controls, §9 Timing / tick order / invariants / tunables, §11 Phased ship order  
   *Revision (Nov 2, 2026): Debu set **a held key through the lock or a mode change** (A): a Left/Right key held through the impact lock or across a Tank ↔ Chopper* change acts as a new press on the first tick movement is allowed, at the new mode's rules, and restarts its hold repeat. That tick is `T_r + 1` after a hit (the respawn tick stays put) and the tick after a mode change. Up is unaffected (a held Up never re-triggers). Updated §7 (open item removed), §9 step 1, invariant 39, §11 Phase 1 check.*

66. **Rulebook:** §7 Controls, §9 Timing / tick order / invariants / tunables, §11 Phased ship order  
   *Revision (Nov 2, 2026): Debu set **Down + Up on one tick** (A): Down resolves before Up in every mode; if Down took effect (a hook, or entering the chopper from Tank), that tick's Up is ignored entirely; otherwise Up applies normally. Updated §7 (new rule; the Down/Fire order in Tank is noted as open), §9 step 1, invariant 38, §11 Phase 4 check.*

67. **Rulebook:** §4 Entities & rules, §7 Controls, §9 Timing / tick order / invariants / tunables, §11 Phased ship order  
   *Revision (Nov 2, 2026): Debu set the **chopper-entry Down** (A): the Down that enters the chopper from Tank never also hooks, even over the boat's column; hooking needs a new Down press, and a held Down never re-triggers (one action per Down press, decided by the mode at the start of step 1). Updated §4 Chopper manual hook, §7, §9 step 1, invariant 38, §11 Phase 4 check.*

68. **Rulebook:** §4 Entities & rules, §7 Controls, §9 Timing / tick order / invariants / tunables, §11 Phased ship order  
   *Revision (Nov 2, 2026): Debu set **hold to fire** (A): Fire is press-only. A new press fires if no shell is active and firing is allowed; holding never re-fires; a press while a shell is active is discarded, not buffered; a Fire held through the lock or a mode change needs a new press. Updated §4 Shell, §7 controls, §9 *Tick order* step 1, invariant 40, §11 Phase 1 check and Phase 3 invariant range.*

69. **Rulebook:** §7 Controls, §9 Timing / tick order / invariants / tunables, §11 Phased ship order  
   *Revision (Nov 2, 2026): Debu set **Fire vs chopper-entry Down** (A): in Tank modes step 1 runs Left/Right, then Up (Jump), then Fire, then Down; a same-tick Fire + Down fires from the tank's cell and then enters the chopper, and the shell keeps flying (the rescue-start clear removes only jets and bombs). The Down + Up wording now says Down before Up in Chopper* modes; in Tank modes the two can't both act. Updated §7 (open marker removed), §9 *Tick order* step 1, invariant 28, §11 Phase 4 check.*

70. **Rulebook:** §9 Timing / tick order / invariants / tunables, §11 Phased ship order  
   *Revision (Nov 2, 2026): Debu set **same-frame presses** (A): all presses of one button since the last frame merge into one new press on the frame's first tick (or are carried); different buttons stay separate and follow the step-1 order and tie rules; whether the merged press is held or a tap is read on the tick. Updated §9 *Tick length* inputs, invariant 35, §11 Phase 1 check. Still open: a same-frame Left + Right where one is already released by the tick.*

71. **Rulebook:** §9 Timing / tick order / invariants / tunables, §11 Phased ship order  
   *Revision (Nov 2, 2026): Debu set **resume after a hidden tab** (A): the game stays paused showing `PRESS ANY KEY` (LCD style) until any key press. That press is consumed (not game input), `frameAcc` resets to 0 and the first tick runs on the next frame. A held resuming key is ignored until released; other held keys follow the held-through rules (Left/Right as a new press, Up/Down/Fire need a new press). Window blur alone doesn't pause. Updated §9 *Tick length* (hidden-tab and resume bullets), invariant 35, §11 Phase 1 check. Still open: where the prompt is drawn.*

72. **Rulebook:** §7 Controls, §9 Timing / tick order / invariants / tunables, §11 Phased ship order  
   *Revision (Nov 2, 2026): Debu set **same-frame Left + Right with one released** (A): the still-held key moves as a new press (Tank at once, chopper under the cap); the released tap is ignored and causes no tie; a tie needs both held at the tick. Updated §9 *Tick length* inputs (open note replaced), §7 both-directions bullet, invariant 39, §11 Phase 1 check. Still open: both released by the tick.*

73. **Rulebook:** §3 Playfield layout, §9 Timing / tick order / invariants / tunables  
   *Revision (Nov 2, 2026): Debu approved the **resume details** (A): any key resumes; the resuming press is consumed and never game input; a held resuming key is ignored until released; other held keys follow the held-through rules; window blur without hiding keeps running; `PRESS ANY KEY` is a centred overlay on the playfield in LCD style, outside the side-panel rules. Updated §9 *Tick length* (open marker removed, details marked as Debu's) and §3 message rule 5 (the overlay is the one exception).*

74. **Rulebook:** §7 Controls, §9 Timing / tick order / invariants / tunables, §11 Phased ship order  
   *Revision (Nov 2, 2026): Debu set **two opposite taps in one frame** (A): Left and Right both pressed and both released within one frame (neither held at the tick) give no move, like a tie, and set no remembered chopper move (an existing one is kept). Updated §9 *Tick length* inputs (open note removed), §7 both-directions bullet, invariant 39, §11 Phase 1 check.*

75. **Rulebook:** §9 Timing / tick order / invariants / tunables, §11 Phased ship order  
   *Revision (Nov 2, 2026): Debu set **held-back counters** (A): while a threat is held at the soft ceiling or waiting for its stagger slot, or the jet spawner is blocked by SkyPolicy, its counter keeps accumulating but is capped at interval − 1; when the block lifts it steps or spawns once on the first allowed tick (same tick's step 3 if the block lifts in step 1–2, next tick if in step 5), with remainder 0 after a capped step. No burst. Updated §9 *Tick length* (last open marker removed), invariant 34, §11 Phase 3 check.*

76. **Rulebook:** §3 Playfield layout  
   *Revision (Nov 2, 2026): Debu fixed two **leftovers** (A): the §3 `FUEL` line now says the last segment stays lit until the budget runs out (≤ 0); invariants 14–19 now have phase checks. 14–16 (chopper, flight budget) are in Phase 3. 18–19 (bombs) are in Phase 2, with 19's SkyPolicy clause again in Phase 3. 17 (cross jets) is in Phase 1, where both jet paths are built. Invariant 24 (invulnerable tank) was also unchecked and is now in Phase 1 and Phase 3. Phase 3 range is now 1–16 and 19–40.*
77. **Rulebook:** header, §10 Locked defaults, §13 Playtest revisit points  
   *Revision (Nov 2, 2026): split finished (Debu, A). `tank-jets-design.md` frozen with a superseded banner; edits now go to the rulebook plus a changelog entry, and the v6 decisions log stays the master decisions list (stated in both headers). Rulebook header gains the status line "Recommended values are the v1 contract unless Debu overrides". §13 renamed **Playtest revisit points** and keeps only the open items (forbidding Up while hooked; crisis interval tuning in Phase 5); the settled rows (band mid-rescue, Up while hooked, crisis spawn interval, mine-aware respawn) moved into §10 unchanged in meaning. The former `slowMultiplier` alias no longer appears in the rulebook. References in `river-guard-level1.md` and the v6 proposal repointed to the rulebook.*
78. **Rulebook:** §7 Controls  
   *Revision (Nov 2, 2026): Debu bound **Fire to Space** (independent review audit of level 1, issue 2, A). New §7 *Key bindings* table: Left/Right arrows move, Up arrow = Jump in Tank modes and leave/unhook in Chopper*, Down arrow = enter the chopper / hook, Space = Fire; no other key is a game input (any key still resumes after a hidden tab). New prompt rule: prompts name keys, Space is written `SPACE` (e.g. `SPACE: FIRE`), arrow glyphs ◀ ▶ ▲ ▼ mean only their arrow keys, and ▲ is never used for Fire. No input semantics changed (Fire press-only, no buffering, same-frame merge, step-1 order unchanged).*
79. **Level 1:** Tutorial step prompt; **Rulebook:** §3 Side message panel (pinned step-prompt line, no text change)  
   *Revision (Nov 2, 2026): Debu approved **pre-boat prompts** (level-1 audit issue 1, A; review fix 5(a)). In `river-guard-level1.md`, before the tutorial boat first appears the step prompt reacts to the player: `MOVE ◀ ▶` until the first Left/Right move takes effect (`moved`), then `SPACE: FIRE` until the first shell is created (`fired`), then none. Firing before moving goes from `MOVE ◀ ▶` straight to none; a move and a shot on one tick give none; when the boat appears the boat-state prompts take over and the pre-boat prompts never return in level 1. The prompt is chosen from the state at the end of each tick. Both strings added to the approved level-1 set (question 9). No rulebook text changed.*
80. **Level 1:** Stress check, *Bomb seen*  
   *Revision (Nov 2, 2026): Debu chose **A for level-1 audit issue 3**. The guaranteed bomb stays at a random column and there is still no fallback bomb, so question 14 stands and is reaffirmed. Only the sim figures changed: they were re-run with fast tapping (60 ms per column, `rg-sim/l1_sim_v6_tap60.py`, a copy of `l1_sim_v6.py` with `TANK_CELL=60`, 200,000 runs, seed 7). Aimers who see no bomb went from 41–48% to 47.2–53.5%, guaranteed bomb lost from 31–76% to 30.8–79.1% (aimers 74.2–79.1%), and aimers' average bombs from 0.65–0.81 to 0.56–0.69. Idle and mid-stayer figures, and *Bomb outlives the jet*, are unchanged. The sim's assumptions are now stated in one line. No rule changed.*
81. **Level 1:** Script (dive jet, T_e), Stress check, Top status panel, Respawn safety *Level-1 effect*  
   *Revision (Nov 2, 2026): Debu chose **A for level-1 audit issue 4**: a second scripted **dive jet** in the tank's column, appearing when the cross jet leaves. It spawns in step 3 of T_x + 60 (T_x = the tick the cross jet exits or is shot), in the tank's column after step 1. If the tank is in the impact lock then, it waits until T_r + 60 and uses the respawned column, and it doesn't spawn if no lives are left. It steps every 720 ms (lane at T_dj + 6,480, ground at T_dj + 7,200), rolls 0.10 on rows 0–8 with no guaranteed drop, and can be shot (+100), so the score is at most 700. T_e now waits for both jets. Tick-exact worst case: T_b ≤ 16,920 (was 15,120). The boat appearance rule is unchanged (issue 5 is still open). Stress checks re-run with `rg-sim/l1_sim_divejet.py` (new tick sim, 50,000 runs, seed 7): an idle player loses 1 life (85%) or 2 (15%), never 3. The guaranteed bomb stays with the cross jet. The jets never overlap. The idle-player claim "at most one life (15%)" is replaced. The choices made while writing it are open questions for Debu.*
82. **Level 1:** Clear condition (*After `LEVEL 1 CLEAR`*)  
   *Revision (Nov 2, 2026): Debu chose **A for level-1 audit issue 6**: after `LEVEL 1 CLEAR` the run carries on into normal band-A play with the score kept (100–700). The script, prompts and `SAFE BOAT` end on the rescue tick; from then on only the rulebook applies (normal jet spawner, boats from the crisis scheduler at `boatUnlockScore` 2,000, mines at `mineUnlockScore`); the guaranteed first-jet drop doesn't repeat. A restart after game over begins at level 1 with a new run.*
83. **Rulebook:** §4 Tank (new *Impact pacing* and *Bomb hits the tank*), §8 *Respawn safety rule* (pointer, prediction wording), §9 tunables (`impactLockMs`); **Level 1:** *Impact pacing and respawn (level 1)*  
   *Revision (Nov 2, 2026): Debu chose **A for level-1 audit issue 7**: impact pacing, the bomb-hit look and the respawn safety rule are game-wide, so they now live only in the rulebook. The impact-pacing table, its *Why these numbers* and the invulnerability decision moved to §4 Tank *Impact pacing*; the bomb-hit table and draw-order note moved to §4 Tank *Bomb hits the tank*. New tunable `impactLockMs` = 420 (7S; the lock expires in step 2 of I + 7 = T_r). §8 now points to §4 for T_r, and its prediction line says the live step is the active band's timing (§6), carried over from the level-1 copy. The level-1 copy of the respawn rule was dropped, because the rulebook §8 text already covered items 1–6; its history notes are kept here: "*This settles the design doc's §4-vs-§8 conflict in favour of §4 (respawn at lane centre), not the keep-X approach this draft used before.*" and "A future angled bomb would follow its fixed diagonal; none exist in v1." Level 1 keeps a pointer and its *Level-1 effect* paragraph. Pre-move text: `river-guard-level1.md.pre-l1batch`.*
84. **Level 1:** Terms (level start, `t_ms`), Board, Script, Stress checks  
   *Revision (Nov 2, 2026): Debu chose **A for level-1 audit issue 8**: every level-1 time is tick-exact. Level start = tick 0; `t` renamed `t_ms` = 60 × tick index. The cross jet enters on the first tick with elapsed ≥ 1,333, tick 23 = 1,380 ms; on tick n it is k = ⌊60(n − 23)/400⌋ steps in, step k at 1,380 + 60·⌈20k/3⌉; it exits at 8,580 (tick 143). Guaranteed drop t_g 1,380–8,220; cross-bomb lane 6,660–13,500, ground 7,320–14,160 (were 1,333, 1,333–8,133, 6,613–13,413, 7,273–14,073, 8,533).*
85. **Rulebook:** §3 Top status panel (tutorial-aid definition); **Level 1:** *Tutorial aids in level 1*  
   *Revision (Nov 2, 2026): Debu chose **A for level-1 audit issue 9**: a tutorial aid is now a level-specific exception that relaxes a normal rule in the player's favour; scripted content (which jets or boats appear, when and where, including a boat outside the crisis scheduler) is not an aid and gets no `TUTORIAL` label. Level 1's only aid is `SAFE BOAT` (replays without counting); the scripted jets and the tutorial boat's appearance outside `boatUnlockScore` are scripted content.*
86. **Level 1:** Top status panel (`FUEL` row), Tutorial boat look  
   *Revision (Nov 2, 2026): Debu chose **A for level-1 audit issue 10**: a `FUEL` row was added: blank until T_b, full on each tutorial boat's T_b, drains only while flying, blank in the 960 ms gaps and after the rescue, never all-empty in level 1. The outline-only tutorial boat keeps the top 2 px of its cell empty for the drown-timer bar (rulebook §3), which it shows.*
87. **Level 1:** Top status panel (`TUTORIAL`), Side message panel, drowning paragraph  
   *Revision (Nov 2, 2026): Debu chose **A for level-1 audit issue 11**: `SAFE BOAT` stays on from the first T_b until the rescue, including the 960 ms gaps. `BOAT LOST` and `TRY AGAIN` are raised together on the drowning (or fuel-out) tick and both hold 960 ms (`msgHoldMs`), so they clear as the replay boat appears (was "`BOAT LOST`, then `TRY AGAIN`"). `TUTORIAL BOAT` is pinned while each boat exists and re-pins on every replay boat.*
88. **Level 1:** drowning paragraph (*Fuel out*), Tutorial step prompt, Stress checks  
   *Revision (Nov 2, 2026): Debu chose **A for level-1 audit issue 12**: while `SAFE BOAT` is on, the flight budget running out ends the attempt at once: tank at the current column, boat removed, `Crisis → None`, no `DROWNED` count, `BOAT LOST` + `TRY AGAIN`, replay 960 ms later. Budget expiry is checked before the drown timer in step 2; a rescue in step 1 wins. This removes a dead wait of up to about 9.3 s; the prompt row "Tank, flight budget spent → `WAIT: BOAT RETURNS`" was removed as unreachable.*
89. **Rulebook:** §4 Tank *Impact pacing* (table and decision line)  
   *Revision (Nov 2, 2026): Debu chose **A for level-1 audit issue 14**: "540 ms of controllable time" / "540 ms of protected control" reworded: after respawn the tank is protected for 540 ms, of which 480 ms is controllable (ticks T_r + 1 to T_r + 8; T_r itself is the lock's last tick). No number changed.*
90. **Level 1:** Script (*T_b* row), Stress checks *Budget vs run*, *Hook vs drown*  
   *Revision (Nov 2, 2026): Level-1 audit issue 13 (no decision needed): the hook-slack claim ("fits inside the 2,000 ms of budget slack") and the "560 spare" figure were replaced with tick math. Down on tick T: the budget runs out in step 2 of T + 165; the worst run (13 free moves, last on T + 49; 13 hooked moves, last on T + 153) has 720 ms spare; a hook up to 480 ms after arriving costs nothing (the first hooked move waits 8 ticks anyway), so reactions up to 1,200 ms fit.*
91. **Rulebook:** §4 Tank *Bomb hits the tank* (draw-order rows)  
   *Revision (Nov 2, 2026): Level-1 audit issue 15 (no decision needed): the draw-order note said "rows 6–8" for both; for a tank on lane row 9 the 1×3 flash covers rows 7–9 and the splash rows 6–8.*
92. **Level 1:** status line, Terms, Board, Sprites, references; voice-brief corrections and settled questions moved here  
   *Revision (Nov 2, 2026): Level-1 audit issue 16 (no decision needed), stale-text cleanup: the status line no longer says "draft, not in the rulebook"; "exactly one cell" now explains the two-tile hooked-chopper sprite as two entities; "doc §" references now say "rulebook §"; "bank markers" removed (the banks are castle towers) and the `planetank/` sheets noted as 12 px designs to redraw at 16 px; board-diagram arrows now span all of row 0 and the `|` bank marks were removed from river row 13 (the towers cover rows 11–12); the approved strings (question 9) became *Approved panel strings*, and rulebook §3 points there. The voice-brief corrections and the settled *Open for Debu* list (questions 1–15) moved here, verbatim:*

   > **Corrections to the voice brief**
   > 1. The boat budget at 18 columns is **9,920 ms**, not ~8.9 s. 8,960 is the value for 16 columns.
   > 2. The chopper moves at **240 ms/cell free and 480 ms/cell hooked**, not 200/450.
   > 3. The band-E drown time (7.4 s) doesn't apply here. Level 1 is band A.
   > 4. **Conflict (resolved):** the timing model had **no crisis in band A**. The crisis interval and drown timer were only defined for B–E, and the doc gates boats on `boatUnlockScore` (2,000), but level 1 starts at score 0. This draft adds **one scripted tutorial boat**. That is a **tutorial exception, approved by Debu (Nov 2, 2026)**. The rulebook defines a band-A drown timer of 9,360 ms (p = 1) for this boat, and the boat sits outside the crisis scheduler.
   > 5. ~~The guaranteed bomb has to be scripted.~~ Resolved (Debu, Nov 2): it's now a normal band A rule, the run's first-jet guaranteed drop (rulebook §4 Bombs).
   >
   > ## Open for Debu
   > 1. ~~Tutorial boat in band A?~~ Settled (Debu, Nov 2): **keep it** as a tutorial exception that bypasses `boatUnlockScore` and does not set `boatsUnlocked`.
   > 2. ~~Scripted guaranteed bomb?~~ Settled (Debu, Nov 2): **not an exception.** It's the normal band A rule: the first jet of a run always drops one bomb at a random cell (rulebook §4 Bombs). Level 1's cross jet is that first jet.
   > 3. ~~When do normal boats start?~~ Settled (Debu, Nov 2): **band B.** `boatUnlockScore` is now 2,000, which matches the band table and the timing proposal.
   > 4. ~~Hook rule?~~ Settled (Debu, Nov 2): **hover over the boat's column and press Down.** No auto-hook.
   > 5. ~~Replay a drowned tutorial boat?~~ Settled (Debu, Nov 2): **replay, drownings don't count.** It's the `SAFE BOAT` tutorial aid, shown in the new top status panel along with score, lives and drowned count.
   > 6. ~~Respawn?~~ Settled (Debu, Nov 2): lane centre, moved to the nearest column safe for each threat's next 3 steps, with a band floor that shrinks from 900 ms (A) to 660 ms (E). Now in rulebook §8, with `invulnMs` 960.
   > 7. ~~Tile size and frames?~~ Settled (Debu, Nov 2): **16×16 px tiles**, so the 18×14 playfield is 288×224 px, plus the top and side panels. One drawn frame per timed step: the flash is 1 frame (60 ms), the burst is 2 frames held at 60 ms each (120 ms), and the wreck is 1 frame held for 240 ms (tank hits only).
   > 8. ~~Castle homage?~~ Settled (Debu, Nov 2): **yes, from the start**, plus setting art with character (sky, river, cactus mines) in rulebook §3.
   > 9. ~~Panel wording?~~ Settled (Debu, Nov 2): **approved as is.** `+100`, `+500 RESCUE`, `LIFE LOST`, `BOAT LOST`, `TRY AGAIN`, `LEVEL 1 CLEAR`, `TUTORIAL BOAT`, the step prompts, `SCORE`, `LIVES`, `DROWNED n/3` and `SAFE BOAT`. Added (Debu, Nov 2, 2026, issue 1 A): the pre-boat step prompts `MOVE ◀ ▶` and `SPACE: FIRE` (keys named per rulebook §7 *Key bindings*). (`BOAT SUNK` was added to the design doc with timing v6; it doesn't appear in level 1.)
   > 10. ~~Tutorial boat shade?~~ Settled (Debu, Nov 2): **outline-only in full ink.** No tutorial ink.
   > 11. ~~Phase 2.1 drifting angled bombs?~~ Settled: removed (Debu, Nov 2). Bombs never drift.
   > 12. ~~Replaying the L1 jet when shot early?~~ Removed (Debu, Nov 2). Note: with random drop columns, early kills again remove bombs (see question 14).
   > 13. ~~`jetCrossChance`?~~ Settled (Debu, Nov 2): **0.5 in every band** for playtesting; tune per band in Phase 5.
   > 14. ~~Level 1 drop point / fallback bomb when shot early?~~ Settled (Debu, Nov 2): random column across all 18. The fallback (shot-down jet releases a bomb) is **rejected**: if the jet is shot before dropping any bomb, there is no bomb.
   > 15. ~~Extra L1 drops?~~ Settled (Debu, Nov 2): **keep them.** The scripted cross jet has the guaranteed drop at a random column, plus a band-A roll of 0.10 on each other cell, for about 1.7 extra bombs on average.
93. **Level 1:** Terms (*Jets gone*), Script (*T_c*, *T_b*, bank row), drowning paragraph, Clear condition, Stress checks (*No game over*, new *Boat timing*, *Hook vs drown*, *Budget vs run*, *Rescue rules*)  
   *Revision (Nov 2, 2026): Debu chose **A for level-1 audit issue 5** (review fix 5(c)). The tutorial boat no longer waits for an empty sky. T_c is the first tick on which, in step 6, both jets are gone (the cross jet left and the dive jet spawned and left) and column 13 is bomb-free under the normal rulebook §4 rule (no falling bomb on rows 1–10). The boat spawns in step 6 of T_c + 16 (960 ms beat). The worst case is unchanged, T_b ≤ 16,920. Sim (`rg-sim/l1_sim_5a.py`, 50,000 runs, seed 7), T_b mean / median / worst: idle 16,521 / 16,800 / 16,800 (unchanged, because the dive jet is last to leave); nonstop mid 8,170 / 6,900 / 13,500 (was 11,277 / 11,100 / 15,120); perfect aimer 4,444 / 4,440 / 4,740 (was 6,942 / 8,280 / 9,780); human aimer 5,017 / 4,560 / 13,500 (was 7,493 / 8,700 / 15,120). Bombs can now still be falling when the boat appears (57–81% of non-idle runs), so the rescue is taught without jets but not always without bombs. The first Down clears rows 7–10, bombs above are held on row 6 and resume after the rescue, an Up, a drowning or a fuel-out. Column 13 stays bomb-free, so replays are never delayed and a bomb sink is still impossible. No game over in any player type.*
94. **Level 1:** Script (dive-jet row, *Settled*)  
   *Revision (Nov 2, 2026): Debu approved **dive-jet choices 1–8** as written in #81: spawn on T_x + 60; column read after step 1; impact-lock wait to T_r + 60 using the respawned column; a hit on T_dj keeps the spawn column; normal 0.10 rolls with no guarantee; shootable for +100 (max level-1 score 700); no spawn at 0 lives; scripted dive path, not the 50/50 choice. They are now recorded as Debu's decisions; they are no longer open questions. The sim assumptions (choice 9) were not part of this.*
95. **Level 1:** *After `LEVEL 1 CLEAR`*; **Rulebook:** §5 *Restart* (new)  
   *Revision (Nov 2, 2026): Debu settled the post-clear details (final call 3): lives carry over unchanged; the normal jet spawner's accumulator starts at 0 on the rescue tick R, so the first normal jet spawns in step 3 of R + 23, 1,380 ms after the rescue; a restart after game over always begins a new run at level 1. The restart rule is now in rulebook §5 next to the game-over conditions.*
96. **Level 1:** drowning paragraph (*Fuel out*)  
   *Revision (Nov 2, 2026): Debu settled (final call 4) that a fuel-out and a drowning on the same tick count as a fuel-out (the budget is checked first in step 2). The outcome is unchanged. Debu also kept the tutorial-aid wording from #85 ("relaxes a normal rule in the player's favour").*
97. **Level 1:** Side message panel (`BOAT LOST` / `TRY AGAIN` timing), drowning paragraph (replay tick)  
   *Revision (Nov 2, 2026): Debu settled (final call 4) the exact clear tick. With D as the drowning or fuel-out tick, `BOAT LOST` and `TRY AGAIN` are raised on D, drawn on ticks D to D + 15 (960 ms), and cleared on D + 16. That is the tick the replay boat spawns (step 6) and `TUTORIAL BOAT` re-pins, so there's no flicker: they clear exactly when the boat returns.*
98. **Level 1:** Stress checks *Bomb seen*, *Bomb outlives the jet* (correction to #80)  
   *Revision (Nov 2, 2026): Correction note for #80; #80 itself is left as written. The #80 figures assumed a 600 ms earliest refire, but the true earliest refire is **660 ms**, because a press on the tick the old shell is removed is discarded. The sim was re-run at 660 ms (`rg-sim/l1_sim_v6_tap60_refire660.py`, 200,000 runs, seed 7, everything else as in #80). Corrected figures: no bomb at all for idle 0%, mid one shot 17.3%, mid nonstop **10.4%** (was 11.3%), human aimer **46.7%** (was 47.2%), perfect aimer 53.5%; guaranteed bomb lost **27.9–79.1%** (was 30.8–79.1%), aimers **73.8–79.1%** (was 74.2–79.1%); average bombs: mid-stayers 1.43–**1.95** (was 1.87), aimers 0.56–**0.70** (was 0.69); *Bomb outlives the jet*: mid nonstop **96.8%** (was 97.2%), everything else unchanged. Q14's reaffirmation doesn't depend on the difference.*
99. **Level 1:** Script (*T_c*)  
   *Revision (Nov 2, 2026): Debu settled (Nov 2, 2026) that the boat condition is checked in step 6, after that tick's hits, so a jet shot in step 5 counts as gone on that same tick.*
100. **Level 1:** Terms (*Dive-jet state*, *Jets gone*)  
   *Revision (Nov 2, 2026): Debu settled (Nov 2, 2026) that the tick between the cross jet leaving and the dive jet spawning is not "no jet on screen". New derived state for code: the dive jet is `waiting` → `pending` (from T_x until it spawns, including an impact-lock wait) → `active` → `gone`; a `pending` dive jet counts as on screen, and *Jets gone* needs the dive jet `gone`.*
101. **Rulebook:** §5 *Restart*  
   *Revision (Nov 2, 2026): Debu settled (Nov 2, 2026) that a restart is a fresh run. Every piece of run state resets: score (band A), lives, drowned boats, `boatsUnlocked`, `minesUnlocked` (ceiling back to 3 cells), the first-jet flag, crisis and scheduler state, the jet spawner, all entities, the flight budget, `rescueClearUsed`, player mode and tank timers, the side panel, and the level-1 script state. Only the local best score carries over.*
102. **Level 1:** new *Last-life net* (tutorial aid), *Tutorial aids in level 1*, Top status panel (`LIVES`), Side message panel (`LIFE LOST`), Script (dive-jet and *T_c* lives cases), drowning paragraph, Stress checks (*No game over before the rescue*, new *Last-life net, adversarial*)  
   *Revision (Nov 2, 2026): Debu chose **GO-A**: in level 1 the last life can't be lost before the first rescue. From tick 0 until the rescue tick, a hit that would take lives from 1 to 0 leaves lives at 1. The hit is otherwise normal: the threat is removed, the hit look plays, and the 420 ms lock, 960 ms invulnerability and §8 respawn all apply. `LIFE LOST` isn't shown for an absorbed hit, and score and everything else are unchanged. Normal rules apply from the rescue on. It is a tutorial aid; its `TUTORIAL` label is open (no label is recommended, which conflicts with rulebook §3). This supersedes "no extra safety net" (accepted Nov 2) and replaces the sim-only "at most 2 lives" sentence. Game over before the rescue is now impossible by rule. The hit figures are stated as sim upper bounds, and the parked-at-column-1 example shows that 3 hits are possible.*
103. **Rulebook:** §5 *Restart* (seed)  
   *Revision (Nov 2, 2026): Debu chose **SD-A**: every run, restarts included, starts from a fresh random seed from the platform's random source. There is no fixed-seed test mode in the rulebook, so none was added.*
104. **Level 1:** *Last-life net*, *Top status panel* (`TUTORIAL`), *Side message panel*, *Approved panel strings*, *Stress checks* (*Panel layout*)  
   *Revision (Nov 2, 2026): Debu approved the new string `LAST LIFE SAFE` (A), which settles the label question left open in #102 and satisfies rulebook §3's every-aid-has-a-label rule. **Slot:** the top panel's `TUTORIAL` field gets two fixed slots: slot 1 `SAFE BOAT` (9 characters) and slot 2 `LAST LIFE SAFE` (14), separated by a 2-character gap, 25 characters in all. It is not a side-panel pinned line, so the side panel's 2-pinned and 4-line limits are unchanged. **On/off:** the net is now written as "on while lives = 1 before the rescue", which behaves the same as "on from tick 0" because hits at 3 or 2 lives aren't affected. So the label appears in step 5 of the tick a hit takes lives from 2 to 1, and it clears on the rescue tick R. **Side panel:** a 2 → 1 hit shows `LIFE LOST` as usual. An absorbed hit shows the transient `LAST LIFE SAFE` instead, for `msgHoldMs` 960 (ticks I to I + 15, cleared on I + 16), which always ends before R (R ≥ I + 33). The side-panel layout on each tick follows rulebook §3 rules 1–4 unchanged. Added to Approved panel strings, the side-panel table, and a new Panel layout stress check.*
105. **Rulebook:** §3 new *Screen and panel layout*, *Top status panel* (two rows, `SCORE` cap, `LIVES` digit), §9 `msgHoldMs` row and new *Panel layout defaults*  
   *Revision (Nov 2, 2026): Debu chose **W-A**. The rulebook now sets the screen from the existing 16×16 tiles and 18×14 grid. Text uses a 5×7 glyph in a fixed 6×8 px cell. The canvas is 416 × 248 px: a 24 px top panel, the 288 × 224 playfield and a 128 px side panel, with 4 px margins, so the top panel holds 68 cells per row and the side panel 20. Field columns are fixed: SCORE 12 cells (6 digits, new cap `scoreMax` 999,999), LIVES 7 (one digit; lives never exceed 3), DROWNED 11, FUEL 13 (5 cells kept for a caption that isn't approved yet, plus 8 segments). TUTORIAL doesn't fit on the same line (76 cells needed, or 71 with no caption, against 68), so it gets a second top row (25 cells). The arithmetic is written out: the longest side-panel string, PRESS DOWN: CHOPPER, is 19 of 20 cells, and PRESS ANY KEY is 78 of 288 px. No approved string was changed. Open: the score cap, LIVES as a digit, whole-number display scaling, the side-panel 16 px line pitch, and a FUEL caption string.*
106. **Rulebook:** §3 *Side message panel* rule 1 (transient timing)  
   *Revision (Nov 2, 2026): Debu chose **M-A**. Game-wide, a transient raised on tick E is drawn on E and on E + 1 to E + 15, and is gone on E + 16 (`msgHoldMs` 960 = 16S, now also listed in §9). The hold counts ticks, so a hidden tab and the PRESS ANY KEY pause freeze it. A repeat of the same string while it is showing restarts that line's hold from the new tick and moves it to the newest position, with no second line. That repeat rule is open for Debu.*
107. **Level 1:** *Last-life net*, *Top status panel* (`TUTORIAL`), *Side message panel* (`LIFE LOST`)  
   *Revision (Nov 2, 2026): Debu chose **L-A**. The three calls left open in #104 are now his decisions: the fixed TUTORIAL slots, the net written as on while lives = 1 before the rescue, and LIFE LOST's exact tick timing, which is now the game-wide rule from #106. The TUTORIAL field is placed on top-panel row 2 (#105).*
108. **Rulebook:** §3 *Screen and panel layout* (FUEL caption, S-A marks), *Side message panel* rule 1 (repeat). **Level 1:** *Approved panel strings*  
   *Revision (Nov 3, 2026): Debu chose **F-A**: the fuel-meter caption is `FUEL`, now an approved string. It fills top-panel cols 36–39 with a space in col 40, so the 13-cell FUEL field is exactly full (4 + 1 + 8). The caption is blank whenever the meter is. Debu chose **S-A**: open choices 1–4 and 6 from #105/#106 (score cap 999,999 with no leading zeros, LIVES as a digit, whole-number scaling, 16 px side-panel lines, a repeat restarting its hold) are now his decisions. The open notes in the rulebook were replaced by decision marks.*
109. **Rulebook:** §3 *Screen and panel layout* (text positions), *Side message panel* rules 3–4. **Level 1:** *Panel layout* stress check, side-panel `LAST LIFE SAFE` row  
   *Revision (Nov 3, 2026): final adversarial pass. (1) "Newest first" and rule 4's "order the events resolve" left the order of messages raised in the same tick ambiguous, and so which one is "oldest". Now: a tick's messages are listed top to bottom in resolution order, above all earlier ticks, and the oldest transient is the bottom transient line. (2) Pixel positions were left implicit. Now: top-panel cell column c is at x = 4 + 6c, with row 1 at y 4 and row 2 at y 12; side-panel text is left-aligned, column c at x = 292 + 6c. (3) The *Panel layout* check wrongly gave +100 as a possible transient while the boat is up. It now names `BOAT LOST`/`TRY AGAIN`, which also unpin both lines, and points to the repeat rule for two quick +100s. (4) The R ≥ I + 33 derivation no longer assumes a hooked move on the hook tick; it gives a lower bound instead. Items (1) and (2) are new choices for Debu to confirm.*
110. **Rulebook:** §3 *Side message panel* rules 3–4  
   *Revision (Nov 3, 2026): Debu approved (A) the same-tick message order from #109 item 1. It is now his decision.*
111. **Rulebook:** §3 *Screen and panel layout* (text positions)  
   *Revision (Nov 3, 2026): Debu approved (A) the text positions from #109 item 2, including left-aligned side-panel text. It is now his decision. No open questions remain for level 1.*

---

## Decisions log (verbatim copy of `river-guard-timing-v6-proposal.md`, *Debu decisions log*)

The v6 proposal remains the master copy of this log.
- Bomb sink: only a direct hit on the boat's cell sinks it (matches D8).
- D1: A, spawn 40·D·S/(W·p) = 1333/1333/943/667/471 (~5.4 jets).
- D2: A, keep 960 ms (16S literal) for invuln, message hold, L1 beats/replay; floors unchanged.
- D3: A, ceiling 3 then 2 cells above lane (rows 6/7).
- D4: A, chopper row 11, boats rows 12-13, hooked boat row 12 (2-tile sprite), towers rows 11-12.
- D5: B, mineLifetimeMs follows H: 5H·S = 4200 ms. Note: re-check mine flyover budget 2160 and crisis interplay at 4200 when applying.
- D6: A, jets and bombs always draw on top of hit flashes/bursts; reword level-1 line.
- D7: A, replace stale min-bomb-warning line with the two accurate notes; no rule change.
- D8: A (per Debu: tank modes only + direct hit only), recommended sink rule as written.
- D9: A, clear all jets and bombs below the ceiling on the rescue Down tick, no score.
- D10: no special rule (follows from D9).
- D11: A and B both: boats spawn only in a bomb-free column (retry each tick), AND only bombs dropped after the boat spawned can sink it (backstop; redundant under the spawn rule).
- D12: A, keep input -> move -> hits order; invulnerable tank lets bombs pass.
- D13: B, sunk boats tracked separately (SUNK n/3 counter); game over at 3 drowned OR 3 sunk. Sink otherwise ends crisis like a drown (Crisis None, budget discarded, scheduler restarts, counts as a boat for alternation). Tutorial boat replays without counting. Needs: top-panel SUNK field + wording approval.
- D13 (revised by Debu): A, sunk boat counts exactly like a drowning (DROWNED +1, Crisis None, budget discarded, scheduler restarts, counts as a boat for alternation, 3 total ends the game). Supersedes the separate-tracking entry above.
- D14: A, transient side-panel message BOAT SUNK (approved string); no separate counter; river bombs use normal bomb sprite.
- Worst-hook formula (Nov 2, 2026): A — simplified to `8S + 4X·S`; value 4,560 unchanged.
- Mine flyover (Nov 2, 2026): A — cut; jump is the only answer to mines; chopper is boat-rescue only; mine flight budget 2,160 removed.
- Drown while flying (Nov 2, 2026): A — auto-return to Tank at current column, like a rescue.
- Timer expiry in tick (Nov 2, 2026): A — input first, then timers, then threat steps, then hits; a hook on the expiry tick saves the boat.
- Shell timing (Nov 2, 2026): A — shells step with threats (step 3), shell hits in step 5, pass-through counts as a hit.
- Point-blank shot (Nov 2, 2026): A — shell hit resolves before jet–tank hit; jet dies, +100, no life lost.
- Near miss (Nov 2, 2026): A — miss; hit = same cell or swap.
- Fire mid-jump (Nov 2, 2026): A — shell starts in the tank's actual cell (row 8 while airborne).
- Move and fire (Nov 2, 2026): A — shell uses the column after the move.
- Tick length (Nov 2, 2026): A — fixed 60 ms tick with catch-up.
- Jump cooldown (Nov 2, 2026): A — 240 ms after landing, written into the design doc.
- Simultaneous hits (Nov 2, 2026): A — at most one life per tick; other threats pass through.
- Speed change mid-flight (Nov 2, 2026): A — accumulator scaled proportionally, capped below one step.
- Catch-up limits (Nov 2, 2026): A — max 5 ticks/frame, pause when hidden, press on first tick.
- Jump rows (Nov 2, 2026): A — row 8 for the whole jump, normal hits.
- Jump+Fire order (Nov 2, 2026): A — move, then Jump, then Fire.
- Mine jump bonus (Nov 2, 2026): A — +200 per clean jump over a live mine; none on the expiry tick.
- Simultaneous hit priority (Nov 2, 2026): A — mine, then bomb, then jet.
- Hit mid-jump (Nov 2, 2026): A — jump ends, wreck stays on row 8, no cooldown.
- Jump+Fire vs descending jet (Nov 2, 2026): A — kept; shell misses, tank is hit.
- Airtime and move rate in design doc (Nov 2, 2026): A — 480 ms and 120 ms as in v6.
- Jump on Up (Nov 2, 2026): A — Jump moves to Up; one action per press, decided by mode at start of step 1.
- Hit vs mine clear same tick (Nov 2, 2026): B — hit resolves first; life lost, mine stays live, no bonus.
- Chopper move vs Up (Nov 2, 2026): A — move first; reaching the bank rescues and the Up does nothing.
- Held vs tapped Left/Right (Nov 2, 2026): A — tap moves at once; hold repeats every 120 ms.
- Chopper move vs Down (Nov 2, 2026): A — move first, then the hook checks the new column.
- Airborne ticks (Nov 2, 2026): A — 480 ms airtime gives 7 airborne ticks; intended.
- Fast tapping (Nov 2, 2026): B — every new press moves at once; tapping can beat the 120 ms hold rate.
- Both directions same tick (Nov 2, 2026): A — no move until one is released.
- Chopper tapping (Nov 2, 2026): A — fast tapping is tank-only; chopper capped at its hold rate.
- Release with other key held (Nov 2, 2026): A — the held key acts as a new press and moves at once.
- Held key through lock or mode change (Nov 2, 2026): A — acts as a new press on the first tick it can act.
- Down + Up same tick (Nov 2, 2026): A — Down counts, Up ignored.
- Chopper-entry Down (Nov 2, 2026): A — entry Down never hooks; hook needs a new press.
- Hold to fire (Nov 2, 2026): A — one press per shot; holding never auto-fires.
- Fire vs chopper-entry Down (Nov 2, 2026): A — Fire first; the shell keeps flying.
- Early chopper tap (Nov 2, 2026): A — kept and moved when allowed, even if released.
- Same-frame presses (Nov 2, 2026): A — repeated presses of one button within a frame merge into one.
- Resume after hidden tab (Nov 2, 2026): A — stays paused until a key press.
- Same-frame L+R, one released (Nov 2, 2026): A — the still-held arrow moves.
- Resume details (Nov 2, 2026): A — resume press consumed; held resume key ignored until released; PRESS ANY KEY centred on the playfield.
- Two opposite taps in one frame (Nov 2, 2026): A — no move.
- Held-back counters (Nov 2, 2026): A — capped just below one step; one step on the first allowed tick, no burst.
- Leftovers (Nov 2, 2026): A — FUEL wording fixed; invariants 14–19 now checked in Phases 2–3.
- Split finish (Nov 2, 2026): A — old doc frozen; edits go to rulebook + changelog; references repointed; §13 renamed Playtest revisit points; status line added; slowMultiplier dropped.
- Fire key (Nov 2, 2026): A — Fire is Space; arrows for Left/Right/Up/Down; prompts name keys (`SPACE: FIRE`), never ▲ for Fire.
- Level-1 pre-boat prompts (Nov 2, 2026): A — `MOVE ◀ ▶` until first move, then `SPACE: FIRE` until first shot, then none; boat prompts take over when the boat appears.
- Level-1 bomb figures (Nov 2, 2026): A — guaranteed bomb stays at a random column, no fallback (Q14 reaffirmed); Bomb seen re-run at 60 ms per column: aimers 47.2–53.5% see no bomb, guaranteed bomb lost 74.2–79.1%.
- Level-1 dive jet (Nov 2, 2026): A — second scripted dive jet in the tank's column, spawning the tick after the cross jet leaves; normal 0.10 rolls, no guarantee, shootable; boat rule unchanged (issue 5 open).
- Level-1 run after clear (Nov 2, 2026): A — after `LEVEL 1 CLEAR` the run continues into normal band-A play, score kept; a restart begins at level 1.
- Level-1 game-wide rules (Nov 2, 2026): A — impact pacing, bomb-hit look and respawn rule live in the rulebook (§4 Tank, §8); new tunable `impactLockMs` = 420 (7S); level 1 keeps a pointer.
- Level-1 tick-exact times (Nov 2, 2026): A — all level-1 times are tick-exact `t_ms` from tick 0; cross jet enters on tick 23 (1,380), exits 8,580.
- Tutorial aid definition (Nov 2, 2026): A — an aid relaxes a normal rule in the player's favour; scripted content is not an aid.
- Level-1 FUEL and boat bar (Nov 2, 2026): A — `FUEL` row added to level 1; the outline tutorial boat keeps 2 px for the timer bar.
- Level-1 drown messages (Nov 2, 2026): A — `SAFE BOAT` stays on until the rescue; `BOAT LOST` and `TRY AGAIN` show together for 960 ms; `TUTORIAL BOAT` re-pins on each new boat.
- Level-1 fuel-out (Nov 2, 2026): A — under `SAFE BOAT`, fuel running out ends the attempt at once with `BOAT LOST`/`TRY AGAIN` and a replay.
- Respawn control wording (Nov 2, 2026): A — "480 ms of control" (of 540 ms protection) after respawn.
- Level-1 boat timing (Nov 2, 2026): A — tutorial boat comes 960 ms after both jets are gone and column 13 is bomb-free (normal §4 rule); bombs elsewhere may still fall.
- Level-1 dive-jet details (Nov 2, 2026): A — dive-jet choices 1–8 approved as written (spawn T_x + 60, column after step 1, lock wait, T_dj hit keeps column, normal rolls, shootable, no spawn at 0 lives, scripted path).
- Level-1 after clear (Nov 2, 2026): A — lives carry over; normal spawner starts at 0 on the rescue tick (first jet 1,380 ms later); a restart always begins at level 1 (rulebook §5).
- Level-1 fuel-out tie (Nov 2, 2026): A — fuel-out and drowning on the same tick count as a fuel-out; aid-definition wording kept.
- Level-1 message clear tick (Nov 2, 2026): A — `BOAT LOST`/`TRY AGAIN` clear on D + 16, the tick the replay boat spawns.
- Level-1 bomb figures correction (Nov 2, 2026): A — Bomb seen re-run with the true 660 ms refire; #80 corrected by note #98.
- Level-1 boat check timing (Nov 2, 2026): A — checked in step 6 after hits; a jet shot that tick counts as gone.
- Level-1 pending dive jet (Nov 2, 2026): A — a pending dive jet counts as on screen; the gap tick isn't "no jet".
- Restart resets (Nov 2, 2026): A — a restart is a fresh run; boat and mine unlocks and all run state reset; only the local best score carries over.
- Level-1 last-life net (Nov 2, 2026): GO-A — before the first rescue a hit at 1 life leaves lives at 1 (normal hit otherwise); a tutorial aid; label open.
- Restart seed (Nov 2, 2026): SD-A — a fresh random seed on every run, restarts included.
- Level-1 last-life net label (Debu, Nov 2, 2026, A): new approved string `LAST LIFE SAFE`. It shows in the top panel's `TUTORIAL` field, slot 2 (`SAFE BOAT` is slot 1; fixed slots), while lives = 1, from the tick lives become 1 until the rescue tick R. On an absorbed hit it is a side-panel transient instead of `LIFE LOST` (960 ms, ticks I to I + 15). A 2 → 1 hit shows `LIFE LOST` as usual.
- Screen and panel layout (Debu, Nov 2, 2026, W-A): 5×7 glyph in a 6×8 px fixed-width cell. Canvas 416 × 248 px: a 24 px two-row top panel, a 288 × 224 playfield and a 128 px side panel (20 cells). Top row 1 has SCORE (6 digits, `scoreMax` 999,999), LIVES (1 digit), DROWNED n/3 and FUEL (8 segments); top row 2 has TUTORIAL (25 cells), because one line would need 76 cells and only 68 fit. A `FUEL` caption is open.
- Transient messages (Debu, Nov 2, 2026, M-A): game-wide, drawn on the event tick E and on E + 1 to E + 15, gone on E + 16 (`msgHoldMs` 960, 16S). A hidden tab or the resume pause freezes them. A repeat of a showing message restarts its hold on one line (open).
- Level-1 layout calls (Debu, Nov 2, 2026, L-A): fixed TUTORIAL slots (`SAFE BOAT` left, `LAST LIFE SAFE` right, 2-cell gap); the net written as on while lives = 1 before the rescue; `LIFE LOST` drawn I to I + 15 and gone on I + 16.
- Fuel caption (Debu, Nov 2, 2026, F-A): `FUEL` is an approved string. It goes in top-panel cols 36–39, with col 40 a space, then the 8 segments in cols 41–48 (13 of 13 cells).
- Layout choices (Debu, Nov 3, 2026, S-A): `scoreMax` 999,999 shown with no leading zeros; LIVES as one digit; whole-number scaling with sharp pixels, centred; side-panel lines 16 px apart; a repeat of a showing message restarts its hold on one line, with no duplicate.
- Side-panel message order (Debu, Nov 3, 2026, A): a tick's messages are listed top to bottom in the order they happen, above earlier ticks; the bottom message line is dropped first.
- Panel text positions (Debu, Nov 3, 2026, A): top-panel column c at x = 4 + 6c, with row 1 at y 4 and row 2 at y 12; side-panel text left-aligned, column c at x = 292 + 6c.
