import chalk from 'chalk';

/**
 * Format a date to YYYY-MM-DD string
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parse date string or return today if not provided
 */
export function parseDate(dateString?: string): string {
  if (!dateString) {
    return formatDate(new Date());
  }
  
  // Handle various date formats
  if (dateString.toLowerCase() === 'today') {
    return formatDate(new Date());
  }
  
  if (dateString.toLowerCase() === 'yesterday') {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return formatDate(yesterday);
  }
  
  // Try to parse the date
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateString}. Use YYYY-MM-DD, 'today', or 'yesterday'.`);
  }
  
  return formatDate(date);
}

/**
 * Format a number with commas
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Format nutrition value with unit
 */
export function formatNutrition(value: number, unit: string, precision: number = 1): string {
  return `${value.toFixed(precision)}${unit}`;
}

/**
 * Get color based on percentage of goal achieved
 */
export function getGoalColor(current: number, goal: number): chalk.ChalkFunction {
  if (goal === 0) return chalk.gray;
  
  const percentage = (current / goal) * 100;
  
  if (percentage < 70) return chalk.red;
  if (percentage < 90) return chalk.yellow;
  if (percentage <= 110) return chalk.green;
  return chalk.blue; // Over goal
}

/**
 * Format percentage of goal
 */
export function formatGoalPercentage(current: number, goal: number): string {
  if (goal === 0) return 'N/A';
  return `${Math.round((current / goal) * 100)}%`;
}

/**
 * Truncate text to specified length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Create a progress bar string
 */
export function createProgressBar(current: number, goal: number, width: number = 20): string {
  if (goal === 0) return '─'.repeat(width);
  
  const percentage = Math.min(current / goal, 1);
  const filled = Math.round(percentage * width);
  const empty = width - filled;
  
  const color = getGoalColor(current, goal);
  return color('█'.repeat(filled)) + '░'.repeat(empty);
}

/**
 * Get date range for week starting from given date
 */
export function getWeekRange(startDate: string): { start: string; end: string; dates: string[] } {
  const start = new Date(startDate);
  const dates: string[] = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(formatDate(date));
  }
  
  const end = dates[dates.length - 1];
  
  return {
    start: dates[0],
    end,
    dates
  };
}

/**
 * Format day of week from date string
 */
export function formatDayOfWeek(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

/**
 * Validate date string format
 */
export function isValidDateString(dateString: string): boolean {
  if (!dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return false;
  }
  
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && dateString === formatDate(date);
}