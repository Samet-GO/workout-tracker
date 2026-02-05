#!/usr/bin/env node

/**
 * Git Hooks Setup Script
 *
 * Installs pre-commit hooks that run route validation and linting.
 * This script runs automatically via npm's "prepare" lifecycle hook.
 *
 * Usage: node scripts/setup-hooks.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const gitDir = path.join(projectRoot, '.git');
const hooksDir = path.join(gitDir, 'hooks');

const preCommitHook = `#!/bin/sh
#
# Pre-commit hook: Validates routes and runs linting
# Installed by: npm run prepare (scripts/setup-hooks.mjs)
#

echo "Running pre-commit checks..."

# Validate routes
echo "Validating routes..."
npm run validate-routes
if [ $? -ne 0 ]; then
  echo ""
  echo "Route validation failed. Fix broken links before committing."
  exit 1
fi

# Run linting (optional - comment out if too slow)
# echo "Running linter..."
# npm run lint
# if [ $? -ne 0 ]; then
#   echo ""
#   echo "Linting failed. Fix lint errors before committing."
#   exit 1
# fi

echo "Pre-commit checks passed!"
exit 0
`;

function setupHooks() {
  // Check if we're in a git repository
  if (!fs.existsSync(gitDir)) {
    console.log('Not a git repository, skipping hook setup');
    return;
  }

  // Ensure hooks directory exists
  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }

  const preCommitPath = path.join(hooksDir, 'pre-commit');

  // Check if hook already exists and is custom
  if (fs.existsSync(preCommitPath)) {
    const existing = fs.readFileSync(preCommitPath, 'utf-8');
    if (!existing.includes('setup-hooks.mjs')) {
      console.log('Custom pre-commit hook exists, not overwriting');
      console.log('To use route validation, add this to your hook:');
      console.log('  npm run validate-routes');
      return;
    }
  }

  // Write the hook
  fs.writeFileSync(preCommitPath, preCommitHook, { mode: 0o755 });
  console.log('Pre-commit hook installed successfully');
}

setupHooks();
