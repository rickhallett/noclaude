# PRD: Autonomous Agent Chain System for noclaude Production Readiness

**Version:** 2.0
**Date:** 2025-10-08
**Status:** Proposed
**Target:** noclaude CLI tool production readiness

## Executive Summary

An autonomous, closed-loop AI Developer Workflow (ADW) system that chains multiple specialized agent prompts together to achieve one-shot production-grade readiness for the noclaude CLI tool. This system leverages TAC (Tactical Agentic Coding) principles to create a self-operating machine that audits, secures, tests, validates, and corrects code without human intervention until production-ready.

## Problem Statement

### Current Pain Points

- **Manual iteration cycles**: Engineers must manually guide agents through security fixes, test implementation, and validation phases
- **Context loss between sessions**: Each agent session starts fresh without accumulated learnings from the production readiness assessment
- **Critical security vulnerability**: Shell injection risk in `src/noclaude.ts:203-215` requires careful remediation
- **Cross-platform compatibility**: sed command syntax differs between macOS, Linux, and Windows
- **Zero test coverage**: No tests despite npm publication at v1.0.1
- **No feedback loops**: Agents can't self-correct based on test results or security validation failures

### Opportunity

By implementing a multi-phase agent chain with closed-loop validation, we can achieve:

- **One-shot production readiness**: First run produces secure, tested, cross-platform code
- **Self-correction**: Agents fix their own failures based on test and security audit output
- **Consistent quality**: Every output meets production standards (85% test coverage, no P0 issues)
- **Zero human iteration**: Engineers review final output, not intermediate steps
- **3-4 week timeline compression**: Automated execution of comprehensive production readiness plan

## Requirements

### User Requirements

1. **Single command execution**: Developer runs one command to trigger entire autonomous chain
2. **Transparent progress**: Clear visibility into which phase is executing (P0-1 through P2-6)
3. **Intervention points**: Ability to pause/review at critical checkpoints (security fixes, runtime changes)
4. **Success guarantees**: System must achieve 85% test coverage and resolve all P0 security issues before completion
5. **Production artifacts**: Final output includes secured code, comprehensive tests, documentation, and Node.js compatibility

### Technical Requirements

#### Phase Architecture

```
Phase 1: Requirements Extraction & Analysis
  ├─> Parse production readiness assessment (docs/specs/initial-plan.md)
  ├─> Parse CLAUDE.md constraints (lowercased filenames, Bun runtime)
  ├─> Identify P0/P1/P2 priorities
  └─> Output: structured-requirements.json

Phase 2: Security Remediation (P0-1, P0-2)
  ├─> P0-1: Implement input validation & sanitization
  ├─> P0-2: Fix shell injection vulnerability (lines 203-215)
  ├─> Replace string interpolation with safe execSync patterns
  └─> Output: secured src/noclaude.ts

Phase 3: Git Safety & Validation (P0-3, P0-4)
  ├─> P0-3: Add git repository validation checks
  ├─> P0-4: Enhance error handling for git operations
  ├─> Add pre-execution validations (dirty repo, detached HEAD)
  └─> Output: hardened src/noclaude.ts

Phase 4: Cross-Platform Compatibility (P0-6)
  ├─> Replace sed command with JavaScript implementation
  ├─> Test on macOS (BSD sed), Linux (GNU sed), Windows (Git Bash)
  ├─> Ensure consistent behavior across platforms
  └─> Output: cross-platform src/noclaude.ts

Phase 5: Test Suite Implementation (P0-5)
  ├─> Set up Bun test infrastructure
  ├─> Unit tests: parseArgs(), input validation, sanitization
  ├─> Integration tests: git operations, error scenarios
  ├─> E2E tests: CLI invocation with real git repos
  ├─> Target: 85% test coverage
  └─> Output: tests/noclaude.test.ts, tests/integration.test.ts, tests/e2e.test.ts

Phase 6: Validation Loop (CLOSED LOOP)
  ├─> Run all tests (bun test)
  ├─> Run security audit (check for remaining vulnerabilities)
  ├─> Verify test coverage ≥85%
  ├─> If failures OR coverage <85% OR security issues remain:
  │   ├─> Phase 6a: Diagnostic Analysis
  │   │   └─> Identify root causes from test/audit output
  │   ├─> Phase 6b: Auto-Correction
  │   │   └─> Fix specific issues (test failures, security gaps)
  │   └─> LOOP BACK to Phase 6
  └─> If all pass AND coverage ≥85% AND no P0 issues: proceed

Phase 7: Node.js Runtime Support (P1-1)
  ├─> Add Node.js shebang option (#!/usr/bin/env node)
  ├─> Update package.json with dual entry points
  ├─> Test with both Bun and Node.js runtimes
  └─> Output: dual-runtime src/noclaude.ts

Phase 8: Enhanced Documentation (P1-4)
  ├─> Generate comprehensive README
  ├─> Add security best practices section
  ├─> Document cross-platform testing approach
  ├─> Create troubleshooting guide
  └─> Output: enhanced README.md, docs/security.md, docs/testing.md

Phase 9: Final Validation Checklist
  ├─> Verify all P0 issues resolved
  ├─> Confirm 85% test coverage achieved
  ├─> Validate cross-platform compatibility
  ├─> Check Node.js/Bun dual runtime support
  ├─> Verify all CLAUDE.md constraints met
  └─> Production readiness sign-off
```

