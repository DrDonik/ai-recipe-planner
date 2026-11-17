# AGENTS.md

## Project Overview

AI Recipe Planner is a React-based meal planning application that uses AI (Copy-Paste mode or Google Gemini API) to generate personalized recipes based on available pantry ingredients, taking into account the user's wishes, available spices, staples, and kitchen appliances. The app supports four languages (English, German, Spanish, French).

- **Hosting**: Static site deployed on GitHub Pages at `/ai-recipe-planner/`
- **Target Audience**: Primarily for personal use
- **UX Philosophy**: Usability is key. Minimize clicks and scrolling. All settings persist to localStorage so users can jump straight to recipe generation.

## Versioning & Release

The version in `package.json` is frozen at 3.3.3 and is not maintained. There
is no release process. Do not bump it, do not create tags, and do not open a
pull request whose purpose is a version bump.

`deploy.yml` publishes every push to `main` to GitHub Pages, so `main` is what
is running and nothing else claims to be. Nothing reads the version: the package
is `"private": true` and never published, the string appears nowhere in the built
app, and there is no service worker or lazy chunk that could hold an old build
back. A reload gets the current one.

## Implementation Guidelines

Think carefully and implement the most concise solution that changes as little code as possible.
All new code code will be carefully reviewed by an expert for correctness, security, edge cases, maintainability, and fit with the existing codebase.

### When Adding Features

- **Context is Everything**: When proposing functionalities or architecture, always think it through on the meta-level. The context of the UI element in question is usually the level where decisions fall out automatically. Why does the user interact with this element? How did they get here? What do they want to achieve? What does this element do in the entire in-app and out-of-app workflow? What other exisitng or not-yet-existing elements are related?
- **Usability First**: Always think user experience first. If the intended user experience or user flow is unclear, ask.
- **Interface Design**: Adhere to the Eight Golden Rules of Interface Design, and to what each has come to mean here: @InterfaceDesign.md
- **Universal Design**: Golden Rule 2 in full — the accessibility conventions this repo is bound to: @UniversalDesign.md
- **Minimize UI Interactions**: Keep interactions minimal. Avoid adding steps or dialogs unless necessary.
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

Coderabbit does not review this repository automatically (it has fewer than 10 stars), so you must trigger every review yourself: after opening the PR, add a comment containing exactly `@coderabbitai review`. Retrigger the review after every push, documentation included, since every push dismisses the approval (edits to the PR title or body are not pushes and need none). Coderabbit reviews at most once per hour; a trigger inside that window is acknowledged but not run: Coderabbit edits its summary comment at the top of the PR into a "Review limit reached" notice naming the wait. Do not count on the trigger being queued.

As an exception to guideline 7 (never jump straight to implementation), fix no-brainer feedback directly; discuss anything that is a judgement call with the requester instead of deciding it on your own. Answer every Coderabbit thread whose suggestion was declined: Coderabbit approves only once all its threads are settled.

Enable auto-merge (squash) on the PR right after opening it, except on the scheduled-task pull requests under Gemini Models below. The ruleset on `main` requires an approving review and green `build` and `lint`, and dismisses the approval on every push. Coderabbit's approval is that review, so the PR merges by itself once the review round is done; nobody merges by hand.

Do not rely on PR events reaching you. After every trigger, schedule a check-in with `send_later`: 10 minutes after the trigger, or a minute past the wait a rate-limit notice names. On the check-in, read the PR: merged means done; no reaction from Coderabbit to the trigger means it was lost, so trigger once more; a rate-limit notice means trigger again once it has run out; requested changes mean fixing and discussing as above; a failed `build` or `lint` means finding its cause and fixing it, or reporting the blocker to the requester. Schedule a new check-in after each step until the PR has merged or waits on the requester.

### Gemini Models

The models in `API_CONFIG` are chosen, measured and kept current as described in `doc/gemini-models.md`, which a monthly scheduled task follows. Do not change them by hand without recording the decision there. Model pull requests opened by that task are exempt from the Coderabbit review above, and so are Dependabot pull requests, which a weekly scheduled task reviews and merges. Both tasks run under the repository owner's account and merge through its admin bypass of the ruleset ("Repository admin", for pull requests), since without a Coderabbit review no approval arrives.
