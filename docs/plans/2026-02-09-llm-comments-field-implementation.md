# LLM Comments Field Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an optional `comments` field to recipes for fun facts, shown only in single recipe view.

**Architecture:** Add `comments?: string` to the Recipe type and Zod schema, update the LLM prompt to optionally request fun facts, and render the comment as a subtle lightbulb-icon footer in RecipeCard when `isStandalone` is true.

**Tech Stack:** TypeScript, Zod, React, Lucide React, Vitest, Testing Library, MSW

---

### Task 1: Add `comments` to Recipe type and Zod schema

**Files:**
- Modify: `src/types/index.ts:37-46`
- Modify: `src/services/llm.ts:52-62`

**Step 1: Add `comments` to the Recipe interface**

In `src/types/index.ts`, add `comments?: string` after the `nutrition` field (line 45):

```typescript
export interface Recipe {
  id: string;
  title: string;
  time: string;
  ingredients: Ingredient[];
  instructions: string[];
  usedIngredients: string[]; // List of PantryItem IDs used
  missingIngredients?: Ingredient[]; // Optional: excluded in shared recipes
  nutrition?: Nutrition; // Optional for backwards compatibility
  comments?: string; // Optional fun fact or remark from the LLM
}
```

**Step 2: Add `comments` to the Zod RecipeSchema**

In `src/services/llm.ts`, add `comments: z.string().optional()` after the `nutrition` field (line 61):

```typescript
export const RecipeSchema = z.object({
  id: z.string(),
  title: z.string(),
  time: z.string(),
  ingredients: z.array(IngredientSchema),
  instructions: z.array(z.string()),
  usedIngredients: z.array(z.string()),
  missingIngredients: z.array(IngredientSchema).optional(),
  nutrition: NutritionSchema.optional(),
  comments: z.string().optional(),
});
```

**Step 3: Run tests to verify nothing breaks**

Run: `npm test -- --run`
Expected: All existing tests PASS (schema is backwards compatible)

**Step 4: Commit**

```bash
git add src/types/index.ts src/services/llm.ts
git commit -m "feat: add optional comments field to Recipe type and Zod schema"
```

---

### Task 2: Add tests for the `comments` field in schema validation

**Files:**
- Modify: `src/__tests__/services/llm.test.ts`

**Step 1: Add test for parsing response with `comments` field present**

Add this test after the existing "should handle optional nutrition field" test (around line 347):

```typescript
it('should handle optional comments field', () => {
  const withoutComments = JSON.stringify({
    recipes: [
      {
        id: '1',
        title: 'Test',
        time: '20 mins',
        ingredients: [{ item: 'Salt', amount: '1g' }],
        instructions: ['Cook'],
        usedIngredients: [],
        missingIngredients: [],
      },
    ],
    shoppingList: [],
  });

  const result = parseRecipeResponse(withoutComments);
  expect(result.recipes[0].comments).toBeUndefined();
});

it('should parse comments field when present', () => {
  const withComments = JSON.stringify({
    recipes: [
      {
        id: '1',
        title: 'Test',
        time: '20 mins',
        ingredients: [{ item: 'Salt', amount: '1g' }],
        instructions: ['Cook'],
        usedIngredients: [],
        missingIngredients: [],
        comments: 'Salt was once used as currency in ancient Rome.',
      },
    ],
    shoppingList: [],
  });

  const result = parseRecipeResponse(withComments);
  expect(result.recipes[0].comments).toBe('Salt was once used as currency in ancient Rome.');
});
```

**Step 2: Run tests to verify they pass**

Run: `npm test -- --run`
Expected: All tests PASS including the two new ones

**Step 3: Commit**

```bash
git add src/__tests__/services/llm.test.ts
git commit -m "test: add schema validation tests for optional comments field"
```

---

### Task 3: Update the LLM prompt

**Files:**
- Modify: `src/services/llm.ts:131-186`

**Step 1: Add rule 18 to the RULES section**

After rule 17 (line 161), add:

```
    18. Optionally include a "comments" field per recipe (1-2 sentences). Use it for a fun or surprising fact about the dish or its ingredients -- or, if the user provided unusual or inedible items, a lighthearted remark about why you skipped them.
```

**Step 2: Add `comments` to the JSON Structure example**

In the JSON Structure section, add the `comments` field to the recipe example object, after `nutrition`:

```json
          "nutrition": {"calories": 450, "carbs": 35, "fat": 18, "protein": 28},
          "comments": "Fun fact about this recipe or its ingredients."
```

**Step 3: Run the existing prompt tests**

