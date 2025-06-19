#!/usr/bin/env bun
/**
* @file git.ts
* @description Automates git add/commit/push and asks Groq's LLM
*              (via plain HTTPS fetch) for a Conventional-Commit message.
*              Includes retry logic, automatically creates smart branches
*              based on the type of changes detected, and runs pre-commit
*              scripts for backup and API documentation generation.
*
* Usage:
*   bun git.ts         - Creates a new branch based on changes
*   bun git.ts main    - Commits directly to current branch (typically main)
*
* Environment:
*   Loads configuration from .env.local file in project root
*   See .env.example for all available configuration options
*
* Pre-commit scripts (place in same directory as git.ts):
* - backup-sql.sh or backup-db.sh: Database backup script
* - generate-api-docs.ts: OpenAPI documentation generator
*/

import { exec } from 'node:child_process';
import { createInterface } from 'node:readline';
import * as fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Configuration from environment variables
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'qwen-qwq-32b';
const GROQ_TEMPERATURE = parseFloat(process.env.GROQ_TEMPERATURE || '0.7');
const GROQ_TOP_P = parseFloat(process.env.GROQ_TOP_P || '0.95');
const GROQ_MAX_TOKENS = parseInt(process.env.GROQ_MAX_TOKENS || '50000');
const MAX_RETRIES = parseInt(process.env.GIT_MAX_RETRIES || '3');
const RETRY_DELAY_MS = parseInt(process.env.GIT_RETRY_DELAY_MS || '3000');

// Get __dirname and __filename equivalents for ES modules
// Using process.argv[1] as a fallback for better compatibility with Bun
const scriptPath = process.argv[1];
const metaUrl = import.meta.url;

// For Bun compatibility, prefer process.argv[1] if available
let __filename;
if (scriptPath && fs.existsSync(scriptPath)) {
  __filename = path.resolve(scriptPath);
} else {
  __filename = fileURLToPath(metaUrl);
}

const __dirname = path.dirname(__filename);

// Check if we should commit directly to current branch
const DIRECT_COMMIT = process.argv[2] === 'main';

/* -------------------------------------------------------------------------- */
/* 1) Utility helpers                                                         */
/* -------------------------------------------------------------------------- */

function execAsync(command: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(command, { maxBuffer: 100 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        (error as any).stdout = stdout;
        (error as any).stderr = stderr;
        return reject(error);
      }
      resolve({ stdout, stderr });
    });
  });
}

function askQuestion(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function executeCommand(cmd: string): Promise<string> {
  try {
    const { stdout, stderr } = await execAsync(cmd);
    if (stderr) console.log(`Command produced stderr: ${stderr}`);
    return stdout.trim();
  } catch (e: any) {
    console.log(`Command failed: ${e.message}`);
    throw e;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* -------------------------------------------------------------------------- */
/* 2) Groq call (native fetch)                                                */
/* -------------------------------------------------------------------------- */

/** Strip any leaked chain-of-thought from the LLM response */
function sanitizeCommit(raw: string): string {
  return raw
    // remove entire <think> … </think> blocks
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    // drop any line starting with "<" (stray XML-ish tags)
    .split('\n')
    .filter((line) => line.trim() && !line.trim().startsWith('<'))
    .join('\n')
    .trim();
}

async function getCommitMessageFromGroq(summary: string): Promise<string> {
  const systemPrompt = `
You are a git commit-message expert.
Follow the Conventional Commits spec:

1) A short subject line (e.g. "feat: add login page")
2) A blank line
3) A descriptive body with at least one full sentence.

IMPORTANT NOTES:
- If there are multiple types of changes (feat, fix, chore, etc), use the most significant type for the subject line
- The body should mention all types of changes made
- For mixed commits, you can use format like "feat: main feature" and mention fixes/chores in the body

VERY IMPORTANT
— Think silently.
— **Output ONLY the final commit message** in the format above.
— Never reveal your reasoning or wrap it in <think> tags.
`.trim();

  const userPrompt = `
Write a commit message from the information below.
ONLY output the raw commit message in the required format.

---
${summary}
`.trim();

  const resp = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: GROQ_TEMPERATURE,
      top_p: GROQ_TOP_P,
      max_tokens: GROQ_MAX_TOKENS,
      stream: false,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!resp.ok) {
    const errTxt = await resp.text();
    throw new Error(`Groq API error (${resp.status}): ${errTxt}`);
  }

  const data = (await resp.json()) as any;
  const raw = data.choices?.[0]?.message?.content ?? '';
  return sanitizeCommit(raw);
}

async function getCommitMessageWithRetry(summary: string, maxRetries: number = MAX_RETRIES): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`\n🤖 Attempting to get AI commit message (attempt ${attempt}/${maxRetries})...`);
      const message = await getCommitMessageFromGroq(summary);
      return message;
    } catch (e: any) {
      console.log(`❌ Attempt ${attempt} failed: ${e.message}`);

      if (attempt < maxRetries) {
        console.log(`⏳ Waiting ${RETRY_DELAY_MS / 1000} seconds before retry...`);
        await sleep(RETRY_DELAY_MS);
      } else {
        console.log(`❌ All ${maxRetries} attempts failed.`);
        throw e;
      }
    }
  }

  return ''; // This line should never be reached due to the throw above
}

