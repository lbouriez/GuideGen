/**
 * Interactive prompts and user input
 */

import * as readline from 'readline';
import type { UpdateMode } from '../types/common';

/**
 * Create readline interface
 */
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Ask user a question and get response
 */
export function askQuestion(question: string): Promise<string> {
  const rl = createInterface();

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Ask user for yes/no confirmation
 */
export async function confirm(question: string, defaultYes: boolean = true): Promise<boolean> {
  const suffix = defaultYes ? ' (Y/n)' : ' (y/N)';
  const answer = await askQuestion(question + suffix + ' ');

  if (answer === '') {
    return defaultYes;
  }

  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
}

/**
 * Ask user to choose update mode
 */
export async function promptUpdateMode(existingPath: string): Promise<UpdateMode> {
  console.log(`\n⚠️  Existing files detected in: ${existingPath}\n`);
  console.log('What would you like to do?\n');
  console.log('  [O] Override  - Delete and regenerate everything (destructive)');
  console.log('  [U] Update    - Intelligently merge with existing files (recommended)');
  console.log('  [C] Cancel    - Exit without making changes\n');

  while (true) {
    const answer = await askQuestion('Your choice [O/U/C]: ');
    const choice = answer.toLowerCase();

    if (choice === 'o' || choice === 'override') {
      const confirmed = await confirm(
        '\n⚠️  This will DELETE all existing files. Are you sure?',
        false
      );
      if (confirmed) {
        return 'override';
      }
      // Loop back to ask again
      continue;
    }

    if (choice === 'u' || choice === 'update') {
      return 'update';
    }

    if (choice === 'c' || choice === 'cancel') {
      return 'cancel';
    }

    console.log('Invalid choice. Please enter O, U, or C.');
  }
}

/**
 * Show dry-run preview and ask for confirmation
 */
export async function confirmChanges(
  changesSummary: string,
  filesAffected: number
): Promise<boolean> {
  console.log('\n📋 Dry-Run Preview:');
  console.log('─'.repeat(50));
  console.log(changesSummary);
  console.log('─'.repeat(50));
  console.log(`\n${filesAffected} file(s) will be modified.\n`);

  return await confirm('Proceed with these changes?', true);
}

/**
 * Show progress bar
 */
export function showProgress(current: number, total: number, message: string) {
  const percentage = Math.round((current / total) * 100);
  const barLength = 30;
  const filledLength = Math.round((barLength * current) / total);
  const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

  process.stdout.write(`\r[${bar}] ${percentage}% ${message}`);

  if (current === total) {
    process.stdout.write('\n');
  }
}
