import { Command } from 'commander';
import chalk from 'chalk';
import { AuthManager } from '../lib/auth';
import { MFPWebClient } from '../lib/web';
import { parseDate } from '../lib/utils';

export function setupDiaryRemoveCommand(program: Command): void {
  program
    .command('diary-remove <entryId>')
    .description('Remove a diary entry by entry id using the authenticated web flow')
    .option('--date <date>', 'Diary date for CSRF context (default: today)', 'today')
    .action(async (entryId: string, options?: { date?: string }) => {
      try {
        const authManager = new AuthManager();
        if (!authManager.loadConfig()) {
          throw new Error('No configuration found. Run "mfp setup" first.');
        }

        const webClient = new MFPWebClient(authManager);
        await webClient.removeFoodEntry(entryId, parseDate(options?.date));
        console.log(chalk.green(`✅ Removed diary entry ${entryId}`));
      } catch (error: any) {
        console.error(chalk.red('❌ Error removing diary entry:'), error.message);
        process.exit(1);
      }
    });
}
