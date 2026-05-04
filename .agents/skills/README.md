# Agent Skills Index

**Read this file at the start of every session.** It tells you which skill files exist and when to use them. Before performing any action listed below, open and read the corresponding `SKILL.md` — do not rely on memory or assumptions.

| Skill | Path | When to read |
| ------- | ------ | -------------- |
| **git-workflow** | `git-workflow/SKILL.md` | Before any git commit, branch creation, branch rename, rebase, merge, or push. Covers conventional commit format, branch naming conventions (type prefixes), fork workflows, branch renaming with PR tracking, safe rebasing with `--force-with-lease`, and a pre-commit checklist. |
| **github-pr** | `github-pr/SKILL.md` | Before creating, updating, or reviewing a pull request, responding to review comments, resolving review threads, or checking CI status. Covers structured PR descriptions (Summary/Changes/Test plan), review feedback workflow, thread resolution via GraphQL, contributor PR review process, and common automated reviewer patterns. |

## How to use this index

1. At session start, read this file.
2. Before any action, check the table above for a matching skill.
3. If a skill matches, read its `SKILL.md` before proceeding.
4. If no skill matches, proceed normally.

## Adding a new skill

1. Create a new subdirectory under `.agents/skills/` with a `SKILL.md` file.
2. Include YAML front-matter with `name` and `description` fields.
3. Add a row to the table above with the skill name, path, and a one-sentence description of when to read it.
