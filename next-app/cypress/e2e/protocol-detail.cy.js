describe("Protocol Detail Pages", () => {
  describe("Insurance Market Detail", () => {
    beforeEach(() => {
      cy.visit("/insurance-market/aave");
      cy.get("nav").should("be.visible");
    });

    it("should load the protocol detail page", () => {
      cy.url().should("include", "/insurance-market/aave");
    });

    it("should display the protocol name", () => {
      cy.contains("Aave").should("be.visible");
    });

    it("should display a back button", () => {
      cy.get("[data-testid='ArrowBackIcon']").should("be.visible");
    });

    it("should navigate back to market on back button click", () => {
      cy.get("[data-testid='ArrowBackIcon']").click();
      cy.url().should("include", "/insurance-market");
    });

    it("should display the maturity label in the title", () => {
      // Default URL has no suffix → maturity defaults to 6M shown in title
      cy.contains("Aave (6M)").should("be.visible");
    });

    it("should display Buy and Sell trade type tabs", () => {
      cy.contains("Buy").should("be.visible");
      cy.contains("Sell").should("be.visible");
    });

    it("should display the price input field", () => {
      cy.get("input").should("have.length.greaterThan", 0);
    });

    it("should display the amount input field", () => {
      cy.get("input").should("have.length.greaterThan", 1);
    });

    it("should display the stablecoin selector (USDT/USDC)", () => {
      // Should have either USDT or USDC visible in the stablecoin dropdown
      cy.contains(/USDT|USDC/).should("be.visible");
    });

    it("should display the order book section", () => {
      // The page should show order-related content
      cy.contains(/Order|order/i).should("be.visible");
    });

    it("should switch between Buy and Sell tabs", () => {
      cy.contains("Sell").click();
      // Should remain on the same page
      cy.url().should("include", "/insurance-market/aave");
      cy.contains("Buy").click();
      cy.url().should("include", "/insurance-market/aave");
    });
  });

  describe("Principal Market Detail", () => {
    beforeEach(() => {
      cy.visit("/principal-market/compound");
      cy.get("nav").should("be.visible");
    });

    it("should load the protocol detail page", () => {
      cy.url().should("include", "/principal-market/compound");
    });

    it("should display the protocol name", () => {
      cy.contains("Compound").should("be.visible");
    });

    it("should display a back button", () => {
      cy.get("[data-testid='ArrowBackIcon']").should("be.visible");
    });

    it("should navigate back to principal market on back button click", () => {
      cy.get("[data-testid='ArrowBackIcon']").click();
      cy.url().should("include", "/principal-market");
    });

    it("should display the maturity label in the title", () => {
      // Default URL has no suffix → maturity defaults to 6M shown in title
      cy.contains("Compound (6M)").should("be.visible");
    });

    it("should display Buy and Sell tabs", () => {
      cy.contains("Buy").should("be.visible");
      cy.contains("Sell").should("be.visible");
    });
  });

  describe("Protocol Detail Navigation from Listings", () => {
    it("should navigate from insurance listing to detail and back", () => {
      cy.visit("/insurance-market");
      cy.contains("SushiSwap (6M)").click();
      cy.url().should("include", "/insurance-market/sushiswap");
      cy.get("[data-testid='ArrowBackIcon']").click();
      cy.url().should("include", "/insurance-market");
    });

    it("should navigate from principal listing to detail and back", () => {
      cy.visit("/principal-market");
      cy.contains("Curve Finance (6M)").click();
      cy.url().should("include", "/principal-market/curve-finance");
      cy.get("[data-testid='ArrowBackIcon']").click();
      cy.url().should("include", "/principal-market");
    });

    it("should load 12M variant when navigating with 12M suffix", () => {
      cy.visit("/insurance-market/aave-12m");
      cy.contains("Aave").should("be.visible");
      cy.contains("12M").should("be.visible");
    });
  });
});
