# NoClaude Production Readiness Assessment

**Date:** 2025-10-08
**Current Version:** 1.0.1
**Status:** Published to npm, needs comprehensive testing and hardening

---

## Executive Summary

**noclaude** is a functional CLI tool that solves a specific problem (removing Claude Code attribution from git history), but lacks the robustness, test coverage, and error handling expected of production-grade npm packages. The core implementation is sound, but there are critical gaps in validation, error handling, cross-platform compatibility, and user safety mechanisms.

**Risk Level:** MEDIUM-HIGH for third-party consumption

- Core git operations work but lack safety guards; git-filter-branch is a dangerous command and should be used with caution - look for alternatives and cross-platform viability
- No test coverage or automated validation
- Cross-platform behavior untested (Windows specifically)
- Input validation is minimal
- Error messages could be more helpful

**Recommendation:** Implement P0 improvements before encouraging widespread adoption. Current state is suitable for personal use with caution, but not ready for production environments or novice users.

---

## 1. Current State Assessment

### 1.1 Strengths

#### Architecture & Design

- **Clean single-file CLI**: Well-structured with clear separation of concerns
- **TypeScript implementation**: Strong typing with proper interfaces (`Args`, `AuthorInfo`)
- **Flexible configuration**: Multi-tier config priority (CLI > env > .env > git config) is well-designed
- **User safety**: Interactive confirmation and dry-run mode demonstrate awareness of destructive operations
- **Modern tooling**: Uses Bun for performance, TypeScript for type safety

#### User Experience

- **Clear help text**: Comprehensive `--help` output with examples
- **Dry-run mode**: Allows preview before execution
- **Auto-push option**: Convenience feature for confident users
- **Readable output**: Clear messages about what's happening

#### Distribution

- **Proper package.json**: All metadata fields populated (repository, bugs, homepage)
- **Automated build**: `prepublishOnly` ensures dist is always fresh
- **Minimal footprint**: Only ships `dist/` folder
- **Proper versioning**: Using semantic versioning

### 1.2 Critical Weaknesses

#### 1.2.1 No Test Coverage

**Severity: CRITICAL (P0)**

**Current State:**

```json
"test": "echo \"Error: no test specified\" && exit 1"
```

**Impact:**

- No confidence in behavior across different scenarios
- Refactoring carries high risk of regression
- Contributors cannot validate their changes
- No verification of edge case handling

**Specific Gaps:**

- No unit tests for argument parsing
- No integration tests for git operations
- No validation of config priority resolution
- No tests for error handling paths
- No verification of sed pattern matching
- No cross-platform behavior verification

#### 1.2.2 Insufficient Input Validation

**Severity: HIGH (P0)**

**Current Issues:**

1. **Email validation missing** (lines 119-161)

   ```typescript
   // Accepts any string as email
   email: string | undefined;
   ```

   - Risk: Malformed emails create invalid git history
   - Example: `noclaude -e "not-an-email"` succeeds

2. **Name validation missing**

   - Risk: Empty strings, special characters, newlines could break git operations
   - Example: `noclaude -n ""` might succeed

3. **Argument parsing vulnerability** (lines 42-46)

   ```typescript
   if (args[i] === "--name" || args[i] === "-n") {
     parsed.name = args[++i]; // No bounds checking
   }
   ```

   - Risk: `noclaude --name` (no value) causes `undefined` assignment
   - Risk: `noclaude --name --email` treats `--email` as name value

4. **No git repository validation**

   - Missing check if current directory is a git repository before operations
   - Risk: Cryptic git errors instead of helpful user messages

5. **.env file parsing fragility** (lines 80-101)
   - No validation of .env format
   - Risk: Malformed .env files could cause crashes
   - Example: `.env` with malicious shell code in values

#### 1.2.3 Error Handling Gaps

**Severity: HIGH (P0)**

**Current Issues:**

1. **git filter-branch failure handling** (lines 203-215)

   ```typescript
   execSync(`git filter-branch ...`, {
     stdio: "inherit",
     env,
   });
   ```

   - Only catches exceptions, no specific error messages
   - Risk: Users don't know why operation failed
   - Missing scenarios:
     - Repository already has `refs/original/` from previous filter-branch
     - Working directory has uncommitted changes
     - Repository is too large (timeouts)
     - `sed` command fails on specific commit messages

2. **Push failure handling** (lines 227-235)

   - Catches push errors but loses error details
   - No guidance on common failure scenarios (merge conflicts, protected branch)

3. **Silent failures in helper functions**
   ```typescript
   function getCurrentBranch(): string | null {
     try {
       return execSync("git rev-parse --abbrev-ref HEAD", {
         encoding: "utf-8",
       }).trim();
     } catch {
       return null; // Silent failure, no logging
     }
   }
   ```

#### 1.2.4 Cross-Platform Compatibility Issues

**Severity: MEDIUM-HIGH (P0-P1)**

**Current Issues:**

1. **Shebang assumes Bun location** (line 1)

   ```typescript
   #!/usr/bin/env bun
   ```

   - Works on Unix (macOS/Linux) but Windows requires different approach
   - No fallback for systems where `bun` is not in PATH

2. **sed command Unix-specific** (lines 209-211)

   ```typescript
   sed -e "s/🤖 Generated with \\[Claude Code\\](https:\\/\\/claude\\.com\\/claude-code)//g" \\
   ```

   - `sed` syntax differs between GNU sed (Linux) and BSD sed (macOS)
   - Windows doesn't have `sed` by default (Git Bash provides it, but different behavior)
   - Risk: Pattern matching may fail on Windows or Linux

3. **Shell command execution**

   - `git filter-branch` uses shell interpolation
   - Quote escaping differs between shells (bash, zsh, cmd, PowerShell)

4. **Path handling** (line 81)
   ```typescript
   const envPath = join(process.cwd(), ".env");
   ```
   - Uses forward slashes in git commands (OK for git, but assumes git handles this)

#### 1.2.5 Security Concerns

**Severity: MEDIUM (P1)**

**Current Issues:**

1. **Shell injection vulnerability** (lines 203-211)

   ```typescript
   execSync(`git filter-branch --env-filter '
     export GIT_AUTHOR_NAME="${name}"
     export GIT_AUTHOR_EMAIL="${email}"
   ```

   - `name` and `email` are user-controlled strings injected into shell commands
   - Risk: Names with quotes, backticks, or shell metacharacters could execute arbitrary commands
   - Example: `noclaude -n '"; rm -rf / #'`

2. **.env file execution risk**

   - Custom .env parser doesn't sanitize values
   - If values contain shell metacharacters, could be exploited when used in git commands

3. **No backup verification**

   - Warns users to backup but doesn't verify backup exists
   - Doesn't check for `.git/refs/original/` cleanup

4. **Force push without additional confirmation**
   - `--auto-push` immediately force-pushes after history rewrite
   - No warning about remote repository state

#### 1.2.6 User Experience Gaps

**Severity: LOW-MEDIUM (P1-P2)**

**Current Issues:**

1. **No progress indication** for large repositories

   - git filter-branch can take minutes/hours on large repos
   - Users don't know if tool is working or hung

2. **Limited error context**

   - Generic error messages don't help users fix issues
   - No troubleshooting guidance for common problems

3. **No verification after completion**

   - Doesn't show sample of rewritten commits
   - Doesn't validate that Claude Code attribution was actually removed

4. **Destructive operation without undo path**
   - No mention of how to recover if something goes wrong
   - `.git/refs/original/` cleanup not explained

### 1.3 Documentation Gaps

#### 1.3.1 README Issues

**Severity: MEDIUM (P1)**

**Missing Information:**

- No troubleshooting section
- No explanation of what can go wrong
- No recovery procedures
- Windows-specific installation/usage instructions missing
- No FAQ for common issues
- No contributor guidelines
- No changelog/release notes

**Incomplete Sections:**

- Requirements don't mention git minimum version
- No performance characteristics (how long for X commits)
- No limitations section (what this tool can't do)

#### 1.3.2 Code Documentation

**Severity: LOW (P2)**

**Current State:**

- No JSDoc comments on functions
- No inline comments explaining complex logic (especially sed patterns)
- No comments on security considerations
- No type documentation beyond basic interfaces

---

## 2. Runtime Compatibility Analysis

### 2.1 Current Runtime Dependencies

**Primary Runtime:** Bun ≥1.0.0

**Bun-Specific Features Used:**

- None identified - code uses standard Node.js APIs

**Node.js APIs Used:**

- `child_process.execSync` (available in Node.js)
- `readline` module (available in Node.js)
- `fs.existsSync`, `fs.readFileSync` (available in Node.js)
- `path.join` (available in Node.js)

**Assessment:** Code is actually runtime-agnostic; Bun requirement is artificial.

### 2.2 Runtime Compatibility Evaluation

#### Barriers to Node.js Support

**Severity: NONE - Easy to support**

**Current Barrier:**

1. Shebang hardcoded to Bun (`#!/usr/bin/env bun`)
2. package.json specifies Bun engine
3. Build target set to `bun`

