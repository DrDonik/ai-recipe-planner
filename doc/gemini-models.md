# Gemini models

Which Gemini models the app calls, why, and how that choice is kept current.
A monthly scheduled task follows the procedure at the end of this file; people
read the rest as the record of what was decided and on what evidence.

## Current models

| Role | Constant (`src/constants/index.ts`) | Model | Why |
| --- | --- | --- | --- |
| Text: meal plans, tips, chat, photo recognition | `API_CONFIG.MODEL` | `gemini-3.6-flash` | Plans of five to six recipes are the common case, so the time a plan takes outweighs refinement in the recipes. Of the stable Flash models it plans fastest at the model's default thinking level. |
| Recipe images | `API_CONFIG.IMAGE_MODEL` | `gemini-nano-banana-2.1` | Newest stable model of the plain Nano Banana line. |

Announced price change: `gemini-3.6-flash` costs $0.75 / $3.75 per million
input / output tokens through 2026-12-31 and $1.50 / $7.50 from 2027-01-01
(Google's "introductory pricing"; the same applies to `gemini-3.8-flash`).

## Decisions

Newest first. Whoever closes a model pull request without merging it records
the rejection here, with the reason and the condition under which the
candidate should be looked at again; the scheduled task cannot know why a
person said no, and it skips a rejected candidate until that condition holds.

### 2026-11-03: `gemini-3.8-flash` rejected

Pull request #361, closed unmerged.

Measured with `npm run smoke:models`, three alternating rounds per model, two
recipes per plan:

| | `gemini-3.6-flash` | `gemini-3.8-flash` (`medium`, its default) | `gemini-3.8-flash` (`low`) |
| --- | --- | --- | --- |
| Meal plan, median | 33 s | 72 s | 14 s |
| Output tokens per smoke run, median | 9,359 | 12,575 | 2,356 |
| Smoke checks | all passed | all passed | all passed |

At its default level 3.8 more than doubles the wait for a plan, which is the
deciding factor. Its recipes were the most elaborate and also needed about
half again as many ingredients bought. At `thinking_level: low` it was the
fastest and cheapest, but all three runs produced the same two dishes and
each plan broke the prompt's rule on count amounts ("the 1 onion" for "the
onion"); the app does not set a thinking level today, and adopting `low` would
be a change to the app, not a model update.

Revisit when `gemini-3.6-flash` is given a shutdown date.

## Criteria

A model change is merged only if all of these hold. They are checked and
reported in this order, all of them, not just the first that fails.

1. **Function**: every check of `npm run smoke:models` passes on the branch,
   including the model-version check.
2. **Wait**: the median duration of the check the user waits on is at most
   20 % above the current model's. That is the meal plan for a text model and
   the recipe image for an image model.
3. **List price**: no input, output or image price of the new model is higher
   than the current model's on the same date, including announced future
   prices.
4. **Effective cost**: the estimated cost of one smoke run (median tokens times
   list prices) is at most 25 % above the current model's.
5. **Completeness**: every price in 3 and 4 could be determined.
6. **CI** on the pull request is green.

If the current model has a shutdown date and the candidate fails a criterion,
nothing is merged, and the report says prominently that a decision is needed
before that date.

## Monthly procedure

The scheduled task runs in a cloud session whose environment holds the Gemini
key as a network secret for `generativelanguage.googleapis.com` (header
`x-goog-api-key`) and allows `aistudio.google.com`. The key never enters the
session; never try to read, print or pass it.

1. Read "Current models" and "Decisions" above. A candidate recorded as
   rejected is skipped unless its revisit condition has occurred.
2. If a model pull request from an earlier run is still open, open no second
   one: re-measure, update the numbers in its description, apply the criteria
   above to it, and merge it under step 9 if every criterion now holds.
   Otherwise report that it awaits a decision.
3. Find candidates. List the available models with
   `curl -sS "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000"`
   and cross-check https://aistudio.google.com/docs/models and
   https://aistudio.google.com/docs/deprecations.
   - Text: the newest stable model named exactly `gemini-<version>-flash` that
     supports `generateContent`. Never `-lite`, `-preview`, `-exp`, `-tts`,
     `-live`, `-image`, `-latest` aliases or omni models.
   - Image: the newest stable model of the plain Nano Banana line
     (`gemini-nano-banana-<version>`). Never Pro, Lite or preview.
   - A candidate is newer than the current model and not skipped under 1.
   - Note any announced shutdown date of a current model.
4. Read https://aistudio.google.com/docs/pricing (paid tier, standard; `curl`
   returns the tables as text) for the current models and any candidate,
   including announced future price changes.
5. Without a candidate: run `npm ci` and `npm run smoke:models` once on main as
   a health check, report its result, any announced price change and any
   shutdown date, and stop. A failure here means the live app is affected; say
   so first.
6. With a candidate: run `npm ci`, then on main and afterwards on the
   candidate branch `npm run smoke:models -- --plan-runs 3` for a text model,
   `--image-runs 3` for an image model, both flags if both change. Run
   `npm run lint` and `npm run build` on the branch.
7. Apply the criteria above.
8. Work on the branch the session's git instructions designate, started fresh
   from main; push without `--force`. Change only the constant(s), and in the
   same commit update "Current models" above and add a "Decisions" entry for
   the adoption with the measured numbers. Commit message:
   `chore(models): move <text|image> model to <id>`. Open the pull request in
   English after `.github/pull_request_template.md`, with a table of the
   criteria and their numbers at the top. Do not request a Coderabbit review:
   the change is one string, and the smoke test is the review.
9. If every criterion holds, squash-merge: enable auto-merge, or wait for the
   checks and merge. Otherwise leave the pull request open and state at the top
   of its description which criteria failed, with the numbers. A slower or more
   expensive model is the requester's decision, never the task's.
10. Final message: one short paragraph in German: merged, open and awaiting a
    decision (and why), or nothing to do; the smoke result; any announced price
    change or shutdown date.
