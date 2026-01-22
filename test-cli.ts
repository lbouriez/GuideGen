#!/usr/bin/env node

// Minimal test to isolate the tsx issue

import { Command } from 'commander';

const program = new Command();

program
  .name('test-cli')
  .description('Test CLI')
  .version('1.0.0');

program
  .command('test')
  .description('Test command')
  .action(() => {
    console.log('Test command works!');
  });

program.parse();