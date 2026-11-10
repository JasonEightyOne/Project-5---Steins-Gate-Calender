# Adding skills from GitHub to Claude Code

This guide explains how this repo got its `frontend-design` skill, so you can add others the same way.

## What a skill is

A skill is a folder containing a `SKILL.md` file:

```markdown
---
name: frontend-design
description: When Claude should use this skill. Claude reads this line to decide.
---

# Instructions Claude follows when the skill is used
...
```

Claude only sees each skill's `name` and `description` until a task matches the description. Then it loads the full instructions. A skill folder can also hold reference files or scripts that `SKILL.md` points to.

## Where skills live

| Location | Who gets it | Survives a new cloud session? |
|---|---|---|
| `.claude/skills/<name>/` **in this repo** | Everyone who works on this repo, on any machine | **Yes**, because it's committed to git |
| `~/.claude/skills/<name>/` on your computer | You, in every project on that computer | Yes, on that computer only |
| `~/.claude/skills/` inside a cloud session | Only that session | **No.** The container is temporary |
| A plugin from a marketplace | Wherever you install it | Depends on where it's installed |

For cloud sessions (claude.ai/code), **commit skills to the repo** under `.claude/skills/`. That's what this repo does.

## Three ways to add a skill from GitHub

### 1. Copy the folder (simplest, works everywhere)

This is how `frontend-design` was added:

```bash
git clone --depth 1 --filter=blob:none --sparse https://github.com/anthropics/skills /tmp/anthropic-skills
```

```bash
git -C /tmp/anthropic-skills sparse-checkout set skills/frontend-design
```

```bash
mkdir -p .claude/skills && cp -r /tmp/anthropic-skills/skills/frontend-design .claude/skills/
```

Then commit and push `.claude/skills/frontend-design/`. To make it personal rather than per-project, copy it to `~/.claude/skills/` instead.

### 2. Install a plugin from a marketplace

Some GitHub repos are plugin marketplaces. A plugin can bundle several skills, commands and agents. In a Claude Code terminal:

```bash
claude plugin marketplace add freshtechbro/claudedesignskills
```

Then run `/plugin` inside Claude Code to browse that marketplace and install a plugin from it.

### 3. Use a repo's own installer

Some projects ship an installer, for example:

```bash
npx add-skill addyosmani/web-quality-skills
```

These usually just copy files into `~/.claude/skills/`. Check where they put them. In a cloud session you'll still need to move the result into `.claude/skills/` and commit it.

## Before you install: safety check

A skill is a set of instructions Claude will follow, and it can include scripts Claude may run. Treat it like code from the internet:

1. **Read the whole `SKILL.md`** and every file it references before copying.
2. **Prefer known sources.** These include Anthropic's `anthropics/skills`, and well-known authors with a clear licence.
3. **Pin a version.** Record the commit you copied (see `.claude/skills/frontend-design/SOURCE.md`) so the skill can't change under you.
4. **Watch for red flags:** instructions to download and run things, send data somewhere, or ignore your instructions.

## Check that it works

1. Start a **new** session on this repo. Skills load when a session starts.
2. Ask "Which skills do you have?" and `frontend-design` should be listed.
3. Or ask for a design change, such as "Redesign the Calendars page". Claude should load the skill.

## Updating a copied skill

Repeat the copy step from "Copy the folder", compare the files with `git diff`, then update the commit hash in `SOURCE.md`.

## More skills to consider

[Claude-Code-Frontend-Design-Toolkit](https://github.com/wilwaldon/Claude-Code-Frontend-Design-Toolkit) lists about 30 more design skills and tools, for example:

- web quality and accessibility audits: `addyosmani/web-quality-skills`
- animation: `freshtechbro/claudedesignskills`
- Tailwind
- Three.js

These are third-party and haven't been reviewed here. Run the safety check above before adding any of them.