**Reality:**

- The code uses only standard Node.js APIs
- No Bun-specific features are actually used
- Would work perfectly with Node.js runtime

#### Barriers to Deno Support

**Severity: MEDIUM - Moderate effort**

**Current Barriers:**

1. Uses Node.js-specific imports (`child_process`, `readline`, `fs`)
2. No Deno-compatible entry point
3. `execSync` import would need Deno-specific handling

**Deno Compatibility:**

- Deno supports Node.js APIs via `node:` prefix imports
- Could support Deno with minimal changes
- Would need conditional imports or separate entry point

### 2.3 Cross-Runtime Compatibility Strategy

**Recommendation: Support Node.js AND Bun**

**Rationale:**

- Wider adoption (npm ecosystem is Node.js-first)
- No technical reason to limit to Bun
- Easy to implement (zero code changes needed)
- Reduces friction for users

**Implementation Approach (P1):**

1. **Change shebang to Node.js**

   ```typescript
   #!/usr/bin/env node
   ```

2. **Update package.json engines**

   ```json
   "engines": {
     "node": ">=18.0.0",
     "bun": ">=1.0.0"
   }
   ```

3. **Update build target**

   ```json
   "build": "bun build src/noclaude.ts --outfile dist/noclaude.js --target node --format esm"
   ```

4. **Document both runtimes**
   - README should mention Node.js as primary, Bun as optional
   - Installation instructions for both

**Trade-offs:**

- **Pro:** Massive increase in potential users
- **Pro:** Better CI/CD compatibility (GitHub Actions, etc.)
- **Pro:** Standard npm package expectations
- **Con:** Lose Bun's speed advantage (minimal for this use case)
- **Con:** Need to test both runtimes (but worth it)

**Deno Support (P2 - Nice to have):**

- Create separate entry point: `src/noclaude.deno.ts`
- Use `node:` prefixed imports
- Publish dual package
- Lower priority - Deno users can use Node.js compatibility mode

---

## 3. Testing Strategy

### 3.1 Test Infrastructure Setup

**Framework:** Bun's built-in test API

- Native to project's existing tooling
- Fast execution
- No additional dependencies
- Built-in mocking capabilities

**Test Directory Structure:**

```
test/
├── unit/
│   ├── argument-parsing.test.ts
│   ├── config-resolution.test.ts
│   ├── validation.test.ts
│   └── env-parser.test.ts
├── integration/
│   ├── git-operations.test.ts
│   ├── full-workflow.test.ts
│   └── error-scenarios.test.ts
├── e2e/
│   ├── cli-invocation.test.ts
│   └── real-repository.test.ts
├── fixtures/
│   ├── sample-repos/
│   ├── .env.samples/
│   └── test-configs/
└── helpers/
    ├── test-repo.ts
    └── mock-git.ts
```

### 3.2 Unit Tests (P0)

**Target: Isolated function testing, no external dependencies**

#### 3.2.1 Argument Parsing Tests

**File:** `test/unit/argument-parsing.test.ts`

```typescript
import { describe, test, expect } from "bun:test";
import { parseArgs } from "../../src/noclaude";

describe("parseArgs", () => {
  test("should parse long-form flags", () => {
    process.argv = [
      "node",
      "script",
      "--name",
      "John",
      "--email",
      "john@example.com",
    ];
    const result = parseArgs();
    expect(result.name).toBe("John");
    expect(result.email).toBe("john@example.com");
  });

  test("should parse short-form flags", () => {
    process.argv = ["node", "script", "-n", "Jane", "-e", "jane@example.com"];
    const result = parseArgs();
    expect(result.name).toBe("Jane");
    expect(result.email).toBe("jane@example.com");
  });

  test("should handle dry-run flag", () => {
    process.argv = ["node", "script", "--dry-run"];
    const result = parseArgs();
    expect(result.dryRun).toBe(true);
  });

  test("should handle auto-push flag", () => {
    process.argv = ["node", "script", "--auto-push"];
    const result = parseArgs();
    expect(result.autoPush).toBe(true);
  });

  test("should handle mixed short and long flags", () => {
    process.argv = [
      "node",
      "script",
      "-n",
      "Bob",
      "--email",
      "bob@test.com",
      "-d",
    ];
    const result = parseArgs();
    expect(result.name).toBe("Bob");
    expect(result.email).toBe("bob@test.com");
    expect(result.dryRun).toBe(true);
  });

  // Edge cases
  test("should handle flags at end without values", () => {
    process.argv = ["node", "script", "--name"];
    const result = parseArgs();
    expect(result.name).toBeUndefined();
  });

  test("should handle empty argument list", () => {
    process.argv = ["node", "script"];
    const result = parseArgs();
    expect(result.name).toBeUndefined();
    expect(result.email).toBeUndefined();
    expect(result.dryRun).toBe(false);
  });

  test("should handle flag value that looks like another flag", () => {
    process.argv = [
      "node",
      "script",
      "--name",
      "--email",
      "--email",
      "test@test.com",
    ];
    const result = parseArgs();
    expect(result.name).toBe("--email");
    expect(result.email).toBe("test@test.com");
  });

  test("should handle values with spaces", () => {
    process.argv = ["node", "script", "--name", "John Doe"];
    const result = parseArgs();
    expect(result.name).toBe("John");
    // Note: This reveals a bug - doesn't handle spaces in values
  });
});
```

**Critical Test Scenarios:**

- All flag combinations (short/long)
- Missing values for flags
- Flags without values
- Values with special characters
- Multiple occurrences of same flag (last wins?)
- Unknown flags (should warn or error?)

#### 3.2.2 Configuration Resolution Tests

**File:** `test/unit/config-resolution.test.ts`

