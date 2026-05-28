# AGENTS.md

## Project Overview

AI Recipe Planner is a React-based meal planning application that uses AI (Copy-Paste mode or Google Gemini API) to generate personalized recipes based on available pantry ingredients, taking into account the user's wishes, available spices, staples, and kitchen appliances. The app supports four languages (English, German, Spanish, French).

- **Hosting**: Static site deployed on GitHub Pages at `/ai-recipe-planner/`
- **Target Audience**: Primarily for personal use
- **UX Philosophy**: Usability is key. Minimize clicks and scrolling. All settings persist to localStorage so users can jump straight to recipe generation.

## Versioning & Release

**Current version**: 1.3.0

This project follows [Semantic Versioning](https://semver.org/) (SemVer):

- **Major version (1.x.x)**: Breaking changes, major architectural changes, incompatible API changes
- **Minor version (x.1.x)**: New features, enhancements, backwards-compatible functionality additions
- **Patch version (x.x.1)**: Bug fixes, minor improvements, documentation updates

### Version Management Workflow

1. Update version in `package.json` and `AGENTS.md`
2. Commit changes with message: `chore: bump version to X.Y.Z`
3. Create git tag: `git tag -a vX.Y.Z -m "Release version X.Y.Z"`
4. Push commits and tags: `git push && git push --tags`
5. GitHub Release is automatically created with a GitHub workflow.

## Implementation Guidelines

Think carefully and implement the most concise solution that changes as little code as possible.
The code will be carefully reviewed by an expert for correctness, security, edge cases, maintainability, and fit with the existing codebase.

### When Adding Features

- **Usability First**: Keep interactions minimal. Avoid adding steps or dialogs unless necessary.
- **Minimize clicks**: Use sensible defaults, persist user choices
- **Minimize scrolling**: Use collapsible panels, keep important actions visible
- **All panels should be collapsible** with state persisted to localStorage
- Follow existing patterns for `PanelHeader` with minimize functionality

### When Working with Translations

- Add new keys to all language objects (English, German, Spanish, French) in `translations.ts`
- Update component to use `t.yourNewKey` pattern
- All LLM-generated content (recipes, ingredients) will be translated via prompt instructions
