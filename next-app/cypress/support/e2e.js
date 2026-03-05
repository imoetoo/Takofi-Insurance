// ***********************************************************
// Cypress E2E Support File
// Loaded before every test file.
// ***********************************************************

// Suppress RainbowKit / Next.js hydration mismatch errors.
// These are cosmetic SSR↔client mismatches and do not affect functionality.
Cypress.on("uncaught:exception", (err) => {
  if (
    err.message.includes("Hydration") ||
    err.message.includes("Minified React error #418") ||
    err.message.includes("Minified React error #423") ||
    err.message.includes("hydrat")
  ) {
    return false; // prevent Cypress from failing the test
  }
});

// Custom command: visit a page and wait for Next.js hydration
Cypress.Commands.add("visitAndWait", (url) => {
  cy.visit(url);
  cy.get("nav").should("be.visible"); // Header always present after hydration
});
