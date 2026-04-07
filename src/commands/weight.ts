import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { AuthManager } from '../lib/auth';
import { MFPApiClient } from '../lib/api';
import { parseDate, formatDate } from '../lib/utils';

export function setupWeightCommand(program: Command): void {
  const weightCmd = program
    .command('weight')
    .description('View and log weight measurements');
  
  // Show weight entries
  weightCmd
    .command('show [date]')
    .description('Show weight entries (default: all entries)')
    .option('--json', 'Output in JSON format')
    .action(async (date?: string, options?: { json?: boolean }) => {
      try {
        const authManager = new AuthManager();
        authManager.loadConfig();
        
        if (!authManager.loadConfig()) {
          console.error(chalk.red('❌ No configuration found. Run "mfp setup" first.'));
          process.exit(1);
        }
        
        const apiClient = new MFPApiClient(authManager);
        const measurements = await apiClient.getMeasurements();
        
        if (options?.json) {
          console.log(JSON.stringify(measurements, null, 2));
          return;
        }
        
        if (measurements.items.length === 0) {
          console.log(chalk.yellow('📊 No weight entries found'));
          return;
        }
        
        console.log(chalk.blue('📊 Weight Measurements'));
        
        // Filter by date if provided
        let filteredItems = measurements.items.filter(item => item.type === 'Weight');
        
        if (date) {
          const targetDate = parseDate(date);
          filteredItems = filteredItems.filter(item => item.date === targetDate);
          
          if (filteredItems.length === 0) {
            console.log(chalk.yellow(`No weight entries found for ${targetDate}`));
            return;
          }
        }
        
        // Sort by date (newest first)
        filteredItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        const table = new Table({
          head: [
            chalk.white('Date'),
            chalk.white('Weight'),
            chalk.white('Unit'),
            chalk.white('Change')
          ],
          colWidths: [12, 10, 8, 12]
        });
        
        for (let i = 0; i < filteredItems.length; i++) {
          const entry = filteredItems[i];
          let change = '';
          
          // Calculate change from previous entry
          if (i < filteredItems.length - 1) {
            const prevEntry = filteredItems[i + 1];
            const diff = entry.value - prevEntry.value;
            
            if (Math.abs(diff) > 0.1) { // Only show if significant change
              if (diff > 0) {
                change = chalk.red(`+${diff.toFixed(1)} ${entry.unit}`);
              } else {
                change = chalk.green(`${diff.toFixed(1)} ${entry.unit}`);
              }
            } else {
              change = chalk.gray('~');
            }
          }
          
          table.push([
            entry.date,
            `${entry.value}`,
            entry.unit,
            change
          ]);
        }
        
        console.log(table.toString());
        
        if (filteredItems.length > 1) {
          const latest = filteredItems[0];
          const oldest = filteredItems[filteredItems.length - 1];
          const totalChange = latest.value - oldest.value;
          const daysDiff = Math.abs(new Date(latest.date).getTime() - new Date(oldest.date).getTime()) / (1000 * 60 * 60 * 24);
          
          console.log(chalk.gray('\nSummary:'));
          console.log(chalk.gray(`  Total entries: ${filteredItems.length}`));
          console.log(chalk.gray(`  Date range: ${oldest.date} to ${latest.date} (${Math.round(daysDiff)} days)`));
          
          if (Math.abs(totalChange) > 0.1) {
            const changeColor = totalChange > 0 ? chalk.red : chalk.green;
            console.log(chalk.gray(`  Total change: ${changeColor(`${totalChange > 0 ? '+' : ''}${totalChange.toFixed(1)} ${latest.unit}`)}`));
          }
        }
        
      } catch (error: any) {
        console.error(chalk.red('❌ Error fetching weight data:'), error.message);
        process.exit(1);
      }
    });
  
  // Log new weight entry
  weightCmd
    .command('log <value> [unit]')
    .description('Log a new weight entry (unit: kg or lbs, default: kg)')
    .action(async (value: string, unit: string = 'kg') => {
      try {
        const weight = parseFloat(value);
        if (isNaN(weight) || weight <= 0) {
          console.error(chalk.red('❌ Invalid weight value. Please provide a positive number.'));
          process.exit(1);
        }
        
        if (!['kg', 'lbs', 'kilograms', 'pounds'].includes(unit.toLowerCase())) {
          console.error(chalk.red('❌ Invalid unit. Use "kg" or "lbs".'));
          process.exit(1);
        }
        
        // Normalize unit
        const normalizedUnit = unit.toLowerCase() === 'lbs' || unit.toLowerCase() === 'pounds' ? 'pounds' : 'kilograms';
        const targetDate = formatDate(new Date());

        const authManager = new AuthManager();
        authManager.loadConfig();

        if (!authManager.loadConfig()) {
          console.error(chalk.red('❌ No configuration found. Run "mfp setup" first.'));
          process.exit(1);
        }

        const apiClient = new MFPApiClient(authManager);
        const existing = await apiClient.getMeasurements();
        const existingToday = existing.items.find(item => item.type === 'Weight' && item.date === targetDate);

        const result = existingToday
          ? await apiClient.updateMeasurement(weight, normalizedUnit, targetDate)
          : await apiClient.createMeasurement(weight, normalizedUnit, targetDate);

        const saved = result.items.find(item => item.type === 'Weight' && item.date === targetDate) || result.items[0];
        console.log(chalk.green(`✅ Logged weight for ${targetDate}: ${saved.value} ${saved.unit}`));
        if (saved.value !== weight) {
          console.log(chalk.yellow(`ℹ️  MFP stored ${saved.value} instead of ${weight} (likely rounding by the platform).`));
        }
        
      } catch (error: any) {
        console.error(chalk.red('❌ Error logging weight:'), error.message);
        process.exit(1);
      }
    });
  
  // Default weight command shows recent entries
  weightCmd.action(async (options?: { json?: boolean }) => {
    try {
      const authManager = new AuthManager();
      authManager.loadConfig();
      
      if (!authManager.loadConfig()) {
        console.error(chalk.red('❌ No configuration found. Run "mfp setup" first.'));
        process.exit(1);
      }
      
      const apiClient = new MFPApiClient(authManager);
      const measurements = await apiClient.getMeasurements();
      
      const weightEntries = measurements.items.filter(item => item.type === 'Weight');
      
      if (weightEntries.length === 0) {
        console.log(chalk.yellow('📊 No weight entries found'));
        console.log('\nTo log your weight:');
        console.log(chalk.cyan('  mfp weight log <value> [unit]'));
        console.log(chalk.gray('  Example: mfp weight log 70.5 kg'));
        return;
      }
      
      // Show latest entry
      const latest = weightEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      
      console.log(chalk.blue('📊 Latest Weight Entry'));
      console.log(chalk.green(`  ${latest.value} ${latest.unit} (${latest.date})`));
      
      if (weightEntries.length > 1) {
        console.log(chalk.gray(`\nTotal entries: ${weightEntries.length}`));
        console.log('\nTo see all entries:');
        console.log(chalk.cyan('  mfp weight show'));
      }
      
    } catch (error: any) {
      console.error(chalk.red('❌ Error fetching weight data:'), error.message);
      process.exit(1);
    }
  });
}