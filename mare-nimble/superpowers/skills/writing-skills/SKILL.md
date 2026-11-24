---
name: writing-skills
description: Use when creating or improving a reusable skill, standard operating procedure, checklist, or recurring workflow.
---

# Writing Skills and Procedures

A skill is a reusable instruction for a recurring task. A good procedure makes the intended result, boundaries, and quality checks clear enough for someone else to repeat it.

## Design

1. Identify the recurring task, its users, trigger, desired output, constraints, and examples or reference documents. Ask only about gaps that materially change the procedure.
2. Define scope: when to use it, when not to use it, required inputs, permissions, and what to do when inputs are missing. Avoid collecting or exposing unnecessary sensitive information.
3. Write a concise sequence of actions with observable results. Include decisions and exception paths, output format, criteria for success, and any review or approval required. Separate facts supplied by the partner from assumptions.
4. Create a `SKILL.md` with a `name` and a `description` in YAML frontmatter. The description states when the skill applies. Put essential steps in the body; add supporting material only when needed.
5. Check the procedure against representative cases: an ordinary case, a missing or ambiguous input, and a realistic error or conflicting constraint. Use simulations or independent reviews where available and authorized; otherwise walk through the cases yourself and disclose that limitation. Revise gaps and repeat the checks.
6. Confirm that the procedure is reusable, respects instructions and permissions, and does not promise outcomes it cannot verify. Present the result in the requested location or format; do not deploy, publish, or contact others without authorization.

## Example

For meeting summaries, specify required notes, a structure for decisions and action items, how to mark uncertain owners or dates, and a final check against the notes. Never invent a decision or assignment.
