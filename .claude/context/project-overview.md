---
created: 2026-02-23T09:02:16Z
last_updated: 2026-04-24T06:19:41Z
version: 1.1
author: Claude Code PM System
---

# Project Overview

## Summary

AI Recipe Planner (v1.2.0) is a React 19 + TypeScript SPA that generates AI-powered meal plans from pantry ingredients. Deployed as a static site on GitHub Pages with no backend dependencies.

## Feature Map

### Core Features
- **Pantry Management** — Add, edit, remove ingredients with amounts
- **Spice Rack** — Separate list of always-available staples and spices
- **Kitchen Appliances** — Manage available appliances so recipes match user equipment
- **Recipe Generation** — AI creates recipes prioritizing available ingredients
- **Shopping List** — Auto-generated missing ingredients with persistent checkboxes
- **Meal Plan Display** — Recipe cards with nutrition info, timing, and instructions

### Operation Modes
- **Copy & Paste Mode** (default) — User copies prompt to any AI, pastes response back
- **API Key Mode** — Direct Gemini API integration with localStorage key storage

### Customization
- **Dietary Preferences** — Vegan, Vegetarian, Pescatarian, Flexitarian, etc.
- **Style Wishes** — Free-text recipe style preferences (stored as JSON array)
- **People Count** — Scale recipes for 1-10+ people
- **Meal Count** — Generate 1-5+ recipes per plan
- **Language** — Full UI + recipe content in EN, DE, ES, FR

### Sharing & Sync
- **Recipe Sharing** — Share individual recipes via URL (base64 encoded)
- **Shopping List Sharing** — Share lists with independent checkbox state per recipient
- **Data Export/Import** — Backup and restore pantry, spice rack, appliances, recipes, and settings as JSON
- **Multi-device Sync** — Optional sync across devices via a personal GitHub Gist

### Interactive Cooking
- **Ingredient Strikethrough** — Click to mark ingredients as added
- **Step Highlighting** — Click instruction steps to track progress
- **Wake Lock** — Keep screen on while cooking (Wake Lock API)

### Quality & Security
- **Content Security Policy** — Restricts script and connection sources (Gemini + GitHub API allowed)
- **Input Sanitization** — Prevents prompt injection
- **Zod Validation** — Runtime schema validation of all LLM responses and imported data
- **Error Boundary** — Catches React errors with refresh recovery
- **JSON-LD Schema** — Recipe structured data for SEO

## Integration Points

| Integration | Type | Details |
|-------------|------|---------|
| Google Gemini API | HTTP REST | Direct browser calls, `gemini-3-flash-preview` model |
| GitHub Gist API | HTTP REST | Optional multi-device sync via personal access token |
| GitHub Pages | Deployment | Static site at `/ai-recipe-planner/` |
| GitHub Actions | CI/CD | Lint, build, test, deploy, Lighthouse, Claude review |
| Codecov | Coverage | Test coverage reporting |
| Dependabot | Dependencies | Automated dependency updates |

## Current State

The application is feature-complete and stable at v1.2.0. The most recent additions are kitchen appliances management, data export/import, and multi-device sync via GitHub Gist. Active maintenance continues via Dependabot.

## Update History

- 2026-04-24: v1.2.0 — added Kitchen Appliances, Data Export/Import, Multi-device Gist sync
