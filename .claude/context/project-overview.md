---
created: 2026-02-23T09:02:16Z
last_updated: 2026-02-23T09:02:16Z
version: 1.0
author: Claude Code PM System
---

# Project Overview

## Summary

AI Recipe Planner (v1.0.2) is a React 19 + TypeScript SPA that generates AI-powered meal plans from pantry ingredients. Deployed as a static site on GitHub Pages with no backend dependencies.

## Feature Map

### Core Features
- **Pantry Management** — Add, edit, remove ingredients with amounts
- **Spice Rack** — Separate list of always-available staples and spices
- **Recipe Generation** — AI creates recipes prioritizing available ingredients
- **Shopping List** — Auto-generated missing ingredients with persistent checkboxes
- **Meal Plan Display** — Recipe cards with nutrition info, timing, and instructions

### Operation Modes
- **Copy & Paste Mode** (default) — User copies prompt to any AI, pastes response back
- **API Key Mode** — Direct Gemini API integration with localStorage key storage

### Customization
- **Dietary Preferences** — Vegan, Vegetarian, Pescatarian, Flexitarian, etc.
- **Style Wishes** — Free-text recipe style preferences
- **People Count** — Scale recipes for 1-10+ people
- **Meal Count** — Generate 1-5+ recipes per plan
- **Language** — Full UI + recipe content in EN, DE, ES, FR

### Sharing
- **Recipe Sharing** — Share individual recipes via URL (base64 encoded)
- **Shopping List Sharing** — Share lists with independent checkbox state per recipient

### Interactive Cooking
- **Ingredient Strikethrough** — Click to mark ingredients as added
- **Step Highlighting** — Click instruction steps to track progress
- **Wake Lock** — Keep screen on while cooking (Wake Lock API)

### Quality & Security
- **Content Security Policy** — Restricts script and connection sources
- **Input Sanitization** — Prevents prompt injection
- **Zod Validation** — Runtime schema validation of all LLM responses
- **Error Boundary** — Catches React errors with refresh recovery
- **JSON-LD Schema** — Recipe structured data for SEO

## Integration Points

| Integration | Type | Details |
|-------------|------|---------|
| Google Gemini API | HTTP REST | Direct browser calls, `gemini-3-flash-preview` model |
| GitHub Pages | Deployment | Static site at `/ai-recipe-planner/` |
| GitHub Actions | CI/CD | Lint, build, test, deploy, Lighthouse, Claude review |
| Codecov | Coverage | Test coverage reporting |
| Dependabot | Dependencies | Automated dependency updates |

## Current State

The application is feature-complete and stable at v1.0.2. Active maintenance includes dependency updates and occasional bug fixes. No major feature work is in progress.