/* -------------------------------------------------------------------------- */
/* 3) Branch creation - Smart branch naming based on changes                  */
/* -------------------------------------------------------------------------- */

/**
 * Analyzes git changes to determine the appropriate branch type
 * Uses file patterns and commit keywords to intelligently categorize changes
 * 
 * @param gitSummary - Summary of git status and recent commits
 * @returns Branch type prefix (feat, fix, docs, etc.)
 */
async function analyzeBranchType(gitSummary: string): Promise<string> {
  const types = new Set<string>();

  // Gather comprehensive information about changes
  // This helps create more accurate branch names
  try {
    const diffFiles = await executeCommand('git diff --name-status');
    const diffCached = await executeCommand('git diff --cached --name-status');
    const statusFiles = await executeCommand('git status --porcelain');
    const allChanges = `${gitSummary}\n${diffFiles}\n${diffCached}\n${statusFiles}`.toLowerCase();

    // File-based detection with more specific patterns
    if (allChanges.match(/\.(test|spec|tests?)\.(js|ts|jsx|tsx|py|java|go)/)) types.add('test');
    if (allChanges.match(/(readme|docs?\/|\.md$|documentation)/i)) types.add('docs');
    if (allChanges.match(/(package(-lock)?\.json|yarn\.lock|requirements\.txt|gemfile|go\.(mod|sum)|cargo\.toml)/)) types.add('chore');
    if (allChanges.match(/\.(css|scss|sass|less|styl|styled)/)) types.add('style');
    if (allChanges.match(/(\.github\/|dockerfile|docker-compose|\.gitlab-ci|jenkinsfile|\.circleci)/i)) types.add('ci');
    if (allChanges.match(/(webpack|rollup|vite|babel|tsconfig|eslint|prettier)/i)) types.add('build');

    // Content-based detection from commit messages and file names
    if (allChanges.match(/\b(feat|feature|add|implement|create|new)\b/)) types.add('feat');
    if (allChanges.match(/\b(fix|bug|patch|correct|resolve|issue)\b/)) types.add('fix');
    if (allChanges.match(/\b(refactor|restructure|reorganize|improve|clean)\b/)) types.add('refactor');
    if (allChanges.match(/\b(perf|performance|optimize|speed|fast)\b/)) types.add('perf');

    // Check for breaking changes
    if (allChanges.match(/\b(breaking|major|!\s*:)/)) types.add('breaking');

  } catch (e) {
    console.log('Could not get detailed diff information');
  }

  // Determine the branch name based on detected types
  if (types.size === 0) {
    return 'feat'; // default
  } else if (types.size === 1) {
    return Array.from(types)[0];
  } else {
    // Multiple types: prioritize or combine
    const priority = ['breaking', 'feat', 'fix', 'perf', 'refactor', 'build', 'ci', 'chore', 'docs', 'style', 'test'];
    const sortedTypes = Array.from(types).sort((a, b) => priority.indexOf(a) - priority.indexOf(b));

    // If breaking changes, always include it
    if (types.has('breaking')) {
      const mainType = sortedTypes.find(t => t !== 'breaking') || 'feat';
      return `breaking-${mainType}`;
    }

    // Otherwise, combine top 2 types
    return sortedTypes.slice(0, 2).join('-');
  }
}

async function createNewBranch(gitSummary: string): Promise<string> {
  // Get current branch to base the new branch on
  const currentBranch = await executeCommand('git rev-parse --abbrev-ref HEAD');

  // Analyze changes to determine branch type
  const branchType = await analyzeBranchType(gitSummary);

  // Generate branch name with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const branchName = `${branchType}/${timestamp}`;

  console.log(`\n🎯 Detected change type: ${branchType}`);
  console.log(`🌿 Creating new branch: ${branchName} from ${currentBranch}`);

  // Create and checkout new branch
  await executeCommand(`git checkout -b ${branchName}`);

  return branchName;
}