```typescript
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { getAuthorInfo } from "../../src/noclaude";
import { writeFileSync, unlinkSync, existsSync } from "fs";

describe("getAuthorInfo - Configuration Priority", () => {
  beforeEach(() => {
    // Clear environment
    delete process.env.GIT_AUTHOR_NAME;
    delete process.env.GIT_AUTHOR_EMAIL;
    // Remove .env if exists
    if (existsSync(".env")) {
      unlinkSync(".env");
    }
  });

  afterEach(() => {
    // Cleanup
    if (existsSync(".env")) {
      unlinkSync(".env");
    }
  });

  test("Priority 1: CLI args override everything", () => {
    process.env.GIT_AUTHOR_NAME = "EnvName";
    process.env.GIT_AUTHOR_EMAIL = "env@test.com";
    writeFileSync(
      ".env",
      "GIT_AUTHOR_NAME=DotEnvName\nGIT_AUTHOR_EMAIL=dotenv@test.com"
    );

    const result = getAuthorInfo({
      name: "CLIName",
      email: "cli@test.com",
      dryRun: false,
      autoPush: false,
    });

    expect(result.name).toBe("CLIName");
    expect(result.email).toBe("cli@test.com");
  });

  test("Priority 2: Environment variables when no CLI args", () => {
    process.env.GIT_AUTHOR_NAME = "EnvName";
    process.env.GIT_AUTHOR_EMAIL = "env@test.com";
    writeFileSync(
      ".env",
      "GIT_AUTHOR_NAME=DotEnvName\nGIT_AUTHOR_EMAIL=dotenv@test.com"
    );

    const result = getAuthorInfo({
      name: undefined,
      email: undefined,
      dryRun: false,
      autoPush: false,
    });

    expect(result.name).toBe("EnvName");
    expect(result.email).toBe("env@test.com");
  });

  test("Priority 3: .env file when no CLI args or env vars", () => {
    writeFileSync(
      ".env",
      "GIT_AUTHOR_NAME=DotEnvName\nGIT_AUTHOR_EMAIL=dotenv@test.com"
    );

    const result = getAuthorInfo({
      name: undefined,
      email: undefined,
      dryRun: false,
      autoPush: false,
    });

    expect(result.name).toBe("DotEnvName");
    expect(result.email).toBe("dotenv@test.com");
  });

  test("should exit with error when no config found", () => {
    // Mock process.exit
    const originalExit = process.exit;
    let exitCode: number | undefined;
    process.exit = ((code?: number) => {
      exitCode = code;
    }) as any;

    try {
      getAuthorInfo({
        name: undefined,
        email: undefined,
        dryRun: false,
        autoPush: false,
      });
    } catch {
      // Expected to throw
    }

    expect(exitCode).toBe(1);
    process.exit = originalExit;
  });

  test("should require BOTH name and email", () => {
    process.env.GIT_AUTHOR_NAME = "OnlyName";
    // No email set

    const originalExit = process.exit;
    let exitCode: number | undefined;
    process.exit = ((code?: number) => {
      exitCode = code;
    }) as any;

    try {
      getAuthorInfo({
        name: undefined,
        email: undefined,
        dryRun: false,
        autoPush: false,
      });
    } catch {
      // Expected
    }

    expect(exitCode).toBe(1);
    process.exit = originalExit;
  });
});
```

#### 3.2.3 .env Parser Tests

**File:** `test/unit/env-parser.test.ts`

```typescript
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { loadEnvFile } from "../../src/noclaude";
import { writeFileSync, unlinkSync } from "fs";

describe("loadEnvFile", () => {
  const testEnvPath = ".env.test";

  afterEach(() => {
    if (existsSync(testEnvPath)) {
      unlinkSync(testEnvPath);
    }
  });

  test("should parse valid .env file", () => {
    writeFileSync(
      testEnvPath,
      `
GIT_AUTHOR_NAME=John Doe
GIT_AUTHOR_EMAIL=john@example.com
    `.trim()
    );

    const result = loadEnvFile();
    expect(result.GIT_AUTHOR_NAME).toBe("John Doe");
    expect(result.GIT_AUTHOR_EMAIL).toBe("john@example.com");
  });

  test("should handle quotes in values", () => {
    writeFileSync(
      testEnvPath,
      `
GIT_AUTHOR_NAME="John Doe"
GIT_AUTHOR_EMAIL='john@example.com'
    `.trim()
    );

    const result = loadEnvFile();
    expect(result.GIT_AUTHOR_NAME).toBe("John Doe");
    expect(result.GIT_AUTHOR_EMAIL).toBe("john@example.com");
  });

  test("should skip comment lines", () => {
    writeFileSync(
      testEnvPath,
      `
# This is a comment
GIT_AUTHOR_NAME=John
# Another comment
GIT_AUTHOR_EMAIL=john@test.com
    `.trim()
    );

    const result = loadEnvFile();
    expect(result.GIT_AUTHOR_NAME).toBe("John");
    expect(result.GIT_AUTHOR_EMAIL).toBe("john@test.com");
  });

  test("should handle empty lines", () => {
    writeFileSync(
      testEnvPath,
      `
GIT_AUTHOR_NAME=John

GIT_AUTHOR_EMAIL=john@test.com

    `.trim()
    );

    const result = loadEnvFile();
    expect(result.GIT_AUTHOR_NAME).toBe("John");
    expect(result.GIT_AUTHOR_EMAIL).toBe("john@test.com");
  });

  test("should handle values with equals signs", () => {
    writeFileSync(
      testEnvPath,
      `
GIT_AUTHOR_NAME=John=Doe
PASSWORD=abc=123=xyz
    `.trim()
    );

    const result = loadEnvFile();
    expect(result.GIT_AUTHOR_NAME).toBe("John=Doe");
    expect(result.PASSWORD).toBe("abc=123=xyz");
  });

  test("should return empty object if file doesn't exist", () => {
    const result = loadEnvFile();
    expect(result).toEqual({});
  });

  test("should handle malformed lines gracefully", () => {
    writeFileSync(
      testEnvPath,
      `
GIT_AUTHOR_NAME=John
INVALID_LINE_NO_EQUALS
GIT_AUTHOR_EMAIL=john@test.com
=VALUE_WITHOUT_KEY
    `.trim()
    );

    const result = loadEnvFile();
    expect(result.GIT_AUTHOR_NAME).toBe("John");
    expect(result.GIT_AUTHOR_EMAIL).toBe("john@test.com");
    expect(Object.keys(result).length).toBe(2);
  });
});
```

#### 3.2.4 Input Validation Tests

**File:** `test/unit/validation.test.ts`

```typescript
import { describe, test, expect } from "bun:test";
import { validateEmail, validateName } from "../../src/noclaude";

describe("validateEmail", () => {
  test("should accept valid email addresses", () => {
    expect(validateEmail("user@example.com")).toBe(true);
    expect(validateEmail("test.user@example.com")).toBe(true);
    expect(validateEmail("user+tag@example.com")).toBe(true);
    expect(validateEmail("user@subdomain.example.com")).toBe(true);
  });

  test("should reject invalid email addresses", () => {
    expect(validateEmail("not-an-email")).toBe(false);
    expect(validateEmail("@example.com")).toBe(false);
    expect(validateEmail("user@")).toBe(false);
    expect(validateEmail("")).toBe(false);
    expect(validateEmail("user @example.com")).toBe(false);
  });

  test("should reject email with shell metacharacters", () => {
    expect(validateEmail("user`whoami`@example.com")).toBe(false);
    expect(validateEmail("user;rm -rf /@example.com")).toBe(false);
    expect(validateEmail("user'@example.com")).toBe(false);
  });
});

describe("validateName", () => {
  test("should accept valid names", () => {
    expect(validateName("John Doe")).toBe(true);
    expect(validateName("Jane")).toBe(true);
    expect(validateName("Mary-Jane")).toBe(true);
    expect(validateName("O'Brien")).toBe(true);
  });

  test("should reject empty or whitespace names", () => {
    expect(validateName("")).toBe(false);
    expect(validateName("   ")).toBe(false);
  });

  test("should reject names with shell metacharacters", () => {
    expect(validateName("John`whoami`")).toBe(false);
    expect(validateName("Jane; rm -rf /")).toBe(false);
    expect(validateName("Bob$(cat /etc/passwd)")).toBe(false);
  });

  test("should reject names with newlines", () => {
    expect(validateName("John\nDoe")).toBe(false);
    expect(validateName("Jane\r\nDoe")).toBe(false);
  });
});
```

