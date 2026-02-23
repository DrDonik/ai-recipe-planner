---
created: 2026-02-23T09:02:16Z
last_updated: 2026-02-23T09:02:16Z
version: 1.0
author: Claude Code PM System
---

# Product Context

## Problem Statement

Home cooks often have ingredients on hand (especially from vegetable box deliveries) but lack recipe ideas that use what they already have. This leads to food waste and frustration with meal planning.

## Target Users

**Primary**: The project owner — personal use tool for meal planning.

**Secondary**: Anyone who wants to:
- Turn available ingredients into meal plans
- Minimize food waste from vegetable box subscriptions
- Get AI-generated recipes without complex setup
- Share recipes or shopping lists with household members

## User Personas

### The Busy Home Cook
- Has ingredients but no inspiration
- Wants quick, personalized meal plans
- Doesn't want to create accounts or manage credentials
- Prefers Copy & Paste mode for simplicity and privacy

### The Tech-Savvy Cook
- Comfortable with API keys
- Wants direct, seamless AI integration
- Values speed over privacy tradeoffs
- Uses API Key mode for one-click generation

### The Recipe Sharer
- Receives shared recipes or shopping lists via URL
- Needs a clean, usable view of shared content
- Wants independent shopping list checkbox state

## Core Use Cases

1. **Pantry-to-Recipes**: Add available ingredients and spices, get recipes that use them
2. **Meal Planning**: Set number of people and meals, get a complete meal plan
3. **Shopping List**: Auto-generated list of missing ingredients with persistent checkboxes
4. **Recipe Sharing**: Share individual recipes via URL (base64 encoded, no backend)
5. **Shopping List Sharing**: Share shopping lists with independent checkbox tracking
6. **Dietary Customization**: Filter by diet (Vegan, Vegetarian, Pescatarian, Flexitarian, etc.)
7. **Style Wishes**: Free-text preferences like "quick meals" or "Italian cuisine"
8. **Multi-language**: Full UI and recipe generation in EN, DE, ES, FR

## UX Principles

- **Minimize clicks**: Sensible defaults, persistent settings, jump straight to generation
- **Minimize scrolling**: Collapsible panels, important actions always visible
- **Persistence**: All settings survive page refreshes via localStorage
- **Privacy first**: Copy & Paste mode as default avoids storing any credentials
- **Responsive**: Works on desktop and mobile with glassmorphism dark mode UI
