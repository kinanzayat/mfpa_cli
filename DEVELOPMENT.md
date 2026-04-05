# Development Guide

This document provides guidance for developers who want to contribute to `mfp-cli` or understand how it works.

## Architecture

The CLI is built with TypeScript and follows a modular architecture:

```
src/
├── commands/          # CLI command implementations
│   ├── auth.ts       # Authentication setup
│   ├── diary.ts      # Food diary command
│   ├── summary.ts    # Nutrition summary command
│   ├── weight.ts     # Weight tracking commands
│   ├── week.ts       # Weekly overview command
│   ├── search.ts     # Food search command
│   └── streak.ts     # Streak tracking command
├── lib/              # Core library code
│   ├── api.ts        # MyFitnessPal API client
│   ├── config.ts     # Configuration management
│   └── utils.ts      # Output formatting and utilities
├── types/            # TypeScript type definitions
│   └── index.ts      # All type definitions
├── cli.ts            # Main CLI entry point
└── index.ts          # Library exports
```

## API Research

### Current Knowledge

Based on research, MyFitnessPal uses these patterns:

1. **Authentication**: Session cookies from web login
2. **API Endpoints**: Mix of `/api/*` endpoints and HTML page scraping
3. **Fallback Strategy**: API first, then HTML scraping if API fails

### Known Endpoints (Hypothetical)

These are educated guesses based on common REST API patterns:

```
GET /api/diary/{date}                    # Daily diary data
GET /api/user/weight?from=X&to=Y         # Weight entries
POST /api/user/weight                    # Log weight entry
GET /api/nutrition-summary/search/item   # Food search
GET /api/user/goals                      # User nutrition goals
GET /api/user/streak                     # Logging streak
```

### Research Methods

1. **Browser Network Tab**: Monitor XHR/Fetch requests while using MyFitnessPal
2. **HTML Scraping**: Parse food diary HTML pages as fallback
3. **Existing Libraries**: Study projects like `fitnessforlife/mfp`

### Contributing API Discoveries

If you find new endpoints or API patterns:

1. Document the endpoint URL and method
2. Include sample request/response data
3. Update the `MFPAPIClient` class in `src/lib/api.ts`
4. Add corresponding parsing methods
5. Submit a pull request with tests

## Testing with Real Data

Since this CLI requires authentication, testing involves:

### Manual Testing

1. Set up authentication: `npm run dev -- auth`
2. Test commands: `npm run dev -- diary`
3. Verify output formatting and error handling

### API Testing

Create a test configuration file for development:

```bash
# ~/.mfprc-dev
{
  "cookies": "your_test_cookies_here"
}
```

Use environment variable to switch configs:

```bash
export MFP_CONFIG_FILE="$HOME/.mfprc-dev"
npm run dev -- diary
```

## Common Issues

### Authentication Problems

- **Expired Cookies**: MyFitnessPal cookies expire after ~2-4 weeks
- **Invalid Format**: Ensure full Cookie header is copied, including all key=value pairs
- **Missing Headers**: Some endpoints may require additional headers (User-Agent, Referer, etc.)

### API Changes

MyFitnessPal can change their internal API at any time:

- **New Response Format**: Update parsing methods in `src/lib/api.ts`
- **New Authentication**: Update auth methods in `src/lib/config.ts`
- **Endpoint Changes**: Update URLs and add fallback methods

### Error Handling

The CLI uses a fallback strategy:

1. Try modern API endpoints first
2. Fall back to HTML scraping if API fails
3. Provide helpful error messages for authentication issues

## Adding New Commands

To add a new command:

1. **Create command file**: `src/commands/newcommand.ts`
2. **Implement the command function**:
   ```typescript
   export async function newCommand(options: Options = {}): Promise<void> {
     try {
       const apiClient = new MFPAPIClient();
       const data = await apiClient.getNewData();
       console.log(OutputFormatter.formatNewData(data, options));
     } catch (error) {
       handleError(error);
       process.exit(1);
     }
   }
   ```
3. **Add to CLI**: Update `src/cli.ts` to register the new command
4. **Add API method**: Implement `getNewData()` in `MFPAPIClient`
5. **Add formatter**: Implement `formatNewData()` in `OutputFormatter`
6. **Update types**: Add necessary TypeScript types in `src/types/`

## Code Style

- **TypeScript**: Strict mode enabled, no `any` types without reason
- **Error Handling**: Always wrap API calls in try-catch
- **Formatting**: Use `OutputFormatter` for consistent output
- **Types**: Define interfaces for all API response data
- **CLI**: Use Commander.js patterns for consistency

## Publishing

When ready to publish:

1. Update version in `package.json`
2. Build: `npm run build`
3. Test locally: `npm link` and test commands
4. Publish: `npm publish`

## Security Considerations

- **Cookie Storage**: Store in user's home directory with restricted permissions
- **Logging**: Never log authentication cookies or tokens
- **Rate Limiting**: Be respectful of MyFitnessPal's servers
- **Error Messages**: Don't expose sensitive data in error messages

## Useful Resources

- [MyFitnessPal Web App](https://www.myfitnesspal.com) - Primary source for API research
- [Commander.js Docs](https://github.com/tj/commander.js/) - CLI framework
- [Axios Docs](https://axios-http.com/) - HTTP client
- [Chalk Docs](https://github.com/chalk/chalk) - Terminal colors
- [CLI Table3 Docs](https://github.com/cli-table/cli-table3) - Table formatting