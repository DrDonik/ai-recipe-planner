---
name: localstorage-error-handling
status: backlog
created: 2026-02-23T09:11:39Z
progress: 0%
prd: .claude/prds/localstorage-error-handling.md
github: [Will be updated when synced to GitHub]
---

# Epic: localstorage-error-handling

## Overview

Extend `useLocalStorage` and `useStringLocalStorage` to expose a `persistError` boolean flag, then surface persistence failures to the user via the existing notification system in `App.tsx`. The change is backwards-compatible — existing `[state, setState]` destructuring continues to work unchanged.

## Architecture Decisions

1. **Tuple extension over new hook** — Adding a third element to the existing return tuple is the simplest approach. TypeScript tuple destructuring ignores trailing elements, so all 20+ existing call sites remain untouched.

2. **Centralized error surfacing in App.tsx** — Rather than having each consumer show its own notification, `App.tsx` already owns both the `showNotification` function and the majority of `useLocalStorage` calls (9 of 20). A single `useEffect` in `App.tsx` that watches all `persistError` flags and fires one notification avoids spam and keeps notification logic in one place.

3. **SettingsContext error propagation** — `SettingsContext.tsx` has 7 hook calls. Expose a single `persistError` boolean from the context (OR of all individual errors) so `App.tsx` can include it in its error check without reaching into context internals.

4. **ShoppingList self-reports** — `ShoppingList.tsx` has 1 hook call and already receives `onShowNotification` as a prop. It can fire the notification directly when its `persistError` becomes true.

5. **Deduplicated notification** — Use a ref-based guard in `App.tsx` to ensure the storage-error notification fires at most once per error episode (resets when all errors clear).

## Technical Approach

### Hook Changes (`src/hooks/useLocalStorage.ts`)
- Add `const [persistError, setPersistError] = useState(false)` to both hooks.
- In the `useEffect` write path: set `true` on catch, `false` on success.
- Return `[state, setState, persistError] as const`.
- No changes to the read path (initializer).

### SettingsContext (`src/contexts/SettingsContext.tsx`)
- Destructure `persistError` from each of the 7 hook calls.
- Derive a single `storagePersistError` boolean (logical OR).
- Expose `storagePersistError` on the context value.

### App.tsx
- Destructure `persistError` from its 9 direct hook calls.
- Read `storagePersistError` from `SettingsContext`.
- Single `useEffect` watches all error flags; on any `true`, call `showNotification` with translated error message (no auto-dismiss).
- Ref guard prevents repeat notifications until all errors clear.

### ShoppingList.tsx
- Destructure `persistError` from its 1 hook call.
- `useEffect` fires `onShowNotification` when `persistError` becomes `true`.

### Translations (`src/constants/translations.ts`)
- Add `storageError` key to all four languages:
  - EN: "Could not save data — your browser storage may be full. Some changes may be lost on refresh."
  - DE/ES/FR: equivalent translations.

## Implementation Strategy

1. **Phase 1**: Modify hooks + add tests for error path.
2. **Phase 2**: Wire up SettingsContext, App.tsx, ShoppingList.tsx + add integration-level tests.
3. **Phase 3**: Add translation keys + verify no regressions.

All phases can be done in a single branch; they are listed for review clarity, not separate PRs.

### Testing Approach
- Unit tests for both hooks: mock `localStorage.setItem` to throw `QuotaExceededError`, verify `persistError` toggles correctly.
- Component test: verify `App.tsx` shows notification when a hook reports `persistError`.
- Verify existing tests still pass (tuple extension is non-breaking).

## Task Breakdown Preview

- [ ] Task 1: Add `persistError` flag to `useLocalStorage` and `useStringLocalStorage` hooks
- [ ] Task 2: Add unit tests for hook error paths
- [ ] Task 3: Expose `storagePersistError` from `SettingsContext`
- [ ] Task 4: Wire error notification in `App.tsx` and `ShoppingList.tsx`
- [ ] Task 5: Add translation keys for storage error message (EN, DE, ES, FR)
- [ ] Task 6: Add integration tests for notification flow
- [ ] Task 7: Manual QA and regression check

## Dependencies

- None — uses only existing React primitives and the existing notification system.

## Success Criteria (Technical)

- `persistError` is `true` when `localStorage.setItem` throws, `false` after a successful write.
- A single notification appears when any hook encounters a persistence error.
- No duplicate notifications for simultaneous errors across multiple keys.
- Notification does not auto-dismiss.
- All existing tests pass without modification.
- New tests cover: hook error flag toggle, notification display, deduplication.

## Tasks Created

- [ ] 001.md - Add persistError flag to localStorage hooks (parallel: false)
- [ ] 002.md - Add storage error translation keys (parallel: true)
- [ ] 003.md - Wire error notifications in SettingsContext, App.tsx, and ShoppingList (parallel: false, depends on 001+002)
- [ ] 004.md - Final verification and regression check (parallel: false, depends on 003)

Total tasks: 4
Parallel tasks: 1 (002 can run alongside 001)
Sequential tasks: 3
Estimated total effort: S

## Estimated Effort

- **Size**: Small (hooks + wiring + translations + tests)
- **Files touched**: 5 source files, 2-3 test files, 1 translations file
- **Risk**: Low — backwards-compatible tuple extension, no architectural changes
