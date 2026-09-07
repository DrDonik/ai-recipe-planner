/**
 * Whether a recipe's serving count is worth showing.
 *
 * `Recipe.servings` is deliberately validated as a plain optional number (see
 * the note on `RecipeSchema` in services/llm.ts), so it may be absent on
 * anything stored or shared before the field existed, and — coming from a
 * model or a hand-crafted share link — may be zero, negative, fractional or
 * infinite. Each consumer would otherwise repeat the same checks.
 *
 * Whole numbers only, which is where the tolerant schema is paid for. The
 * field counts people, so a fraction is already meaningless, and rendering one
 * would need two things this app has no use for: a locale-aware decimal
 * separator (`${1.5}` is "1.5" in German, where it must read "1,5"), and a
 * plural rule finer than singular-vs-rest (French says "1,5 portion", German
 * "1,5 Portionen"). Dropping the pill costs nothing a fraction was worth
 * saying, and no meal plan is thrown away for it.
 */
export const hasServings = (value: number | undefined): value is number =>
    typeof value === 'number' && Number.isInteger(value) && value > 0;
