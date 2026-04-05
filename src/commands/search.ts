import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { AuthManager } from '../lib/auth';
import { MFPApiClient } from '../lib/api';
import { truncateText, formatNumber } from '../lib/utils';

export function setupSearchCommand(program: Command): void {
  program
    .command('search <query>')
    .description('Search for food items')
    .option('--json', 'Output in JSON format')
    .option('--limit <number>', 'Maximum number of results to show (default: 10)', '10')
    .action(async (query: string, options?: { json?: boolean; limit?: string }) => {
      try {
        if (!query || query.trim().length === 0) {
          console.error(chalk.red('❌ Please provide a search query.'));
          console.log('\nExample:');
          console.log(chalk.cyan('  mfp search "chicken breast"'));
          process.exit(1);
        }
        
        const authManager = new AuthManager();
        authManager.loadConfig();
        
        if (!authManager.loadConfig()) {
          console.error(chalk.red('❌ No configuration found. Run "mfp setup" first.'));
          process.exit(1);
        }
        
        console.log(chalk.blue(`🔍 Searching for: "${query}"`));
        
        const apiClient = new MFPApiClient(authManager);
        const searchResults = await apiClient.searchFood(query);
        
        if (options?.json) {
          console.log(JSON.stringify(searchResults, null, 2));
          return;
        }
        
        if (searchResults.items.length === 0) {
          console.log(chalk.yellow('❌ No results found.'));
          console.log('\nTips:');
          console.log('- Try broader search terms (e.g., "chicken" instead of "grilled chicken breast")');
          console.log('- Check spelling');
          console.log('- Try brand names or common food names');
          return;
        }
        
        const limit = parseInt(options?.limit || '10');
        const itemsToShow = searchResults.items.slice(0, limit);
        
        console.log(chalk.green(`\n✅ Found ${searchResults.items.length} results (showing ${itemsToShow.length}):\n`));
        
        const table = new Table({
          head: [
            chalk.white('Food'),
            chalk.white('Brand'),
            chalk.white('Calories'),
            chalk.white('Carbs'),
            chalk.white('Fat'),
            chalk.white('Protein'),
            chalk.white('Per')
          ],
          colWidths: [30, 15, 10, 8, 8, 8, 10]
        });
        
        for (const result of itemsToShow) {
          const food = result.item;
          const nutrition = food.nutritional_contents;
          
          // Determine serving size info (usually in description)
          const servingInfo = getServingInfo(food.description);
          
          table.push([
            truncateText(food.description, 27),
            food.brand_name ? truncateText(food.brand_name, 12) : chalk.gray('Generic'),
            formatNumber(Math.round(nutrition.energy.value)),
            `${nutrition.carbohydrates.toFixed(1)}g`,
            `${nutrition.fat.toFixed(1)}g`,
            `${nutrition.protein.toFixed(1)}g`,
            servingInfo
          ]);
        }
        
        console.log(table.toString());
        
        // Show additional food details for top result
        if (itemsToShow.length > 0) {
          const topResult = itemsToShow[0].item;
          const nutrition = topResult.nutritional_contents;
          
          console.log(chalk.cyan('\nTop Result Details:'));
          console.log(chalk.white(`📋 ${topResult.description}`));
          if (topResult.brand_name) {
            console.log(chalk.gray(`   Brand: ${topResult.brand_name}`));
          }
          
          const detailsTable = new Table({
            head: [chalk.white('Nutrient'), chalk.white('Amount')],
            colWidths: [20, 15]
          });
          
          detailsTable.push(
            ['Calories', `${nutrition.energy.value.toFixed(1)} ${nutrition.energy.unit}`],
            ['Carbohydrates', `${nutrition.carbohydrates.toFixed(1)}g`],
            ['Fat', `${nutrition.fat.toFixed(1)}g`],
            ['Protein', `${nutrition.protein.toFixed(1)}g`],
            ['Sodium', `${nutrition.sodium.toFixed(1)}mg`],
            ['Sugar', `${nutrition.sugar.toFixed(1)}g`],
            ['Fiber', `${nutrition.fiber.toFixed(1)}g`]
          );
          
          // Add optional nutrients if present
          if (nutrition.cholesterol !== undefined) {
            detailsTable.push(['Cholesterol', `${nutrition.cholesterol.toFixed(1)}mg`]);
          }
          if (nutrition.saturated_fat !== undefined) {
            detailsTable.push(['Saturated Fat', `${nutrition.saturated_fat.toFixed(1)}g`]);
          }
          if (nutrition.potassium !== undefined) {
            detailsTable.push(['Potassium', `${nutrition.potassium.toFixed(1)}mg`]);
          }
          
          console.log(detailsTable.toString());
          
          // Show food ID for reference
          console.log(chalk.gray(`Food ID: ${topResult.id}`));
        }
        
        // Show search tips
        if (searchResults.items.length > limit) {
          console.log(chalk.gray(`\n💡 Showing ${limit} of ${searchResults.items.length} results. Use --limit to show more.`));
        }
        
        console.log(chalk.gray('\n💡 Search Tips:'));
        console.log(chalk.gray('  • Use specific terms: "apple" vs "red apple"'));
        console.log(chalk.gray('  • Include brand names: "coca cola" vs "coke"'));
        console.log(chalk.gray('  • Try different spellings or abbreviations'));
        
      } catch (error: any) {
        console.error(chalk.red('❌ Error searching for food:'), error.message);
        process.exit(1);
      }
    });
}

function getServingInfo(description: string): string {
  // Extract serving size information from description
  // Common patterns: "per 100g", "per cup", "per medium", "per slice", etc.
  
  const perMatch = description.match(/per\s+(\w+(?:\s+\w+)?)/i);
  if (perMatch) {
    return truncateText(perMatch[1], 8);
  }
  
  // Look for weight indicators
  const weightMatch = description.match(/(\d+)g/);
  if (weightMatch) {
    return `${weightMatch[1]}g`;
  }
  
  // Look for volume indicators
  const volumeMatch = description.match(/(cup|oz|ml|l)\b/i);
  if (volumeMatch) {
    return volumeMatch[1];
  }
  
  // Look for count indicators
  const countMatch = description.match(/\b(\d+\s*(?:piece|slice|item|medium|large|small))/i);
  if (countMatch) {
    return truncateText(countMatch[1], 8);
  }
  
  // Default fallback
  return 'serving';
}