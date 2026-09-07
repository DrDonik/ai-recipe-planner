/**
 * Whether a recipe's serving count is worth showing.
 *
 * `Recipe.servings` is deliberately validated as a plain optional number (see
 * the note on `RecipeSchema` in services/llm.ts), so it may be absent on
 * anything stored or shared before the field existed, and — coming from a
 * model or a hand-crafted share link — may be zero, negative or infinite. Each
 * consumer would otherwise repeat the same three checks.
 */
export const hasServings = (value: number | undefined): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value > 0;
