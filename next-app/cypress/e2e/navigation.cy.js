describe("Navigation & Layout", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.get("nav").should("be.visible");
  });

  it("should display the header with logo and navigation links", () => {
    cy.get("nav").within(() => {
      cy.contains("TakoFi").should("be.visible");
      cy.contains("BETA").should("be.visible");
    });
  });

  it("should display all navigation links on desktop", () => {
    cy.get("nav").within(() => {
      cy.contains("Insurance Market").should("be.visible");
      cy.contains("Principal Market").should("be.visible");
      cy.contains("Mint Tokens").should("be.visible");
      cy.contains("Redeem PT").should("be.visible");
      cy.contains("Submit Claims").should("be.visible");
    });
  });

  it("should display the RainbowKit connect button", () => {
    // RainbowKit renders a connect button
    cy.get("nav").find("button").should("exist");
  });

  it("should navigate to Insurance Market page", () => {
    cy.get("nav").contains("Insurance Market").click();
    cy.url().should("include", "/insurance-market");
    cy.contains("Trade Insurance Token").should("be.visible");
  });

  it("should navigate to Principal Market page", () => {
    cy.get("nav").contains("Principal Market").click();
    cy.url().should("include", "/principal-market");
    cy.contains("Trade Principal Token").should("be.visible");
  });

  it("should navigate to Mint Tokens page", () => {
    cy.get("nav").contains("Mint Tokens").click();
    cy.url().should("include", "/mint-tokens");
    cy.contains("Mint Insurance Tokens").should("be.visible");
  });

  it("should navigate to Redeem Principal page", () => {
    cy.get("nav").contains("Redeem PT").click();
    cy.url().should("include", "/redeem-principal");
  });

  it("should navigate to Submit Claims page", () => {
    cy.get("nav").contains("Submit Claims").click();
    cy.url().should("include", "/redeem-insurance");
  });

  it("should navigate back to home when clicking the logo", () => {
    cy.get("nav").contains("Insurance Market").click();
    cy.url().should("include", "/insurance-market");
    cy.get("nav").contains("TakoFi").click();
    cy.url().should("eq", Cypress.config().baseUrl + "/");
  });

  it("should hide navigation links on mobile viewport", () => {
    cy.viewport(375, 667); // iPhone SE
    cy.get("nav").within(() => {
      cy.contains("Insurance Market").should("not.be.visible");
      cy.contains("Principal Market").should("not.be.visible");
      cy.contains("Mint Tokens").should("not.be.visible");
    });
  });
});
