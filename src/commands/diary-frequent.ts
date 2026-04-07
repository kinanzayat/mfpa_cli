import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { AuthManager } from '../lib/auth';
import { MFPWebClient } from '../lib/web';
import { parseDate, truncateText } from '../lib/utils';

function normalizeFoodName(name: string): string {
  return name
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function setupDiaryFrequentCommand(program: Command): void {
  program
    .command('diary-frequent [days]')
    .description('Show the most frequent diary items from the last N days using authenticated diary HTML (default: 14)')
    .option('--date <date>', 'End date (default: today)', 'today')
    .option('--meal <meal>', 'Filter to a meal: breakfast, lunch, dinner, snacks')
    .option('--limit <number>', 'Max rows (default: 15)', '15')
    .option('--json', 'Output JSON')
    .action(async (daysArg?: string, options?: { date?: string; meal?: string; limit?: string; json?: boolean }) => {
      try {
        const days = Math.max(1, parseInt(daysArg || '14', 10));
        const endDate = parseDate(options?.date);
        const mealFilter = options?.meal?.toLowerCase().trim();
        const limit = Math.max(1, parseInt(options?.limit || '15', 10));

        const authManager = new AuthManager();
        if (!authManager.loadConfig()) {
          throw new Error('No configuration found. Run "mfp setup" first.');
        }

        const webClient = new MFPWebClient(authManager);
        const entries = await webClient.getRecentDiaryEntries(days, endDate);
        const filtered = mealFilter
          ? entries.filter(entry => entry.meal.toLowerCase() === mealFilter)
          : entries;

        const grouped = new Map<string, { name: string; meal: string; count: number; latestDate: string; latestId: string }>();
        for (const entry of filtered) {
          const name = normalizeFoodName(entry.name);
          const key = `${entry.meal}::${name}`;
          const existing = grouped.get(key);
          if (!existing) {
            grouped.set(key, { name, meal: entry.meal, count: 1, latestDate: entry.date, latestId: entry.id });
          } else {
            existing.count += 1;
            if (entry.date > existing.latestDate) {
              existing.latestDate = entry.date;
              existing.latestId = entry.id;
            }
          }
        }

        const rows = [...grouped.values()].sort((a, b) => b.count - a.count || b.latestDate.localeCompare(a.latestDate));

        if (options?.json) {
          console.log(JSON.stringify({ endDate, days, totalEntries: filtered.length, items: rows }, null, 2));
          return;
        }

        console.log(chalk.blue(`📚 Frequent diary items from the last ${days} day(s) ending ${endDate}`));
        if (mealFilter) {
          console.log(chalk.gray(`Meal filter: ${mealFilter}`));
        }

        if (rows.length === 0) {
          console.log(chalk.yellow('No diary items found for that range.'));
          return;
        }

        const table = new Table({
          head: [chalk.white('Meal'), chalk.white('Food'), chalk.white('Count'), chalk.white('Last Seen'), chalk.white('Entry ID')],
          colWidths: [12, 52, 8, 12, 14],
          wordWrap: true,
        });

        for (const row of rows.slice(0, limit)) {
          table.push([
            row.meal,
            truncateText(row.name, 49),
            String(row.count),
            row.latestDate,
            row.latestId,
          ]);
        }

        console.log(table.toString());
        console.log(chalk.gray('\nTip: use this to spot recurring foods before adding new CLI shortcuts or presets.'));
      } catch (error: any) {
        console.error(chalk.red('❌ Error fetching frequent diary items:'), error.message);
        process.exit(1);
      }
    });
}
