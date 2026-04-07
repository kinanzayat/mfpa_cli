import { Command } from 'commander';
import chalk from 'chalk';
import { AuthManager } from '../lib/auth';
import { MFPWebClient } from '../lib/web';
import { parseDate } from '../lib/utils';

const MEAL_MAP: Record<string, string> = {
  breakfast: '0',
  lunch: '1',
  dinner: '2',
  snacks: '3',
  snack: '3',
};

export function setupDiaryAddCommand(program: Command): void {
  program
    .command('diary-add <query>')
    .description('Add a food to your diary using the authenticated web flow')
    .requiredOption('--meal <meal>', 'Meal name: breakfast, lunch, dinner, snacks')
    .option('--date <date>', 'Target date (default: today)', 'today')
    .option('--qty <quantity>', 'Quantity / number of servings (default: 1)', '1')
    .option('--result <number>', '1-based search result index (default: 1)', '1')
    .option('--weight-id <id>', 'Explicit weight_id to use')
    .option('--json', 'Output JSON')
    .action(async (query: string, options?: { meal?: string; date?: string; qty?: string; result?: string; weightId?: string; json?: boolean }) => {
      try {
        const targetDate = parseDate(options?.date);
        const mealKey = (options?.meal || '').toLowerCase().trim();
        const mealId = MEAL_MAP[mealKey];

        if (!mealId) {
          throw new Error('Invalid meal. Use breakfast, lunch, dinner, or snacks.');
        }

        const authManager = new AuthManager();
        if (!authManager.loadConfig()) {
          throw new Error('No configuration found. Run "mfp setup" first.');
        }

        const webClient = new MFPWebClient(authManager);
        const result = await webClient.addFoodFromSearch({
          query,
          mealId,
          date: targetDate,
          quantity: options?.qty || '1',
          resultIndex: parseInt(options?.result || '1', 10),
          weightId: options?.weightId,
        });

        if (options?.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        console.log(chalk.green('✅ Food added to diary'));
        console.log(chalk.white(`  Food: ${result.description}`));
        console.log(chalk.gray(`  Date: ${result.date}`));
        console.log(chalk.gray(`  Meal: ${mealKey}`));
        console.log(chalk.gray(`  Quantity: ${result.quantity}`));
        console.log(chalk.gray(`  weight_id: ${result.weightId}`));
        console.log(chalk.gray(`  food_id: ${result.originalFoodId}`));
      } catch (error: any) {
        console.error(chalk.red('❌ Error adding food to diary:'), error.message);
        process.exit(1);
      }
    });
}
