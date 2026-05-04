---
name: git-workflow
description: >-
  Git branch management and commit workflow. Covers conventional commits,
  feature branch creation, branch renaming/alignment, and safe rebasing.
  Use when the user asks to commit changes, create a branch, rename a branch,
  align a branch name, write a commit message, or manage git workflow.
---

# Git Workflow

## Feature Branch Creation

Always start from the latest base branch:

```bash
git fetch origin
git switch --create <type>/<slug> origin/main
```

Use descriptive branch names with a type prefix:

| Prefix | When to use |
| -------- | ------------- |
| `feat/` | New feature |
| `fix/` | Bug fix |
| `docs/` | Documentation only |
| `refactor/` | Code restructuring |
| `test/` | Adding or updating tests |
| `build/` | Build system, deps, containers |
| `ci/` | CI/CD configuration |
| `chore/` | Maintenance tasks |

Examples: `feat/add-user-auth`, `fix/date-parsing-timezone`,
`docs/api-reference-update`.

### Fork workflows

When working from a fork, fetch from the upstream remote:

```bash
git fetch upstream
git switch --create feat/<slug> upstream/main
```

Push to your fork remote and target upstream for PRs.

---

## Conventional Commits

Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
format:

```text
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | When to use |
| ------ | ------------- |
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Code style/formatting (no logic change) |
| `refactor` | Code restructuring (no feature or fix) |
| `test` | Adding or updating tests |
| `build` | Build system, dependencies, containers |
| `ci` | CI/CD configuration |
| `chore` | Maintenance tasks |
| `perf` | Performance improvement |
| `revert` | Reverting a previous commit |

### Scopes

Scopes are project-specific. Use them to indicate the area of change (e.g.
`auth`, `api`, `ui`, `cli`, `db`). Keep scopes consistent within a project.

### Examples

```text
feat(auth): add JWT token refresh endpoint

Implement automatic token refresh when access token expires within 5 minutes.
Refresh tokens are rotated on each use.

Closes #42
```

```text
fix(api): handle null response from upstream service

The payments API occasionally returns null instead of an error object.
Add null check before accessing response fields.
```

```text
docs: update API reference for v2 endpoints
```

```text
build: upgrade Node.js to 22 LTS
```

### Writing good commit messages

1. **Subject line**: imperative mood, no period, under 72 chars.
   - Good: "add user authentication middleware"
   - Bad: "Added user authentication middleware."
2. **Body** (optional): explain *why*, not *what*. The diff shows what changed.
3. **Footer** (optional): reference issues (`Closes #123`), note breaking
   changes (`BREAKING CHANGE: ...`).

### Committing via heredoc

For multi-line commit messages, use a heredoc to preserve formatting:

```bash
git commit -m "$(cat <<'EOF'
feat(auth): add JWT token refresh endpoint

Implement automatic token refresh when access token expires within
5 minutes. Refresh tokens are rotated on each use.

Closes #42
EOF
)"
```

---

## Branch Renaming / Alignment

Use this when a branch name no longer matches its purpose (e.g. after
renumbering an issue or ticket, or if the initial name was wrong).

### 1. Detect current state

```bash
git branch --show-current
git rev-parse --abbrev-ref @{upstream} 2>/dev/null || echo "no upstream set"
```

Check for an open PR on the current branch:

```bash
gh pr list --head "$(git branch --show-current)" --json number,url \
  --jq '.[] | {number, url}'
```

### 2. Execute rename

```bash
OLD_BRANCH=$(git branch --show-current)
NEW_BRANCH="<new-branch-name>"

# Rename local branch
git branch -m "$OLD_BRANCH" "$NEW_BRANCH"

# Push new branch to remote
git push -u origin "$NEW_BRANCH"

# Delete old remote branch
git push origin --delete "$OLD_BRANCH"
```

For fork workflows, replace `origin` with your fork remote name.

### 3. Update PR (if exists)

GitHub PRs automatically track renamed branches if the new branch is pushed
before deleting the old one. Verify with `gh pr view N`. If it doesn't
update automatically:

```bash
gh pr edit N --head "your-fork:$NEW_BRANCH"
```

### Safety checks

- **Never rename `main` or `master`** — abort with error.
- **Check for uncommitted changes** — stash or commit before renaming.
- **Verify remote exists** — fail gracefully if not configured.
- **Confirm before deleting the old remote branch.**

### Edge cases

| Situation | Handling |
| ----------- | ---------- |
| Uncommitted changes | Stash before rename, restore after |
| Not on the branch to rename | Checkout first or specify the branch explicitly |
| No open PR | Skip PR update step |
| Multiple remotes | Prompt which remote to update |
| Protected branch | Warn and abort |

---

## Safe Rebasing

### Rebase onto updated base

```bash
git fetch origin
git rebase origin/main
```

If there are conflicts, resolve them file by file, then:

```bash
git add <resolved-files>
git rebase --continue
```

To abort a rebase in progress:

```bash
git rebase --abort
```

### Push after rebase

A rebase rewrites history. Use `--force-with-lease` (never `--force`) to
push safely:

```bash
git push --force-with-lease
```

`--force-with-lease` refuses to push if the remote has commits you haven't
fetched, protecting against overwriting collaborators' work.

---

## Pre-commit Checklist

Before committing, verify:

- [ ] On a feature branch (not `main`/`master`)
- [ ] Quality gates pass (linter, formatter, type checker)
- [ ] Tests pass
- [ ] Commit message follows conventional commits format
- [ ] No secrets or credentials in staged files

Before pushing / creating a PR:

- [ ] Branch is up to date with base (`git rebase origin/main`)
- [ ] All quality gates still pass after rebase
- [ ] Branch name matches the work being done