**Note:** These validation functions need to be implemented (they don't exist yet).

### 3.3 Integration Tests (P0)

**Target: Multi-component interactions, git operations with test repositories**

#### 3.3.1 Git Operations Tests

**File:** `test/integration/git-operations.test.ts`

```typescript
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { execSync } from "child_process";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

describe("Git Operations Integration", () => {
  let testRepoPath: string;

  beforeEach(() => {
    // Create temporary git repository
    testRepoPath = mkdtempSync(join(tmpdir(), "noclaude-test-"));

    process.chdir(testRepoPath);

    // Initialize git repo
    execSync("git init");
    execSync("git config user.name 'Test User'");
    execSync("git config user.email 'test@example.com'");

    // Create commits with Claude Code attribution
    writeFileSync("file1.txt", "content 1");
    execSync("git add .");
    execSync(`git commit -m "First commit

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"`);

    writeFileSync("file2.txt", "content 2");
    execSync("git add .");
    execSync(`git commit -m "Second commit

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"`);
  });

  afterEach(() => {
    // Cleanup
    process.chdir("/");
    rmSync(testRepoPath, { recursive: true, force: true });
  });

  test("should remove Claude Code attribution from all commits", () => {
    // Run noclaude
    execSync(`noclaude --name "New Author" --email "new@example.com"`, {
      cwd: testRepoPath,
      input: "\n", // Auto-confirm
    });

    // Verify commit messages
    const log = execSync("git log --format=%B", { encoding: "utf-8" });

    expect(log).not.toContain("Generated with [Claude Code]");
    expect(log).not.toContain("Co-Authored-By: Claude");
    expect(log).not.toContain("🤖");
  });

  test("should update author information", () => {
    execSync(`noclaude --name "New Author" --email "new@example.com"`, {
      cwd: testRepoPath,
      input: "\n",
    });

    const log = execSync("git log --format='%an <%ae>'", { encoding: "utf-8" });

    const lines = log.trim().split("\n");
    expect(lines.every((line) => line === "New Author <new@example.com>")).toBe(
      true
    );
  });

  test("should preserve commit content", () => {
    const beforeLog = execSync("git log --format='%H %s'", {
      encoding: "utf-8",
    });
    const beforeCommits = beforeLog.trim().split("\n");

    execSync(`noclaude --name "New Author" --email "new@example.com"`, {
      cwd: testRepoPath,
      input: "\n",
    });

    const afterLog = execSync("git log --format='%H %s'", {
      encoding: "utf-8",
    });
    const afterCommits = afterLog.trim().split("\n");

    // Subject lines should be preserved
    expect(afterCommits.length).toBe(beforeCommits.length);
    expect(afterCommits[0]).toContain("Second commit");
    expect(afterCommits[1]).toContain("First commit");
  });

  test("should handle dry-run mode without making changes", () => {
    const beforeLog = execSync("git log --format='%H'", { encoding: "utf-8" });

    execSync(
      `noclaude --name "New Author" --email "new@example.com" --dry-run`,
      {
        cwd: testRepoPath,
      }
    );

    const afterLog = execSync("git log --format='%H'", { encoding: "utf-8" });

    // Hashes should be identical (no rewrite occurred)
    expect(beforeLog).toBe(afterLog);
  });

  test("should fail gracefully if not in git repository", () => {
    const nonGitPath = mkdtempSync(join(tmpdir(), "noclaude-nogit-"));
    process.chdir(nonGitPath);

    let error: Error | undefined;
    try {
      execSync(`noclaude --name "Test" --email "test@test.com"`, {
        input: "\n",
      });
    } catch (e) {
      error = e as Error;
    }

    expect(error).toBeDefined();
    expect(error?.message).toContain("fatal: not a git repository");

    rmSync(nonGitPath, { recursive: true, force: true });
  });

  test("should handle repository with existing refs/original/", () => {
    // Run filter-branch once to create refs/original
    execSync(`git filter-branch --msg-filter 'cat' HEAD~1..HEAD`);

    // Attempt to run noclaude - should fail or cleanup refs/original
    let error: Error | undefined;
    try {
      execSync(`noclaude --name "Test" --email "test@test.com"`, {
        input: "\n",
      });
    } catch (e) {
      error = e as Error;
    }

    // Should provide clear error message about refs/original
    expect(error).toBeDefined();
    expect(error?.message.toLowerCase()).toContain("original");
  });
});
```

#### 3.3.2 Error Scenario Tests

**File:** `test/integration/error-scenarios.test.ts`

```typescript
import { describe, test, expect } from "bun:test";
import { execSync } from "child_process";

describe("Error Scenario Handling", () => {
  test("should handle missing name gracefully", () => {
    let stderr = "";
    try {
      execSync("noclaude --email test@test.com", {
        encoding: "utf-8",
        stdio: "pipe",
      });
    } catch (e: any) {
      stderr = e.stderr;
    }

    expect(stderr).toContain("author information");
  });

  test("should handle missing email gracefully", () => {
    let stderr = "";
    try {
      execSync("noclaude --name TestUser", {
        encoding: "utf-8",
        stdio: "pipe",
      });
    } catch (e: any) {
      stderr = e.stderr;
    }

    expect(stderr).toContain("author information");
  });

  test("should handle invalid email format", () => {
    // This test will fail until validation is implemented
    let stderr = "";
    try {
      execSync("noclaude --name Test --email 'not-an-email'", {
        encoding: "utf-8",
        stdio: "pipe",
      });
    } catch (e: any) {
      stderr = e.stderr;
    }

    expect(stderr).toContain("invalid email");
  });

  test("should handle shell injection attempts safely", () => {
    // Should reject or escape dangerous characters
    let stderr = "";
    try {
      execSync(`noclaude --name 'test"; rm -rf /"' --email test@test.com`, {
        encoding: "utf-8",
        stdio: "pipe",
      });
    } catch (e: any) {
      stderr = e.stderr;
    }

    expect(stderr).toContain("invalid");
  });
});
```

### 3.4 End-to-End Tests (P1)

**Target: Full CLI invocation, realistic user workflows**

#### 3.4.1 CLI Invocation Tests

**File:** `test/e2e/cli-invocation.test.ts`

```typescript
import { describe, test, expect } from "bun:test";
import { spawn } from "child_process";

describe("CLI Invocation E2E", () => {
  test("should show help text with --help", async () => {
    const proc = spawn("noclaude", ["--help"]);

    let stdout = "";
    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    await new Promise((resolve) => proc.on("close", resolve));

    expect(stdout).toContain("Usage: noclaude");
    expect(stdout).toContain("Options:");
    expect(stdout).toContain("--name");
    expect(stdout).toContain("--email");
    expect(stdout).toContain("Examples:");
  });

  test("should show help with -h", async () => {
    const proc = spawn("noclaude", ["-h"]);

    let stdout = "";
    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    await new Promise((resolve) => proc.on("close", resolve));

    expect(stdout).toContain("Usage: noclaude");
  });

  test("should handle Ctrl+C gracefully during confirmation", async () => {
    const proc = spawn("noclaude", [
      "--name",
      "Test",
      "--email",
      "test@test.com",
    ]);

    // Wait for prompt then send SIGINT
    await new Promise((resolve) => setTimeout(resolve, 100));
    proc.kill("SIGINT");

    const exitCode = await new Promise((resolve) => {
      proc.on("close", resolve);
    });

    // Should exit cleanly, not crash
    expect(exitCode).toBeDefined();
  });
});
```

#### 3.4.2 Real Repository Workflow Tests

**File:** `test/e2e/real-repository.test.ts`

```typescript
import { describe, test, expect } from "bun:test";

