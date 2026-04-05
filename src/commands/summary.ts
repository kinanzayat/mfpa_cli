import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { AuthManager } from '../lib/auth';
import { MFPApiClient } from '../lib/api';
import { DiaryHTMLScraper } from '../lib/scraper';
import { parseDate, formatNumber, getGoalColor, formatGoalPercentage, createProgressBar } from '../lib/utils';

export function setupSummaryCommand(program: Command): void {
  program
    .command('summary [date]')
    .description('Show daily nutrition summary with goals')
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
        
        console.log(chalk.blue(`📊 Nutrition Summary for ${targetDate}`));
        
        // Get data from both API and HTML scraping
        const apiClient = new MFPApiClient(authManager);
        const scraper = new DiaryHTMLScraper(authManager);
        
        // Get meal-level data from API
        const diaryData = await apiClient.getDiary(targetDate);
        
        // Get goals from HTML scraping (not available in API)
        const htmlData = await scraper.scrapeDiaryData(targetDate);
        const goals = htmlData.goals;
        
        if (options?.json) {
          const output = {
            date: targetDate,
            meals: diaryData.items,
            goals: goals,
            totals: calculateTotals(diaryData.items)
          };
          console.log(JSON.stringify(output, null, 2));
          return;
        }
        
        // Calculate daily totals from API data
        const totals = calculateTotals(diaryData.items);
        
        // Show meal breakdown
        if (diaryData.items.length > 0) {
          console.log(chalk.cyan('\nMEAL BREAKDOWN'));
          
          const mealTable = new Table({
            head: [
              chalk.white('Meal'),
              chalk.white('Calories'),
              chalk.white('Carbs'),
              chalk.white('Fat'),
              chalk.white('Protein')
            ],
            colWidths: [15, 12, 10, 10, 10]
          });
          
          for (const meal of diaryData.items) {
            const nutrition = meal.nutritional_contents;
            mealTable.push([
              meal.diary_meal,
              formatNumber(nutrition.energy.value),
              `${nutrition.carbohydrates.toFixed(1)}g`,
              `${nutrition.fat.toFixed(1)}g`,
              `${nutrition.protein.toFixed(1)}g`
            ]);
          }
          
          console.log(mealTable.toString());
        }
        
        // Show daily summary vs goals
        console.log(chalk.magenta('\nDAILY TOTALS VS GOALS'));
        
        const summaryTable = new Table({
          head: [
            chalk.white('Nutrient'),
            chalk.white('Current'),
            chalk.white('Goal'),
            chalk.white('Remaining'),
            chalk.white('Progress'),
            chalk.white('% Goal')
          ],
          colWidths: [12, 12, 12, 12, 22, 10]
        });
        
        // Calories
        const caloriesRemaining = goals.calories - totals.calories;
        summaryTable.push([
          'Calories',
          getGoalColor(totals.calories, goals.calories)(formatNumber(totals.calories)),
          formatNumber(goals.calories),
          caloriesRemaining >= 0 ? 
            chalk.green(formatNumber(caloriesRemaining)) : 
            chalk.red(`-${formatNumber(Math.abs(caloriesRemaining))}`),
          createProgressBar(totals.calories, goals.calories),
          getGoalColor(totals.calories, goals.calories)(formatGoalPercentage(totals.calories, goals.calories))
        ]);
        
        // Carbs
        const carbsRemaining = goals.carbs - totals.carbs;
        summaryTable.push([
          'Carbs',
          getGoalColor(totals.carbs, goals.carbs)(`${totals.carbs.toFixed(1)}g`),
          `${goals.carbs}g`,
          carbsRemaining >= 0 ? 
            chalk.green(`${carbsRemaining.toFixed(1)}g`) : 
            chalk.red(`-${Math.abs(carbsRemaining).toFixed(1)}g`),
          createProgressBar(totals.carbs, goals.carbs),
          getGoalColor(totals.carbs, goals.carbs)(formatGoalPercentage(totals.carbs, goals.carbs))
        ]);
        
        // Fat
        const fatRemaining = goals.fat - totals.fat;
        summaryTable.push([
          'Fat',
          getGoalColor(totals.fat, goals.fat)(`${totals.fat.toFixed(1)}g`),
          `${goals.fat}g`,
          fatRemaining >= 0 ? 
            chalk.green(`${fatRemaining.toFixed(1)}g`) : 
            chalk.red(`-${Math.abs(fatRemaining).toFixed(1)}g`),
          createProgressBar(totals.fat, goals.fat),
          getGoalColor(totals.fat, goals.fat)(formatGoalPercentage(totals.fat, goals.fat))
        ]);
        
        // Protein
        const proteinRemaining = goals.protein - totals.protein;
        summaryTable.push([
          'Protein',
          getGoalColor(totals.protein, goals.protein)(`${totals.protein.toFixed(1)}g`),
          `${goals.protein}g`,
          proteinRemaining >= 0 ? 
            chalk.green(`${proteinRemaining.toFixed(1)}g`) : 
            chalk.red(`-${Math.abs(proteinRemaining).toFixed(1)}g`),
          createProgressBar(totals.protein, goals.protein),
          getGoalColor(totals.protein, goals.protein)(formatGoalPercentage(totals.protein, goals.protein))
        ]);
        
        // Sodium
        const sodiumRemaining = goals.sodium - totals.sodium;
        summaryTable.push([
          'Sodium',
          getGoalColor(totals.sodium, goals.sodium)(`${totals.sodium.toFixed(0)}mg`),
          `${goals.sodium}mg`,
          sodiumRemaining >= 0 ? 
            chalk.green(`${sodiumRemaining.toFixed(0)}mg`) : 
            chalk.red(`-${Math.abs(sodiumRemaining).toFixed(0)}mg`),
          createProgressBar(totals.sodium, goals.sodium),
          getGoalColor(totals.sodium, goals.sodium)(formatGoalPercentage(totals.sodium, goals.sodium))
        ]);
        
        console.log(summaryTable.toString());
        
        // Overall assessment
        const caloriesPercent = (totals.calories / goals.calories) * 100;
        const proteinPercent = (totals.protein / goals.protein) * 100;
        
        console.log(chalk.gray('\nDaily Assessment:'));
        
        if (caloriesPercent < 70) {
          console.log(chalk.red('⚠️  Low calorie intake - consider eating more'));
        } else if (caloriesPercent > 110) {
          console.log(chalk.yellow('⚠️  High calorie intake - above goal'));
        } else {
          console.log(chalk.green('✅ Calorie intake is within target range'));
        }
        
        if (proteinPercent < 70) {
          console.log(chalk.red('⚠️  Low protein intake - consider adding protein sources'));
        } else if (proteinPercent >= 90) {
          console.log(chalk.green('✅ Excellent protein intake'));
        }
        
      } catch (error: any) {
        console.error(chalk.red('❌ Error fetching summary:'), error.message);
        process.exit(1);
      }
    });
}

function calculateTotals(meals: any[]): {
  calories: number;
  carbs: number;
  fat: number;
  protein: number;
  sodium: number;
  sugar: number;
} {
  return meals.reduce((totals, meal) => {
    const nutrition = meal.nutritional_contents;
    return {
      calories: totals.calories + nutrition.energy.value,
      carbs: totals.carbs + nutrition.carbohydrates,
      fat: totals.fat + nutrition.fat,
      protein: totals.protein + nutrition.protein,
      sodium: totals.sodium + nutrition.sodium,
      sugar: totals.sugar + nutrition.sugar
    };
  }, {
    calories: 0,
    carbs: 0,
    fat: 0,
    protein: 0,
    sodium: 0,
    sugar: 0
  });
}