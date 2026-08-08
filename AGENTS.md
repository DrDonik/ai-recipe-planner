# AGENTS.md

## Project Overview

AI Recipe Planner is a React-based meal planning application that uses AI (Copy-Paste mode or Google Gemini API) to generate personalized recipes based on available pantry ingredients, taking into account the user's wishes, available spices, staples, and kitchen appliances. The app supports four languages (English, German, Spanish, French).

- **Hosting**: Static site deployed on GitHub Pages at `/ai-recipe-planner/`
- **Target Audience**: Primarily for personal use
- **UX Philosophy**: Usability is key. Minimize clicks and scrolling. All settings persist to localStorage so users can jump straight to recipe generation.

## Versioning & Release

**Current version**: 1.14.1

This project follows [Semantic Versioning](https://semver.org/) (SemVer):

- **Major version (1.x.x)**: Breaking changes, major architectural changes, incompatible API changes
- **Minor version (x.1.x)**: New features, enhancements, backwards-compatible functionality additions
- **Patch version (x.x.1)**: Bug fixes, minor improvements, documentation updates

### Version Management Workflow

1. Update version in `package.json` (use `npm version X.Y.Z --no-git-tag-version` so `package-lock.json` stays in sync) and in `AGENTS.md`
2. Commit changes with message: `chore: bump version to X.Y.Z`
3. Get the commit onto `main` (push, or merge a pull request)
4. `tag-release.yml` creates the `vX.Y.Z` tag automatically, which triggers `release.yml` to publish the GitHub Release.

Tagging by hand is no longer necessary — the version in `package.json` is what
drives a release. An existing tag is never overwritten, so re-running the
workflow on an already-released version is a no-op.

## Implementation Guidelines

Think carefully and implement the most concise solution that changes as little code as possible.
The code will be carefully reviewed by an expert for correctness, security, edge cases, maintainability, and fit with the existing codebase.

### When Adding Features

- **Usability First**: Keep interactions minimal. Avoid adding steps or dialogs unless necessary.
- **Interface Design**: Adhere to the Eight Golden Rules of Interface Design, and to what each has come to mean here: @InterfaceDesign.md
- **Universal Design**: Golden Rule 2 in full — the accessibility conventions this repo is bound to: @UniversalDesign.md
- **Minimize clicks**: Use sensible defaults, persist user choices
- **Minimize scrolling**: Use collapsible panels, keep important actions visible
- **All panels should be collapsible** with state persisted to localStorage
- **Follow existing patterns** for `PanelHeader` with minimize functionality
- **Never jump straight to implementation**. Always present your plan and the resulting user experience first and deliberate with the person requesting new code. Only implement new code when the requester explicitely states you should.

### When Working with Translations

- Add new keys to all language objects (English, German, Spanish, French) in `translations.ts`
- Update component to use `t.yourNewKey` pattern
- All LLM-generated content (recipes, ingredients) will be translated via prompt instructions

### When Opening a Pull Request

Structure the description after `.github/pull_request_template.md` and work
through its checklist. Creating a pull request through the API does not fill the
template in — copy it across yourself. Replace the comments rather than leaving
them in the body, and drop a section that has nothing to say.