#### Constraint Validation

Each phase must validate:

- No shell injection vulnerabilities (user input properly sanitized)
- Input validation for --name and --email flags
- Git repository validation before operations
- Cross-platform compatibility (macOS, Linux, Windows)
- Test coverage ≥85%
- Node.js runtime compatibility (in addition to Bun)
- Lowercased filenames for JS/TS files (CLAUDE.md constraint)
- No emojis in code or output (CLAUDE.md constraint)
- Build system integrity (bun run build still works)

### Design Requirements

#### Agent Specialization

Each phase uses a specialized agent with distinct system prompt:

1. **Requirements Agent**: Extract and structure P0/P1/P2 priorities from production readiness plan
2. **Security Agent**: Remediate shell injection and implement input validation
3. **Git Safety Agent**: Add repository validation and error handling
4. **Cross-Platform Agent**: Replace sed with JavaScript, ensure platform compatibility
5. **Test Generator Agent**: Create comprehensive test suite with 85% coverage target
6. **Validator Agent**: Execute tests, security audits, and coverage analysis
7. **Diagnostic Agent**: Analyze test failures, security issues, coverage gaps
8. **Corrector Agent**: Implement targeted fixes for failures
9. **Runtime Agent**: Add Node.js support while maintaining Bun compatibility
10. **Documentation Agent**: Generate production-grade docs and guides
11. **Auditor Agent**: Final production-readiness checklist and sign-off

#### Inter-Agent Communication

```typescript
interface PhaseOutput {
  phase: string;
  priority: "P0" | "P1" | "P2";
  status: "success" | "failure" | "needs_retry";
  artifacts: {
    files: Record<string, string>; // filename -> content
    metadata: {
      securityIssuesResolved?: string[];
      testCoverage?: number;
      crossPlatformTested?: boolean;
      runtimeSupport?: string[];
    };
  };
  nextPhase: string | null;
  validationResults?: {
    passed: boolean;
    securityAudit: { passed: boolean; issues: string[] };
    testResults: { passed: boolean; coverage: number };
    details: string[];
  };
}
```

## Implementation Notes

### Core ADW Orchestrator