Run: `npm test -- --run`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add src/services/llm.ts
git commit -m "feat: update LLM prompt to optionally request fun facts in comments field"
```

---

### Task 4: Add test for prompt containing comments instruction

**Files:**
- Modify: `src/__tests__/services/llm.test.ts`

**Step 1: Add test verifying the prompt includes comments instruction**

Add this test inside the `buildRecipePrompt` describe block:

```typescript
it('should include optional comments instruction in the prompt', () => {
  const prompt = buildRecipePrompt({
    ingredients: [],
    people: 2,
    meals: 1,
    diet: 'No restrictions',
    language: 'English',
  });

  expect(prompt).toContain('comments');
  expect(prompt).toContain('fun');
});
```

**Step 2: Run tests**

Run: `npm test -- --run`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/__tests__/services/llm.test.ts
git commit -m "test: verify prompt includes comments field instruction"
```

---

### Task 5: Render comments in RecipeCard (standalone only)

**Files:**
- Modify: `src/components/RecipeCard.tsx`

**Step 1: Add Lightbulb to the lucide-react imports**

Change the import line (line 2) to include `Lightbulb`:

```typescript
import { Clock, ChefHat, AlertCircle, ExternalLink, Sun, SunDim, Trash2, ListChecks, X, Lightbulb } from 'lucide-react';
```

**Step 2: Add the comments footer after the nutrition section**

After the nutrition `div` (after line 270, before the closing `</div>` of `space-y-8`), add:

```tsx
{isStandalone && recipe.comments && (
    <div className="pt-4 border-t border-border-base/30 flex items-start gap-2 text-text-muted text-xs">
        <Lightbulb size={14} className="shrink-0 mt-0.5 opacity-60" />
        <span className="opacity-60 italic">{recipe.comments}</span>
    </div>
)}
```

**Step 3: Run tests**

Run: `npm test -- --run`
Expected: All existing tests PASS

**Step 4: Commit**

```bash
git add src/components/RecipeCard.tsx
git commit -m "feat: render comments as subtle footer in standalone recipe view"
```

---

### Task 6: Add RecipeCard tests for comments rendering

**Files:**
- Modify: `src/__tests__/components/RecipeCard.test.tsx`

**Step 1: Add a recipe fixture with comments**

After the existing `mockRecipe` definition (around line 32), add:

```typescript
const mockRecipeWithComments: Recipe = {
    ...mockRecipe,
    comments: 'Tomatoes were once considered poisonous in Europe.',
};
```

**Step 2: Add tests for comments rendering**

Add a new describe block inside the `RecipeCard` describe:

```typescript
describe('Comments (fun facts)', () => {
    it('renders comments in standalone mode when present', () => {
        renderWithSettings(
            <RecipeCard
                recipe={mockRecipeWithComments}
                index={0}
                isStandalone={true}
            />
        );

        expect(screen.getByText('Tomatoes were once considered poisonous in Europe.')).toBeInTheDocument();
    });

    it('does not render comments in overview mode even when present', () => {
        renderWithSettings(
            <RecipeCard
                recipe={mockRecipeWithComments}
                index={0}
                isStandalone={false}
            />
        );

        expect(screen.queryByText('Tomatoes were once considered poisonous in Europe.')).not.toBeInTheDocument();
    });

    it('does not render comments section when comments field is absent', () => {
        renderWithSettings(
            <RecipeCard
                recipe={mockRecipe}
                index={0}
                isStandalone={true}
            />
        );

        // The mockRecipe has no comments field, so no lightbulb text should appear
        // We check that no element with the comment styling exists
        const commentElements = document.querySelectorAll('.italic');
        const commentTexts = Array.from(commentElements).map(el => el.textContent);
        expect(commentTexts).toHaveLength(0);
    });
});
```

**Step 3: Run tests**

Run: `npm test -- --run`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add src/__tests__/components/RecipeCard.test.tsx
git commit -m "test: add RecipeCard tests for comments in standalone vs overview mode"
```

---

### Task 7: Update MSW mock handler to include comments in some responses

**Files:**
- Modify: `src/__tests__/mocks/handlers.ts`

**Step 1: Add `comments` to the validRecipeResponse mock**

In `src/__tests__/mocks/handlers.ts`, add `comments` to the recipe object in `validRecipeResponse` (after line 35):

```typescript
nutrition: { calories: 450, carbs: 35, fat: 18, protein: 28 },
comments: 'Rice is the staple food for more than half the world\'s population.',
```

**Step 2: Run all tests**

Run: `npm test -- --run`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/__tests__/mocks/handlers.ts
git commit -m "test: include comments field in MSW mock response"
```

---

### Task 8: Final verification

**Step 1: Run full test suite with coverage**

Run: `npm run test:coverage`
Expected: All tests PASS, no coverage regressions

**Step 2: Run lint**

Run: `npm run lint`
Expected: No errors

**Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Push to remote**

```bash
git push -u origin claude/llm-comments-field-LefKE
```
