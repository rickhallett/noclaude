# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`noclaude` is a CLI tool that rewrites git history to remove Claude Code attribution and set a custom author. It's built with TypeScript and Bun, and published as an npm package.

## Build System

This project uses Bun for building and TypeScript compilation:

- **Build**: `bun run build` - Bundles `src/noclaude.ts` to `dist/noclaude.js` as an ESM executable
- **Auto-build on publish**: The `prepublishOnly` script ensures the dist is built before publishing

The build uses Bun's bundler with:
- Target: `bun`
- Format: `esm`
- Entry: `src/noclaude.ts`
- Output: `dist/noclaude.js`

## Architecture

Single-file CLI architecture (`src/noclaude.ts`):

1. **CLI argument parsing** (`parseArgs()`): Manual argument parser supporting `--name/-n` and `--email/-e` flags
2. **Interactive prompt**: Uses Node's readline for confirmation before rewriting history
3. **Git operation**: Executes `git filter-branch` via `execSync` with two filters:
   - `--env-filter`: Sets author and committer name/email from CLI args
   - `--msg-filter`: Uses `sed` to strip Claude Code attribution lines from commit messages

## Important Constraints

- **Bun runtime required**: Shebang is `#!/usr/bin/env bun` (not node)
- **Use lowercased filenames** for all JavaScript/TypeScript files
- **Never use emojis** in code or output
- **Both `--name` and `--email` are required** arguments (enforced in `parseArgs()`)

## Development Workflow

**After every meaningful change, run `/ai-commit`** to create atomic, well-structured commits. This slash command:
- Analyzes staged and unstaged changes
- Groups related changes logically
- Generates conventional commit messages
- Executes atomic commits with proper categorization (FEAT, FIX, DOCS, REFACTOR, etc.)

**After every git commit, use the readme-updater agent** to keep README.md current:
- Analyzes recent code changes and new features
- Updates documentation to reflect current implementation
- Ensures installation, usage, and API documentation stays accurate
- Maintains consistency between code and documentation

## Testing Locally

```bash
bun link
noclaude -n "author-name" -e "email@example.com"
```

## Publishing

The package only ships the `dist` folder (configured in `files` field). TypeScript source remains in the repository but is not published.
