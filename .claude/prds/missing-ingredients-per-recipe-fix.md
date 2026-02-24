---
name: missing-ingredients-per-recipe-fix
description: Fix LLM prompt ambiguity that causes all missing ingredients to be grouped into one recipe instead of scoped per recipe.
status: backlog
created: 2026-02-24T14:46:18Z
---

# PRD: missing-ingredients-per-recipe-fix

## Executive Summary

The LLM prompt contains an ambiguous rule that occasionally causes the model to dump all missing ingredients from the entire meal plan into a single recipe's `missingIngredients` array instead of scoping each recipe's list to its own requirements. The fix is two targeted prompt rule changes — no data model or UI changes required.

## Problem Statement

### What is broken

Rule 13 in `buildRecipePrompt()` reads:
> "If the same ingredient is missing in different recipes, combine them in the `missingIngredients` array and total the amount needed."

The phrase "combine them in the `missingIngredients` array" does not specify *which recipe's* array. The LLM sometimes interprets this as: collapse all missing ingredients from the whole meal plan into one recipe. The result is one recipe with an inflated, unrelated `missingIngredients` list and the remaining recipes with empty or missing arrays.

Additionally, the prompt never explicitly describes what the top-level `shoppingList` field is for or how it relates to per-recipe `missingIngredients`. The LLM is left to infer the relationship, which is unreliable.

### Why this matters

The "Need to Buy" section in each `RecipeCard` is supposed to show at a glance what a user must purchase specifically for that dish. When everything is bunched into one recipe, the feature is misleading and confusing.

## User Stories

**Primary persona:** A home cook using the app to plan meals from pantry items.

### Story 1
> As a user, when I view a recipe card I want to see only the ingredients I need to buy *for that recipe*, so I can shop accurately for a single dish.

**Acceptance criteria:**
- Each recipe card's "Need to Buy" section contains only ingredients relevant to that recipe.
- No recipe card shows ingredients from other recipes.
- If a recipe uses only pantry/spice items, its "Need to Buy" section is empty (or hidden).

### Story 2
> As a user, I want the shopping list to aggregate all purchases across all recipes, so I only need to buy each item once in the correct total quantity.

**Acceptance criteria:**
- The top-level shopping list totals amounts correctly when the same ingredient appears in multiple recipes.
- The shopping list is consistent with (but distinct from) the per-recipe `missingIngredients` arrays.

## Requirements

### Functional Requirements

1. **Per-recipe scope**: Each recipe's `missingIngredients` array contains only the ingredients that specific recipe requires from the store, at the amount needed for that recipe.
2. **Top-level aggregation**: The `shoppingList` field aggregates across all recipes; if the same ingredient appears in multiple recipes, amounts are combined there.
3. **Prompt rule 13 rewrite**: Replace the ambiguous rule with an explicit per-recipe scoping rule.
4. **New shoppingList rule**: Add an explicit rule describing the `shoppingList` field's purpose and its relationship to per-recipe `missingIngredients`.
5. **No regression**: All existing rules (12, 15, 16) governing `missingIngredients` content (exclude available spices, distinct objects, buy spices via this array) remain intact.

### Non-Functional Requirements

- **No data model changes**: `Recipe.missingIngredients` and `MealPlan.shoppingList` types are unchanged.
- **No UI changes**: `RecipeCard` and `ShoppingList` components are unchanged.
- **No new dependencies**: Pure prompt text change.
- **Backwards compatibility**: Existing Zod schemas (`missingIngredients` optional) remain unchanged.

## Success Criteria

- Manually generating 5+ meal plans no longer produces a recipe with an anomalously large `missingIngredients` list containing items from other recipes.
- Unit tests for `buildRecipePrompt()` verify the new rule text is present and the old ambiguous text is absent.
- Existing `llm.test.ts` tests continue to pass without modification.

## Constraints & Assumptions

- The fix is limited to `buildRecipePrompt()` in `src/services/llm.ts`.
- LLM behaviour is non-deterministic; the fix reduces but cannot eliminate all prompt misinterpretation. The assumption is that explicit scoping language significantly reduces the failure rate.
- No integration test against a live API is required to ship (the existing integration test suite covers this path).

## Out of Scope

- Frontend validation that cross-checks per-recipe `missingIngredients` sums against `shoppingList` totals.
- UI changes to the "Need to Buy" section in `RecipeCard`.
- Changes to how `shoppingList` is displayed in `ShoppingList.tsx`.
- Any changes to the Zod schemas or TypeScript types.
- Prompt changes unrelated to `missingIngredients` / `shoppingList`.

## Dependencies

- `src/services/llm.ts` — only file to be modified.
- `src/__tests__/services/llm.test.ts` — tests must be updated to assert the new rule text.
- No external dependencies.
