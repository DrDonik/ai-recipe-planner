---
created: 2026-02-23T09:02:16Z
last_updated: 2026-02-23T09:02:16Z
version: 1.0
author: Claude Code PM System
---

# Project Style Guide

## TypeScript Conventions

### Naming
- **Components**: PascalCase (`RecipeCard`, `PantryInput`)
- **Hooks**: camelCase with `use` prefix (`useLocalStorage`, `useWakeLock`)
- **Utilities/Services**: camelCase (`idGenerator`, `sharing`, `llm`)
- **Types/Interfaces**: PascalCase (`PantryItem`, `MealPlan`, `Notification`)
- **Constants**: SCREAMING_SNAKE_CASE (`STORAGE_KEYS`, `API_CONFIG`, `DEFAULTS`)
- **Constant objects**: SCREAMING_SNAKE keys inside `as const` objects
- **Files**: Match primary export casing (`RecipeCard.tsx`, `useLocalStorage.ts`)

### Types
- Prefer `interface` for object shapes (`interface Recipe { ... }`)
- Use `type` for unions, intersections, and utility types
- Export types from `src/types/index.ts`
- Use `as const` for constant objects to get literal types
- Zod schemas for runtime validation of external data (LLM responses, URL params)

### Imports
- React imports first, then external packages, then local modules
- Group: react → external → components → hooks → services → utils → types → constants
- Use named exports (no default exports observed in codebase)

## React Patterns

### Component Structure
- Functional components only (no class components)
- Hooks at the top of components
- Event handlers as `const` arrow functions
- Destructure props in function signature
- Use `useCallback` for handlers passed to children
- Use `useRef` for imperative handles and mutable values

### State Management
- `useState` for component-local state
- `useLocalStorage` for persisted state
- `SettingsContext` for global settings
- No external state libraries

### Component Files
- One component per file
- Component, types, and helpers in the same file (unless shared)
- Exported `Ref` types for imperative handles (`PantryInputRef`, `SettingsPanelRef`)

## CSS / Styling

### Tailwind CSS 4
- CSS-based config in `src/index.css` (no `tailwind.config.js`)
- Utility classes inline on elements
- Custom CSS classes for complex effects (glass-morphism) defined in `index.css`
- CSS custom properties (HSL-based) for theming
- Dark mode via `prefers-color-scheme: dark`
- Framer Motion for animations (`AnimatePresence`, `motion.div`)

### Design System
- Glass-morphism card effects with backdrop blur
- Consistent spacing and border radius via Tailwind
- Lucide icons throughout the UI
- Responsive: mobile-first with desktop breakpoints

## Testing Conventions

### File Organization
- Tests in `src/__tests__/` mirroring source structure
- Test utils in `src/__tests__/testUtils.tsx`
- MSW handlers in `src/__tests__/mocks/handlers.ts`
- localStorage mock in `src/__tests__/mocks/localStorage.ts`

### Test Style
- Use `describe` blocks for grouping related tests
- Test names describe behavior: `it('should display error when API key is missing')`
- Use Testing Library queries (`getByRole`, `getByText`, `findByText`)
- Prefer `userEvent` over `fireEvent` for user interactions
- MSW for API mocking; swap handlers per test with `server.use()`
- No manual localStorage cleanup needed (auto-reset in setup)

### Coverage
- Use `@vitest/coverage-v8` provider
- Run `npm run test:coverage` before submitting changes
- Integration tests gated on `GEMINI_API_KEY` env var

## Git Conventions

### Commit Messages
- Conventional commits style: `type: description`
- Types: `feat`, `fix`, `refactor`, `test`, `docs`, `deps`, `chore`
- Examples: `feat: add wake lock to recipe cards`, `fix: handle empty pantry gracefully`

### Branch Naming
- Feature branches: `epic/{feature-name}`
- Issue branches via Claude CI: `claude/description-hash`

## Code Quality Rules

- No partial implementations
- No code duplication — reuse existing functions and constants
- No dead code — delete unused code completely
- No over-engineering — minimal abstractions
- No mixed concerns — proper separation of logic
- No resource leaks — clean up timeouts, listeners, subscriptions
- Tests for every function
- Tests designed to reveal flaws, not just pass
