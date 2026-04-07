import axios from 'axios';
import * as cheerio from 'cheerio';
import { AuthManager } from './auth';
import { FoodSearchResponse } from '../types';

export interface WebSearchResult {
  originalFoodId: string;
  externalFoodId: string;
  description: string;
  subtitle: string;
  verified: boolean;
  weightIds: string[];
  version?: string;
}

export interface AddFoodOptions {
  query?: string;
  originalFoodId?: string;
  mealId: string;
  date: string;
  quantity: string;
  weightId?: string;
  resultIndex?: number;
}

export interface AddFoodResult {
  description: string;
  originalFoodId: string;
  weightId: string;
  quantity: string;
  mealId: string;
  date: string;
}

export class MFPWebClient {
  private authManager: AuthManager;
  private baseURL = 'https://www.myfitnesspal.com';

  constructor(authManager: AuthManager) {
    this.authManager = authManager;
  }

  private getHeaders(extra: Record<string, string> = {}) {
    return {
      'Cookie': this.authManager.getCookieString(),
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...extra,
    };
  }

  async fetchDiaryPage(date: string): Promise<string> {
    const response = await axios.get(`${this.baseURL}/food/diary`, {
      params: { date },
      headers: this.getHeaders(),
      responseType: 'text',
    });
    return response.data;
  }

  async searchFoods(query: string, mealId: string, date: string): Promise<WebSearchResult[]> {
    const addPage = await axios.get(`${this.baseURL}/food/add_to_diary`, {
      params: { meal: mealId, date },
      headers: this.getHeaders(),
      responseType: 'text',
    });

    const addPageHtml = addPage.data as string;
    const authenticityToken = this.extractAuthenticityToken(addPageHtml);

    const form = new URLSearchParams();
    form.set('authenticity_token', authenticityToken);
    form.set('meal', mealId);
    form.set('date', date);
    form.set('search', query);

    const searchPage = await axios.post(`${this.baseURL}/food/search`, form.toString(), {
      headers: this.getHeaders({
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      }),
      responseType: 'text',
    });

    const html = searchPage.data as string;
    const $ = cheerio.load(html);
    const results: WebSearchResult[] = [];

    $('#matching a.search').each((_, el) => {
      const link = $(el);
      const container = link.closest('li');
      const originalFoodId = (link.attr('data-original-id') || '').trim();
      const externalFoodId = (link.attr('data-external-id') || '').trim();
      const version = (link.attr('data-version') || '').trim();
      const weightIds = (link.attr('data-weight-ids') || '')
        .split(',')
        .map(id => id.trim())
        .filter(Boolean);
      const description = link.text().replace(/\s+/g, ' ').trim();
      const subtitle = container.find('.search-nutritional-info').text().replace(/\s+/g, ' ').trim();
      const verified = link.attr('data-verified') === 'true';

      if (originalFoodId && externalFoodId) {
        results.push({ originalFoodId, externalFoodId, description, subtitle, verified, weightIds, version });
      }
    });

    return results;
  }

  async addFoodFromSearch(options: AddFoodOptions): Promise<AddFoodResult> {
    const mealId = options.mealId;
    const date = options.date;

    let selected: WebSearchResult | undefined;
    if (options.originalFoodId) {
      selected = {
        originalFoodId: options.originalFoodId,
        externalFoodId: '',
        description: options.query || options.originalFoodId,
        subtitle: '',
        verified: false,
        weightIds: options.weightId ? [options.weightId] : [],
      };
    } else {
      if (!options.query) {
        throw new Error('Query is required when food_id is not provided.');
      }
      const results = await this.searchFoods(options.query, mealId, date);
      if (results.length === 0) {
        throw new Error(`No web results found for "${options.query}".`);
      }
      const resultIndex = options.resultIndex ?? 1;
      selected = results[resultIndex - 1];
      if (!selected) {
        throw new Error(`Search result #${resultIndex} not found. Only ${results.length} result(s) available.`);
      }
    }

    const inferredWeightId = (!options.weightId && options.query && selected.externalFoodId)
      ? await this.inferPreferredWeightId(options.query, selected)
      : undefined;
    const weightId = options.weightId || inferredWeightId || selected.weightIds[0];
    if (!weightId) {
      throw new Error('No weight_id available for the selected food.');
    }

    const diaryPage = await this.fetchDiaryPage(date);
    const csrfToken = this.extractCsrfToken(diaryPage);

    const form = new URLSearchParams();
    form.set('food_entry[food_id]', selected.originalFoodId);
    form.set('food_entry[date]', date);
    form.set('food_entry[quantity]', options.quantity);
    form.set('food_entry[weight_id]', weightId);
    form.set('food_entry[meal_id]', mealId);
    form.set('ajax', 'true');

    await axios.post(`${this.baseURL}/food/add`, form.toString(), {
      headers: this.getHeaders({
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-CSRF-Token': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
      }),
      validateStatus: status => status >= 200 && status < 300,
    });

    return {
      description: selected.description,
      originalFoodId: selected.originalFoodId,
      weightId,
      quantity: options.quantity,
      mealId,
      date,
    };
  }

  async removeFoodEntry(entryId: string, date?: string): Promise<void> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const diaryPage = await this.fetchDiaryPage(targetDate);
    const csrfToken = this.extractCsrfToken(diaryPage);

    const form = new URLSearchParams();
    form.set('_method', 'delete');

    await axios.post(`${this.baseURL}/food/remove/${entryId}`, form.toString(), {
      headers: this.getHeaders({
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-CSRF-Token': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
      }),
      validateStatus: status => (status >= 200 && status < 300) || status === 302,
      maxRedirects: 0,
    });
  }

  private async inferPreferredWeightId(query: string, selected: WebSearchResult): Promise<string | undefined> {
    try {
      const token = await this.authManager.getToken();
      const userId = this.authManager.getUserId();
      const url = new URL('/v2/nutrition', 'https://api.myfitnesspal.com');
      url.searchParams.set('q', query);

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'mfp-client-id': 'mfp-main-js',
          'mfp-user-id': userId,
        }
      });

      if (!response.ok) return undefined;
      const data = await response.json() as FoodSearchResponse;
      const match = data.items.find(item => item.item.id === selected.externalFoodId);
      if (!match?.item?.serving_sizes?.length) return undefined;

      const preferredIndex = match.item.serving_sizes.findIndex((serving) => serving.value === 1);
      if (preferredIndex >= 0 && selected.weightIds[preferredIndex]) {
        return selected.weightIds[preferredIndex];
      }

      return selected.weightIds[0];
    } catch {
      return selected.weightIds[0];
    }
  }

  private extractAuthenticityToken(html: string): string {
    const match = html.match(/name="authenticity_token" value="([^"]+)"/);
    if (!match) {
      throw new Error('Could not extract authenticity token from add-to-diary page.');
    }
    return match[1];
  }

  private extractCsrfToken(html: string): string {
    const match = html.match(/<meta name="csrf-token" content="([^"]+)"/);
    if (!match) {
      throw new Error('Could not extract CSRF token from diary page.');
    }
    return match[1];
  }
}
