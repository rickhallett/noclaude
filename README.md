# NoClaude: The Git History Sanitizer for the AI-Weary Developer

In a world where AI assistants inject their egos into your commit messages like uninvited code reviewers, **NoClaude** emerges as the ironic hero: a tool built by developers to erase traces of other tools built by developers. It rewrites your Git history, stripping Claude Code attributions and slapping on your own author details—because nothing says "ownership" like retroactively claiming credit for code you didn't write alone. Crafted in TypeScript with Bun, because why suffer Node's glacial pace when you can embrace a runtime that's probably just a fad? Shipped as an npm package, for that extra layer of dependency hell.

## Features (The Bare Minimum to Justify Its Existence)

- **Attribution Extermination**: Ruthlessly deletes "Claude Code from claude.ai/code" lines from commits. Ironic, isn't it? Using code to purge mentions of code generators.
- **Author Impersonation**: Overwrites every commit's author and committer with your details. Perfect for those moments when you realize sharing credit with an AI is as appealing as merging untested PRs on Friday afternoon.
- **Reluctant Confirmation**: Forces an interactive prompt before the rewrite. Because developers love nothing more than second-guessing irreversible actions that could brick their repo.
- **Enforced Bureaucracy**: Mandates both name and email flags. Skip one, and it errors out—mirroring the joy of mandatory fields in a poorly designed CI pipeline.

## Requirements (The Usual Suspects You'll Forget to Install)

- **[Bun](https://bun.sh/)**: The hipster runtime that's faster than Node but will likely introduce its own set of obscure bugs. Shebang: `#!/usr/bin/env bun`—pray your env finds it.
- **Git**: Essential for the history mangling. Without it, this tool is as useful as a linter in a legacy codebase.
- **Node.js and npm**: Ironically required for installation, even though the tool shuns Node at runtime. Dependency graphs gonna graph.

## Installation (Yet Another Global Polluter)

Install it globally, because who doesn't love cluttering their system PATH?

```bash
npm install -g noclaude
```

Now `noclaude` is ready to haunt your terminal sessions.

## Usage (Invoke at Your Own Peril)

CD into your repo-of-doom and run:

```bash
noclaude -n "Shadow Coder" -e "ghost@nullpointer.com"
```

### Options (Flags That Mock Your Forgetfulness)

- `-n, --name <name>`: Your fabricated author name. Required, or face the void of undefined behavior.
- `-e, --email <email>`: Matching email. Also required—because partial commits are like half-implemented features: worthless.

It'll prompt for confirmation, then proceed to rewrite history. If it fails, enjoy debugging Git's cryptic errors in the dead of night.

**Warning:** History rewrites are the developer equivalent of deleting production data without backups. Force-pushes will alienate your team, and unpushed changes? Ha, good luck. Use on toy repos only, unless you thrive on chaos.

## How It Works (The Gory Internals, Sans the Glory)

Leverages `git filter-branch`—that ancient Git command you avoid like the plague—with dual filters:

- **Env-Filter**: Sets GIT\_\* env vars to your inputs, making every commit yours. Ironic victory over collaborative illusions.
- **Msg-Filter**: Pipes through `sed` to excise attribution lines. Simple regex surgery, because string manipulation never goes wrong.

All wrapped in `execSync`, for that synchronous blocking feel that grinds your CPU to a halt.

## Development (For When You Hate Yourself Enough to Contribute)

### Build System (Bun's Promise of Speed, Delivered with Strings Attached)

- **Build Command**: `bun run build` – Bundles `src/noclaude.ts` to `dist/noclaude.js` as ESM. Because transpiling is the tax we pay for type safety.
- **Config**: Target `bun`, ESM format, single entry/output. The `prepublishOnly` hook builds on publish, ensuring you don't ship broken dreams.

### Architecture (Minimalist, Like Your Hopes for Bug-Free Code)

One file rules them all: `src/noclaude.ts`.

1. **Arg Parsing**: Manual, no fancy libs—because over-engineering flags is peak irony.
2. **Prompt**: Node's `readline`, blocking your terminal like a forgotten console.log in prod.
3. **Git Exec**: `execSync` runs the filter-branch. If Git barfs, so does your script.

### Constraints (Arbitrary Rules to Enforce Developer Misery)

- **Bun Exclusive**: Shebang locks it to Bun. Run with Node? Enjoy the crash and burn.
- **Lowercase Filenames**: For JS/TS. Capitalization is for amateurs who don't fear case-sensitivity bugs.
- **No Emojis**: Code and output stay emoji-free. We're not writing Slack bots here.
- **Flag Mandates**: Both `--name` and `--email` or bust. Partial inputs? Straight to error handling purgatory.

### Testing Locally (Simulate the Pain Without Committing)

```bash
bun link
noclaude -n "Debug Demon" -e "error@stackoverflow.com"
```

Test on a disposable repo. Watch it rewrite, then weep over the lost original history.

### Publishing (Inflict This on the World)

`files` in `package.json` ships only `dist`. Source lingers in the repo like uncommented legacy code—visible but ignored by users.

## Contributing (Fork at Your Own Risk)

Fork, hack, PR. Ensure it builds, adheres to constraints, and amplifies the dark irony. Bonus for commits that mock AI overreach.

## License (The Illusion of Freedom)

[MIT License](LICENSE). Free as in beer, but with the hangover of potential repo destruction.