describe("Real Repository Workflows", () => {
  test("should handle repository with 100+ commits", () => {
    // Create repo with many commits
    // Run noclaude
    // Verify all commits processed
    // Measure performance
  });

  test("should handle repository with merge commits", () => {
    // Create repo with branch merges
    // Run noclaude
    // Verify merge commits preserved
  });

  test("should handle repository with tags", () => {
    // Create repo with tags
    // Run noclaude
    // Verify tags updated correctly
  });

  test("should handle repository with multiple branches", () => {
    // Create repo with branches
    // Run noclaude
    // Verify all branches processed
  });
});
```

### 3.5 Test Helpers & Utilities

#### 3.5.1 Test Repository Builder

**File:** `test/helpers/test-repo.ts`

```typescript
import { execSync } from "child_process";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

export class TestRepo {
  public readonly path: string;

  constructor() {
    this.path = mkdtempSync(join(tmpdir(), "noclaude-test-"));
    this.initialize();
  }

  private initialize() {
    process.chdir(this.path);
    execSync("git init");
    execSync("git config user.name 'Test User'");
    execSync("git config user.email 'test@example.com'");
  }

  addCommitWithClaudeAttribution(
    fileName: string,
    content: string,
    message: string
  ) {
    writeFileSync(join(this.path, fileName), content);
    execSync("git add .");
    execSync(`git commit -m "${message}

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"`);
  }

  addCommitWithoutClaudeAttribution(
    fileName: string,
    content: string,
    message: string
  ) {
    writeFileSync(join(this.path, fileName), content);
    execSync("git add .");
    execSync(`git commit -m "${message}"`);
  }

  getCommitLog(): string {
    return execSync("git log --format=%B", { encoding: "utf-8" });
  }

  getAuthorLog(): string {
    return execSync("git log --format='%an <%ae>'", { encoding: "utf-8" });
  }

  cleanup() {
    process.chdir("/");
    rmSync(this.path, { recursive: true, force: true });
  }
}
```

### 3.6 Test Execution & CI

**package.json updates:**

```json
{
  "scripts": {
    "test": "bun test",
    "test:unit": "bun test test/unit",
    "test:integration": "bun test test/integration",
    "test:e2e": "bun test test/e2e",
    "test:watch": "bun test --watch",
    "test:coverage": "bun test --coverage"
  }
}
```

**Coverage Targets (P1):**

- Unit tests: 90%+ coverage
- Integration tests: Cover all git operations
- E2E tests: Cover all CLI workflows

**CI Integration (P1):**

- GitHub Actions workflow for tests on PR
- Test on multiple OS (Ubuntu, macOS, Windows)
- Test with both Node.js and Bun
- Run security audits

---

## 4. Production Readiness Roadmap

### Phase 0: Critical Fixes (P0) - Must complete before production use

**Estimated Effort:** 3-5 days
**Risk:** HIGH if not addressed

#### P0-1: Input Validation & Sanitization

**Complexity:** MODERATE

**Tasks:**

1. Implement `validateEmail()` function

   - Use RFC 5322 compliant regex
   - Reject emails with shell metacharacters
   - Return user-friendly error messages

2. Implement `validateName()` function

   - Reject empty/whitespace-only names
   - Block shell metacharacters: `` ` ``, `$`, `"`, `'`, `;`, `|`, `&`, newlines
   - Preserve legitimate characters: spaces, hyphens, apostrophes

3. Add validation calls in `getAuthorInfo()`

   - Validate before returning
   - Provide specific error messages per validation failure

4. Add argument bounds checking in `parseArgs()`
   - Check `args[i+1]` exists before accessing
   - Reject flags without values
   - Warn on unknown flags

**Acceptance Criteria:**

- All user inputs validated before use
- Shell injection attempts blocked
- Clear error messages for validation failures
- Unit tests for all validation functions

#### P0-2: Shell Command Safety

**Complexity:** MODERATE

**Tasks:**

1. Escape shell arguments in `git filter-branch` command

   - Use parameterized approach instead of string interpolation
   - Consider using `spawn` instead of `execSync` for better control

2. Sanitize environment variable values

   - Validate env vars from .env file
   - Escape special characters in env values

3. Add comprehensive security tests
   - Test shell injection attempts
   - Verify proper escaping

**Implementation Example:**

```typescript
// Instead of:
execSync(`git filter-branch --env-filter 'export GIT_AUTHOR_NAME="${name}"'`);

// Use:
execSync(
  `git filter-branch --env-filter 'export GIT_AUTHOR_NAME="$NAME_VAR"'`,
  {
    env: {
      ...process.env,
      NAME_VAR: name, // Bun/Node handles escaping
    },
  }
);
```

**Acceptance Criteria:**

- No direct string interpolation in shell commands
- All inputs properly escaped
- Security tests pass
- Documented security considerations

#### P0-3: Git Repository Validation

**Complexity:** SIMPLE

**Tasks:**

1. Add `isGitRepository()` function

   ```typescript
   function isGitRepository(): boolean {
     try {
       execSync("git rev-parse --git-dir", { stdio: "ignore" });
       return true;
     } catch {
       return false;
     }
   }
   ```

2. Check for git repository in `main()` before operations

   - Exit early with helpful error if not in git repo

3. Check for uncommitted changes

   - Warn user if working directory is dirty
   - Suggest stashing changes

4. Check for existing `refs/original/`
   - Detect previous filter-branch runs
   - Offer to clean up or abort

**Acceptance Criteria:**

- Clear error when not in git repository
- Warning for dirty working directory
- Handling of refs/original/ conflicts
- Tests for each validation scenario

#### P0-4: Error Handling Improvements

**Complexity:** MODERATE

**Tasks:**

1. Create custom error classes

   ```typescript
   class NoCLaudeError extends Error {
     constructor(message: string, public readonly code: string) {
       super(message);
       this.name = "NoCLaudeError";
     }
   }
   ```

2. Add specific error handlers for common failures

   - Git filter-branch failures (refs/original exists)
   - Push failures (merge conflicts, protected branch)
   - Permission errors
   - Network errors (for push)

3. Improve error messages with actionable guidance

   ```typescript
   console.error("Error: Cannot rewrite history - refs/original/ exists");
   console.error("");
   console.error(
     "This happens when a previous filter-branch run was not cleaned up."
   );
   console.error("");
   console.error("To fix, run:");
   console.error("  git update-ref -d refs/original/refs/heads/main");
   console.error('  (replace "main" with your branch name)');
   ```

4. Log errors with stack traces in debug mode
   - Add `--debug` flag
   - Show full error details when enabled

**Acceptance Criteria:**

- All error paths have helpful messages
- Common errors have recovery guidance
- Error messages tested
- Debug mode available

#### P0-5: Core Test Suite

**Complexity:** COMPLEX

**Tasks:**

1. Set up test infrastructure (see Section 3.1)
2. Implement unit tests for:

   - Argument parsing (15+ test cases)
   - Config resolution (8+ test cases)
   - .env parsing (7+ test cases)
   - Validation functions (10+ test cases)

