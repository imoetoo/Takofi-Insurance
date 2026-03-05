describe("Redeem & Claims Pages", () => {
  describe("Redeem Principal Page", () => {
    beforeEach(() => {
      cy.visit("/redeem-principal");
      cy.get("nav").should("be.visible");
    });

    it("should load the redeem principal page", () => {
      cy.url().should("include", "/redeem-principal");
    });

    it("should prompt wallet connection when disconnected", () => {
      // When wallet is not connected, should show a connection prompt
      cy.contains(/connect.*wallet/i).should("be.visible");
    });
  });

  describe("Redeem Insurance / Submit Claims Page", () => {
    beforeEach(() => {
      cy.visit("/redeem-insurance");
      cy.get("nav").should("be.visible");
    });

    it("should load the redeem insurance page", () => {
      cy.url().should("include", "/redeem-insurance");
    });

    it("should prompt wallet connection when disconnected", () => {
      cy.contains(/connect.*wallet/i).should("be.visible");
    });
  });
});
