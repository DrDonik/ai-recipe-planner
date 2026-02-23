---
created: 2026-02-23T09:02:16Z
last_updated: 2026-02-23T09:02:16Z
version: 1.0
author: Claude Code PM System
---

# Tech Context

## Language & Runtime

- **Language**: TypeScript ~5.9.3
- **Runtime**: Node.js 20 (required by CI)
- **Module System**: ESM (`"type": "module"` in package.json)

## Framework & Build

- **UI Framework**: React 19.2
- **Build Tool**: Vite 7.3
- **CSS Framework**: Tailwind CSS 4.1 (Vite plugin, CSS-based config in `src/index.css`)
- **PostCSS**: autoprefixer 10.4

## Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^19.2.4 | UI framework |
| react-dom | ^19.2.4 | React DOM renderer |
| framer-motion | ^12.34.3 | Animations and transitions |
| lucide-react | ^0.575.0 | Icon library |
| zod | ^4.3.6 | Runtime schema validation (LLM responses) |

## Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| typescript | ~5.9.3 | Type checking |
| vite | ^7.3.1 | Build tool and dev server |
| @vitejs/plugin-react | ^5.1.4 | React Fast Refresh |
| tailwindcss | ^4.1.18 | Utility-first CSS |
| @tailwindcss/vite | ^4.2.0 | Tailwind Vite integration |
| eslint | ^9.39.3 | Linting (flat config) |
| typescript-eslint | ^8.56.0 | TypeScript ESLint rules |
| vitest | ^4.0.18 | Test runner |
| @vitest/coverage-v8 | ^4.0.18 | Code coverage (v8 provider) |
| @testing-library/react | ^16.3.2 | Component testing |
| @testing-library/user-event | ^14.6.1 | User interaction simulation |
| @testing-library/jest-dom | ^6.9.1 | DOM assertion matchers |
| happy-dom | ^20.7.0 | Test DOM environment |
| msw | ^2.12.10 | API mocking (Mock Service Worker) |

## External Services

- **LLM Provider**: Google Gemini API
  - Model: `gemini-3-flash-preview`
  - Base URL: `https://generativelanguage.googleapis.com/v1beta/models`
  - Timeout: 60 seconds
- **Hosting**: GitHub Pages (static deployment)
- **CI/CD**: GitHub Actions
- **Coverage**: Codecov

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | TypeScript compile + Vite build |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint check |
| `npm test` | Vitest in watch mode |
| `npm run test:coverage` | Tests with v8 coverage |
| `npm run test:ui` | Vitest interactive UI |
| `npm run test:integration` | Real API tests (needs GEMINI_API_KEY) |

## Key Configuration

- **Vite base path**: `/ai-recipe-planner/` (GitHub Pages)
- **TypeScript**: Composite project with `tsconfig.app.json` and `tsconfig.node.json`
- **Vitest**: `happy-dom` environment, globals enabled, path alias `@` -> `./src`
- **ESLint**: Flat config (ESLint 9) with react-hooks and react-refresh plugins
- **Lighthouse CI**: perf 80%, a11y 90%, best practices 90%, SEO 90%
