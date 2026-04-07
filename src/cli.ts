#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { setupSetupCommand } from './commands/setup';
import { setupDiaryCommand } from './commands/diary';
import { setupSummaryCommand } from './commands/summary';
import { setupWeightCommand } from './commands/weight';
import { setupWeekCommand } from './commands/week';
import { setupSearchCommand } from './commands/search';
import { setupDiaryAddCommand } from './commands/diary-add';
import { setupDiaryRemoveCommand } from './commands/diary-remove';
import { setupDiaryFrequentCommand } from './commands/diary-frequent';

const program = new Command();

program
  .name('mfp')
  .description(chalk.blue('Unofficial MyFitnessPal CLI for accessing your diary data, weight logs, and nutrition summaries'))
  .version('1.0.0');

// Set up all commands
setupSetupCommand(program);
setupDiaryCommand(program);
setupSummaryCommand(program);
setupWeightCommand(program);
setupWeekCommand(program);
setupSearchCommand(program);
setupDiaryAddCommand(program);
setupDiaryRemoveCommand(program);
setupDiaryFrequentCommand(program);

// Add help examples
program.on('--help', () => {
  console.log('');
  console.log(chalk.cyan('Examples:'));
  console.log('  $ mfp setup                    # Set up authentication');
  console.log('  $ mfp summary                  # Today\'s nutrition summary');
  console.log('  $ mfp diary                    # Today\'s detailed food diary');
  console.log('  $ mfp diary 2024-03-15         # Diary for specific date');
  console.log('  $ mfp week                     # This week\'s nutrition summary');
  console.log('  $ mfp weight                   # Latest weight entry');
  console.log('  $ mfp weight show              # All weight entries');
  console.log('  $ mfp weight log 70.5 kg       # Log new weight');
  console.log('  $ mfp search "chicken breast"  # Search for foods');
  console.log('  $ mfp diary-add "biscoff" --meal snacks --qty 1   # Add food to diary');
  console.log('  $ mfp diary-remove 12619810555 --date 2026-04-07 # Remove diary entry');
  console.log('  $ mfp diary-frequent 14 --meal snacks            # See recurring foods');
  console.log('');
  console.log(chalk.cyan('Authentication:'));
  console.log('  Before using any commands, run "mfp setup" to configure your');
  console.log('  MyFitnessPal session cookies for authentication.');
  console.log('');
  console.log(chalk.cyan('Date Formats:'));
  console.log('  • YYYY-MM-DD (e.g., 2024-03-15)');
  console.log('  • "today" or "yesterday"');
  console.log('  • If no date provided, defaults to today');
  console.log('');
  console.log(chalk.cyan('JSON Output:'));
  console.log('  Add --json flag to any command for machine-readable output');
  console.log('');
});

// Handle unknown commands
program.on('command:*', () => {
  console.error(chalk.red(`❌ Unknown command: ${program.args.join(' ')}`));
  console.log('');
  console.log('Run ' + chalk.cyan('mfp --help') + ' to see available commands.');
  process.exit(1);
});

// Show help if no command provided
if (process.argv.length === 2) {
  program.outputHelp();
  process.exit(0);
}

// Parse command line arguments
program.parse();