3. Implement integration tests for:

   - Git operations (6+ test cases)
   - Error scenarios (4+ test cases)

4. Set up test fixtures
   - Sample .env files
   - Test git repositories

**Acceptance Criteria:**

- 80%+ code coverage
- All critical paths tested
- Tests pass on CI
- Documentation for running tests

#### P0-6: Cross-Platform sed Compatibility

**Complexity:** MODERATE-COMPLEX

**Tasks:**

1. Research sed differences:

   - GNU sed (Linux)
   - BSD sed (macOS)
   - Git Bash sed (Windows)

2. Test current sed patterns on all platforms

   - Identify incompatibilities
   - Document differences

3. Options to fix:
   **Option A: Platform detection**

   ```typescript
   const sedCommand =
     process.platform === "darwin"
       ? "sed -E ..." // BSD sed
       : "sed -r ..."; // GNU sed
   ```

   **Option B: Use portable sed features only**

   - Stick to POSIX-compliant sed
   - Avoid extended regex

   **Option C: Replace sed with JavaScript**

   ```typescript
   --msg-filter 'node -e "
     let msg = require(\"fs\").readFileSync(0, \"utf-8\");
     msg = msg.replace(/🤖 Generated with \\[Claude Code\\].*\\n?/g, \"\");
     msg = msg.replace(/Co-Authored-By: Claude.*\\n?/g, \"\");
     process.stdout.write(msg.trim() + \"\\n\");
   "'
   ```

4. Implement chosen solution
5. Test on all platforms

**Acceptance Criteria:**

- Works on macOS (BSD sed)
- Works on Linux (GNU sed)
- Works on Windows (Git Bash)
- Tests pass on all platforms
- Documented platform requirements

**Recommendation:** Option C (JavaScript) - most portable, no external sed dependency

---

### Phase 1: Important Improvements (P1) - Should complete before widespread adoption

**Estimated Effort:** 4-6 days
**Risk:** MEDIUM if not addressed

#### P1-1: Node.js Runtime Support

**Complexity:** SIMPLE

**Tasks:**

1. Change shebang from `#!/usr/bin/env bun` to `#!/usr/bin/env node`
2. Update build target from `bun` to `node`
3. Update package.json engines:
   ```json
   "engines": {
     "node": ">=18.0.0",
     "bun": ">=1.0.0"
   }
   ```
4. Test with both Node.js and Bun
5. Update README with Node.js installation instructions

**Acceptance Criteria:**

- Works with Node.js ≥18
- Works with Bun ≥1.0
- CI tests both runtimes
- Documentation updated

#### P1-2: Enhanced Error Messages & Help

**Complexity:** MODERATE

**Tasks:**

1. Add troubleshooting section to `--help`

   - Common errors and solutions
   - Link to GitHub issues

2. Improve validation error messages

   - Show examples of valid input
   - Explain why input was rejected

3. Add progress indicators for long operations

   ```typescript
   console.log("Rewriting history...");
   // Show spinner or progress
   // Report when complete
   ```

4. Add post-operation verification
   ```typescript
   // After rewrite, show sample of changes:
   console.log("\nVerification:");
   console.log("Sample of rewritten commits:");
   execSync("git log --oneline -3");
   ```

**Acceptance Criteria:**

- Help text includes troubleshooting
- Validation errors are actionable
- Long operations show progress
- Users can verify success

#### P1-3: Safety Enhancements

**Complexity:** MODERATE

**Tasks:**

1. Add backup verification

   ```typescript
   console.log("Before proceeding:");
   console.log("1. Have you created a backup? (git clone/bundle)");
   console.log("2. Are you ready to rewrite history?");
   console.log("");
   const confirmation = await prompt('Type "yes" to continue: ');
   if (confirmation.toLowerCase() !== "yes") {
     console.log("Aborted.");
     process.exit(0);
   }
   ```

2. Add `--force` flag requirement for destructive operations

   - Require explicit `--force` for auto-push
   - Document the risk

3. Show impact summary before execution

   ```typescript
   const commitCount = execSync("git rev-list --count HEAD", {
     encoding: "utf-8",
   });
   console.log(`This will rewrite ${commitCount.trim()} commits.`);
   ```

4. Offer to create backup automatically
   ```typescript
   const createBackup = await prompt("Create backup first? (y/n): ");
   if (createBackup === "y") {
     execSync(`git bundle create ../backup-${Date.now()}.bundle --all`);
     console.log("Backup created.");
   }
   ```

**Acceptance Criteria:**

- Users explicitly confirm destructive operations
- Impact clearly communicated
- Optional automatic backup
- `--force` required for auto-push

#### P1-4: Comprehensive Documentation

**Complexity:** MODERATE

**Tasks:**

1. Add TROUBLESHOOTING.md

   - Common errors and solutions
   - Platform-specific issues
   - Recovery procedures

2. Add CONTRIBUTING.md

   - Development setup
   - Testing guidelines
   - PR process

3. Add CHANGELOG.md

   - Version history
   - Breaking changes
   - Migration guides

4. Expand README:

   - Limitations section
   - FAQ section
   - Performance characteristics
   - Windows-specific instructions

5. Add JSDoc comments to all functions
   ```typescript
   /**
    * Parses command-line arguments into Args object.
    * Supports both long-form (--name) and short-form (-n) flags.
    *
    * @returns Parsed arguments with defaults
    * @throws Never throws - missing values result in undefined
    */
   function parseArgs(): Args { ... }
   ```

**Acceptance Criteria:**

- All major scenarios documented
- Contributors have clear guidelines
- Users understand limitations
- Code has inline documentation

#### P1-5: Integration & E2E Tests

**Complexity:** COMPLEX

**Tasks:**

1. Implement integration tests (see Section 3.3)

   - Git operations: 6+ scenarios
   - Error handling: 4+ scenarios

2. Implement E2E tests (see Section 3.4)

   - CLI invocation: 3+ scenarios
   - Real workflows: 4+ scenarios

3. Add test fixtures

   - Sample repositories
   - Various git histories

4. Set up GitHub Actions CI
   ```yaml
   name: Tests
   on: [push, pull_request]
   jobs:
     test:
       strategy:
         matrix:
           os: [ubuntu-latest, macos-latest, windows-latest]
           runtime: [node, bun]
       runs-on: ${{ matrix.os }}
       steps:
         - uses: actions/checkout@v3
         - run: ${{ matrix.runtime }} test
   ```

**Acceptance Criteria:**

- Integration tests cover git operations
- E2E tests cover user workflows
- CI runs tests on all platforms
- 85%+ code coverage

#### P1-6: Performance & UX Polish

**Complexity:** SIMPLE-MODERATE

**Tasks:**

1. Add progress indication

   ```typescript
   // Use ora spinner or similar
   const spinner = ora("Rewriting history...").start();
   // ... operation ...
   spinner.succeed("History rewritten successfully.");
   ```

2. Add estimated time for large repos

   ```typescript
   const commitCount = getCommitCount();
   const estimatedSeconds = commitCount * 0.1; // ~10 commits/sec
   console.log(
     `Estimated time: ${estimatedSeconds}s for ${commitCount} commits`
   );
   ```

3. Add `--quiet` flag for scripting

   - Suppress interactive prompts
   - Only output errors

4. Add `--verbose` flag for debugging
   - Show git commands being executed
   - Display intermediate results

**Acceptance Criteria:**

- Large repos show progress
- Users know how long to wait
- Scriptable with `--quiet`
- Debuggable with `--verbose`

---

### Phase 2: Nice-to-Have Features (P2) - Future enhancements

**Estimated Effort:** 5-8 days
**Risk:** LOW if not addressed

