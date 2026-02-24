---
name: missing-ingredients-per-recipe-fix
status: completed
created: 2026-02-24T14:47:30Z
progress: 100%
prd: .claude/prds/missing-ingredients-per-recipe-fix.md
github: https://github.com/DrDonik/ai-recipe-planner/issues/164
---

# Epic: missing-ingredients-per-recipe-fix

## Overview

Two targeted changes to `buildRecipePrompt()` in `src/services/llm.ts`:

1. Rewrite rule 13 to explicitly scope `missingIngredients` to the individual recipe.
2. Add a new rule that defines the top-level `shoppingList` as the cross-recipe aggregate.

No data model, UI, schema, or dependency changes required.

## Architecture Decisions

- **Prompt-only fix**: The bug lives entirely in the natural language instructions sent to the LLM. The data model (`missingIngredients?: Ingredient[]` per recipe, `shoppingList: Ingredient[]` at meal plan level) is already correct.
- **No frontend defensive logic**: Adding frontend cross-validation would mask the prompt problem rather than fix it. The prompt is the right place to enforce this contract.
- **Rule numbering preserved**: Existing rules retain their numbers where possible; a new rule is appended after the current last rule to minimise diff noise.

## Technical Approach

### The Two Prompt Changes

**Change 1 — Rewrite rule 13** (currently: "If the same ingredient is missing in different recipes, combine them in the `missingIngredients` array and total the amount needed."):

Replace with:
> "Each recipe's `missingIngredients` must list only the ingredients that specific recipe requires to be purchased, at the amount needed for that recipe alone. Do not combine amounts across recipes in `missingIngredients`."

**Change 2 — Add new rule** (after rule 16):
> "The top-level `shoppingList` is the aggregated shopping list across all recipes. If the same ingredient is needed in multiple recipes, combine the totals here."

### Files Changed

| File | Change |
|------|--------|
| `src/services/llm.ts` | Rewrite rule 13; add new `shoppingList` rule |
| `src/__tests__/services/llm.test.ts` | Update/add assertions for new rule text |

### No Changes Needed

- `src/types/index.ts` — types unchanged
- `src/components/RecipeCard.tsx` — UI unchanged
- `src/components/ShoppingList.tsx` — UI unchanged
- All Zod schemas — unchanged

## Implementation Strategy

This is a single-task implementation:

1. Edit the two rules in `buildRecipePrompt()`.
2. Update `llm.test.ts` to assert the new rule text is present and the old ambiguous text is absent.
3. Run the full test suite to confirm no regressions.

## Task Breakdown

- [ ] **Task 1**: Rewrite rule 13 and add `shoppingList` rule in `buildRecipePrompt()`; update `llm.test.ts` assertions.

## Dependencies

- None. Standalone change to a single function.

## Success Criteria (Technical)

- Rule 13 no longer contains the phrase "combine them in the `missingIngredients` array".
- A new rule explicitly describes the `shoppingList` field's aggregation purpose.
- All existing tests in `llm.test.ts` pass.
- New/updated test assertions confirm the corrected rule text.

## Estimated Effort

- Minimal: ~2 lines changed in `llm.ts`, ~5–10 lines updated in `llm.test.ts`.
- Critical path: the prompt edit itself; testing is straightforward.

## Tasks Created

- [ ] #165 - Fix missingIngredients prompt rules and update tests (parallel: false)

Total tasks: 1
Parallel tasks: 0
Sequential tasks: 1
Estimated total effort: 1 hour