/* -------------------------------------------------------------------------- */
/* 4) Pre-commit scripts execution                                            */
/* -------------------------------------------------------------------------- */

/**
 * Executes pre-commit scripts to ensure code quality and data safety
 * 
 * Pre-commit scripts run automatically before each commit:
 * 1. backup-sql.sh - Creates versioned database backup
 *    - Includes git commit hash and schema version
 *    - Automatically rotates old backups
 *    - Essential for data recovery
 * 
 * Other available scripts (not run automatically):
 * - check-migrations.ts - Validates database migrations
 * - validate-schema.ts - Validates Drizzle schemas
 * 
 * Scripts are optional but backups are highly recommended
 * If a script fails, user is prompted to continue or abort
 */
async function executePreCommitScripts(): Promise<void> {
  console.log('\n📋 Running pre-commit scripts...\n');

  // The scripts should be in the same directory as git.ts
  const scriptsDir = __dirname;

  console.log(`📍 git.ts is running from: ${__filename}`);
  console.log(`📁 Looking for pre-commit scripts in: ${scriptsDir}`);

  // List all files in the directory for debugging
  try {
    const allFiles = fs.readdirSync(scriptsDir);
    console.log(`📄 Files in directory: ${allFiles.join(', ')}`);
  } catch (e) {
    console.log(`❌ Could not list directory contents: ${e.message}`);
  }

  // Define scripts to run - check for multiple possible names
  const backupScriptNames = ['backup-sql.sh', 'backup-db.sh', 'backup.sh'];

  let backupScript = null;

  // Find backup script
  for (const scriptName of backupScriptNames) {
    const scriptPath = path.join(scriptsDir, scriptName);
    if (fs.existsSync(scriptPath)) {
      backupScript = scriptPath;
      console.log(`✅ Found backup script: ${scriptName}`);
      break;
    }
  }


  // Run backup script if found
  if (backupScript) {
    console.log(`\n🔄 Running ${path.basename(backupScript)}...`);
    try {
      // Make sure the script is executable
      await executeCommand(`chmod +x ${backupScript}`);
      const backupResult = await executeCommand(backupScript);
      console.log('✅ Backup completed successfully');
      if (backupResult) console.log(backupResult);
    } catch (e: any) {
      console.log(`⚠️  Backup script failed: ${e.message}`);
      const continueAnswer = await askQuestion('Continue without backup? (y/n): ');
      if (continueAnswer.toLowerCase() !== 'y') {
        throw new Error('Process aborted by user');
      }
    }
  } else {
    console.log(`\n⚠️  Warning: No backup script found`);
    console.log(`   Searched for: ${backupScriptNames.join(', ')}`);
    console.log(`   In directory: ${scriptsDir}`);

    // List files in the directory to help debug
    try {
      const files = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.sh'));
      if (files.length > 0) {
        console.log(`   Available .sh files: ${files.join(', ')}`);
      }
    } catch (e) {
      // Directory might not exist
    }

    console.log('   Continuing without backup...');
  }


  console.log('\n✅ Pre-commit scripts phase completed\n');
}

/* -------------------------------------------------------------------------- */
/* 5) Main Git Workflow - Orchestrates the entire process                    */
/* -------------------------------------------------------------------------- */

/**
 * Main function that handles the complete git workflow:
 * 1. Checks for changes to commit
 * 2. Runs pre-commit scripts (backup)
 * 3. Creates smart branch based on changes (or commits to current branch)
 * 4. Generates AI-powered commit message
 * 5. Commits and pushes changes
 * 
 * The workflow ensures:
 * - Data safety (backups before commits)
 * - Consistent commit messages (AI-generated)
 * - Smart branching strategy
 */
