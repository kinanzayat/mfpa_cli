export interface MFPConfig {
  cookies: {
    session_token: string;
    mfp_session: string;
    cf_clearance: string;
  };
  auth?: {
    access_token: string;
    refresh_token: string;
    expires_at: number; // timestamp
    user_id: string;
  };
}

export interface AuthTokenResponse {
  token_type: string;
  access_token: string;
  expires_in: number;
  refresh_token: string;
}

export interface NutritionalContents {
  protein: number;
  fat: number;
  carbohydrates: number;
  energy: {
    unit: string;
    value: number;
  };
  sodium: number;
  fiber: number;
  sugar: number;
  cholesterol?: number;
  saturated_fat?: number;
  polyunsaturated_fat?: number;
  monounsaturated_fat?: number;
  trans_fat?: number;
  potassium?: number;
  vitamin_a?: number;
  vitamin_c?: number;
  calcium?: number;
  iron?: number;
}

export interface DiaryMeal {
  type: string;
  date: string;
  diary_meal: string;
  nutritional_contents: NutritionalContents;
}

export interface DiaryResponse {
  items: DiaryMeal[];
}

export interface WeightEntry {
  id: string;
  type: string;
  value: number;
  date: string;
  unit: string;
}

export interface MeasurementsResponse {
  items: WeightEntry[];
  has_more: boolean;
  total_entries: number;
}

export interface ServingSize {
  id: string;
  index: number;
  nutrition_multiplier: number;
  unit: string;
  value: number;
}

export interface FoodItem {
  description: string;
  id: string;
  brand_name: string | null;
  nutritional_contents: NutritionalContents;
  serving_sizes?: ServingSize[];
  type?: string;
  verified?: boolean;
  version?: string;
}

export interface FoodSearchResponse {
  items: Array<{
    item: FoodItem;
  }>;
  commonly_paired_foods: any[];
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  updated_at: string;
}

export interface UserResponse {
  item: UserProfile;
}

export interface FoodEntryRow {
  id: string;
  name: string;
  calories: number;
  carbs: number;
  fat: number;
  protein: number;
  sodium: number;
  sugar: number;
}

export interface DiaryGoals {
  calories: number;
  carbs: number;
  fat: number;
  protein: number;
  sodium: number;
  sugar: number;
}

export interface MealSection {
  name: string;
  foods: FoodEntryRow[];
  totals: Omit<FoodEntryRow, 'id' | 'name'>;
}

export interface DiaryData {
  date: string;
  meals: MealSection[];
  dailyTotals: Omit<FoodEntryRow, 'id' | 'name'>;
  goals: DiaryGoals;
  remaining: Omit<FoodEntryRow, 'id' | 'name'>;
}