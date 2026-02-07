# Fix Workflow Chaining Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix two broken workflow chains by replacing `GITHUB_TOKEN` with a custom GitHub App token so events propagate to downstream workflows.

**Architecture:** Add a `actions/create-github-app-token@v2` step in `issue-validation.yml` and `claude.yml` to generate a short-lived app token. Use this token (instead of `GITHUB_TOKEN`) for the steps that post comments and create PRs. Update `claude.yml`'s `if` condition and `allowed_bots` to accept the new app bot identity. Update `claude-code-review.yml`'s `if` condition and `allowed_bots` similarly.

**Tech Stack:** GitHub Actions, `actions/create-github-app-token@v2`, custom GitHub App

**App bot name placeholder:** `<APP_NAME>` — replace with the actual app slug (lowercase, hyphenated) before committing. The bot identity will be `<APP_NAME>[bot]`.

---

## Background

### Chain 1: issue-validation → claude

1. `issue-validation.yml` step 1 (claude-code-action) validates the issue
2. Step 2 posts a footer comment with `@claude` using `GITHUB_TOKEN`
3. Comment is authored by `github-actions[bot]` but `GITHUB_TOKEN` events are **suppressed by GitHub** — `claude.yml` never fires

### Chain 2: claude → code-review / test / lighthouse / ci

1. `claude.yml` implements the fix and creates a PR using `GITHUB_TOKEN`
2. PR is authored by `github-actions[bot]` but `GITHUB_TOKEN` events are **suppressed** — downstream `pull_request` workflows never fire

### Solution

Use a **custom GitHub App** token for both trigger points. The app's bot identity (`<APP_NAME>[bot]`) is distinct from `claude[bot]`, preventing self-trigger loops.

---

## Task 1: Update `issue-validation.yml` — generate app token and use it for footer comment

**Files:**
- Modify: `.github/workflows/issue-validation.yml`

### Step 1: Add app token generation step

Insert a new step between "Validate Issue with Claude" (line 79) and "Post footer comment" (line 80). Update the "Post footer comment" step to use the app token.

Replace the entire `issue-validation.yml` "Post footer comment" section (lines 80-119) with:

```yaml
      - name: Generate app token
        id: app-token
        uses: actions/create-github-app-token@v2
        with:
          app-id: ${{ vars.APP_ID }}
          private-key: ${{ secrets.APP_PRIVATE_KEY }}

      - name: Post footer comment
        env:
          GH_TOKEN: ${{ steps.app-token.outputs.token }}
          ISSUE_NUMBER: ${{ github.event.issue.number || inputs.issue_number }}
          AUTHOR_ASSOCIATION: ${{ github.event.issue.author_association }}
        run: |
          # Fetch the current labels on the issue
          LABELS=$(gh issue view "$ISSUE_NUMBER" --json labels --jq '.labels[].name')

          HAS_AUTO_IMPLEMENTABLE=$(echo "$LABELS" | grep -c '^auto-implementable$' || true)
          HAS_VALIDATED=$(echo "$LABELS" | grep -c '^validated$' || true)

          if [ "$HAS_AUTO_IMPLEMENTABLE" -gt 0 ]; then
            if [ "$AUTHOR_ASSOCIATION" = "OWNER" ] || [ "$AUTHOR_ASSOCIATION" = "MEMBER" ] || [ "$AUTHOR_ASSOCIATION" = "COLLABORATOR" ] || [ "$AUTHOR_ASSOCIATION" = "CONTRIBUTOR" ]; then
              gh issue comment "$ISSUE_NUMBER" --body "$(cat <<'EOF'
          🤖 This issue has been automatically flagged for implementation.

          @claude Please implement the fix/enhancement described in this issue.
          EOF
              )"
            else
              gh issue comment "$ISSUE_NUMBER" --body "$(cat <<'EOF'
          ℹ️ This issue appears safe to auto-implement, but requires approval from a maintainer.
          Maintainers: Explicitly call claude to trigger implementation.
          EOF
              )"
            fi
          elif [ "$HAS_VALIDATED" -gt 0 ]; then
            gh issue comment "$ISSUE_NUMBER" --body "$(cat <<'EOF'
          ℹ️ This issue requires manual review before implementation.
          Maintainers: Explicitly call claude to request implementation when ready.
          EOF
            )"
          else
            gh issue comment "$ISSUE_NUMBER" --body "$(cat <<'EOF'
          ⚠️ This issue needs clarification before it can be addressed.
          Please provide more details about the problem or enhancement you're requesting.
          EOF
            )"
          fi
```

### Step 2: Verify the diff looks correct

Run: `git diff .github/workflows/issue-validation.yml`

Expected: Only changes are (1) new "Generate app token" step added, (2) `GH_TOKEN` changed from `${{ secrets.GITHUB_TOKEN }}` to `${{ steps.app-token.outputs.token }}`. All existing shell logic unchanged.

### Step 3: Commit

```bash
git add .github/workflows/issue-validation.yml
git commit -m "fix(ci): use app token in issue-validation footer comment

The footer comment with @claude was posted using GITHUB_TOKEN, which
suppresses issue_comment events and prevents claude.yml from triggering.
Switch to a custom GitHub App token so the event propagates."
```

---

## Task 2: Update `claude.yml` — accept new bot and use app token for PR creation

**Files:**
- Modify: `.github/workflows/claude.yml`

### Step 1: Update the `if` condition to accept the app bot

