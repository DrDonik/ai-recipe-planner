# Decision: No Import Button for Shared Views

**Date:** 2026-02-09
**Status:** Decided -- not building

## Context

Considered adding an "Import" button to shared recipe and shopping list views, allowing recipients to pull shared content into their own app state.

## Personas Analyzed

1. **Household partners (primary use case):** One person generates the meal plan, shares recipes or shopping lists to their partner. Both share the same kitchen/pantry.
2. **Solo cook:** Uses the app for their own meals, occasionally shares a recipe to a friend.
3. **Casual receiver:** Gets a shared link, opens it once, moves on.

## Key Finding

For all realistic personas, shared views are **ephemeral and task-oriented**:

- Shopping lists are used at the store, then discarded.
- Shared recipes are cooked from once, then the view is closed.
- The "source of truth" meal plan lives in one app instance per household.

## Why Import Doesn't Add Value

- **No persistence need:** Users don't revisit shared content. If they do, the URL still works.
- **No integration need:** Household partners share one pantry, so pantry-aware recalculation is pointless. Cross-household pantry matching would be an ingredient-name-matching nightmare.
- **UX complexity:** Import raises hard questions (merge vs. replace meal plan?) for a feature with no real demand.
- **Recipe collecting:** Not a use case for this app. LLMs make recipe generation cheap -- regenerate rather than archive.

## Decision

Don't build it. The current shared views are well-designed for their purpose: lightweight, self-contained, disposable snapshots.

Revisit only if a clear use case emerges where two independent app users with separate pantries regularly exchange recipes.
