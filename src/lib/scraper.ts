import axios from 'axios';
import * as cheerio from 'cheerio';
import { AuthManager } from './auth';
import { DiaryData, MealSection, FoodEntryRow, DiaryGoals } from '../types';

export class DiaryHTMLScraper {
  private authManager: AuthManager;

  constructor(authManager: AuthManager) {
    this.authManager = authManager;
  }

  /**
   * Scrape detailed diary data including individual food items and goals
   */
  async scrapeDiaryData(date: string): Promise<DiaryData> {
    try {
      const response = await axios.get(
        `https://www.myfitnesspal.com/food/diary?date=${date}`,
        {
          headers: {
            'Cookie': this.authManager.getCookieString(),
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        }
      );

      const $ = cheerio.load(response.data);
      const meals: MealSection[] = [];
      
      // Parse each meal section
      $('.diary-day-diary-table').each((_, table) => {
        const $table = $(table);
        const mealHeader = $table.find('.diary-day-diary-table-header').text().trim();
        
        // Skip if this isn't a meal table or if it's a summary
        if (!mealHeader || mealHeader.includes('TOTAL') || mealHeader.includes('Summary')) {
          return;
        }

        const foods: FoodEntryRow[] = [];
        let mealTotals: Omit<FoodEntryRow, 'id' | 'name'> = {
          calories: 0,
          carbs: 0,
          fat: 0,
          protein: 0,
          sodium: 0,
          sugar: 0
        };

        // Parse food entries in this meal
        $table.find('tbody tr').each((_, row) => {
          const $row = $(row);
          const entryId = $row.attr('data-food-entry-id');
          
          // Skip if no entry ID (might be totals row)
          if (!entryId) {
            // Check if this is a totals row
            const firstCell = $row.find('td:first').text().trim();
            if (firstCell.toLowerCase().includes('totals')) {
              mealTotals = this.parseNutritionRow($row);
            }
            return;
          }

          // Get food name from the first cell
          const nameCell = $row.find('td:first');
          const name = nameCell.find('span').text().trim() || nameCell.text().trim();
          
          if (name) {
            const nutrition = this.parseNutritionRow($row);
            foods.push({
              id: entryId,
              name: name,
              ...nutrition
            });
          }
        });

        if (foods.length > 0 || mealTotals.calories > 0) {
          meals.push({
            name: mealHeader,
            foods: foods,
            totals: mealTotals
          });
        }
      });

      // Parse daily totals and goals from the main summary table
      const dailyTotals = this.parseDailyTotals($);
      const goals = this.parseDailyGoals($);
      const remaining = this.parseDailyRemaining($);

      return {
        date,
        meals,
        dailyTotals,
        goals,
        remaining
      };

    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error('Authentication failed. Your cookies may have expired. Run "mfp setup" again.');
      }
      throw new Error(`Failed to scrape diary data: ${error.message}`);
    }
  }

  /**
   * Parse nutrition values from a table row
   * Cells may contain <span class="macro-value">250</span><span class="macro-percentage">50</span>
   * We only want the macro-value, or the direct text if no spans exist
   */
  private parseNutritionRow($row: cheerio.Cheerio<any>): Omit<FoodEntryRow, 'id' | 'name'> {
    const cells = $row.find('td');
    
    return {
      calories: this.parseCellValue(cells.eq(1)),
      carbs: this.parseCellValue(cells.eq(2)),
      fat: this.parseCellValue(cells.eq(3)),
      protein: this.parseCellValue(cells.eq(4)),
      sodium: this.parseCellValue(cells.eq(5)),
      sugar: this.parseCellValue(cells.eq(6))
    };
  }

  /**
   * Extract numeric value from a table cell, preferring .macro-value span
   */
  private parseCellValue(cell: cheerio.Cheerio<any>): number {
    const macroValue = cell.find('.macro-value');
    if (macroValue.length > 0) {
      return this.parseNumber(macroValue.text());
    }
    // Fallback: get only direct text content (not nested spans)
    const text = cell.clone().children().remove().end().text();
    if (text.trim()) {
      return this.parseNumber(text);
    }
    return this.parseNumber(cell.text());
  }

