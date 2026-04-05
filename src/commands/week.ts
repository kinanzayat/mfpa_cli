import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { AuthManager } from '../lib/auth';
import { MFPApiClient } from '../lib/api';
import { parseDate, getWeekRange, formatDayOfWeek, formatNumber, getGoalColor } from '../lib/utils';

export function setupWeekCommand(program: Command): void {
  program
    .command('week [start-date]')
    .description('Show 7-day nutrition summary (default: this week starting today)')
    .option('--json', 'Output in JSON format')
    .action(async (startDate?: string, options?: { json?: boolean }) => {
      try {
        const start = parseDate(startDate);
        const weekRange = getWeekRange(start);
        
        const authManager = new AuthManager();
        authManager.loadConfig();
        
        if (!authManager.loadConfig()) {
          console.error(chalk.red('❌ No configuration found. Run "mfp setup" first.'));
          process.exit(1);
        }
        
        console.log(chalk.blue(`📅 Week Summary: ${weekRange.start} to ${weekRange.end}`));
        
        const apiClient = new MFPApiClient(authManager);
        
        // Get diary data for the entire week
        const weekData = await apiClient.getWeekDiary(weekRange.start);
        
        if (options?.json) {
          const output = {
            weekRange: weekRange,
            data: weekData.items
          };
          console.log(JSON.stringify(output, null, 2));
          return;
        }
        
        // Group data by date
        const dailyData: Record<string, any[]> = {};
        
        for (const date of weekRange.dates) {
          dailyData[date] = weekData.items.filter(item => item.date === date);
        }
        
        // Create summary table
        const table = new Table({
          head: [
            chalk.white('Date'),
            chalk.white('Day'),
            chalk.white('Calories'),
            chalk.white('Carbs'),
            chalk.white('Fat'),
            chalk.white('Protein'),
            chalk.white('Meals')
          ],
          colWidths: [12, 6, 10, 8, 8, 8, 7]
        });
        
        let weekTotals = {
          calories: 0,
          carbs: 0,
          fat: 0,
          protein: 0,
          meals: 0
        };
        
        for (const date of weekRange.dates) {
          const dayMeals = dailyData[date];
          const dayName = formatDayOfWeek(date);
          
          if (dayMeals.length === 0) {
            table.push([
              date,
              chalk.gray(dayName),
              chalk.gray('0'),
              chalk.gray('0g'),
              chalk.gray('0g'),
              chalk.gray('0g'),
              chalk.gray('0')
            ]);
            continue;
          }
          
          // Calculate daily totals
          const dailyTotals = dayMeals.reduce((totals, meal) => {
            const nutrition = meal.nutritional_contents;
            return {
              calories: totals.calories + nutrition.energy.value,
              carbs: totals.carbs + nutrition.carbohydrates,
              fat: totals.fat + nutrition.fat,
              protein: totals.protein + nutrition.protein
            };
          }, {
            calories: 0,
            carbs: 0,
            fat: 0,
            protein: 0
          });
          
          // Update week totals
          weekTotals.calories += dailyTotals.calories;
          weekTotals.carbs += dailyTotals.carbs;
          weekTotals.fat += dailyTotals.fat;
          weekTotals.protein += dailyTotals.protein;
          weekTotals.meals += dayMeals.length;
          
          // Color calories based on typical daily goal (2000 cal)
          const caloriesColor = getGoalColor(dailyTotals.calories, 2000);
          
          table.push([
            date,
            dayName,
            caloriesColor(formatNumber(Math.round(dailyTotals.calories))),
            `${dailyTotals.carbs.toFixed(0)}g`,
            `${dailyTotals.fat.toFixed(0)}g`,
            `${dailyTotals.protein.toFixed(0)}g`,
            dayMeals.length.toString()
          ]);
        }
        
        console.log(table.toString());
        
        // Week summary
        console.log(chalk.magenta('\nWEEK SUMMARY'));
        
        const avgCalories = weekTotals.calories / 7;
        const avgCarbs = weekTotals.carbs / 7;
        const avgFat = weekTotals.fat / 7;
        const avgProtein = weekTotals.protein / 7;
        
        const summaryTable = new Table({
          head: [
            chalk.white('Metric'),
            chalk.white('Total'),
            chalk.white('Daily Avg'),
            chalk.white('Assessment')
          ],
          colWidths: [15, 12, 12, 25]
        });
        
        summaryTable.push([
          'Calories',
          formatNumber(Math.round(weekTotals.calories)),
          formatNumber(Math.round(avgCalories)),
          getCaloriesAssessment(avgCalories)
        ]);
        
        summaryTable.push([
          'Carbohydrates',
          `${weekTotals.carbs.toFixed(0)}g`,
          `${avgCarbs.toFixed(1)}g`,
          getCarbsAssessment(avgCarbs)
        ]);
        
        summaryTable.push([
          'Fat',
          `${weekTotals.fat.toFixed(0)}g`,
          `${avgFat.toFixed(1)}g`,
          getFatAssessment(avgFat)
        ]);
        
        summaryTable.push([
          'Protein',
          `${weekTotals.protein.toFixed(0)}g`,
          `${avgProtein.toFixed(1)}g`,
          getProteinAssessment(avgProtein)
        ]);
        
        summaryTable.push([
          'Total Meals',
          weekTotals.meals.toString(),
          `${(weekTotals.meals / 7).toFixed(1)}`,
          getMealsAssessment(weekTotals.meals / 7)
        ]);
        
        console.log(summaryTable.toString());
        
        // Additional insights
        console.log(chalk.gray('\nWeek Insights:'));
        
        const daysWithData = weekRange.dates.filter(date => dailyData[date].length > 0).length;
        console.log(chalk.gray(`  Days logged: ${daysWithData}/7`));
        
        if (daysWithData < 7) {
          console.log(chalk.yellow(`  ⚠️  Missing data for ${7 - daysWithData} days`));
        }
        
        // Find highest and lowest calorie days
        const dailyCalories: { date: string; calories: number }[] = [];
        for (const date of weekRange.dates) {
          const dayMeals = dailyData[date];
          const calories = dayMeals.reduce((sum, meal) => 
            sum + meal.nutritional_contents.energy.value, 0);
          
          if (calories > 0) {
            dailyCalories.push({ date, calories });
          }
        }
        
        if (dailyCalories.length > 1) {
          const highest = dailyCalories.reduce((max, day) => 
            day.calories > max.calories ? day : max);
          const lowest = dailyCalories.reduce((min, day) => 
            day.calories < min.calories ? day : min);
          
          console.log(chalk.gray(`  Highest: ${formatNumber(Math.round(highest.calories))} cal on ${highest.date} (${formatDayOfWeek(highest.date)})`));
          console.log(chalk.gray(`  Lowest: ${formatNumber(Math.round(lowest.calories))} cal on ${lowest.date} (${formatDayOfWeek(lowest.date)})`));
        }
        
      } catch (error: any) {
        console.error(chalk.red('❌ Error fetching week summary:'), error.message);
        process.exit(1);
      }
    });
}

