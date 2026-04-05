# MFP API Research — Verified Endpoints

## Authentication Flow
1. User logs into myfitnesspal.com in browser
2. CLI needs these cookies: `__Secure-next-auth.session-token`, `_mfp_session`, `cf_clearance`
3. CLI calls `GET /user/auth_token?refresh=true` with cookies → returns Bearer token
4. Bearer token used for all v2 API calls (expires in 864000s = 10 days)
5. Token has refresh_token for renewal

### Auth Token Response
```json
{
  "token_type": "Bearer",
  "access_token": "YTptZnAtbWFpbi...",
  "expires_in": 864000,
  "refresh_token": "cjptZnAtbWFpbi..."
}
```

### Required Headers for v2 API
```
Authorization: Bearer <access_token>
mfp-client-id: mfp-main-js
mfp-user-id: <user_id>
```

### Getting User Info from HTML
The diary page embeds:
```javascript
MFP.User.MFP_API_HOST = 'https://api.myfitnesspal.com/v2';
MFP.User.MFP_CLIENT_ID = 'mfp-main-js';
MFP.User.api_user_id = '67780770328237';
```

CSRF token in meta tag: `<meta name="csrf-token" content="...">`

## v2 API Endpoints (Verified)

### GET /v2/users/{user_id} → 200
Returns user profile:
```json
{
  "item": {
    "id": "67780770328237",
    "username": "kinanju215",
    "email": "kinanzayat@gmail.com",
    "updated_at": "2026-03-25T05:50:34Z"
  }
}
```

### GET /v2/diary?from={date}&to={date} → 200
Returns per-meal nutrition summaries. This is the MAIN diary endpoint.
```json
{
  "items": [
    {
      "type": "diary_meal",
      "date": "2026-04-04",
      "diary_meal": "Breakfast",
      "nutritional_contents": {
        "protein": 50.49,
        "fat": 25.3,
        "carbohydrates": 9.97,
        "energy": { "unit": "calories", "value": 485.3 },
        "sodium": 329.82,
        "sugar": 1.16,
        "fiber": 0.0,
        "cholesterol": 738.38,
        "saturated_fat": 8.87,
        ...
      }
    },
    { "diary_meal": "Dinner", ... },
    { "diary_meal": "Snacks", ... }
  ]
}
```
Date params: `from=YYYY-MM-DD&to=YYYY-MM-DD` or `entry_date=YYYY-MM-DD`

### GET /v2/measurements → 200
Returns weight entries:
```json
{
  "items": [
    { "id": "128674551541477", "type": "Weight", "value": 68.0, "date": "2019-10-19", "unit": "kilograms" }
  ],
  "has_more": false,
  "total_entries": 2
}
```

### GET /v2/nutrition?q={search_term} → 200
Food search endpoint. Returns matching foods with full nutrition:
```json
{
  "commonly_paired_foods": [],
  "items": [
    {
      "item": {
        "description": "Chicken breast, grilled, skinless",
        "id": "164248067900917",
        "brand_name": null,
        "nutritional_contents": { ... }
      }
    }
  ]
}
```

### POST /v2/measurements (for logging weight) — NOT YET TESTED

## Goals (from HTML only)
The v2 API doesn't expose goals. Must scrape from diary HTML:
- Goal row in table: `2,000 cal | 250g carbs | 44g fat | 150g protein | 2,300mg sodium | 93g sugar`

## Individual Food Entries (from HTML only)
The v2 API returns per-meal aggregates, not individual food items.
Individual items are in the diary HTML:
- `data-food-entry-id="12615200839"` attribute on rows
- Food names in `class="first alt"` cells
- Each row has: calories, carbs, fat, protein, sodium, sugar

## Endpoints NOT Available
- /v2/exercises → 401 (scope not authorized with web token)
- /v2/streak, /v2/goals, /v2/reports, /v2/progress → 404

## Web Page Scraping (for detail data)
URL: `https://www.myfitnesspal.com/food/diary?date=YYYY-MM-DD`
Auth: session cookies
Structure: Rails-rendered HTML with tables
- Meal sections: Breakfast, Lunch, Dinner, Snacks
- Each food entry row has data-food-entry-id attribute
- Footer has: Totals, Your Daily Goal, Remaining rows
