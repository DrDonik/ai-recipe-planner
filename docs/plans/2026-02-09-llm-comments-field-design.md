# Design: LLM Comments Field on Recipes

**Date**: 2026-02-09
**Status**: Approved

## Summary

Add an optional `comments` field to the `Recipe` type. The LLM uses it to include a fun/surprising fact about the dish or its ingredients (1-2 sentences), or to make a lighthearted remark about unusual/inedible ingredients the user may have entered. Displayed as a subtle easter-egg-style footer on the single recipe view only.

## Data Model & Schema

- Add `comments?: string` to the `Recipe` interface in `src/types/index.ts`
- Add `comments: z.string().optional()` to `RecipeSchema` in `src/services/llm.ts`
- No changes to `MealPlan`, `Ingredient`, `Nutrition`, or any other types
- Fully backwards compatible: existing cached meal plans and shared recipe URLs without the field continue to work

## LLM Prompt Changes

In `buildRecipePrompt()` (`src/services/llm.ts`):

- Add a rule: "Optionally include a `comments` field (1-2 sentences). Use it for a fun or surprising fact about the dish or its ingredients -- or, if the user provided unusual/inedible items, a lighthearted remark about why you skipped them."
- Add `"comments": "..."` to the JSON Structure example

The instruction is kept soft ("optionally") so the LLM treats it as a bonus, not an obligation. This preserves the easter-egg feel.

## UI Changes

### Recipe overview (multi-card list)
- **No change.** The `comments` field is not rendered in overview mode.

### Single recipe view (detail/expanded)
- If `recipe.comments` is present and non-empty, render a footer line:
  - Lucide `Lightbulb` icon (small size, muted color)
  - Comment text in smaller, muted font
  - Positioned below nutrition info (or below instructions if no nutrition)
  - No header or label -- just icon + text

### Styling
- Subtle and unobtrusive, consistent with the existing muted/secondary text styles
- Should feel like a footnote discovery, not a feature section

## What's NOT Changing

- No new localStorage keys
- No new translation keys (LLM generates content in the selected language via existing prompt instruction)
- No changes to sharing/URL encoding (optional field passes through naturally)
- No new components (small conditional block in RecipeCard)
- No changes to tests beyond covering the new optional field

## Testing

- Update Zod schema tests to verify `comments` is accepted when present and passes validation when absent
- Update MSW mock handlers to include `comments` in some responses
- Add RecipeCard test verifying comment renders in detail view and is absent in overview