async function handleGitOperations(): Promise<void> {
  console.log('🚀 Starting git automation process...\n');
  console.log('━'.repeat(50));

  // Check for required environment variables
  // GROQ_API_KEY is needed for AI commit messages
  if (!GROQ_API_KEY) {
    console.log('\n⚠️  Warning: GROQ_API_KEY not set in .env.local');
    console.log('   AI commit messages will not be available.');
    console.log('   You will need to enter commit messages manually.\n');
  }

  if (DIRECT_COMMIT) {
    const currentBranch = await executeCommand('git rev-parse --abbrev-ref HEAD');
    console.log(`⚡ Direct commit mode - committing to current branch: ${currentBranch}`);
    console.log('━'.repeat(50));
  }

  // Abort if nothing to commit
  const status = await executeCommand('git status --porcelain');
  if (!status) {
    console.log('✨ No changes to commit');
    return;
  }

  // Run pre-commit scripts (backup and API docs)
  try {
    await executePreCommitScripts();
  } catch (e: any) {
    console.log(`❌ Pre-commit scripts failed: ${e.message}`);
    process.exit(1);
  }

  // Check again for changes after running scripts (they might have generated new files)
  const statusAfterScripts = await executeCommand('git status --porcelain');
  if (!statusAfterScripts) {
    console.log('✨ No changes to commit after running pre-commit scripts');
    return;
  }

  console.log('━'.repeat(50));
  console.log('\n🔍 Analyzing changes...');

  // Summarise repo state with more detail for better analysis
  const gitSummary = await executeCommand(`
  echo "### GIT STATUS ###"
  git status

  echo ""
  echo "### FILES CHANGED ###"
  git diff --name-status
  git diff --cached --name-status

  echo ""
  echo "### STAGED CHANGES SUMMARY ###"
  git --no-pager diff --cached --stat

  echo ""
  echo "### UNSTAGED CHANGES SUMMARY ###"
  git --no-pager diff --stat

  echo ""
  echo "### RECENT COMMITS ###"
  git --no-pager log --oneline -n 5
`);

  // Create new branch only if not in direct commit mode
  let branchName: string;
  if (!DIRECT_COMMIT) {
    branchName = await createNewBranch(gitSummary);
    console.log(`✅ Switched to new branch: ${branchName}`);
    console.log('━'.repeat(50));
  } else {
    branchName = await executeCommand('git rev-parse --abbrev-ref HEAD');
    console.log(`📍 Will commit to current branch: ${branchName}`);
    console.log('━'.repeat(50));
  }

  /* Ask Groq for a commit message with retry logic */
  let commitMessage = '';
  try {
    commitMessage = await getCommitMessageWithRetry(gitSummary);
    console.log('\n🤖 AI commit message (clean):\n');
    console.log('┌' + '─'.repeat(60) + '┐');
    commitMessage.split('\n').forEach(line => {
      console.log(`│ ${line.padEnd(58)} │`);
    });
    console.log('└' + '─'.repeat(60) + '┘\n');
  } catch (e: any) {
    console.log(`\n❌ Couldn't get AI message after 3 attempts: ${e.message}`);
  }

  // Fallback: prompt the user
  if (!commitMessage.trim()) {
    console.log('\n📝 Manual commit message required:');
    commitMessage = await askQuestion('Enter a commit message:\n> ');
  }

  // Write message to temp file so git handles newlines correctly
  const tmpFile = path.join(os.tmpdir(), `commit_msg_${Date.now()}.txt`);
  fs.writeFileSync(tmpFile, commitMessage);

  console.log('━'.repeat(50));
  console.log('\n📦 Committing changes...');

  // Git add / commit / push
  await executeCommand('git add .');
  await executeCommand(`git commit -F ${tmpFile}`);

  // Try to get the default remote (usually 'origin')
  let remoteName = 'origin';
  try {
    // Get the first remote if exists
    const remotes = await executeCommand('git remote');
    if (remotes) {
      remoteName = remotes.split('\n')[0].trim();
    }
  } catch (e) {
    console.log('No remote found, using "origin"');
  }

  // Push the branch
  if (DIRECT_COMMIT) {
    console.log(`\n🚀 Pushing changes to ${remoteName}/${branchName}...`);
    await executeCommand(`git push ${remoteName} ${branchName}`);
  } else {
    console.log(`\n🚀 Pushing new branch ${branchName} to ${remoteName}/${branchName}...`);
    await executeCommand(`git push --set-upstream ${remoteName} ${branchName}`);
  }

  fs.unlinkSync(tmpFile);

  console.log('\n' + '━'.repeat(50));
  console.log('\n✨ Git operations completed successfully!\n');

  if (!DIRECT_COMMIT) {
    console.log('📌 To merge this branch later, use:');
    console.log(`   git checkout main`);
    console.log(`   git merge ${branchName}`);
  } else {
    console.log(`📌 Changes committed directly to ${branchName}`);
  }

  console.log('\n' + '━'.repeat(50));
}

/* -------------------------------------------------------------------------- */
/* 6) Entrypoint                                                              */
/* -------------------------------------------------------------------------- */

(async () => {
  try {
    await handleGitOperations();
  } catch (e: any) {
    console.log(`\n❌ Process failed: ${e.message}`);
    process.exit(1);
  }
})();
