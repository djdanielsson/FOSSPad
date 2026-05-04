---
name: github-pr
description: >-
  Create, review, and maintain GitHub pull requests using gh CLI. Covers PR
  creation with structured descriptions, responding to review comments,
  resolving threads via GraphQL, checking CI status, and reviewing contributor
  PRs. Use when the user asks to create a PR, review a PR, respond to review
  feedback, check CI, resolve review threads, or prepare a contributor PR for
  merge.
---

# GitHub Pull Requests

## Creating a Pull Request

### 1. Pre-flight checks

Before creating a PR, ensure the branch is ready:

```bash
git fetch origin
git log --oneline origin/main..HEAD   # confirm commits to include
git diff origin/main --stat           # review changed files
```

Run your project's quality gates (linter, tests, etc.) and confirm they pass
on the full tree — not just files you touched.

### 2. Push and create

```bash
git push -u origin HEAD

gh pr create \
  --title "type(scope): concise description" \
  --body "$(cat <<'EOF'
## Summary
- What changed and why (1-3 bullets)

## Changes
- Notable implementation details

## Test plan
- [ ] Linter passes
- [ ] Tests pass
- [ ] Docs updated (if applicable)
EOF
)"
```

**Fork workflows:** If your fork pushes to a different remote (e.g. `fork`)
and the PR targets an upstream repo, specify `--repo owner/repo`:

```bash
git push -u fork HEAD
gh pr create --repo upstream-owner/repo \
  --title "type(scope): description" \
  --body "..."
```

Return the PR URL to the user when done.

### 3. PR description sections

| Section | Purpose |
| --------- | --------- |
| **Summary** | What changed and why — 1-3 bullets |
| **Changes** | Notable implementation details reviewers should know |
| **Test plan** | How to verify — checkboxes for CI, manual steps, etc. |

Add optional sections as needed (e.g. "Breaking changes", "Screenshots",
"Related issues").

### 4. Keeping the PR updated

When pushing additional commits, update the PR body to stay current:

```bash
gh pr edit <number> --body "$(cat <<'EOF'
...updated body reflecting all commits...
EOF
)"
```

---

## Responding to Review Feedback

### Rules

- Address **all** review comments before requesting re-review.
- Every comment requires a **closing reply** explaining how it was resolved
  and citing the commit hash (e.g. "Removed unused import. Fixed in abc1234.").
- When feedback is addressed, **resolve the thread**. When disputing, leave
  it unresolved for human escalation with a clear technical explanation.
- After pushing fixes, update the PR description to reflect expanded scope.

### Deferred work must be tracked

Any time a response says "follow-up PR", "future enhancement", or "out of
scope" — create a GitHub issue immediately so the work is tracked:

```bash
gh issue create --repo owner/repo \
  --title "type(scope): brief description" \
  --body "$(cat <<'EOF'
## Context
<What was deferred and why>

Flagged in: <link to PR comment thread>

## Proposal
<What should be done>
EOF
)"
```

Include the issue URL in your reply.

### Replying to comments

```bash
gh api -X POST "repos/OWNER/REPO/pulls/PR/comments/COMMENT_ID/replies" \
  -f body="Explanation of how it was resolved. Fixed in COMMIT_SHA."
```

To get comment IDs:

```bash
gh api repos/OWNER/REPO/pulls/PR/comments \
  --jq '.[] | {id, user: .user.login, body: .body[0:120]}'
```

### Resolving review threads (GraphQL)

**Always use `resolveReviewThread`** — never `minimizeComment` (that hides
the comment but does NOT resolve the thread).