In the `if` block (line 17), change:
```yaml
contains(fromJSON('["github-actions[bot]"]'), github.actor) &&
```
to:
```yaml
contains(fromJSON('["github-actions[bot]", "<APP_NAME>[bot]"]'), github.actor) &&
```

### Step 2: Update `allowed_bots` to include the app bot

On line 51, change:
```yaml
allowed_bots: 'github-actions'
```
to:
```yaml
allowed_bots: 'github-actions,<APP_NAME>'
```

### Step 3: Add app token generation step and use it for PR creation

Insert a "Generate app token" step between "Run Claude Code" (line 44) and "Create Pull Request" (line 67). Then update the "Create Pull Request" step to use it.

After the "Run Claude Code" step, add:
```yaml
      - name: Generate app token for PR
        if: |
          steps.claude.outputs.branch_name != '' &&
          steps.claude.outputs.structured_output != '' &&
          fromJSON(steps.claude.outputs.structured_output).made_changes == true &&
          (
            (github.event_name == 'issue_comment' && github.event.issue.pull_request == null)
          )
        id: app-token
        uses: actions/create-github-app-token@v2
        with:
          app-id: ${{ vars.APP_ID }}
          private-key: ${{ secrets.APP_PRIVATE_KEY }}
```

Then in the "Create Pull Request" step, change line 76:
```yaml
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
to:
```yaml
          GH_TOKEN: ${{ steps.app-token.outputs.token }}
```

### Step 4: Verify the diff

Run: `git diff .github/workflows/claude.yml`

Expected changes:
1. `if` condition includes `<APP_NAME>[bot]`
2. `allowed_bots` includes `<APP_NAME>`
3. New "Generate app token for PR" step added
4. "Create Pull Request" uses `steps.app-token.outputs.token`

### Step 5: Commit

```bash
git add .github/workflows/claude.yml
git commit -m "fix(ci): accept app bot trigger and use app token for PR creation

Two fixes:
- Allow <APP_NAME>[bot] as actor in the if condition and allowed_bots
  so the footer comment from issue-validation triggers this workflow.
- Use custom GitHub App token for gh pr create so the pull_request
  event propagates to downstream workflows (review, test, lighthouse)."
```

---

## Task 3: Update `claude-code-review.yml` — accept the app bot as PR author

**Files:**
- Modify: `.github/workflows/claude-code-review.yml`

### Step 1: Update the `if` condition

On line 17, change:
```yaml
github.actor == 'github-actions[bot]' ||
```
to:
```yaml
github.actor == 'github-actions[bot]' ||
github.actor == '<APP_NAME>[bot]' ||
```

### Step 2: Update `allowed_bots`

On line 45, change:
```yaml
allowed_bots: 'claude,github-actions'
```
to:
```yaml
allowed_bots: 'claude,github-actions,<APP_NAME>'
```

### Step 3: Verify and commit

Run: `git diff .github/workflows/claude-code-review.yml`

```bash
git add .github/workflows/claude-code-review.yml
git commit -m "fix(ci): allow app bot PRs to trigger code review

Accept <APP_NAME>[bot] as a valid PR author so PRs created by the
custom app token in claude.yml trigger the code review workflow."
```

---

## Task 4: Verify no changes needed in downstream workflows

**Files (read-only verification):**
- `.github/workflows/test.yml`
- `.github/workflows/lighthouse.yml`
- `.github/workflows/ci.yml`

### Step 1: Confirm test.yml, lighthouse.yml, and ci.yml need no changes

These workflows trigger on `pull_request` to `main` with **no actor checks**. They will fire for any PR regardless of author. Since the PR is now created with the app token (not `GITHUB_TOKEN`), the `pull_request` event will propagate and these workflows will trigger automatically.

No changes needed. Move on.

---

## Task 5: Push and verify

### Step 1: Push the branch

```bash
git push -u origin claude/debug-workflow-triggers-dhsi0
```

### Step 2: Create a test issue to verify Chain 1

Create a simple test issue on the repo. Verify:
- [ ] `issue-validation.yml` runs and posts assessment comment (as `claude[bot]`)
- [ ] Footer comment is posted by `<APP_NAME>[bot]` (not `github-actions[bot]`)
- [ ] `claude.yml` triggers from the footer comment
- [ ] Claude implements the fix and creates a PR

### Step 3: Verify Chain 2 on the created PR

After the PR is created, verify:
- [ ] PR author is `<APP_NAME>[bot]`
- [ ] `claude-code-review.yml` triggers
- [ ] `test.yml` triggers
- [ ] `lighthouse.yml` triggers
- [ ] `ci.yml` triggers

---

## Summary of changes

| File | Change | Why |
|------|--------|-----|
| `issue-validation.yml` | Add app token step; use it for footer comment | So `issue_comment` event propagates to `claude.yml` |
| `claude.yml` | Add `<APP_NAME>[bot]` to `if` + `allowed_bots`; add app token step; use it for PR creation | Accept new bot as trigger; so `pull_request` event propagates to downstream workflows |
| `claude-code-review.yml` | Add `<APP_NAME>[bot]` to `if` + `allowed_bots` | Accept app-bot-authored PRs for review |
| `test.yml` | No change | No actor check — triggers on any PR |
| `lighthouse.yml` | No change | No actor check — triggers on any PR |
| `ci.yml` | No change | No actor check — triggers on any PR |
