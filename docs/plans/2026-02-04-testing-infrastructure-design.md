# Testing Infrastructure Design

**Issue:** [#47 - There are no tests defined](https://github.com/DrDonik/ai-recipe-planner/issues/47)
**Date:** 2026-02-04
**Status:** Validated

## Goals

1. **Code quality signal** - Professional appearance with comprehensive test coverage
2. **Preventing bugs** - Catch edge cases and errors before production

## Strategy: Three-Phase Rollout

### Phase 1: Infrastructure + Utilities (~25-30% coverage)
- Set up testing infrastructure
- Test critical business logic (LLM, sharing, ID generation)
- Establish patterns and examples

### Phase 2: Hooks + Contexts (~50% coverage)
- Test state management
- Test localStorage interactions
- Test browser API integrations

### Phase 3: Components (~70-80% coverage)
- Test all UI components
- Achieve professional polish
- Complete comprehensive coverage

**Flexibility:** Each phase is independently valuable. Can stop after any phase with meaningful tests.

## Testing Stack

### Core Framework
- **Vitest** - Fast, Vite-native test runner with TypeScript support
- **React Testing Library** - Component testing focused on user behavior
- **@testing-library/user-event** - Realistic user interaction simulation
- **@vitest/ui** - Optional visual test runner interface

### Coverage & Utilities
- **@vitest/coverage-v8** - Code coverage reporting
- **msw** (Mock Service Worker) - API mocking for LLM integration tests
- **happy-dom** - Lightweight DOM environment for component tests

## Project Structure

```
src/
├─ __tests__/
│  ├─ utils/
│  │  ├─ sharing.test.ts
│  │  ├─ idGenerator.test.ts
│  ├─ services/
│  │  ├─ llm.test.ts
│  │  ├─ llm.integration.test.ts  # Optional, skipped by default
│  ├─ hooks/
│  │  ├─ useLocalStorage.test.ts
│  │  ├─ useWakeLock.test.ts
│  │  ├─ useFocusTrap.test.ts
│  ├─ contexts/
│  │  ├─ SettingsContext.test.tsx
│  ├─ components/
│  │  ├─ RecipeCard.test.tsx
│  │  ├─ ShoppingList.test.tsx
│  │  └─ ... (all components)
│  ├─ setup.ts  # Global test setup
│  └─ mocks/
│     ├─ handlers.ts  # MSW API mock handlers
│     └─ localStorage.ts  # localStorage mock
```

## Phase 1: Critical Business Logic

### Priority 1: LLM Service (CRUCIAL)

**File:** `src/__tests__/services/llm.test.ts`

Comprehensive mocked tests:
- ✅ `buildRecipePrompt()` - Correct prompt structure with all parameters
- ✅ `parseRecipeResponse()` - Valid JSON parsing, markdown cleanup, error handling
- ✅ `generateRecipes()` - Full flow with mocked API responses
- ✅ Error cases: Network failures, timeout, invalid JSON, missing fields, malformed responses
- ✅ Edge cases: Empty pantry, empty spice rack, special characters in ingredients
- ✅ ID tracking: Verifies usedIngredients IDs match pantry items

**File:** `src/__tests__/services/llm.integration.test.ts`

Optional integration tests (skipped by default):
- 🔌 Real Gemini API call with test data
- 🔌 Validates actual API response structure
- 🔌 Requires `GEMINI_API_KEY` environment variable
- 🔌 Run with: `npm test -- --run integration`

### Priority 2: Sharing Utilities (Nice-to-have)

**File:** `src/__tests__/utils/sharing.test.ts`

Good coverage for common cases:
- ✅ `encodeRecipe()` / `decodeRecipe()` - Round-trip encoding
- ✅ `encodeShoppingList()` / `decodeShoppingList()` - Round-trip encoding
- ✅ UTF-8 characters (emoji, umlauts, special chars)
- ✅ Large recipe objects (ensure no URL length issues)
- ✅ Invalid/corrupted base64 handling

### Priority 3: ID Generator

**File:** `src/__tests__/utils/idGenerator.test.ts`

Simple validation:
- ✅ Generates valid UUIDs
- ✅ Each ID is unique
- ✅ Format validation (UUID v4 pattern)

**Phase 1 Target:** 90%+ coverage for tested files, ~25-30% overall coverage

## Phase 2: State Management & Browser APIs

### Priority 1: useLocalStorage Hook (IMPORTANT)

**File:** `src/__tests__/hooks/useLocalStorage.test.ts`

Thorough coverage (losing data is annoying):
- ✅ Initial value from localStorage when key exists
- ✅ Fallback to default when key doesn't exist
- ✅ Updates localStorage when value changes
- ✅ Handles corrupted/invalid JSON gracefully
- ✅ Synchronizes across multiple hook instances (same key)
- ✅ TypeScript type safety with generic types
- ✅ Edge cases: null values, undefined, empty strings, large objects

### Priority 2: SettingsContext

**File:** `src/__tests__/contexts/SettingsContext.test.tsx`

Global settings state:
- ✅ Provides all default settings
- ✅ Persists settings to localStorage
- ✅ Loads persisted settings on mount
- ✅ Updates individual settings (apiKey, language, diet, etc.)
- ✅ Auto-detects browser language on first load
- ✅ Handles missing/corrupted localStorage data

### Priority 3: useWakeLock Hook

**File:** `src/__tests__/hooks/useWakeLock.test.ts`

Basic validation:
- ✅ Acquires wake lock when supported
- ✅ Releases wake lock on cleanup
- ✅ Handles unsupported browsers gracefully
- ✅ Re-acquires lock after visibility changes

### Priority 4: useFocusTrap Hook

**File:** `src/__tests__/hooks/useFocusTrap.test.ts`

Basic accessibility validation:
- ✅ Traps focus within container
- ✅ Cycles through focusable elements
- ✅ Releases trap on cleanup

**Phase 2 Target:** ~50% overall coverage

## Phase 3: UI Components

### Testing Approach
- Use React Testing Library's user-centric queries (`getByRole`, `getByLabelText`)
- Test user behavior, not implementation details
- Mock external dependencies (contexts, hooks, APIs)

### Priority Tier 1: Complex Components (Thorough Testing)

**RecipeCard.tsx** - Most complex:
- ✅ Renders recipe data correctly (title, time, ingredients, instructions)
- ✅ Ingredient strikethrough on click
- ✅ Instruction highlighting on click
- ✅ Wake lock toggle functionality
- ✅ Share button generates correct URL
- ✅ Nutrition info display
- ✅ Handles missing optional fields (nutrition)

**ShoppingList.tsx** - Stateful:
- ✅ Renders shopping list items
- ✅ Checkbox state persistence to localStorage
- ✅ Unchecked items displayed correctly
- ✅ Empty state handling

**CopyPasteDialog.tsx** - Two-step workflow:
- ✅ Step 1: Displays prompt, copy button works
- ✅ Step 2: Paste textarea, parsing responses
- ✅ Error handling for invalid responses
- ✅ Dialog close/cancel behavior

### Priority Tier 2: Medium Components (Standard Testing)

**PantryInput.tsx**, **SpiceRack.tsx**:
- ✅ Add/remove items
- ✅ Form validation
- ✅ localStorage persistence
- ✅ Collapsible panel state

**Header.tsx**, **SettingsPanel.tsx**:
- ✅ Renders all controls
- ✅ Updates context on changes
- ✅ Mode switching (copy/paste vs API key)

### Priority Tier 3: Simple Components (Basic Testing)

**WelcomeDialog.tsx**, **ApiKeySecurityDialog.tsx**, **ClearApiKeyDialog.tsx**:
- ✅ Renders content
- ✅ Dismiss/confirm actions
- ✅ Persistence of dismissal state

**PanelHeader.tsx**, **TooltipButton.tsx**:
- ✅ Basic rendering
- ✅ Click handlers
- ✅ Accessibility (aria labels)

**App.tsx** - Integration:
- ✅ Renders main layout
- ✅ Routing (normal/shared recipe/shared shopping list)
- ✅ Error boundary integration

**Phase 3 Target:** 70-80% overall coverage

## Configuration Files

### vitest.config.ts
- Test environment: happy-dom
- Global setup file
- Coverage configuration (v8 provider)
- Test patterns: `**/__tests__/**/*.test.{ts,tsx}`

### GitHub Actions Workflow

**File:** `.github/workflows/test.yml`

Features:
- ✅ Run on every push and pull request
- ✅ Test on Node 20 LTS
- ✅ Run linter first, then tests
- ✅ Generate and upload coverage reports
- ✅ Skip integration tests by default
- ✅ Cache node_modules for speed
- ✅ Show clear pass/fail status on PRs

### NPM Scripts

Add to `package.json`:
```json
{
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest --coverage",
  "test:integration": "vitest --run integration"
}
```

## Documentation

### TESTING.md

Create `docs/TESTING.md` with:

**Getting Started:**
- How to run tests: `npm test`, `npm run test:ui`, `npm run test:coverage`
- How to run specific tests: `npm test sharing`
- How to run integration tests: `npm test -- --run integration`

**Writing Tests:**
- Common patterns with code examples
- How to mock localStorage, API calls, contexts
- React Testing Library best practices
- Where to add new test files

**CI/CD:**
- How GitHub Actions runs tests
- How to view coverage reports
- What to do when tests fail in CI

## Coverage Tracking

- ✅ Track coverage percentage without enforcement
- ✅ Generate HTML reports viewable locally
- ✅ Terminal summary after test runs
- ✅ No build failures due to coverage
- 🎯 Target: 70-80% overall, 90%+ for critical files

## Testing Priorities Summary

1. **CRUCIAL:** LLM integration (`llm.ts`) - App is pointless without it
2. **IMPORTANT:** localStorage interactions - Losing results is annoying
3. **Nice-to-have:** Sharing feature - Good coverage but not exhaustive

## Implementation Notes

- User is new to testing - include clear examples and detailed comments
- Full implementation approach - not focused on learning through exercise
- Each phase can be implemented independently
- Integration tests are optional and skipped by default
- Mocking strategy: Mock API responses for speed/reliability, optional real tests for verification
