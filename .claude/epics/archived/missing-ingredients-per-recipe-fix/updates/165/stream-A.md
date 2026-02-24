---
issue: 165
stream: Prompt + Test Update
agent: fullstack-specialist
started: 2026-02-24T14:52:01Z
status: completed
---

# Stream A: Prompt + Test Update

## Scope
Rewrite rule 13 in `buildRecipePrompt()` to scope `missingIngredients` per-recipe, insert new rule 17 for `shoppingList` aggregation, renumber subsequent rules, and update test assertions.

## Files
- `src/services/llm.ts`
- `src/__tests__/services/llm.test.ts`

## Progress
- Updated rule 13: per-recipe missingIngredients scoping
- Added rule 17: shoppingList aggregation across recipes
- Renumbered rules 17->18 and 18->19
- Added test: 'should enforce per-recipe missingIngredients and aggregated shoppingList rules'
- Build: passed
- Tests: 278 passed, 3 skipped (integration tests, expected)
- Committed: 80ed1b0
