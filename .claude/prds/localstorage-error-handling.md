---
name: localstorage-error-handling
description: Surface localStorage persistence failures to users instead of silently losing data
status: backlog
created: 2026-02-23T09:10:22Z
github_issue: 104
---

# PRD: localStorage Error Handling

## Problem

The `useLocalStorage` and `useStringLocalStorage` hooks silently swallow `QuotaExceededError` (and other write failures). When localStorage is full, the in-memory state diverges from persisted state. The user believes their data is saved, but it is lost on page refresh.

This affects all persisted data: pantry items, spice rack, meal plans, shopping lists, and settings.

## Goal

When localStorage persistence fails, notify the user immediately so they can take action (e.g., clear old data) rather than discovering data loss after a page refresh.

## Requirements

### R1: Expose persistence error state from hooks
- Both `useLocalStorage<T>` and `useStringLocalStorage` must return a `persistError: boolean` flag as a third tuple element.
- The flag is `true` when the most recent write to localStorage failed, `false` otherwise.
- The flag resets to `false` on the next successful write.

### R2: User-visible notification on persistence failure
- When any `useLocalStorage` / `useStringLocalStorage` consumer detects `persistError === true`, the app displays a notification using the existing `Notification` system in `App.tsx`.
- The notification type should be `'error'`.
- The message should be translated (all four languages) and clearly state that data could not be saved.
- The notification should not auto-dismiss — the user must acknowledge it.

### R3: No breaking changes
- Existing consumers that destructure `[state, setState]` must continue to work without modification (tuple extension is backwards-compatible).
- Consumers that want error awareness opt in by destructuring the third element.

## Out of Scope

- localStorage cleanup/eviction strategies (separate feature)
- Migrating to IndexedDB or other storage backends
- Retry logic for failed writes

## Success Criteria

1. When localStorage is full, the user sees a clear error notification.
2. The `persistError` flag accurately reflects the current persistence state.
3. All existing tests continue to pass.
4. New tests cover the error path for both hooks.
5. Translation keys added for all four languages.

## Technical Notes

- The existing notification system in `App.tsx` uses `showNotification(notif: Notification)` with `setNotification` state.
- Notification type `'error'` is already supported.
- The hooks are used in many components; surfacing the error at the `App.tsx` level (or via a dedicated error-aggregation hook) would avoid scattering notification logic across all consumers.
- Consider a single "storage error" notification that fires once, not per-key, to avoid notification spam.