  /**
   * Parse daily totals from the summary table
   */
  private parseDailyTotals($: cheerio.CheerioAPI): Omit<FoodEntryRow, 'id' | 'name'> {
    const totalsRow = $('tr').filter((_, el) => {
      return $(el).find('td:first').text().trim().toLowerCase().includes('totals');
    }).first();

    if (totalsRow.length === 0) {
      return { calories: 0, carbs: 0, fat: 0, protein: 0, sodium: 0, sugar: 0 };
    }

    return this.parseNutritionRow(totalsRow);
  }

  /**
   * Parse daily goals from the summary table
   */
  private parseDailyGoals($: cheerio.CheerioAPI): DiaryGoals {
    const goalsRow = $('tr').filter((_, el) => {
      const text = $(el).find('td:first').text().trim().toLowerCase();
      return text.includes('goal') || text.includes('daily goal');
    }).first();

    if (goalsRow.length === 0) {
      // Try to parse from goal text format: "2,000 cal | 250g carbs | 44g fat | 150g protein | 2,300mg sodium | 93g sugar"
      const goalText = $('.goal').text() || $('.daily-goal').text() || '';
      if (goalText) {
        return this.parseGoalText(goalText);
      }
      
      return { calories: 0, carbs: 0, fat: 0, protein: 0, sodium: 0, sugar: 0 };
    }

    const nutrition = this.parseNutritionRow(goalsRow);
    return {
      calories: nutrition.calories,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
      protein: nutrition.protein,
      sodium: nutrition.sodium,
      sugar: nutrition.sugar
    };
  }

  /**
   * Parse remaining calories/nutrients
   */
  private parseDailyRemaining($: cheerio.CheerioAPI): Omit<FoodEntryRow, 'id' | 'name'> {
    const remainingRow = $('tr').filter((_, el) => {
      return $(el).find('td:first').text().trim().toLowerCase().includes('remaining');
    }).first();

    if (remainingRow.length === 0) {
      return { calories: 0, carbs: 0, fat: 0, protein: 0, sodium: 0, sugar: 0 };
    }

    return this.parseNutritionRow(remainingRow);
  }

  /**
   * Parse goals from text format like "2,000 cal | 250g carbs | 44g fat | 150g protein | 2,300mg sodium | 93g sugar"
   */
  private parseGoalText(goalText: string): DiaryGoals {
    const goals: DiaryGoals = { calories: 0, carbs: 0, fat: 0, protein: 0, sodium: 0, sugar: 0 };
    
    const parts = goalText.split('|').map(part => part.trim());
    
    for (const part of parts) {
      const caloriesMatch = part.match(/^([\d,]+)\s*cal/i);
      if (caloriesMatch) {
        goals.calories = this.parseNumber(caloriesMatch[1]);
        continue;
      }
      
      const carbsMatch = part.match(/([\d,]+)g\s*carbs/i);
      if (carbsMatch) {
        goals.carbs = this.parseNumber(carbsMatch[1]);
        continue;
      }
      
      const fatMatch = part.match(/([\d,]+)g\s*fat/i);
      if (fatMatch) {
        goals.fat = this.parseNumber(fatMatch[1]);
        continue;
      }
      
      const proteinMatch = part.match(/([\d,]+)g\s*protein/i);
      if (proteinMatch) {
        goals.protein = this.parseNumber(proteinMatch[1]);
        continue;
      }
      
      const sodiumMatch = part.match(/([\d,]+)mg\s*sodium/i);
      if (sodiumMatch) {
        goals.sodium = this.parseNumber(sodiumMatch[1]);
        continue;
      }
      
      const sugarMatch = part.match(/([\d,]+)g\s*sugar/i);
      if (sugarMatch) {
        goals.sugar = this.parseNumber(sugarMatch[1]);
        continue;
      }
    }
    
    return goals;
  }

  /**
   * Parse number from text, handling commas
   */
  private parseNumber(text: string): number {
    const cleaned = text.replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
}