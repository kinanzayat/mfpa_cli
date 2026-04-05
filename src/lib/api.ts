import { AuthManager } from './auth';
import { 
  DiaryResponse, 
  MeasurementsResponse, 
  FoodSearchResponse, 
  UserResponse 
} from '../types';

export class MFPApiClient {
  private authManager: AuthManager;
  private baseURL = 'https://api.myfitnesspal.com/v2';

  constructor(authManager: AuthManager) {
    this.authManager = authManager;
  }

  /**
   * Make an authenticated API request using native fetch
   */
  private async apiRequest<T>(path: string, params?: Record<string, string>): Promise<T> {
    const token = await this.authManager.getToken();
    const userId = this.authManager.getUserId();

    const url = new URL(path, this.baseURL);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'mfp-client-id': 'mfp-main-js',
        'mfp-user-id': userId,
      }
    });

    if (response.status === 401) {
      throw new Error('Authentication failed. Your session may have expired. Run "mfp setup" again.');
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API request failed (${response.status}): ${errorBody}`);
    }

    return await response.json() as T;
  }

  /**
   * Get diary data for a date range
   */
  async getDiary(fromDate: string, toDate?: string): Promise<DiaryResponse> {
    const params: Record<string, string> = {};
    
    if (toDate) {
      params.from = fromDate;
      params.to = toDate;
    } else {
      params.from = fromDate;
      params.to = fromDate;
    }

    return this.apiRequest<DiaryResponse>('/v2/diary', params);
  }

  /**
   * Get weight measurements
   */
  async getMeasurements(): Promise<MeasurementsResponse> {
    return this.apiRequest<MeasurementsResponse>('/v2/measurements');
  }

  /**
   * Search for food items
   */
  async searchFood(query: string): Promise<FoodSearchResponse> {
    return this.apiRequest<FoodSearchResponse>('/v2/nutrition', { q: query });
  }

  /**
   * Get user profile
   */
  async getUserProfile(): Promise<UserResponse> {
    const userId = this.authManager.getUserId();
    return this.apiRequest<UserResponse>(`/v2/users/${userId}`);
  }

  /**
   * Get diary data for a week (7 days)
   */
  async getWeekDiary(startDate: string): Promise<DiaryResponse> {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const fromDate = start.toISOString().split('T')[0];
    const toDate = end.toISOString().split('T')[0];

    return await this.getDiary(fromDate, toDate);
  }
}
