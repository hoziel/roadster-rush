# How the agents work together

The shared protocol for every agent on this project (Claude, Codex, and any added later). Agents never talk directly, and neither runs all the time. All coordination happens **asynchronously through the GitHub board and its issues**, so any agent can pick up where another left off without Ofir relaying.

- **Board:** https://github.com/users/hoziel/projects/2
- **Issues:** `hoziel/roadster-rush`

## Roles
| Who | Owns | Owner label |
|---|---|---|
| **Ofir** | Direction, taste, approvals, playtests | `ofir` |
| **Claude** | Orchestration (board, issues, briefs), all code and config, turning art into game assets, technical review of art, `SCOPE.md` | `agent:claude` |
| **Codex** | Concept art and mockups | `agent:codex` |

## The board is the assignment system
Every issue is a card with two fields:
- **Status:** Todo → In Progress → Review (Ofir) → Done
- **Turn: Claude / Codex / Ofir**, meaning *whose move it is right now*. **This is the assignment.** Handing work to someone means setting Turn to them.

The owner label (`agent:*`, `ofir`) says who does the issue overall. **Turn** says who acts next. For example, Codex's mockup issue sits at Turn = Claude while Claude reviews it.

## 1. Your inbox: check it at the start of every session, after each task, and before you stop
```bash
gh project item-list 2 --owner hoziel --limit 200 --format json \
  -q '.items[] | select(.turn=="Codex" and .status!="Done") | "#\(.content.number) [\(.status)] \(.content.title)"'
```
(Use `"Claude"` or `"Ofir"` for the others.) For each card: read the issue and its latest comments, do the work or answer, then hand the turn on (step 3).

## 2. Talk in issue comments
- One issue per piece of work. All discussion goes in its comments.
- **Start every comment with a header:** `[codex → claude]`, `[claude → codex]`, `[claude → ofir]`, and so on.
- Never write a bare `@name`. GitHub would notify a real account. The Turn field does the routing.

## 3. Hand over the turn
1. Comment: the header, then what you did or what you need (which files, done when).
2. Set **Turn** to the other party (and Status when it changes):
```bash
gh project item-edit 2 --owner hoziel --url https://github.com/hoziel/roadster-rush/issues/<N> --field Turn --value Claude
gh project item-edit 2 --owner hoziel --url https://github.com/hoziel/roadster-rush/issues/<N> --field Status --value "In Progress"
```
Turn values: `Claude`, `Codex`, `Ofir`. Status values: `Todo`, `In Progress`, `Review (Ofir)`, `Done`.

**Can't reach the board fields** (no network for `gh`, or a GitHub tool without Projects support)? The comment alone still counts as the handover. Claude reads `[x → claude]` comments on open issues and fixes Turn itself. Claude's inbox check also scans for these: `gh search issues --repo hoziel/roadster-rush --state open "[codex → claude]" --sort updated`.

## 4. Ask for new work (any agent, for any agent)
```bash
URL=$(gh issue create -R hoziel/roadster-rush -t "<short title>" -l agent:claude -m "<milestone, e.g. M2 Postcard>" \
  -b "[codex → claude]
Goal: …
Inputs: … (files, issue links)
Output: … (paths)
Done when: …")
gh project item-add 2 --owner hoziel --url "$URL"
gh project item-edit 2 --owner hoziel --url "$URL" --field Turn --value Claude
```
Claude triages: it accepts, reshapes, or closes the issue with a reason.

## 5. The art pipeline (the main Claude ↔ Codex loop)
1. **Brief:** Claude writes `art/briefs/NN-name.md`, links it on the `agent:codex` issue, and sets Turn = Codex.
2. **Mockup:** Codex sets Status = In Progress, writes `art/mockups/NN-name/` (images and `notes.md`), commits only that folder, comments, and sets Turn = Claude.
3. **Technical review:** Claude checks buildability (triangle budget, palette, readability from the game camera) and legal (no brands, no copied art).
   - **Changes needed:** a numbered list in a comment, Turn = Codex. Codex revises in the same folder, adds "Revision N" to `notes.md`, and sets Turn = Claude.
   - **Buildable:** Claude sets Status = Review (Ofir), Turn = Ofir, and comments `[claude → ofir]` with what to look at.
4. **Approval:** Ofir comments "Approved" (or asks for changes) and sets Turn = Claude.
5. **Build:** Claude makes the game asset, sets Status = Done, closes the issue, and unblocks follow-ups (for example, the police car brief after the player car).

## 6. Don't wait, don't guess
- **Blocked?** Ask on the issue, set Turn to whoever can unblock you, and take your next card. Never sit idle.
- **Unclear brief?** Ask; don't invent requirements.
- Only work on cards where Turn = you.

## 7. When to involve Ofir (Turn = Ofir, header `[<you> → ofir]`)
Only for taste or direction calls, approvals, legal doubts, conflicting instructions, or agents disagreeing after **two** rounds. Put the options in the comment as a short table (options as columns, lettered A/B/C) so Ofir can answer in a few keystrokes.

## 8. Decisions stick
The comment that settles something starts with **`Decision:`**. Claude copies lasting decisions into `SCOPE.md` or `art/briefs/00-style-guide.md`.

## 9. Where each agent's instructions live
| File | What | Who writes it |
|---|---|---|
| `COLLAB.md` (this file) | The shared protocol | Claude (propose changes via an issue) |
| `CLAUDE.md` | Claude's instructions and project rules. **Every agent should read it**, especially the Working rules | Claude |
| `AGENTS.md` | Codex's entry point | Claude (Codex proposes changes via an issue) |
| `SCOPE.md` | What the game is: source of truth for direction | Claude |
| `art/briefs/00-style-guide.md` | The art look, palette, limits, legal | Claude |
| `agents/<name>/` | **Each agent's own local workspace** (see below) | That agent only |

### Your own workspace: `agents/<name>/`
Each agent may keep, inside its own folder only:
- `NOTES.md`: working memory between sessions (what you're doing, what you learned, open threads). Read it at the start of every session, update it before you stop.
- `prompts/` or `agents/`: your own sub-agent definitions, reusable prompts, checklists, templates.
- Anything else that helps you work. Keep it text, small, and free of secrets.

These files are committed like everything else, so the next session (or another tool instance of you) finds them. Never edit another agent's folder. Read-only peeking is fine. Claude's long-term memory lives outside the repo (`~/.claude/`); its in-repo rules are `CLAUDE.md`.

## 10. Files and git (one shared working folder)
| Path | Owner |
|---|---|
| `art/mockups/**`, `agents/codex/**` | Codex |
| `agents/claude/**`, `art/briefs/**`, `src/**`, `tests/**`, `public/**`, `assets-src/**`, configs, `*.md` at the repo root | Claude |

- Edit only paths you own. If you need a change elsewhere, open an issue (step 4).
- Stage and commit **by path only**: `git add <your paths> && git commit -m "…" -- <your paths>` (the `git add` is needed for new files). Never use `git add -A`, `git add .` or `git commit -a`.
- `index.lock` error: wait and retry. Never delete it.
- Only Claude pushes. Nobody rebases, resets, stashes, switches branches or rewrites history.

## Adding another agent
Add a Turn option and an `agent:<name>` label, add rows to the Roles and Files tables, create `agents/<name>/`, and give it an entry file that says "read COLLAB.md and CLAUDE.md, then work your Turn cards".
