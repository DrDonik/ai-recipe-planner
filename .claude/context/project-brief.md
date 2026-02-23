---
created: 2026-02-23T09:02:16Z
last_updated: 2026-02-23T09:02:16Z
version: 1.0
author: Claude Code PM System
---

# Project Brief

## What It Does

AI Recipe Planner is a client-side React application that generates personalized meal plans from ingredients the user already has. It uses Google Gemini (or any AI via copy-paste) to create recipes, minimizing food waste by prioritizing available pantry items.

## Why It Exists

- To solve the "what should I cook?" problem using AI
- To reduce food waste from vegetable box deliveries and unused pantry items
- To provide a no-backend, privacy-respecting meal planning tool
- Personal project for the owner's daily use

## Scope

### In Scope
- Pantry ingredient management
- Spice rack / staples management
- AI-powered recipe generation (Gemini API or copy-paste with any AI)
- Dietary preference filtering
- Multi-language support (EN, DE, ES, FR)
- Shopping list generation with persistent checkboxes
- Recipe and shopping list sharing via URL
- Interactive cooking features (wake lock, step highlighting, ingredient strikethrough)
- Static deployment on GitHub Pages

### Out of Scope
- Backend services or databases
- User accounts or authentication
- Recipe storage beyond the current session (only last meal plan persisted)
- Meal plan history
- Nutritional database lookups (estimates come from LLM)
- Mobile native app

## Success Criteria

1. **Functional**: Generates usable recipes from pantry ingredients
2. **Usable**: Minimal clicks from opening the app to getting recipes
3. **Reliable**: LLM responses validated with Zod schemas; graceful error handling
4. **Performant**: Lighthouse scores: perf 80%+, a11y 90%+, best practices 90%+, SEO 90%+
5. **Tested**: Comprehensive test suite covering components, hooks, services, and utilities
6. **Deployable**: Automated CI/CD with GitHub Actions to GitHub Pages

## Constraints

- No server-side code — must work as a static site
- Gemini API called directly from browser (CORS allowed by Google)
- API key stored in plain-text localStorage (with explicit security warning)
- URL sharing limited by URL length constraints (base64 encoded data)