function getCaloriesAssessment(avgCalories: number): string {
  if (avgCalories < 1200) return chalk.red('Very low');
  if (avgCalories < 1500) return chalk.yellow('Low');
  if (avgCalories < 2500) return chalk.green('Good');
  return chalk.blue('High');
}

function getCarbsAssessment(avgCarbs: number): string {
  if (avgCarbs < 100) return chalk.yellow('Low carb');
  if (avgCarbs < 300) return chalk.green('Moderate');
  return chalk.blue('High carb');
}

function getFatAssessment(avgFat: number): string {
  if (avgFat < 30) return chalk.yellow('Low fat');
  if (avgFat < 80) return chalk.green('Moderate');
  return chalk.blue('High fat');
}

function getProteinAssessment(avgProtein: number): string {
  if (avgProtein < 50) return chalk.red('Low protein');
  if (avgProtein < 100) return chalk.yellow('Moderate');
  if (avgProtein < 150) return chalk.green('Good');
  return chalk.green('High protein');
}

function getMealsAssessment(avgMeals: number): string {
  if (avgMeals < 2) return chalk.red('Too few meals');
  if (avgMeals < 3) return chalk.yellow('Infrequent');
  if (avgMeals <= 4) return chalk.green('Good frequency');
  return chalk.blue('Frequent meals');
}