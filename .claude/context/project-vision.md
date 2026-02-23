---
created: 2026-02-23T09:02:16Z
last_updated: 2026-02-23T09:02:16Z
version: 1.0
author: Claude Code PM System
---

# Project Vision

## Core Vision

A zero-friction, privacy-respecting meal planner that turns whatever ingredients you have into delicious meals — powered by AI, requiring no accounts, no servers, and no setup.

## Design Philosophy

1. **Simplicity over features** — Every interaction should be as minimal as possible
2. **Privacy by default** — Copy & Paste mode avoids credential storage entirely
3. **No backend** — Static deployment means zero operational cost and maximum reliability
4. **AI-agnostic** — Copy & Paste mode works with any AI service, not just Gemini
5. **Offline-friendly** — Settings and last meal plan persist in localStorage

## Strategic Priorities

### Short-term (Maintenance)
- Keep dependencies up to date via Dependabot
- Fix bugs reported through usage
- Maintain Lighthouse scores above thresholds

### Medium-term (Potential Enhancements)
- Additional language support
- More dietary preference options
- Improved recipe card interactions
- PWA capabilities for offline use
- Recipe favorites / history

### Long-term (Aspirational)
- Support for additional LLM providers in API mode
- Community recipe sharing
- Meal plan calendar view
- Ingredient price estimation
- Nutritional goals tracking

## Guiding Principles

- **Don't over-engineer** — This is a personal tool first. Keep it simple.
- **Usability is king** — If a feature adds complexity for the user, it's probably not worth it.
- **Test everything** — Comprehensive tests enable confident refactoring and updates.
- **Security matters** — Even for a personal tool, follow security best practices (CSP, input sanitization, credential warnings).
