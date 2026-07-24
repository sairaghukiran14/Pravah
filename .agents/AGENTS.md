# HasaFlow Project-Scoped Rules

## Git & Testing Constraints
- **Test Only Rule**: If the user requests to "test", "run tests", or perform diagnostics on the app, execute the testing scripts (e.g. `npx tsx src/scripts/test-apis.ts`) and connection verification locally to generate the report. Do **NOT** run git stage, commit, or push commands.
