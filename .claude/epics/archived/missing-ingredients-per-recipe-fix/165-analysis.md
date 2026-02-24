---
issue: 165
title: Fix missingIngredients prompt rules and update tests
analyzed: 2026-02-24T14:51:13Z
estimated_hours: 1
parallelization_factor: 1.0
---

# Parallel Work Analysis: Issue #165

## Overview
Rewrite rule 13 in `buildRecipePrompt()` to scope `missingIngredients` per-recipe instead of cross-recipe, add a new rule 17 defining `shoppingList` as the cross-recipe aggregate, renumber subsequent rules, and update `llm.test.ts` to assert the corrected rule text.

## Parallel Streams

### Stream A: Prompt + Test Update
**Scope**: Rewrite rule 13, add rule 17, renumber remaining rules in `llm.ts`; add/update test assertions in `llm.test.ts`
**Files**:
- `src/services/llm.ts`
- `src/__tests__/services/llm.test.ts`
**Agent Type**: fullstack-specialist
**Can Start**: immediately
**Estimated Hours**: 1
**Dependencies**: none

## Coordination Points

### Shared Files
None — only one stream, no coordination required.

### Sequential Requirements
1. Modify `src/services/llm.ts` first (change rule 13, insert rule 17, renumber rules 17→18+)
2. Update `src/__tests__/services/llm.test.ts` to assert new rule text

## Conflict Risk Assessment
- **Low Risk**: Single stream, two directly related files

## Parallelization Strategy

**Recommended Approach**: sequential

This issue is marked `parallel: false` and is XS size (1h). The test changes directly validate the prompt text changes — they are tightly coupled and must be done in sequence within the same stream.

## Expected Timeline

With single stream:
- Wall time: 1 hour
- Total work: 1 hour
- Efficiency gain: N/A (no parallelization possible)

## Notes

**Key changes in `src/services/llm.ts`:**
- Line ~157: Replace rule 13 text ("If the same ingredient is missing in different recipes, combine them in the `missingIngredients` array and total the amount needed.") with: "Each recipe's `missingIngredients` must list only the ingredients that specific recipe requires to be purchased, at the amount needed for that recipe alone. Do not combine amounts across recipes in `missingIngredients`."
- After rule 16: Insert new rule 17: "The top-level `shoppingList` is the aggregated shopping list across all recipes. If the same ingredient is needed in multiple recipes, combine the totals here."
- Renumber former rule 17 ("Return ONLY valid JSON…") to 18, and any subsequent rules accordingly.

**Key changes in `src/__tests__/services/llm.test.ts`:**
- Assert prompt does NOT contain: `"combine them in the"`
- Assert prompt DOES contain: `"that specific recipe"` or `"for that recipe alone"`
- Assert prompt DOES contain the new `shoppingList` aggregation rule text
