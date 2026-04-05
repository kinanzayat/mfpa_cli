# MFP CLI - MyFitnessPal Command Line Interface

Unofficial MyFitnessPal CLI built from scratch using verified API endpoints. Access your diary data, weight logs, and nutrition summaries from the command line.

## ✨ Features

- 📊 **Daily nutrition summaries** with goal tracking
- 📖 **Detailed food diaries** showing individual items per meal
- 📅 **Weekly nutrition overview** with trends
- ⚖️ **Weight tracking** and history
- 🔍 **Food search** in the MyFitnessPal database
- 🎨 **Beautiful terminal output** with progress bars and colors
- 📱 **JSON output** for automation and scripting

## 🚀 Installation

### From Source (Recommended)

```bash
git clone <repository>
cd mfp-cli
npm install
```

### Global Install (Future)

```bash
npm install -g mfp-cli
```

## 🔧 Setup

Before using any commands, authenticate with your MyFitnessPal account:

```bash
npm run dev -- setup
```

You'll need these cookies from your logged-in browser session:

1. **Log into myfitnesspal.com** in your browser
2. **Open Developer Tools** (F12)
3. **Go to Application/Storage > Cookies** > myfitnesspal.com
4. **Copy these cookie values**:
   - `__Secure-next-auth.session-token`
   - `_mfp_session`
   - `cf_clearance`

Set them as environment variables:

```bash
export MFP_SESSION_TOKEN="your_session_token_value"
export MFP_SESSION="your_mfp_session_value"
export CF_CLEARANCE="your_cf_clearance_value"
```

Then run setup:

```bash
npm run dev -- setup
```

## 📋 Commands

### Daily Summary

```bash
npm run dev -- summary                # Today's nutrition vs goals
npm run dev -- summary 2024-03-15     # Specific date
npm run dev -- summary yesterday      # Yesterday
npm run dev -- summary --json         # JSON output
```

### Detailed Food Diary

```bash
npm run dev -- diary                  # Today's detailed food list
npm run dev -- diary 2024-03-15       # Specific date
npm run dev -- diary yesterday        # Yesterday
```

### Weekly Overview

```bash
npm run dev -- week                   # This week starting today
npm run dev -- week 2024-03-10        # Custom start date
```

### Weight Tracking

```bash
npm run dev -- weight                 # Latest weight entry
npm run dev -- weight show            # All weight entries
npm run dev -- weight show 2024-03-15 # Specific date
npm run dev -- weight log 70.5 kg     # Log new weight (coming soon)
```

### Food Search

```bash
npm run dev -- search "chicken breast"
npm run dev -- search "coca cola" --limit 20
```

## 📊 Example Output

### Daily Summary
```
📊 Nutrition Summary for 2024-03-15

MEAL BREAKDOWN
┌─────────────┬──────────┬────────┬────────┬─────────┐
│ Meal        │ Calories │ Carbs  │ Fat    │ Protein │
├─────────────┼──────────┼────────┼────────┼─────────┤
│ Breakfast   │ 485      │ 10.0g  │ 25.3g  │ 50.5g   │
│ Lunch       │ 650      │ 45.2g  │ 28.1g  │ 42.3g   │
│ Dinner      │ 720      │ 55.8g  │ 35.2g  │ 48.9g   │
└─────────────┴──────────┴────────┴────────┴─────────┘

DAILY TOTALS VS GOALS
┌──────────┬─────────┬──────┬───────────┬──────────────────────┬────────┐
│ Nutrient │ Current │ Goal │ Remaining │ Progress             │ % Goal │
├──────────┼─────────┼──────┼───────────┼──────────────────────┼────────┤
│ Calories │ 1,855   │ 2000 │ 145       │ ████████████████░░░░ │ 93%    │
│ Protein  │ 142g    │ 150g │ 8g        │ ███████████████████░ │ 95%    │
└──────────┴─────────┴──────┴───────────┴──────────────────────┴────────┘

✅ Calorie intake is within target range
✅ Excellent protein intake
```

## 🔐 Authentication & Security

- Uses **official MyFitnessPal v2 API** endpoints
- Stores session cookies locally in `~/.mfprc` (chmod 600)
- Auto-refreshes Bearer tokens (valid 10 days)
- **Never transmits credentials** to third parties
- Uses the same auth flow as the official web app

## ⚡ Technology Stack

- **Node.js + TypeScript** for robust development
- **commander.js** for CLI interface
- **axios** for HTTP requests
- **cheerio** for HTML parsing
- **chalk** for colored output
- **cli-table3** for beautiful tables

## 🛠 API Architecture

### Hybrid Approach: API + Web Scraping

**v2 API Endpoints (Verified):**
- `GET /v2/diary` - Meal-level nutrition totals
- `GET /v2/measurements` - Weight entries
- `GET /v2/nutrition` - Food search
- `GET /v2/users/{id}` - User profile

**HTML Scraping (for missing data):**
- Individual food items per meal
- Daily nutrition goals
- Food entry IDs

### Authentication Flow
1. User provides 3 browser cookies
2. CLI calls `/user/auth_token?refresh=true` → Bearer token
3. All API calls use: `Authorization: Bearer <token>` + client headers
4. Token auto-refreshed when expired

## 🔄 Development

```bash
# Install dependencies
npm install

# Run CLI in development
npm run dev -- --help
npm run dev -- summary

# Test setup
npm run dev -- setup

# Check syntax
npx ts-node src/cli.ts --help
```

### Project Structure
```
src/
├── cli.ts              # Main CLI entry point
├── types/index.ts      # TypeScript interfaces
├── lib/
│   ├── auth.ts         # Authentication manager
│   ├── api.ts          # v2 API client
│   ├── scraper.ts      # HTML scraper
│   └── utils.ts        # Utilities & formatting
└── commands/
    ├── setup.ts        # Authentication setup
    ├── summary.ts      # Daily nutrition summary
    ├── diary.ts        # Detailed food diary
    ├── weight.ts       # Weight tracking
    ├── week.ts         # Weekly overview
    └── search.ts       # Food search
```

## 📝 Date Formats

All commands accept:
- `YYYY-MM-DD` (e.g., 2024-03-15)
- `today`, `yesterday`
- No date = today

## 🎯 Future Features

- [ ] Weight logging via API (POST /v2/measurements)
- [ ] Food logging capabilities
- [ ] Exercise data integration
- [ ] Macro trend analysis
- [ ] Export to CSV/JSON
- [ ] Multiple user accounts
- [ ] Nutrition goal setting

## ⚠️ Limitations

- Weight logging not yet implemented (requires API testing)
- Food entry creation not supported
- Exercise data requires different API scopes
- Depends on MyFitnessPal's unofficial API stability

## 📄 License

MIT License - Feel free to use, modify, and distribute.

---

**Built with ❤️ for the MyFitnessPal community**