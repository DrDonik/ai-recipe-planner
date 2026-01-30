# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Recipe Planner (Rezept-Planer) is a React-based meal planning application that uses AI (Google Gemini API) to generate personalized recipes based on available pantry ingredients. The app supports multiple languages (English, German, Spanish, French) and dietary preferences, and includes recipe sharing functionality via URL parameters.

### Deployment & Purpose

- **Hosting**: Static site deployed on GitHub Pages at `/ai-recipe-planner/`
- **Target Audience**: Primarily for personal use
- **UX Philosophy**: Usability is key. Minimize clicks and scrolling. All settings persist to localStorage so users can jump straight to recipe generation.

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

1. **User Input** → User adds ingredients to pantry, sets preferences (people count, meal count, diet, language)
2. **Mode Selection** → User chooses Copy & Paste mode (default, secure) or API Key mode
3. **API Call** → `generateRecipes()` in `src/services/llm.ts` sends structured prompt to Gemini API (or user manually copies prompt)
4. **Response Parsing** → JSON response is parsed into `MealPlan` type containing recipes and shopping list
5. **State Management** → SettingsContext + App.tsx manage state using React hooks (no external state library)
6. **Rendering** → Components display recipes and shopping list with internationalized text

### Key Technical Details

**Dual Operation Modes**
- **Copy & Paste Mode** (default): No API key stored. User copies prompt to external AI and pastes response back. More secure.
- **API Key Mode**: Stores Gemini API key in localStorage (with security warning). Direct API calls from browser.

**LLM Integration (`src/services/llm.ts`)**
- Uses Google Gemini Flash 3 Preview model (`gemini-3-flash-preview`)
- Base URL: `https://generativelanguage.googleapis.com/v1beta/models`
- Request timeout: 60 seconds
- `buildRecipePrompt()` creates structured prompt with pantry items, dietary preferences, spices
- `parseRecipeResponse()` cleans markdown code blocks and parses JSON
- Tracks which pantry items are used via IDs to minimize waste

**Recipe Sharing (`src/utils/sharing.ts`)**
- Recipes shareable via URL parameter `?recipe=<base64>`
- Shopping lists via `?shoppingList=<base64>`
- Uses TextEncoder for UTF-8 safe base64 encoding
- No backend required for sharing functionality

**State Management (`src/contexts/SettingsContext.tsx`)**
- Provides global settings: `useCopyPaste`, `apiKey`, `people`, `meals`, `diet`, `styleWishes`, `language`
- Auto-detects browser language
- All settings persist to localStorage

**ID Generation (`src/utils/idGenerator.ts`)**
- Uses Web Crypto API `crypto.randomUUID()` for generating unique IDs

**Internationalization (`src/constants/translations.ts`)**
- Supports: English, German, Spanish, French
- 200+ translation keys covering all UI text
- LLM is instructed to generate recipe content in selected language
- Type-safe access via translations object

**Styling Architecture**
- Tailwind CSS 4.x with Vite plugin
- Glass-morphism effects via custom CSS classes in `src/index.css`
- CSS custom properties (HSL-based) for theming
- Dark mode support via `prefers-color-scheme: dark`
- Framer Motion for animations

### Component Structure

```
App.tsx                     # Main app, routing (normal/shared recipe/shared shopping list views)
├─ Header.tsx               # Sticky header with mode toggle, API key input, language selector
├─ SettingsPanel.tsx        # Diet, style wishes, people/meals count (collapsible)
├─ PantryInput.tsx          # Add/remove ingredients from pantry (collapsible)
├─ SpiceRack.tsx            # Manage staples/spices always available (collapsible)
├─ RecipeCard.tsx           # Recipe display with ingredient strikethrough, step highlighting,
│                           #   wake lock, nutrition info, JSON-LD schema, share button
├─ ShoppingList.tsx         # Checkbox-based shopping list with persistence
├─ WelcomeDialog.tsx        # Onboarding dialog (dismissible)
├─ CopyPasteDialog.tsx      # Two-step dialog for Copy & Paste mode
├─ ApiKeySecurityDialog.tsx # Security warning when enabling API Key mode
├─ ClearApiKeyDialog.tsx    # Confirmation for clearing stored API key
└─ ErrorBoundary.tsx        # Error boundary with refresh button
```

