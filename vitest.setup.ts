/**
 * Keeps the test suite off the paid APIs.
 *
 * Importing almost anything in src pulls in Prisma transitively, and the Prisma
 * client loads `.env` into process.env as a side effect of being imported. That
 * handed every test the real SARVAM_API_KEY, so any test touching a node that
 * transcribes, translates or speaks made a live billable request — quietly, and
 * against production quota, on every `npm test` and every CI run.
 *
 * Forcing the mock key here makes the provider clients take their simulated
 * path. A test that genuinely wants to exercise the HTTP layer sets its own key
 * and stubs fetch, which is explicit and costs nothing.
 */
process.env.SARVAM_API_KEY = 'mock_sarvam_api_key';