#### P2-1: Deno Runtime Support

**Complexity:** MODERATE

**Tasks:**

1. Create `src/noclaude.deno.ts` entry point
2. Use `node:` prefixed imports
3. Add Deno-specific build
4. Test with Deno runtime
5. Document Deno usage

**Acceptance Criteria:**

- Works with Deno
- Separate entry point
- Documentation includes Deno

#### P2-2: Configuration File Support

**Complexity:** MODERATE

**Tasks:**

1. Support `.noclauderc` or `noclaude.config.js`
2. Allow pre-configured author info
3. Allow custom sed patterns
4. Schema validation for config

**Acceptance Criteria:**

- Config file optional
- Validates against schema
- Documented format

#### P2-3: Selective Rewriting

**Complexity:** COMPLEX

**Tasks:**

1. Add `--since` flag to rewrite only recent commits

   ```bash
   noclaude --since="2024-01-01"
   ```

2. Add `--branch` flag to target specific branch

   ```bash
   noclaude --branch=feature/xyz
   ```

3. Add `--commit-range` for precise control
   ```bash
   noclaude --commit-range=abc123..def456
   ```

**Acceptance Criteria:**

- Can target specific commits
- Can target specific branches
- Doesn't rewrite unnecessary commits

#### P2-4: Undo/Rollback Feature

**Complexity:** COMPLEX

**Tasks:**

1. Automatically backup to `refs/noclaude/backup` before rewrite
2. Add `noclaude --undo` to restore from backup
3. Keep track of noclaude operations
4. Time-limited undo (e.g., 7 days)

**Acceptance Criteria:**

- Automatic backups
- Easy undo
- Clear undo window

#### P2-5: Batch Processing

**Complexity:** MODERATE

**Tasks:**

1. Add `--all-repos` flag to process multiple repositories
2. Accept directory of repos
3. Parallel processing
4. Summary report

**Acceptance Criteria:**

- Can process multiple repos
- Shows overall progress
- Error handling per-repo

#### P2-6: Custom Attribution Patterns

**Complexity:** MODERATE

**Tasks:**

1. Add `--pattern` flag for custom removal patterns

   ```bash
   noclaude --pattern="Signed-off-by: Bot"
   ```

2. Support regex patterns
3. Multiple patterns

**Acceptance Criteria:**

- Can remove custom attributions
- Regex support
- Multiple patterns allowed

---

## 5. Third-Party Consumption Considerations

### 5.1 Error Handling & User-Friendly Messages

**Current State:** Basic error handling, generic messages
**Target:** Comprehensive error handling with actionable guidance

**Improvements Needed:**

1. **Categorized Errors**

   ```typescript
   enum ErrorCode {
     NOT_GIT_REPO = "NOT_GIT_REPO",
     INVALID_EMAIL = "INVALID_EMAIL",
     INVALID_NAME = "INVALID_NAME",
     REFS_ORIGINAL_EXISTS = "REFS_ORIGINAL_EXISTS",
     DIRTY_WORKING_DIR = "DIRTY_WORKING_DIR",
     PUSH_FAILED = "PUSH_FAILED",
     NO_CONFIG = "NO_CONFIG",
   }
   ```

2. **Contextual Help**

   ```typescript
   function showError(code: ErrorCode, details?: string) {
     const errorInfo = {
       [ErrorCode.NOT_GIT_REPO]: {
         message: "Not a git repository",
         help: "Run this command from inside a git repository.\nTo create one: git init",
       },
       [ErrorCode.REFS_ORIGINAL_EXISTS]: {
         message: "Previous filter-branch backup exists",
         help: "Clean up with: git update-ref -d refs/original/refs/heads/<branch>",
       },
       // ... etc
     };

     console.error(`Error: ${errorInfo[code].message}`);
     if (details) console.error(`  ${details}`);
     console.error("");
     console.error(`How to fix:\n${errorInfo[code].help}`);
   }
   ```

3. **Error Recovery Suggestions**
   - Automatically suggest fixes
   - Offer to perform safe corrections
   - Link to docs for complex issues

### 5.2 Input Validation & Sanitization

**Already covered in P0-1, but key principles:**

1. **Validate early, validate often**

   - Check at input time
   - Re-validate before use
   - Fail fast with clear errors

2. **Whitelist approach**

   - Define what's allowed
   - Reject everything else
   - No "trying to sanitize" dangerous inputs

3. **Defense in depth**
   - Validation layer
   - Escaping layer
   - Safe API usage layer

### 5.3 Security Considerations

**Already covered in P0-2, plus:**

1. **Audit logging** (P2)

   - Log all operations to `~/.noclaude/audit.log`
   - Include timestamps, repos, args
   - Help users track what was changed

2. **Permission checks** (P1)

   - Verify user has write access to repo
   - Check remote permissions before auto-push

3. **Dependency security** (P1)

   - Regular `npm audit`
   - Keep TypeScript/@types/node updated
   - No unnecessary dependencies

4. **Security documentation** (P1)
   - Document security model
   - Explain risks clearly
   - Provide secure usage examples

### 5.4 Breaking Change Prevention

**Strategy:**

1. **Semantic Versioning (MUST)**

   - MAJOR: Breaking changes to CLI args or behavior
   - MINOR: New features (new flags, options)
   - PATCH: Bug fixes, internal improvements

2. **Deprecation Process** (P1)

   ```typescript
   if (args.someOldFlag) {
     console.warn(
       "Warning: --some-old-flag is deprecated and will be removed in v2.0"
     );
     console.warn("Use --some-new-flag instead");
   }
   ```

3. **Feature Flags** (P2)

   - New behaviors behind flags initially
   - Promote to default after proven
   - Remove old behavior in major version

4. **Testing Matrix** (P1)
   - Test current version
   - Test with real-world repos
   - Regression tests for each release

### 5.5 Versioning & Deprecation Policies

**Policy:**

1. **Version Support**

   - Current major version: Full support
   - Previous major version: Security fixes only (6 months)
   - Older versions: Unsupported

2. **Deprecation Timeline**

   - Announce deprecation: In minor release
   - Grace period: At least 6 months or next major version
   - Removal: Only in major version

3. **Migration Guides**

   - Document breaking changes
   - Provide migration scripts if possible
   - Examples of old → new usage

4. **Changelog Discipline**
   - Every release documented
   - Breaking changes highlighted
   - Migration path explained

### 5.6 Support & Community

**Considerations:**

1. **Issue Templates** (P1)

   - Bug report template
   - Feature request template
   - Question template

2. **Response Time Expectations** (P1)

   - Document maintainer availability
   - Set realistic expectations
   - Community-driven support encouraged

3. **Code of Conduct** (P2)
   - Welcoming community
   - Clear behavior standards
   - Enforcement process

---

## 6. Package Distribution Best Practices

### 6.1 Current State

**Good:**

- Proper package.json metadata
- `prepublishOnly` hook
- Only ships dist folder
- Repository links configured

**Needs Improvement:**

- No LICENSE file (MIT mentioned but not included)
- No .npmignore (relies on `files` field - OK but could be explicit)
- No provenance/signing
- No types exported (TypeScript definitions)

### 6.2 Improvements Needed

#### P1: Add LICENSE File

```
MIT License

Copyright (c) 2024 rickhallett

Permission is hereby granted, free of charge...
```

#### P1: Type Definitions

Export types for programmatic usage:

```typescript
// dist/noclaude.d.ts
export interface Args {
  name?: string;
  email?: string;
  dryRun: boolean;
  autoPush: boolean;
}

export interface AuthorInfo {
  name: string;
  email: string;
}

export function parseArgs(): Args;
export function getAuthorInfo(args: Args): AuthorInfo;
```

