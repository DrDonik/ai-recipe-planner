# Session Context

## User Prompts

### Prompt 1

# PRD New

Launch brainstorming for new product requirement document.

## Usage
```
/pm:prd-new <feature_name>
```

## Required Rules

**IMPORTANT:** Before executing this command, read and follow:
- `.claude/rules/datetime.md` - For getting real current date/time

## Preflight Checklist

Before proceeding, complete these validation steps.
Do not bother the user with preflight checks progress ("I'm not going to ..."). Just do them and move on.

### Input Validation
1. **Validate feature name for...

### Prompt 2

# PRD New

Launch brainstorming for new product requirement document.

## Usage
```
/pm:prd-new <feature_name>
```

## Required Rules

**IMPORTANT:** Before executing this command, read and follow:
- `.claude/rules/datetime.md` - For getting real current date/time

## Preflight Checklist

Before proceeding, complete these validation steps.
Do not bother the user with preflight checks progress ("I'm not going to ..."). Just do them and move on.

### Input Validation
1. **Validate feature name for...

### Prompt 3

Base directory for this skill: /Users/dominik/Code/ai-recipe-planner/.claude/skills/brainstorming

# Brainstorming Ideas Into Designs

## Overview

Help turn ideas into fully formed designs and specs through natural collaborative dialogue.

Start by understanding the current project context, then ask questions one at a time to refine the idea. Once you understand what you're building, present the design in small sections (200-300 words), checking after each section whether it looks right so far....

### Prompt 4

d) Sometimes, the LLM groups the entire shoppingList into the missingIngredients of one recipe. Maybe the LLM prompt can be misunderstood?

### Prompt 5

a) is the desired begaviour

### Prompt 6

Yes, this seems right. What other rules or parts of the prompt mention shoppingList or missingIngredients?

### Prompt 7

That looks right

### Prompt 8

# PRD Parse

Convert PRD to technical implementation epic.

## Usage
```
/pm:prd-parse <feature_name>
```

## Required Rules

**IMPORTANT:** Before executing this command, read and follow:
- `.claude/rules/datetime.md` - For getting real current date/time

## Preflight Checklist

Before proceeding, complete these validation steps.
Do not bother the user with preflight checks progress ("I'm not going to ..."). Just do them and move on.

### Validation Steps
1. **Verify <feature_name> was provided...

### Prompt 9

# PRD Parse

Convert PRD to technical implementation epic.

## Usage
```
/pm:prd-parse <feature_name>
```

## Required Rules

**IMPORTANT:** Before executing this command, read and follow:
- `.claude/rules/datetime.md` - For getting real current date/time

## Preflight Checklist

Before proceeding, complete these validation steps.
Do not bother the user with preflight checks progress ("I'm not going to ..."). Just do them and move on.

### Validation Steps
1. **Verify <feature_name> was provided...

### Prompt 10

# Epic Decompose

Break epic into concrete, actionable tasks.

## Usage
```
/pm:epic-decompose <feature_name>
```

## Required Rules

**IMPORTANT:** Before executing this command, read and follow:
- `.claude/rules/datetime.md` - For getting real current date/time

## Preflight Checklist

Before proceeding, complete these validation steps.
Do not bother the user with preflight checks progress ("I'm not going to ..."). Just do them and move on.

1. **Verify epic exists:**
   - Check if `.claude/ep...

### Prompt 11

# Epic Sync

Push epic and tasks to GitHub as issues.

## Usage
```
/pm:epic-sync <feature_name>
```

## Quick Check

```bash
# Verify epic exists
test -f .claude/epics/missing-ingredients-per-recipe-fix/epic.md || echo "❌ Epic not found. Run: /pm:prd-parse missing-ingredients-per-recipe-fix"

# Count task files
ls .claude/epics/missing-ingredients-per-recipe-fix/*.md 2>/dev/null | grep -v epic.md | wc -l
```

If no tasks found: "❌ No tasks to sync. Run: /pm:epic-decompose missing-ingredient...

### Prompt 12

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

### Prompt 13

I need to ask a meta-question here, this task is done! When you tried createing the issue using the gh command, the label "epic:missing-ingredients-per-recipe-fix" didn't exist. This is not surprising, it would need to be created first. The "epic" label, however, does exist, but it didn't return as an existing label when you listed the labels. This is puzzling.

Two questions:
1. It doesn't really make sense to create a label for each seperate epic, does it? Does the pm-command specifically stat...

### Prompt 14

Can you check where in the .claude/commands files you are instructed to create or at least assign these labels? And where would the truncate limit go?