```typescript
// adw-orchestrator.ts
import { Agent } from "./agent-executor";

interface ChainConfig {
  maxRetries: number;
  targetCoverage: number; // 0.85 for 85%
  checkpoints: string[]; // Phases requiring human approval
  priorityLevels: ("P0" | "P1" | "P2")[]; // Execute in priority order
}

class AutonomousAgentChain {
  private phases: Agent[];
  private config: ChainConfig;

  async execute(): Promise<ProductionArtifacts> {
    const context = new ChainContext();

    // Execute P0 phases first (critical security and testing)
    for (const agent of this.getPhasesByPriority("P0")) {
      console.log(`[P0] Executing ${agent.name}...`);
      const result = await agent.run(context);
      context.accumulate(result);

      if (this.config.checkpoints.includes(agent.name)) {
        await this.humanReview(result);
      }

      // Validation loop trigger after test generation
      if (agent.name === "Test Generator") {
        console.log("Running validation loop...");
        await this.validationLoop(context);
      }
    }

    // Execute P1 phases (important enhancements)
    for (const agent of this.getPhasesByPriority("P1")) {
      console.log(`[P1] Executing ${agent.name}...`);
      const result = await agent.run(context);
      context.accumulate(result);
    }

    return context.getFinalArtifacts();
  }

  private async validationLoop(context: ChainContext): Promise<void> {
    let attempts = 0;

    while (attempts++ < this.config.maxRetries) {
      // Run validator agent
      const validation = await this.agents.validator.run(context);

      if (validation.validationResults.passed) {
        console.log("Validation successful!");
        return;
      }

      console.log(`Validation failed (attempt ${attempts}), diagnosing...`);

      // Run diagnostic agent
      const diagnosis = await this.agents.diagnostic.run({
        ...context,
        validationOutput: validation,
      });

      // Run corrector agent
      const fixes = await this.agents.corrector.run({
        ...context,
        diagnosis,
      });

      context.applyFixes(fixes);
    }

    throw new Error(
      `Max validation attempts (${this.config.maxRetries}) reached without success`
    );
  }
}
```

### Security Agent System Prompt

