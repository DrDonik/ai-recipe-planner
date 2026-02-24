# Session Context

## User Prompts

### Prompt 1

# Issue Analyze

Analyze an issue to identify parallel work streams for maximum efficiency.

## Usage
```
/pm:issue-analyze <issue_number>
```

## Quick Check

1. **Find local task file:**
   - First check if `.claude/epics/*/165.md` exists (new naming convention)
   - If not found, search for file containing `github:.*issues/165` in frontmatter (old naming)
   - If not found: "❌ No local task for issue #165. Run: /pm:import first"

2. **Check for existing analysis:**
   ```bash
   test -f .cl...

### Prompt 2

# Issue Start

Begin work on a GitHub issue with parallel agents based on work stream analysis.

## Usage
```
/pm:issue-start <issue_number>
```

## Quick Check

1. **Get issue details:**
   ```bash
   gh issue view 165 --json state,title,labels,body
   ```
   If it fails: "❌ Cannot access issue #165. Check number or run: gh auth login"

2. **Find local task file:**
   - First check if `.claude/epics/*/165.md` exists (new naming)
   - If not found, search for file containing `github:.*issues/1...

### Prompt 3

# Issue Sync

Push local updates as GitHub issue comments for transparent audit trail.

## Usage
```
/pm:issue-sync <issue_number>
```

## Required Rules

**IMPORTANT:** Before executing this command, read and follow:
- `.claude/rules/datetime.md` - For getting real current date/time

## Preflight Checklist

Before proceeding, complete these validation steps.
Do not bother the user with preflight checks progress ("I'm not going to ..."). Just do them and move on.

0. **Repository Protection Chec...

### Prompt 4

# Epic Merge

Merge completed epic from worktree back to main branch.

## Usage
```
/pm:epic-merge <epic_name>
```

## Quick Check

1. **Verify worktree exists:**
   ```bash
   git worktree list | grep "epic-missing-ingredients-per-recipe-fix" || echo "❌ No worktree for epic: missing-ingredients-per-recipe-fix"
   ```

2. **Check for active agents:**
   Read `.claude/epics/missing-ingredients-per-recipe-fix/execution-status.md`
   If active agents exist: "⚠️ Active agents detected. Stop th...