Update package.json:

```json
{
  "types": "dist/noclaude.d.ts",
  "exports": {
    ".": {
      "types": "./dist/noclaude.d.ts",
      "default": "./dist/noclaude.js"
    }
  }
}
```

#### P2: npm Provenance

Enable provenance for supply chain security:

```json
{
  "publishConfig": {
    "provenance": true
  }
}
```

Requires publishing from GitHub Actions.

#### P2: Package Keywords

Improve discoverability:

```json
{
  "keywords": [
    "git",
    "history",
    "rewrite",
    "filter-branch",
    "author",
    "claude",
    "claude-code",
    "attribution",
    "commit-message",
    "bun",
    "typescript",
    "cli"
  ]
}
```

---

## 7. Risk Assessment Summary

### Critical Risks (Must Address - P0)

| Risk                          | Impact | Likelihood | Mitigation                            |
| ----------------------------- | ------ | ---------- | ------------------------------------- |
| Shell injection vulnerability | High   | Medium     | P0-2: Input validation & escaping     |
| Data loss from failed rewrite | High   | Medium     | P0-3: Pre-flight checks, P1-3: Backup |
| Cross-platform failures       | High   | High       | P0-6: Platform testing                |
| No test coverage              | High   | High       | P0-5: Core test suite                 |
| Invalid input crashes tool    | Medium | High       | P0-1: Input validation                |

### Important Risks (Should Address - P1)

| Risk                       | Impact | Likelihood | Mitigation                 |
| -------------------------- | ------ | ---------- | -------------------------- |
| Poor user experience       | Medium | Medium     | P1-2: Better errors & help |
| Bun-only limits adoption   | Medium | High       | P1-1: Node.js support      |
| Insufficient documentation | Medium | Medium     | P1-4: Comprehensive docs   |
| No CI/automation           | Medium | Medium     | P1-5: GitHub Actions       |

### Minor Risks (Nice to Address - P2)

| Risk                         | Impact | Likelihood | Mitigation         |
| ---------------------------- | ------ | ---------- | ------------------ |
| Limited runtime support      | Low    | Low        | P2-1: Deno support |
| Manual configuration tedious | Low    | Medium     | P2-2: Config files |
| Cannot undo operations       | Medium | Low        | P2-4: Undo feature |

---

## 8. Recommended Implementation Order

### Week 1: Critical Security & Validation (P0)

1. Day 1-2: P0-1 Input Validation & Sanitization
2. Day 2-3: P0-2 Shell Command Safety
3. Day 3-4: P0-3 Git Repository Validation
4. Day 4-5: P0-4 Error Handling Improvements

### Week 2: Testing & Cross-Platform (P0)

1. Day 1-3: P0-5 Core Test Suite (unit + integration)
2. Day 4-5: P0-6 Cross-Platform sed Compatibility

### Week 3: Runtime Support & Polish (P1)

1. Day 1: P1-1 Node.js Runtime Support
2. Day 2-3: P1-2 Enhanced Error Messages & Help
3. Day 3-4: P1-3 Safety Enhancements
4. Day 4-5: P1-4 Comprehensive Documentation

### Week 4: Testing & CI (P1)

1. Day 1-3: P1-5 Integration & E2E Tests
2. Day 3-4: P1-6 Performance & UX Polish
3. Day 5: Buffer/polish

### Later: Optional Enhancements (P2)

- Implement as needed based on user feedback
- Prioritize based on actual usage patterns

---

## 9. Success Metrics

### Production Ready Definition

A package is production-ready when:

1. **Security** ✓

   - No known vulnerabilities
   - Input validation complete
   - Shell injection impossible

2. **Reliability** ✓

   - 85%+ test coverage
   - Works on all major platforms
   - Handles all error scenarios gracefully

3. **Usability** ✓

   - Clear error messages
   - Comprehensive documentation
   - Help text answers common questions

4. **Compatibility** ✓

   - Works with Node.js ≥18
   - Works with Bun ≥1.0
   - Cross-platform (macOS/Linux/Windows)

5. **Maintainability** ✓
   - Well-tested codebase
   - Clear code structure
   - Contributor guidelines
   - Automated CI

### Acceptance Criteria for "Production Ready"

- [ ] All P0 tasks complete
- [ ] All P1 tasks complete (or documented deferrals)
- [ ] Test coverage ≥85%
- [ ] No critical or high security issues
- [ ] Works on macOS, Linux, Windows
- [ ] Works with Node.js and Bun
- [ ] Comprehensive documentation
- [ ] CI pipeline established
- [ ] At least 10 real-world test cases passed

---

## 10. Open Questions & Decisions Needed

### 1. Runtime Strategy

**Question:** Should we support Node.js as primary or keep Bun-only?
**Recommendation:** Support both, Node.js as primary (wider adoption)
**Decision needed by:** Before P1-1

### 2. sed Replacement Strategy

**Question:** Platform detection, POSIX sed, or JavaScript replacement?
**Recommendation:** JavaScript replacement (most portable)
**Decision needed by:** Before P0-6

### 3. Test Coverage Target

**Question:** What's realistic coverage target?
**Recommendation:** 85% (unit + integration)
**Decision needed by:** Before P0-5

### 4. Breaking Changes Policy

**Question:** How aggressive should we be with fixes that break compatibility?
**Recommendation:** Fix security/critical bugs immediately, document others for v2.0
**Decision needed by:** Before any breaking changes

### 5. Feature Scope

**Question:** Should we add features like selective rewriting (P2-3)?
**Recommendation:** Defer until P0/P1 complete, reassess based on user feedback
**Decision needed by:** After P1 complete

---

## 11. Conclusion

**noclaude** has a solid foundation but needs significant hardening before it's truly production-ready for third-party consumption. The core functionality is sound, but gaps in validation, error handling, testing, and cross-platform support pose real risks.

**Critical Path to Production:**

1. Security fixes (P0-1, P0-2)
2. Validation & error handling (P0-3, P0-4)
3. Test coverage (P0-5)
4. Cross-platform compatibility (P0-6)
5. Runtime support (P1-1)
6. Documentation (P1-4)

**Estimated Timeline:** 3-4 weeks for production-ready status (P0 + critical P1)

**Current Risk Level:** MEDIUM-HIGH
**Post-P0 Risk Level:** LOW
**Post-P1 Risk Level:** VERY LOW

**Recommendation:** Complete P0 tasks before encouraging public use beyond early adopters. Complete P1 tasks before marketing as production-ready npm package.

---

## Appendix A: Quick Reference

### File Paths

- Source: `/Users/richardhallett/Documents/code/noclaude/src/noclaude.ts`
- Package: `/Users/richardhallett/Documents/code/noclaude/package.json`
- README: `/Users/richardhallett/Documents/code/noclaude/README.md`
- Tests: `/Users/richardhallett/Documents/code/noclaude/test/` (to be created)

### Commands

```bash
# Build
bun run build

# Test (after implementation)
bun test
bun test:unit
bun test:integration
bun test:e2e

# Publish
npm publish
```

### Key Issues in Current Code

1. Line 42-46: Argument parsing lacks bounds checking
2. Line 149-158: No email/name validation
3. Line 203-215: Shell injection vulnerability
4. Line 209-211: Cross-platform sed issues
5. No test coverage
6. Bun-only runtime (artificial limitation)

---

**Document Version:** 1.0
**Date:** 2025-10-08
**Author:** Claude Code (Production Readiness Assessment Agent)
**Status:** Draft for Review
