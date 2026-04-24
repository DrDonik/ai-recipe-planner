---
created: 2026-02-23T09:02:16Z
last_updated: 2026-04-24T06:19:41Z
version: 1.1
author: Claude Code PM System
---

# System Patterns

## Architecture Style

**Single-page application (SPA)** with no backend. All logic runs client-side. The app communicates directly with the Gemini API from the browser (in API Key mode) or relies on the user to relay prompts/responses (in Copy & Paste mode). For multi-device sync, the browser talks directly to the GitHub Gist API using a user-supplied personal access token.

## State Management

- **React hooks only** — no external state library (Redux, Zustand, etc.)
- **SettingsContext** provides global settings via React Context
- **useLocalStorage** hook persists all user preferences and app state
- **useGistSync** hook layers optional remote sync on top of local state
- **Component-local state** via `useState` for UI-specific concerns (loading, dialogs)
- **Refs** for imperative handles (scroll position, timeouts, child component methods)

## Data Flow

```
User Input → Component State → localStorage (persistence)
                 ↓                      ↓
         buildRecipePrompt()    useGistSync → GitHub Gist (optional remote sync)
                 ↓
         Gemini API / Copy-Paste
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

### Data Export / Import
- `buildExportData()` serializes pantry, spice rack, appliances, recipes, and settings as a versioned JSON blob
- `readImportFile()` + Zod schema validate the blob on import (no unsafe merging)
- `applyImportData()` writes validated data back into localStorage
- Enables manual backups/restores independent of remote sync

### Multi-Device Sync (GitHub Gist)
- User supplies a personal access token with `gist` scope
- `gistSync.ts` creates/updates a single private Gist containing the export payload
- `useGistSync` hook tracks status (idle/syncing/conflict/error), schedules pushes after local changes, and pulls on load
- Credentials stored in localStorage with explicit security warning (same model as API key mode)
- CSP `connect-src` permits `api.github.com` for this purpose

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

1. **No backend** — Static site on GitHub Pages. All state in localStorage + URL params + optional user-owned Gist.
2. **Zod for LLM validation and imports** — All untrusted external payloads (LLM, share URLs, imported files, Gist content) are validated at runtime.
3. **Copy & Paste as default** — Prioritizes security by not requiring API key storage.
4. **Separate shared shopping list state** — Recipients get independent checkbox state via `SHOPPING_LIST_CHECKED_SHARED`.
5. **Ingredient ID tracking** — `usedIngredients` maps recipe ingredients back to pantry items by ID, enabling waste minimization.
6. **User-owned sync storage** — Multi-device sync uses the user's own Gist rather than any project-hosted service, keeping ops cost at zero and data ownership with the user.

## Update History

- 2026-04-24: Added Data Export/Import and Multi-Device Gist Sync patterns; clarified Zod is used for all untrusted payloads
