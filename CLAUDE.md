# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Recipe Planner (Rezept-Planer) is a React-based meal planning application that uses AI (Google Gemini API) to generate personalized recipes based on available pantry ingredients. The app supports multiple languages (German/English) and dietary preferences, and includes recipe sharing functionality via URL parameters.

## Development Commands

```bash
# Start development server
npm run dev

# Build for production (runs TypeScript compiler + Vite build)
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

## Architecture

### Core Data Flow

1. **User Input** → User adds vegetables to pantry, sets preferences (people count, meal count, diet, language)
2. **API Call** → `generateRecipes()` in `src/services/llm.ts` sends structured prompt to Gemini API
3. **Response Parsing** → JSON response is parsed into `MealPlan` type containing recipes and shopping list
4. **State Management** → App.tsx manages all state using React hooks (no external state library)
5. **Rendering** → Components display recipes and shopping list with internationalized text

### Key Technical Details

**LLM Integration (`src/services/llm.ts`)**
- Uses Google Gemini Flash 3 Preview model (`gemini-3-flash-preview`)
- Sends highly structured prompts with explicit JSON format requirements
- Tracks which pantry vegetables are used via IDs to minimize waste
- Generates consolidated shopping list across all recipes
- Handles markdown code block cleanup from LLM responses

**Recipe Sharing**
- Recipes are shareable via URL query parameter `?recipe=<base64>`
- Uses `btoa(unescape(encodeURIComponent(json)))` encoding
- App.tsx detects recipe parameter on mount and renders single-recipe view
- No backend required for sharing functionality

**ID Generation (`src/utils/idGenerator.ts`)**
- Uses Web Crypto API `crypto.randomUUID()` for generating unique IDs
- Available in all modern browsers over HTTPS

**Internationalization (`src/constants/translations.ts`)**
- All UI text stored in translations object with English/German keys
- LLM is instructed to generate recipe content in selected language
- Uses type-safe access: `translations[language as keyof typeof translations]`

**Styling Architecture**
- Tailwind CSS 4.x with custom CSS variables for theming
- Glass-morphism effects via custom `glass-panel` class in `src/index.css`
- CSS custom properties in `:root` for colors, spacing, shadows
- Framer Motion for animations on recipe cards

### Component Structure

```
App.tsx                 # Main app container, state management, routing logic
├─ PantryInput.tsx      # Add/remove vegetables from pantry inventory
├─ RecipeCard.tsx       # Display individual recipe with share functionality
└─ ShoppingList.tsx     # Aggregated shopping list across all recipes
```

## Important Implementation Notes

### When Adding Features

- **LocalStorage Persistence**: The following settings persist across sessions:
  - API key: `'gemini_api_key'`
  - Spice rack: `'spice_rack_items'` (JSON array)
  - Number of people: `'people_count'` (integer)
  - Number of meals: `'meals_count'` (integer)
  - Diet preference: `'diet_preference'` (string)
- **Type Safety**: All LLM response data uses strict TypeScript interfaces (`Recipe`, `MealPlan`, `Ingredient`, `Vegetable`)
- **Error Handling**: User-facing errors are displayed via `error` state in App.tsx

### When Modifying LLM Prompts

The prompt in `generateRecipes()` has specific rules that prevent common LLM mistakes:
- Enforces separation of "ingredients" (all items) vs "missingIngredients" (to purchase)
- Prevents LLMs from combining amount into item string
- Requires valid JSON without markdown formatting
- Uses vegetable IDs to track pantry usage

### When Working with Translations

- Add new keys to both `English` and `German` objects in `translations.ts`
- Update component to use `t.yourNewKey` pattern
- Remember LLM-generated content (recipes, ingredients) is also translated via prompt instructions

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 4 (using new Vite plugin)
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **LLM Provider**: Google Gemini API
- **Linting**: ESLint 9 (flat config) with TypeScript-ESLint

## Configuration Files

- `vite.config.ts` - Vite configuration with GitHub Pages base path
- `eslint.config.js` - Flat config format (ESLint 9)
- `tsconfig.json` - Composite TypeScript project with app/node references
- `tailwind.config.js` - Minimal Tailwind config (v4 uses CSS-based config)
