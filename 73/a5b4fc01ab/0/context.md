# Session Context

## User Prompts

### Prompt 1

# Prime Context

This command loads essential context for a new agent session by reading the project context documentation and understanding the codebase structure.

## Preflight Checklist

Before proceeding, complete these validation steps.
Do not bother the user with preflight checks progress ("I'm not going to ..."). Just do them and move on.

### 1. Context Availability Check
- Run: `ls -la .claude/context/ 2>/dev/null`
- If directory doesn't exist or is empty:
  - Tell user: "❌ No context...

### Prompt 2

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

### Prompt 3

Can you create a prd from issue 104?

### Prompt 4

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

### Prompt 5

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

### Prompt 6

Output:
!bash ccpm/scripts/pm/help.sh

### Prompt 7

# Epic Start

Launch parallel agents to work on epic tasks in a shared branch.

## Usage
```
/pm:epic-start <epic_name>
```

## Quick Check

1. **Verify epic exists:**
   ```bash
   test -f .claude/epics//epic.md || echo "❌ Epic not found. Run: /pm:prd-parse "
   ```

2. **Check GitHub sync:**
   Look for `github:` field in epic frontmatter.
   If missing: "❌ Epic not synced. Run: /pm:epic-sync  first"

3. **Check for branch:**
   ```bash
   git branch -a | grep "epic/"
   ```

4. **Check fo...

### Prompt 8

Base directory for this skill: /Users/dominik/Code/ai-recipe-planner/.claude/skills/brainstorming

# Brainstorming Ideas Into Designs

## Overview

Help turn ideas into fully formed designs and specs through natural collaborative dialogue.

Start by understanding the current project context, then ask questions one at a time to refine the idea. Once you understand what you're building, present the design in small sections (200-300 words), checking after each section whether it looks right so far....