**Reusable UI Components**
- `PanelHeader.tsx` - Header with icon, title, minimize button, tooltip
- `TooltipButton.tsx` - Polymorphic button/link/span with tooltip support

### Security Features

- **Content Security Policy** in `index.html`:
  - `connect-src` allows only Gemini API
  - `script-src 'self'` prevents inline scripts
- **API Key Security Dialog** warns about plain-text localStorage storage
- **XSS Protection** escapes `</script>` in JSON-LD schema output
- **Copy & Paste mode** avoids storing credentials entirely

## Important Implementation Notes

### When Adding Features

- **Usability First**: Keep interactions minimal. Avoid adding steps or dialogs unless necessary.
- **LocalStorage Persistence**: The following settings persist across sessions:
  - `gemini_api_key` - API key (API Key mode only)
  - `use_copy_paste` - Boolean for mode selection
  - `api_key_warning_seen` - Security dialog dismissed
  - `spice_rack_items` - JSON array of staples/spices
  - `pantry_items` - JSON array of current pantry
  - `people_count`, `meals_count` - Integers
  - `diet_preference`, `style_wishes` - Strings
  - `language` - Selected UI language
  - `meal_plan` - Last generated meal plan
  - `shopping_list_checked` - Checked items state
  - `*_minimized` - Collapsed state for various panels
  - `welcome_dismissed` - Welcome dialog dismissed
- **Type Safety**: All LLM response data uses strict TypeScript interfaces (`Recipe`, `MealPlan`, `Ingredient`, `PantryItem`, `Nutrition`)
- **Error Handling**: User-facing errors displayed via `error` state in App.tsx

### When Modifying LLM Prompts

The prompt in `buildRecipePrompt()` has specific rules that prevent common LLM mistakes:
- Enforces separation of "ingredients" (all items) vs "missingIngredients" (to purchase)
- Prevents LLMs from combining amount into item string
- Requires valid JSON without markdown formatting
- Uses ingredient IDs to track pantry usage

### When Working with Translations

- Add new keys to all language objects (English, German, Spanish, French) in `translations.ts`
- Update component to use `t.yourNewKey` pattern
- Remember LLM-generated content (recipes, ingredients) is also translated via prompt instructions

### When Adding UI Elements

- **Minimize clicks**: Use sensible defaults, persist user choices
- **Minimize scrolling**: Use collapsible panels, keep important actions visible
- **All panels should be collapsible** with state persisted to localStorage
- Follow existing patterns for `PanelHeader` with minimize functionality

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 4 (Vite plugin)
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **LLM Provider**: Google Gemini API (`gemini-3-flash-preview`)
- **Linting**: ESLint 9 (flat config) with TypeScript-ESLint
- **Package Manager**: Yarn 4.5.3

## Configuration Files

- `vite.config.ts` - Vite config with GitHub Pages base path (`/ai-recipe-planner/`)
- `eslint.config.js` - Flat config format (ESLint 9)
- `tsconfig.json` - Composite TypeScript project with app/node references
- `tailwind.config.js` - Minimal config (v4 uses CSS-based configuration)

## Data Types

```typescript
interface PantryItem {
  id: string;
  name: string;
  amount: string;
}

interface Recipe {
  id: string;
  title: string;
  time: string;
  ingredients: Ingredient[];
  instructions: string[];
  usedIngredients: string[];      // IDs of pantry items used
  missingIngredients: Ingredient[];
  nutrition?: Nutrition;
}

interface Ingredient {
  item: string;
  amount: string;
  unit?: string;
}

interface Nutrition {
  calories: number;
  carbs: number;    // grams
  fat: number;      // grams
  protein: number;  // grams
}

interface MealPlan {
  recipes: Recipe[];
  shoppingList: Ingredient[];
}
```

## Advanced Features

- **Wake Lock API** - Keep screen on during cooking (button on recipe cards)
- **JSON-LD Schema** - Generates Recipe schema markup for SEO/social sharing
- **Ingredient strikethrough** - Click ingredients to mark as added
- **Active step highlighting** - Click instructions to highlight current step
- **Decoupled shopping lists** - Shared shopping lists maintain separate checkbox state
