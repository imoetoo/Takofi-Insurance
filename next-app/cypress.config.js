import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 30000,
    video: false,
    screenshotOnRunFailure: false,
    // setupNodeEvents(on, config) {
    //   // implement node event listeners here
    // },
  },
});
