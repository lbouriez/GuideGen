/**
 * Display utilities for CLI output
 */

import chalk from 'chalk';
import ora, { type Ora } from 'ora';

export const colors = {
  title: chalk.bold.cyan,
  subtitle: chalk.bold.white,
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.blue,
  muted: chalk.gray,
  highlight: chalk.bold.magenta,
  code: chalk.cyan,
};

export function printHeader(): void {
  console.log();
  console.log(colors.title('╔════════════════════════════════════════════╗'));
  console.log(colors.title('║              GuideGen v0.1.0               ║'));
  console.log(colors.title('║    AI-Powered Guideline Generator          ║'));
  console.log(colors.title('╚════════════════════════════════════════════╝'));
  console.log();
}

export function printPhase(phase: number, name: string): void {
  console.log();
  console.log(colors.subtitle(`━━━ Phase ${phase}: ${name} ━━━`));
  console.log();
}

export function printSuccess(message: string): void {
  console.log(colors.success(`✓ ${message}`));
}

export function printError(message: string): void {
  console.log(colors.error(`✗ ${message}`));
}

export function printWarning(message: string): void {
  console.log(colors.warning(`⚠ ${message}`));
}

export function printInfo(message: string): void {
  console.log(colors.info(`ℹ ${message}`));
}

export function printMuted(message: string): void {
  console.log(colors.muted(`  ${message}`));
}

export function printList(items: string[], prefix: string = '•'): void {
  items.forEach((item) => {
    console.log(colors.muted(`  ${prefix} ${item}`));
  });
}

export function printKeyValue(key: string, value: string): void {
  console.log(`  ${colors.muted(key + ':')} ${value}`);
}

export function printSection(title: string): void {
  console.log();
  console.log(colors.highlight(`▸ ${title}`));
}

export function printCode(code: string): void {
  console.log(colors.code(`  ${code}`));
}

export function printDivider(): void {
  console.log(colors.muted('─'.repeat(50)));
}

// Track active spinners to allow stopping all of them
const activeSpinners = new Set<Ora>();

export function createSpinner(text: string): Ora {
  const spinner = ora({
    text,
    color: 'cyan',
  });

  // Track this spinner
  activeSpinners.add(spinner);

  // Override stop method to remove from tracking
  const originalStop = spinner.stop.bind(spinner);
  spinner.stop = () => {
    activeSpinners.delete(spinner);
    return originalStop();
  };

  // Override succeed/fail/warn to also remove from tracking
  const originalSucceed = spinner.succeed.bind(spinner);
  spinner.succeed = (text?: string) => {
    activeSpinners.delete(spinner);
    return originalSucceed(text);
  };

  const originalFail = spinner.fail.bind(spinner);
  spinner.fail = (text?: string) => {
    activeSpinners.delete(spinner);
    return originalFail(text);
  };

  const originalWarn = spinner.warn.bind(spinner);
  spinner.warn = (text?: string) => {
    activeSpinners.delete(spinner);
    return originalWarn(text);
  };

  return spinner;
}

/**
 * Stop all active spinners - useful before showing interactive prompts
 */
export function stopAllSpinners(): void {
  activeSpinners.forEach(spinner => {
    if (spinner.isSpinning) {
      spinner.stop();
    }
  });
  activeSpinners.clear();
}

export function printSummary(
  title: string,
  items: Record<string, string | number | boolean | string[]>
): void {
  printSection(title);
  for (const [key, value] of Object.entries(items)) {
    if (Array.isArray(value)) {
      console.log(`  ${colors.muted(key + ':')} ${value.join(', ') || 'none'}`);
    } else {
      console.log(`  ${colors.muted(key + ':')} ${value}`);
    }
  }
}

export function printArtifactPreview(
  name: string,
  path: string,
  preview: string
): void {
  console.log();
  console.log(colors.subtitle(`📄 ${name}`));
  console.log(colors.muted(`   Path: ${path}`));
  console.log(colors.muted('   Preview:'));
  const lines = preview.split('\n').slice(0, 5);
  lines.forEach((line) => {
    console.log(colors.code(`   │ ${line}`));
  });
  if (preview.split('\n').length > 5) {
    console.log(colors.muted('   │ ...'));
  }
}
