#!/usr/bin/env bun

import { execSync } from 'child_process';
import * as readline from 'readline';

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
  name: string;
  email: string;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const parsed: Partial<Args> = {
    name: undefined,
    email: undefined
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--name' || args[i] === '-n') {
      parsed.name = args[++i];
    } else if (args[i] === '--email' || args[i] === '-e') {
      parsed.email = args[++i];
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`Usage: clean-git-history --name <name> --email <email>

Options:
  --name, -n    Author name (required)
  --email, -e   Author email (required)
  --help, -h    Show this help message

Example:
  clean-git-history --name "rickhallett" --email "rick@example.com"
`);
      process.exit(0);
    }
  }

  if (!parsed.name || !parsed.email) {
    console.error('Error: Both --name and --email are required');
    console.error('Run with --help for usage information');
    process.exit(1);
  }

  return parsed as Args;
}

async function main(): Promise<void> {
  const { name, email } = parseArgs();

  console.log('This will rewrite git history. Make sure you have a backup!');
  console.log(`Author will be set to: ${name} <${email}>`);
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
