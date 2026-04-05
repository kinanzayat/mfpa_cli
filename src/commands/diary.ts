import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { AuthManager } from '../lib/auth';
import { DiaryHTMLScraper } from '../lib/scraper';
import { parseDate, truncateText, formatNumber } from '../lib/utils';

export function setupDiaryCommand(program: Command): void {
  program
    .command('diary [date]')
    .description('Show detailed food diary with individual food items')
    .option('--json', 'Output in JSON format')
    .action(async (date?: string, options?: { json?: boolean }) => {
      try {
        const targetDate = parseDate(date);
        
        const authManager = new AuthManager();
        authManager.loadConfig();
        
        if (!authManager.loadConfig()) {
          console.error(chalk.red('❌ No configuration found. Run "mfp setup" first.'));
          process.exit(1);
        }
        
        console.log(chalk.blue(`📖 Food Diary for ${targetDate}`));
        
        const scraper = new DiaryHTMLScraper(authManager);
        const diaryData = await scraper.scrapeDiaryData(targetDate);
        
        if (options?.json) {
          console.log(JSON.stringify(diaryData, null, 2));
          return;
        }
        
        // Display each meal
        for (const meal of diaryData.meals) {
          console.log(chalk.cyan(`\n${meal.name.toUpperCase()}`));
          
          if (meal.foods.length === 0) {
            console.log(chalk.gray('  No foods logged'));
            continue;
          }
          
          const table = new Table({
            head: [
              chalk.white('Food'),
              chalk.white('Cal'),
              chalk.white('Carbs'),
              chalk.white('Fat'),
              chalk.white('Protein'),
              chalk.white('Sodium'),
              chalk.white('Sugar')
            ],
            colWidths: [35, 8, 8, 8, 8, 8, 8]
          });
          
          // Add food entries
          for (const food of meal.foods) {
            table.push([
              truncateText(food.name, 32),
              formatNumber(food.calories),
              `${food.carbs}g`,
              `${food.fat}g`,
              `${food.protein}g`,
              `${food.sodium}mg`,
              `${food.sugar}g`
            ]);
          }
          
          // Add meal totals
          table.push([
            chalk.bold('TOTAL'),
            chalk.bold(formatNumber(meal.totals.calories)),
            chalk.bold(`${meal.totals.carbs}g`),
            chalk.bold(`${meal.totals.fat}g`),
            chalk.bold(`${meal.totals.protein}g`),
            chalk.bold(`${meal.totals.sodium}mg`),
            chalk.bold(`${meal.totals.sugar}g`)
          ]);
          
          console.log(table.toString());
        }
        
        // Display daily summary
        console.log(chalk.magenta('\nDAILY SUMMARY'));
        
        const summaryTable = new Table({
          head: [
            chalk.white(''),
            chalk.white('Calories'),
            chalk.white('Carbs'),
            chalk.white('Fat'),
            chalk.white('Protein'),
            chalk.white('Sodium'),
            chalk.white('Sugar')
          ]
        });
        
        summaryTable.push([
          chalk.blue('Total'),
          formatNumber(diaryData.dailyTotals.calories),
          `${diaryData.dailyTotals.carbs}g`,
          `${diaryData.dailyTotals.fat}g`,
          `${diaryData.dailyTotals.protein}g`,
          `${diaryData.dailyTotals.sodium}mg`,
          `${diaryData.dailyTotals.sugar}g`
        ]);
        
        summaryTable.push([
          chalk.yellow('Goal'),
          formatNumber(diaryData.goals.calories),
          `${diaryData.goals.carbs}g`,
          `${diaryData.goals.fat}g`,
          `${diaryData.goals.protein}g`,
          `${diaryData.goals.sodium}mg`,
          `${diaryData.goals.sugar}g`
        ]);
        
        // Calculate remaining (can be negative)
        const remaining = {
          calories: diaryData.goals.calories - diaryData.dailyTotals.calories,
          carbs: diaryData.goals.carbs - diaryData.dailyTotals.carbs,
          fat: diaryData.goals.fat - diaryData.dailyTotals.fat,
          protein: diaryData.goals.protein - diaryData.dailyTotals.protein,
          sodium: diaryData.goals.sodium - diaryData.dailyTotals.sodium,
          sugar: diaryData.goals.sugar - diaryData.dailyTotals.sugar
        };
        
        summaryTable.push([
          remaining.calories >= 0 ? chalk.green('Remaining') : chalk.red('Over'),
          remaining.calories >= 0 ? 
            chalk.green(formatNumber(remaining.calories)) : 
            chalk.red(formatNumber(Math.abs(remaining.calories))),
          remaining.carbs >= 0 ? 
            chalk.green(`${remaining.carbs}g`) : 
            chalk.red(`${Math.abs(remaining.carbs)}g`),
          remaining.fat >= 0 ? 
            chalk.green(`${remaining.fat}g`) : 
            chalk.red(`${Math.abs(remaining.fat)}g`),
          remaining.protein >= 0 ? 
            chalk.green(`${remaining.protein}g`) : 
            chalk.red(`${Math.abs(remaining.protein)}g`),
          remaining.sodium >= 0 ? 
            chalk.green(`${remaining.sodium}mg`) : 
            chalk.red(`${Math.abs(remaining.sodium)}mg`),
          remaining.sugar >= 0 ? 
            chalk.green(`${remaining.sugar}g`) : 
            chalk.red(`${Math.abs(remaining.sugar)}g`)
        ]);
        
        console.log(summaryTable.toString());
        
        // Show progress percentages
        console.log('\n' + chalk.gray('Progress towards goals:'));
        const caloriesPercent = diaryData.goals.calories > 0 ? 
          Math.round((diaryData.dailyTotals.calories / diaryData.goals.calories) * 100) : 0;
        const proteinPercent = diaryData.goals.protein > 0 ? 
          Math.round((diaryData.dailyTotals.protein / diaryData.goals.protein) * 100) : 0;
        const carbsPercent = diaryData.goals.carbs > 0 ? 
          Math.round((diaryData.dailyTotals.carbs / diaryData.goals.carbs) * 100) : 0;
        const fatPercent = diaryData.goals.fat > 0 ? 
          Math.round((diaryData.dailyTotals.fat / diaryData.goals.fat) * 100) : 0;
        
        console.log(chalk.gray(`  Calories: ${caloriesPercent}% | Protein: ${proteinPercent}% | Carbs: ${carbsPercent}% | Fat: ${fatPercent}%`));
        
      } catch (error: any) {
        console.error(chalk.red('❌ Error fetching diary:'), error.message);
        process.exit(1);
      }
    });
}