```bash
# List unresolved threads
gh api graphql -f query='{
  repository(owner: "OWNER", name: "REPO") {
    pullRequest(number: N) {
      reviewThreads(first: 50) {
        nodes { id isResolved comments(first:1) { nodes { body } } }
      }
    }
  }
}' --jq '.data.repository.pullRequest.reviewThreads.nodes[]
  | select(.isResolved == false)
  | {id, snippet: .comments.nodes[0].body[0:120]}'

# Resolve a thread
gh api graphql -f query='mutation {
  resolveReviewThread(input: {threadId: "THREAD_ID"}) {
    thread { isResolved }
  }
}'

# Resolve multiple threads
for tid in "THREAD_ID_1" "THREAD_ID_2"; do
  gh api graphql -f query="mutation {
    resolveReviewThread(input: {threadId: \"${tid}\"}) {
      thread { isResolved }
    }
  }"
done
```

---

## Checking CI Status

Always check CI as part of review. Fix failures before addressing comments —
a green build is a prerequisite for merge.

```bash
# List failing checks
gh pr checks N --json name,state \
  --jq '.[] | select(.state != "SUCCESS" and .state != "PENDING")'

# Get log link for a specific failed check
gh pr checks N --json name,state,link \
  --jq '.[] | select(.name == "CHECK_NAME") | .link'

# View failed job logs directly
gh run view RUN_ID --log-failed 2>&1 | tail -80
```

### After pushing fixes: check for new automated reviews

Automated reviewers (e.g. Copilot) may run again on new commits. Re-check
for new comments after each push:

```bash
# Check for new Copilot review (replace ISO8601 with last push time)
gh api repos/OWNER/REPO/pulls/N/reviews \
  --jq '.[] | select(.user.login == "copilot-pull-request-reviewer[bot]"
    and .submitted_at > "ISO8601") | {submitted_at, state, body: .body[0:200]}'

# Check for new Copilot line comments
gh api repos/OWNER/REPO/pulls/N/comments \
  --jq '.[] | select(.user.login == "Copilot"
    and .created_at > "ISO8601") | {id, path, body: .body[0:150]}'
```

---

## Reviewing a Contributor's PR

Use this workflow when helping someone else's PR get merge-ready.

### 1. Fetch PR metadata

```bash
gh pr view N --json number,title,body,baseRefName,headRefName,author
gh pr diff N
```

Confirm the base branch and the remote/branch you would push to if making
changes on their behalf.

### 2. Check if the branch is up to date

```bash
git fetch origin
# Compare: does the PR base have newer commits than the branch?
git log --oneline HEAD..origin/main | head -5
```

If the base has moved ahead, rebase (or merge) before pushing:

```bash
git rebase origin/main
git push --force-with-lease
```

### 3. Run quality gates

Run the project's linter and tests on the **entire** tree before pushing to
the contributor's branch. Do not push if quality gates fail — fix first.

### 4. PR description quality

If the PR body is minimal or missing structure, suggest or apply the template
from the "PR description sections" table above. You can update it via:

```bash
gh pr edit N --body "$(cat <<'EOF'
...structured body...
EOF
)"
```

### 5. Pushing to the contributor's branch

Only push if you have permission and the user has asked you to.

```bash
git push <remote> <local-branch>:<their-branch> --force-with-lease
```

After pushing, reply on any review threads your changes address (see
"Replying to comments" above).

### Contributor review checklist

- [ ] PR metadata and diff reviewed
- [ ] Branch up to date with base (rebased if needed)
- [ ] Quality gates pass (linter + tests)
- [ ] PR description has Summary, Changes, Test plan
- [ ] If pushing: rebase, quality gates green, force-with-lease
- [ ] Review threads replied to and resolved where appropriate

---

## Common Copilot Review Patterns

Address these proactively to reduce review round-trips:

| Pattern | Fix |
| --------- | ----- |
| **Pin GitHub Actions to SHAs** | Use `actions/checkout@SHA # v4` instead of mutable tags |
| **Inaccurate docs** | Ensure docs describe actual behavior (triggers, branches, etc.) |
| **Markdown table formatting** | Single leading `\|` per line — double `\|\|` creates empty columns |
| **Stale comments** | Update comments/docstrings when renaming or changing behavior |
| **Secrets on command lines** | Use env vars in docs/examples, never inline tokens |
| **Unused imports** | Remove them or use the symbol (type annotation, assertion) |
