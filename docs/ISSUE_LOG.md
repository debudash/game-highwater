# Issue log

Every bug fix, newest first. Each has a test with the same ID and a comment block at the fix site.

| ID | Found | Issue | Root cause | Fix | Test | Commit |
|---|---|---|---|---|---|---|
| HW-001 | 2026-11-03, Debu, feel check | Hooking a boat with the chopper was very hard: it had to hover still within 10 px for 0.2 s | The hover rule existed only so that landing on a crate wouldn't pick it up | The hook is automatic within reach (about 2 tiles down, a tile either side); the crate you just set down is skipped until you fly away, so you can still land on it to refuel | `HW-001` tests in `tests/chopper.test.ts` | `1423850` (fixed inside the commit that introduced the chopper code; the build had not been committed before) |
