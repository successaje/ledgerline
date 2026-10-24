// End-to-end tests against a running dev or production server. Usage: npx playwright test
export default {
  testDir: "./e2e",
  timeout: 60_000,
  use: { baseURL: process.env.E2E_BASE || "http://localhost:3000", viewport: { width: 375, height: 812 }, locale: "en-SG", reducedMotion: "reduce" },
  reporter: [["list"]],
};
