#!/usr/bin/env bun

import { execSync } from 'child_process';
import * as readline from 'readline';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer: string) => {
      resolve(answer);
    });
  });
}

interface Args {
  name?: string;
  email?: string;
  dryRun: boolean;
}

interface AuthorInfo {
  name: string;
  email: string;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const parsed: Args = {
    name: undefined,
    email: undefined,
    dryRun: false
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--name' || args[i] === '-n') {
      parsed.name = args[++i];
    } else if (args[i] === '--email' || args[i] === '-e') {
      parsed.email = args[++i];
    } else if (args[i] === '--dry-run' || args[i] === '-d') {
      parsed.dryRun = true;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`Usage: noclaude [options]

Options:
  --name, -n       Author name (optional, defaults to env/git config)
  --email, -e      Author email (optional, defaults to env/git config)
  --dry-run, -d    Show what would be done without executing
  --help, -h       Show this help message

Configuration Priority (highest to lowest):
  1. Command-line arguments (--name, --email)
  2. Environment variables (GIT_AUTHOR_NAME, GIT_AUTHOR_EMAIL)
  3. .env file in current directory
  4. Git config (user.name, user.email)

Examples:
  noclaude --name "rickhallett" --email "rick@example.com"
  noclaude --dry-run
  GIT_AUTHOR_NAME="rickhallett" GIT_AUTHOR_EMAIL="rick@example.com" noclaude
`);
      process.exit(0);
    }
  }

  return parsed;
}

function loadEnvFile(): Record<string, string> {
  const envPath = join(process.cwd(), '.env');
  if (!existsSync(envPath)) {
    return {};
  }

  const envContent = readFileSync(envPath, 'utf-8');
  const envVars: Record<string, string> = {};

  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').replace(/^["']|["']$/g, '');
      if (key && value) {
        envVars[key.trim()] = value.trim();
      }
    }
  });

  return envVars;
}

function getGitConfig(key: string): string | null {
  try {
    return execSync(`git config ${key}`, { encoding: 'utf-8' }).trim();
  } catch {
    return null;
  }
}

function getAuthorInfo(args: Args): AuthorInfo {
  let name: string | undefined;
  let email: string | undefined;

  // Priority 1: Command-line arguments
  if (args.name && args.email) {
    return { name: args.name, email: args.email };
  }

  // Priority 2: Environment variables
  name = process.env.GIT_AUTHOR_NAME;
  email = process.env.GIT_AUTHOR_EMAIL;

  if (name && email) {
    return { name, email };
  }

  // Priority 3: .env file
  const envVars = loadEnvFile();
  name = name || envVars.GIT_AUTHOR_NAME;
  email = email || envVars.GIT_AUTHOR_EMAIL;

  if (name && email) {
    return { name, email };
  }

  // Priority 4: Git config
  name = name || getGitConfig('user.name') || undefined;
  email = email || getGitConfig('user.email') || undefined;

  if (!name || !email) {
    console.error('Error: No author information found');
    console.error('');
    console.error('Please provide author information via one of:');
    console.error('  1. Command-line: noclaude --name "Your Name" --email "your@email.com"');
    console.error('  2. Environment: export GIT_AUTHOR_NAME="Your Name" GIT_AUTHOR_EMAIL="your@email.com"');
    console.error('  3. .env file: Create .env with GIT_AUTHOR_NAME and GIT_AUTHOR_EMAIL');
    console.error('  4. Git config: git config user.name "Your Name" && git config user.email "your@email.com"');
    process.exit(1);
  }

  return { name, email };
}

async function main(): Promise<void> {
  const args = parseArgs();
  const { name, email } = getAuthorInfo(args);

  console.log('This will rewrite git history. Make sure you have a backup!');
  console.log(`Author will be set to: ${name} <${email}>`);

  if (args.dryRun) {
    console.log('');
    console.log('[DRY RUN MODE - No changes will be made]');
    console.log('');
    console.log('Would execute:');
    console.log(`  git filter-branch --env-filter 'export GIT_AUTHOR_NAME="${name}" ...'`);
    console.log(`  sed filters to remove Claude Code attribution`);
    console.log('');
    console.log('Run without --dry-run to execute');
    rl.close();
    return;
  }

  console.log('Press Ctrl+C to cancel, or Enter to continue...');
  await prompt('');

  try {
    // Set environment variables for git filter-branch
    const env = {
      ...process.env,
      GIT_AUTHOR_NAME: name,
      GIT_AUTHOR_EMAIL: email,
      GIT_COMMITTER_NAME: name,
      GIT_COMMITTER_EMAIL: email
    };

    console.log('Rewriting git history...');

    // Run git filter-branch
    execSync(`git filter-branch --env-filter '
      export GIT_AUTHOR_NAME="${name}"
      export GIT_AUTHOR_EMAIL="${email}"
      export GIT_COMMITTER_NAME="${name}"
      export GIT_COMMITTER_EMAIL="${email}"
    ' --msg-filter '
      sed -e "s/🤖 Generated with \\[Claude Code\\](https:\\/\\/claude\\.com\\/claude-code)//g" \\
          -e "s/Co-Authored-By: Claude <noreply@anthropic\\.com>//g" \\
          -e "/^[[:space:]]*$/d"
    ' --tag-name-filter cat -- --all`, {
      stdio: 'inherit',
      env
    });

    console.log('');
    console.log('History rewritten. Review with \'git log\' before force pushing.');
    console.log('To force push: git push --force-with-lease origin main');

  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