```
You are a Security Agent responsible for remediating critical security vulnerabilities in the noclaude CLI tool.

Critical issue to fix (P0-2):
Location: src/noclaude.ts:203-215
Vulnerability: Shell injection via user-controlled input in git filter-branch command

Current vulnerable code:
```typescript
execSync(`git filter-branch --env-filter '
  export GIT_AUTHOR_NAME="${name}"
  export GIT_AUTHOR_EMAIL="${email}"
  ...
```

A malicious user could provide: --name '"; rm -rf /"' and execute arbitrary code.

Your tasks:
1. Implement input validation (P0-1):
   - Validate --name contains only safe characters (alphanumeric, spaces, hyphens)
   - Validate --email matches standard email regex
   - Reject inputs with shell metacharacters (;, |, &, $, `, etc.)

2. Fix shell injection (P0-2):
   - Use environment variable export instead of string interpolation
   - OR use child_process.spawn with argument array instead of shell string
   - OR sanitize inputs with proper escaping

3. Add unit tests for validation logic

Output: Secured src/noclaude.ts with validation functions and tests
```

### Test Generator Agent System Prompt

```
You are a Test Generator Agent responsible for creating comprehensive test coverage for noclaude.

Target: 85% test coverage (P0-5 requirement)

Your tasks:
1. Set up Bun test infrastructure (create test files)

2. Unit tests (tests/noclaude.test.ts):
   - parseArgs() with valid/invalid inputs
   - Input validation functions (name, email sanitization)
   - Argument parsing edge cases (missing flags, empty values, special chars)

3. Integration tests (tests/integration.test.ts):
   - Git filter-branch execution (mocked)
   - Error handling for git failures
   - User confirmation prompt logic

4. E2E tests (tests/e2e.test.ts):
   - Full CLI invocation with test git repository
   - History rewriting verification
   - Author/committer changes confirmation

5. Security tests:
   - Shell injection attempts (should be rejected)
   - Malicious input patterns (should fail validation)

Use Bun's native test API:
```typescript
import { describe, test, expect } from "bun:test";
```

Output format: Complete test suite with 85%+ coverage
```

### Validation Agent System Prompt

```
You are a Validation Agent responsible for ensuring noclaude production readiness.

Your tasks:
1. Execute test suite: bun test
2. Calculate test coverage: bun test --coverage
3. Run security audit: check for remaining vulnerabilities
   - Grep for execSync, eval, Function constructor
   - Verify input validation presence
   - Check for unescaped user input
4. Verify cross-platform compatibility markers
5. Report validation results in structured format

Output format:
{
  "allTestsPassing": boolean,
  "testCoverage": number,
  "securityAudit": {
    "passed": boolean,
    "issues": string[]
  },
  "passed": boolean,
  "details": string[]
}

Criteria for passing:
- All unit tests pass
- All integration tests pass
- Test coverage ≥ 85%
- No P0 security issues remain
- No shell injection vulnerabilities
- Input validation implemented
```

### Diagnostic Agent System Prompt

```
You are a Diagnostic Agent responsible for root cause analysis of noclaude validation failures.

Input: Test failures, security audit issues, and coverage reports from Validation Agent

Your tasks:
1. Analyze failure patterns across test runs
2. Identify root causes (not just symptoms)
3. Categorize failures:
   - Input validation gaps
   - Shell injection vectors
   - Test coverage gaps
   - Cross-platform compatibility issues
   - Git operation failures
   - Logic errors
4. Prioritize fixes by impact (P0 security > test coverage > P1 enhancements)
5. Provide specific, actionable diagnosis

Output format:
{
  "rootCauses": [
    {
      "category": "security" | "testing" | "compatibility" | "logic",
      "description": string,
      "affectedFiles": string[],
      "priority": "P0" | "P1" | "P2",
      "suggestedFix": string
    }
  ]
}
```

## CLI Interface

```bash
# Basic execution (runs P0 phases only)
npx noclaude-adw execute

# Execute P0 and P1 phases
npx noclaude-adw execute --phases P0,P1

# With checkpoints for human review
npx noclaude-adw execute --checkpoint security --checkpoint validation

# Specify coverage threshold
npx noclaude-adw execute --target-coverage 0.90

# Verbose mode showing all agent reasoning
npx noclaude-adw execute --verbose

# Dry run (planning only, no execution)
npx noclaude-adw plan

# Resume from checkpoint after manual review
npx noclaude-adw resume --from phase-6
```

## Success Metrics

### Quantitative

- **One-shot production readiness**: First run resolves all P0 issues (target: 100%)
- **Time to production**: Minutes from command execution to production-ready code (target: <45min for P0 phases)
- **Test coverage**: Achieved coverage after test generation (target: ≥85%)
- **Security audit**: No P0 vulnerabilities remaining (target: 0 critical issues)
- **Correction loop efficiency**: Average iterations needed in validation loop (target: ≤2)
- **Cross-platform success**: Tool works on macOS, Linux, Windows (target: 3/3 platforms)

### Qualitative

- **Code readability**: Production-quality code that human engineers can maintain
- **Security posture**: Shell injection vulnerability eliminated, input validation comprehensive
- **Documentation completeness**: Security best practices, testing approach, troubleshooting documented
- **Developer confidence**: Engineers trust system enough to deploy without manual security review

## Edge Cases and Error States

### Chain-Level Failures

1. **Max retries exceeded in validation loop**
   - Action: Export diagnostic report showing remaining failures (security, tests, coverage)
   - Recovery: Human reviews diagnostic output, adjusts requirements, reruns chain

2. **Agent crashes mid-phase**
   - Action: Persist chain context to disk, allow resume from last completed phase
   - Recovery: `npx noclaude-adw resume --from phase-5`

3. **Conflicting constraints detected**
   - Action: Requirements Agent identifies conflicts (e.g., "Bun-only" vs "Node.js support")
   - Recovery: Fail fast with clear explanation before implementation

### Phase-Specific Failures

1. **Test coverage below 85% after multiple iterations**
   - Action: Diagnostic Agent identifies untested code paths
   - Recovery: Corrector Agent adds targeted tests for specific functions/branches

2. **Security audit still finds issues after remediation**
   - Action: Diagnostic Agent analyzes remaining attack vectors
   - Recovery: Corrector Agent applies additional sanitization/validation

3. **Cross-platform test failures**
   - Action: Diagnostic Agent identifies platform-specific issues (sed syntax, path separators)
   - Recovery: Corrector Agent replaces platform-specific code with JavaScript

4. **TypeScript compilation errors after changes**
   - Action: Implementation Agent gets compiler errors as immediate feedback
   - Recovery: Auto-fix type errors before proceeding to next phase

## Future Enhancements

### Phase 1: Core Chain (Current)

- Sequential phase execution with validation loop
- Single-threaded agent execution
- Human checkpoints for security and runtime changes

### Phase 2: Parallel Execution

- Run independent phases in parallel (test generation + documentation)
- Multi-threaded agent pool for faster P0 completion
- Dependency graph resolution for optimal scheduling

### Phase 3: Learning System

- Persist successful security remediation patterns to knowledge base
- Agents reference past solutions for similar vulnerabilities
- Continuous improvement: fewer correction loop iterations over time

### Phase 4: Multi-Project Optimization

- Apply chain to other CLI tools with similar issues
- Identify common patterns (shell injection, cross-platform issues)
- Build reusable agent components for CLI tool hardening

### Phase 5: Full Autonomy

- Remove all checkpoints (full lights-out operation)
- Automatic PR creation with production-ready changes
- Continuous monitoring for new vulnerabilities post-deployment

## Appendix A: Phase Dependency Graph

```
┌─────────────────────┐
│ Requirements Agent  │
│ (Parse prod plan)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Security Agent     │
│  (P0-1, P0-2)       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Git Safety Agent    │
│ (P0-3, P0-4)        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│Cross-Platform Agent │
│ (P0-6)              │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Test Generator Agent│
│ (P0-5, 85% coverage)│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Validator Agent   │◄──────────┐
│ (Tests + Security)  │           │
└──────────┬──────────┘           │
           │                      │
           ▼                      │
      [Pass/Fail]                 │
           │                      │
      [If Fail]                   │
           │                      │
           ▼                      │
┌─────────────────────┐           │
│  Diagnostic Agent   │           │
│ (Root cause)        │           │
└──────────┬──────────┘           │
           │                      │
           ▼                      │
┌─────────────────────┐           │
│  Corrector Agent    │───────────┘
│ (Targeted fixes)    │    [Loop back]
└─────────────────────┘
           │
      [If Pass]
           │
           ▼
┌─────────────────────┐
│   Runtime Agent     │
│ (P1-1: Node.js)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Documentation Agent │
│ (P1-4: Guides)      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Auditor Agent     │
│ (Final checklist)   │
└─────────────────────┘
           │
           ▼
    [Production Ready]
```

## Appendix B: Context Accumulation Strategy

Each phase adds to shared context:

```typescript
interface ChainContext {
  // From Requirements Agent
  requirements: {
    priorities: { P0: string[]; P1: string[]; P2: string[] };
    constraints: string[]; // CLAUDE.md constraints
    securityIssues: { id: string; location: string; severity: string }[];
    targetCoverage: number; // 0.85
  };

  // From Security Agent
  security: {
    validationFunctions: string[]; // Added validation function names
    sanitizationApplied: boolean;
    remediatedVulnerabilities: string[];
  };

  // From Git Safety Agent
  gitSafety: {
    validationChecks: string[]; // Added check names
    errorHandling: string[]; // Enhanced error scenarios
  };

  // From Cross-Platform Agent
  crossPlatform: {
    replacedCommands: { old: string; new: string }[];
    testedPlatforms: string[]; // ["macOS", "Linux", "Windows"]
  };

  // From Test Generator Agent
  tests: {
    "tests/noclaude.test.ts": string;
    "tests/integration.test.ts": string;
    "tests/e2e.test.ts": string;
  };

  // From Validator Agent
  validation: {
    testResults: { passed: boolean; coverage: number };
    securityAudit: { passed: boolean; issues: string[] };
    passed: boolean;
  };

  // From Diagnostic Agent (if validation failed)
  diagnosis?: {
    rootCauses: Array<{
      category: string;
      priority: string;
      suggestedFix: string;
    }>;
  };

  // From Corrector Agent (if validation failed)
  corrections?: {
    appliedFixes: Array<{ file: string; description: string }>;
    iteration: number;
  };

  // From Runtime Agent
  runtime?: {
    supportedRuntimes: string[]; // ["bun", "node"]
    shebangUpdated: boolean;
  };

  // From Documentation Agent
  documentation?: {
    "README.md": string;
    "docs/security.md": string;
    "docs/testing.md": string;
  };
}
```

This context persists across all phases and correction loops, ensuring no information is lost and each agent builds upon previous work.

---

**Implementation Priority:** High
**Estimated Effort:** 40 hours (1 week sprint for core chain)
**Dependencies:** Claude Code CLI, Bun runtime, git, TypeScript
**Success Criteria:** All P0 issues resolved, 85% test coverage, production-ready noclaude v2.0.0
