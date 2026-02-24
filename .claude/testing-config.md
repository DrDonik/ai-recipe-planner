---
framework: vitest
test_command: npm test
created: 2026-02-24T14:37:44Z
---

# Testing Configuration

## Framework
- Type: Vitest
- Version: 4.0.18
- Config File: `vitest.config.ts`
- Environment: happy-dom

## Test Structure
- Test Directory: `src/__tests__/`
- Test Files: 18 files found
- Naming Pattern: `*.test.ts` / `*.test.tsx`
- Setup File: `src/__tests__/setup.ts`
- Path Alias: `@` → `./src`

## Test Categories
- Component tests: `src/__tests__/components/` (9 files)
- Hook tests: `src/__tests__/hooks/` (3 files)
- Service tests: `src/__tests__/services/` (2 files, 1 integration)
- Utility tests: `src/__tests__/utils/` (2 files)
- App-level tests: `src/__tests__/App.test.tsx`
- Setup validation: `src/__tests__/setup.test.ts`

## Commands
- Run all tests: `npm test`
- Run with coverage: `npm run test:coverage`
- Run with UI: `npm run test:ui`
- Run specific file: `npx vitest run src/__tests__/components/RecipeCard.test.tsx`
- Run pattern: `npx vitest run --reporter=verbose src/__tests__/components/`
- Integration tests: `GEMINI_API_KEY=your_key npm run test:integration`

## Environment
- Required ENV vars: none for unit tests; `GEMINI_API_KEY` for integration tests only
- API Mocking: MSW 2.x (Mock Service Worker) — handlers in `src/__tests__/mocks/handlers.ts`
- localStorage: auto-reset mock between tests (configured in `src/__tests__/setup.ts`)

## Test Runner Agent Configuration
- Use verbose output for debugging
- Run tests sequentially (no parallel)
- Capture full stack traces
- No mocking beyond MSW — use real implementations
- Wait for each test to complete
- If test fails, check test structure before assuming code issue
