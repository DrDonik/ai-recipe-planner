---
created: 2026-02-23T09:02:16Z
last_updated: 2026-02-23T09:02:16Z
version: 1.0
author: Claude Code PM System
---

# System Patterns

## Architecture Style

**Single-page application (SPA)** with no backend. All logic runs client-side. The app communicates directly with the Gemini API from the browser (in API Key mode) or relies on the user to relay prompts/responses (in Copy & Paste mode).

## State Management

- **React hooks only** — no external state library (Redux, Zustand, etc.)
- **SettingsContext** provides global settings via React Context
- **useLocalStorage** hook persists all user preferences and app state
- **Component-local state** via `useState` for UI-specific concerns (loading, dialogs)
- **Refs** for imperative handles (scroll position, timeouts, child component methods)

## Data Flow

```
User Input → Component State → localStorage (persistence)
                 ↓
         buildRecipePrompt() → Gemini API / Copy-Paste
                 ↓
         parseRecipeResponse() → Zod validation → MealPlan state → UI render
```

## Key Patterns

### Dual Operation Mode
The app supports two modes selected by the user:
1. **Copy & Paste** (default): Generates a prompt the user copies to any AI. User pastes response back. No credentials stored.
2. **API Key**: Direct Gemini API calls from browser. Key stored in localStorage with security warning.

### Collapsible Panels
Every major UI section is collapsible with state persisted to localStorage. Pattern:
- `PanelHeader` component with minimize/expand toggle
- `useLocalStorage<boolean>(STORAGE_KEYS.X_MINIMIZED, false)` for state
- Framer Motion `AnimatePresence` for smooth transitions

### LLM Response Validation
- Zod schemas (`MealPlanSchema`, `RecipeSchema`, `IngredientSchema`, `NutritionSchema`) validate all LLM output at runtime
- `parseRecipeResponse()` strips markdown code blocks before JSON parsing
- `sanitizeUserInput()` prevents prompt injection (newlines, control chars, length limits)

### URL-Based Sharing
- Recipes and shopping lists encoded as base64 in URL query parameters
- `generateShareUrl()` / `decodeFromUrl()` in `src/utils/sharing.ts`
- Shared shopping lists maintain separate checkbox state from local lists
- Zod validation on decode to reject malformed shared data

### Error Handling Pattern
- Fail fast for critical config (missing API key, invalid model)
- Graceful degradation for external services
- User-facing errors via `Notification` state in App.tsx with auto-dismiss timeout
- Undo support for destructive actions (e.g., clearing pantry)

### Input Sanitization
- `sanitizeUserInput()` strips newlines, control characters, limits length
- Used on all user inputs before including in LLM prompts
- CSP headers in `index.html` restrict script and connection sources

### Accessibility
- `useFocusTrap` hook for dialog focus management (Tab/Shift+Tab cycling, Escape to close)
- ARIA labels on interactive elements
- Keyboard navigation support
- `useWakeLock` for keeping screen on during cooking

## Design Decisions

1. **No backend** — Static site on GitHub Pages. All state in localStorage + URL params.
2. **Zod for LLM validation** — LLM output is untrusted; runtime validation catches malformed responses.
3. **Copy & Paste as default** — Prioritizes security by not requiring API key storage.
4. **Separate shared shopping list state** — Recipients get independent checkbox state via `SHOPPING_LIST_CHECKED_SHARED`.
5. **Ingredient ID tracking** — `usedIngredients` maps recipe ingredients back to pantry items by ID, enabling waste minimization.
