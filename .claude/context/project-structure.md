---
created: 2026-02-23T09:02:16Z
last_updated: 2026-02-23T09:02:16Z
version: 1.0
author: Claude Code PM System
---

# Project Structure

## Root Directory

```
ai-recipe-planner/
├── .claude/              # Claude Code agent configuration
│   ├── agents/           # Sub-agent definitions
│   ├── commands/         # Slash command definitions
│   ├── context/          # Project context (this directory)
│   ├── rules/            # Behavioral rules for agents
│   ├── scripts/          # Automation scripts
│   └── skills/           # Skill definitions
├── .github/
│   └── workflows/        # CI/CD workflows (ci, deploy, lighthouse, release, claude)
├── dist/                 # Production build output
├── docs/
│   ├── TESTING.md        # Testing guide
│   └── plans/            # Design documents and decision records
├── public/               # Static assets (favicon, icons)
├── src/                  # Application source code
├── index.html            # Entry HTML with CSP headers
├── package.json          # Dependencies and scripts
├── vite.config.ts        # Vite build config (GitHub Pages base path)
├── vitest.config.ts      # Test runner config
├── tsconfig.json         # TypeScript project references
├── eslint.config.js      # ESLint 9 flat config
└── lighthouserc.json     # Lighthouse CI thresholds
```

## Source Directory (`src/`)

```
src/
├── App.tsx                     # Main app component, routing, state orchestration
├── main.tsx                    # React entry point
├── index.css                   # Tailwind CSS 4 config, custom properties, glass effects
├── components/
│   ├── ApiKeySecurityDialog.tsx  # Security warning when enabling API mode
│   ├── ClearApiKeyDialog.tsx     # API key clear/keep choice dialog
│   ├── CopyPasteDialog.tsx       # Two-step copy/paste workflow dialog
│   ├── ErrorBoundary.tsx         # React error boundary with refresh
│   ├── Header.tsx                # Sticky header: mode toggle, API key, language
│   ├── PantryInput.tsx           # Add/remove/edit pantry ingredients
│   ├── RecipeCard.tsx            # Recipe display with interactive features
│   ├── SettingsPanel.tsx         # Diet, style, people/meals count
│   ├── ShoppingList.tsx          # Checkbox shopping list with persistence
│   ├── SpiceRack.tsx             # Manage always-available staples/spices
│   ├── WelcomeDialog.tsx         # Onboarding dialog
│   └── ui/
│       ├── PanelHeader.tsx       # Reusable collapsible panel header
│       ├── TooltipButton.tsx     # Polymorphic button with tooltip
│       └── index.ts              # UI barrel export
├── constants/
│   ├── index.ts                  # STORAGE_KEYS, API_CONFIG, DEFAULTS, VALIDATION, URL_PARAMS
│   └── translations.ts          # 200+ keys in EN/DE/ES/FR
├── contexts/
│   └── SettingsContext.tsx        # Global settings provider with localStorage
├── hooks/
│   ├── useFocusTrap.ts           # Accessibility focus trap for dialogs
│   ├── useLocalStorage.ts        # Generic JSON/string localStorage hook
│   └── useWakeLock.ts            # Screen Wake Lock API wrapper
├── services/
│   └── llm.ts                    # Gemini API: prompt building, response parsing, validation
├── types/
│   └── index.ts                  # PantryItem, Recipe, Ingredient, MealPlan, Nutrition, Notification
└── utils/
    ├── idGenerator.ts            # UUID generation via crypto.randomUUID()
    ├── sharing.ts                # URL base64 encode/decode with Zod validation
    └── shoppingListHelpers.ts    # Item key generation, list comparison
```

## Test Directory (`src/__tests__/`)

```
src/__tests__/
├── setup.ts                          # Global setup: localStorage mock, cleanup
├── setup.test.ts                     # Test environment validation
├── testUtils.tsx                     # Custom render with providers
├── App.test.tsx                      # Integration tests
├── mocks/
│   ├── handlers.ts                   # MSW handlers for Gemini API
│   └── localStorage.ts              # Map-based localStorage mock
├── components/                       # One test file per component
├── hooks/                            # Hook behavior tests
├── services/
│   ├── llm.test.ts                   # Unit tests
│   └── llm.integration.test.ts       # Real API tests (env-gated)
└── utils/                            # Utility function tests
```

## File Naming Patterns

- **Components**: PascalCase (`RecipeCard.tsx`)
- **Hooks**: camelCase with `use` prefix (`useLocalStorage.ts`)
- **Utils/Services**: camelCase (`idGenerator.ts`, `llm.ts`)
- **Tests**: Mirror source path with `.test.ts(x)` suffix
- **Constants**: camelCase files, SCREAMING_SNAKE for exported consts
