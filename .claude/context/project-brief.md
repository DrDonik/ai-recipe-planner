---
created: 2026-02-23T09:02:16Z
last_updated: 2026-04-24T06:19:41Z
version: 1.1
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
- Kitchen appliances management (recipes matched to user's equipment)
- AI-powered recipe generation (Gemini API or copy-paste with any AI)
- Dietary preference filtering
- Multi-language support (EN, DE, ES, FR)
- Shopping list generation with persistent checkboxes
- Recipe and shopping list sharing via URL
- Interactive cooking features (wake lock, step highlighting, ingredient strikethrough)
- Data export/import as JSON
- Optional multi-device sync via user-owned GitHub Gist
- Static deployment on GitHub Pages

### Out of Scope
- Project-hosted backend services or databases
- User accounts or authentication
- Recipe storage beyond the current session (only last meal plan persisted locally or in user's Gist)
- Meal plan history beyond the last plan
- Nutritional database lookups (estimates come from LLM)
- Mobile native app

## Success Criteria

1. **Functional**: Generates usable recipes from pantry ingredients
2. **Usable**: Minimal clicks from opening the app to getting recipes
3. **Reliable**: LLM responses and imported data validated with Zod schemas; graceful error handling
4. **Performant**: Lighthouse scores: perf 80%+, a11y 90%+, best practices 90%+, SEO 90%+
5. **Tested**: Comprehensive test suite covering components, hooks, services, and utilities
6. **Deployable**: Automated CI/CD with GitHub Actions to GitHub Pages

## Constraints

- No server-side code — must work as a static site
- Gemini API called directly from browser (CORS allowed by Google)
- GitHub Gist API called directly from browser for optional sync
- API keys and Gist tokens stored in plain-text localStorage (with explicit security warnings)
- URL sharing limited by URL length constraints (base64 encoded data)

## Update History

- 2026-04-24: Added kitchen appliances, data export/import, and multi-device Gist sync to in-scope list
