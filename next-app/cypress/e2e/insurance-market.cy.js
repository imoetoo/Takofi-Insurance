describe("Insurance Market", () => {
  beforeEach(() => {
    cy.visit("/insurance-market");
    cy.get("nav").should("be.visible");
  });

  describe("Tab Navigation", () => {
    it("should display the two market tabs", () => {
      cy.contains("Trade Insurance Token").should("be.visible");
      cy.contains("My Insurance Token").should("be.visible");
    });

    it("should show the browse tokens view by default (tab 0)", () => {
      cy.contains("Browse Tokens").should("be.visible");
    });

    it("should switch to 'My Insurance Token' tab", () => {
      cy.contains("My Insurance Token").click();
      // After switching, the browse view should disappear
      cy.contains("Browse Tokens").should("not.exist");
    });

    it("should switch back to 'Trade Insurance Token' tab", () => {
      cy.contains("My Insurance Token").click();
      cy.contains("Trade Insurance Token").click();
      cy.contains("Browse Tokens").should("be.visible");
    });
  });

  describe("Search Functionality", () => {
    it("should display the search input", () => {
      cy.get("input[placeholder='Search for an insurance token listing']").should(
        "be.visible"
      );
    });

    it("should filter listings by search term", () => {
      cy.get("input[placeholder='Search for an insurance token listing']").type(
        "Aave"
      );
      // Should show Aave listings only (6M and 12M)
      cy.contains("Aave (6M)").should("be.visible");
      cy.contains("Aave (12M)").should("be.visible");
      // Other protocols should not appear
      cy.contains("SushiSwap (6M)").should("not.exist");
      cy.contains("Compound (6M)").should("not.exist");
    });

    it("should show no results message for non-matching search", () => {
      cy.get("input[placeholder='Search for an insurance token listing']").type(
        "NonExistentProtocol"
      );
      cy.contains("No insurance listings found").should("be.visible");
    });

    it("should show all listings when search is cleared", () => {
      cy.get("input[placeholder='Search for an insurance token listing']")
        .type("Aave")
        .clear();
      cy.contains("12 Listings").should("be.visible");
    });
  });

  describe("Category Filtering", () => {
    it("should display the category dropdown", () => {
      cy.contains("All categories").should("be.visible");
    });

    it("should filter by Exchange category", () => {
      // Open the MUI select dropdown
      cy.contains("All categories").click();
      cy.get('[role="listbox"]').contains("Exchange").click();
      // Exchange protocols: SushiSwap, Uniswap V3, PancakeSwap (each 6M + 12M = 6)
      cy.contains("6 Listings").should("be.visible");
      cy.contains("SushiSwap (6M)").should("be.visible");
      cy.contains("Uniswap V3 (6M)").should("be.visible");
      cy.contains("PancakeSwap (6M)").should("be.visible");
    });

    it("should filter by Lending category", () => {
      cy.contains("All categories").click();
      cy.get('[role="listbox"]').contains("Lending").click();
      // Lending protocols: Aave, Compound (each 6M + 12M = 4)
      cy.contains("4 Listings").should("be.visible");
      cy.contains("Aave (6M)").should("be.visible");
      cy.contains("Compound (6M)").should("be.visible");
    });

    it("should filter by DeFi category", () => {
      cy.contains("All categories").click();
      cy.get('[role="listbox"]').contains("DeFi").click();
      // DeFi protocols: Curve Finance (6M + 12M = 2)
      cy.contains("2 Listings").should("be.visible");
      cy.contains("Curve Finance (6M)").should("be.visible");
    });

    it("should combine search and category filters", () => {
      // Select Exchange category
      cy.contains("All categories").click();
      cy.get('[role="listbox"]').contains("Exchange").click();
      // Then search within exchange
      cy.get("input[placeholder='Search for an insurance token listing']").type(
        "SushiSwap"
      );
      cy.contains("2 Listings").should("be.visible");
      cy.contains("SushiSwap (6M)").should("be.visible");
      cy.contains("SushiSwap (12M)").should("be.visible");
    });
  });

  describe("Listing Cards", () => {
    it("should display all 12 insurance listings by default", () => {
      cy.contains("12 Listings").should("be.visible");
    });

    it("should display listing results label", () => {
      cy.contains("Annual Fee / TVL").should("be.visible");
    });

    it("should display protocol names in listing cards", () => {
      const protocols = [
        "SushiSwap (6M)",
        "SushiSwap (12M)",
        "Curve Finance (6M)",
        "Curve Finance (12M)",
        "Aave (6M)",
        "Aave (12M)",
        "Uniswap V3 (6M)",
        "Uniswap V3 (12M)",
        "Compound (6M)",
        "Compound (12M)",
        "PancakeSwap (6M)",
        "PancakeSwap (12M)",
      ];
      protocols.forEach((name) => {
        cy.contains(name).should("exist");
      });
    });

    it("should navigate to protocol detail when clicking a listing", () => {
      cy.contains("Aave (6M)").click();
      cy.url().should("include", "/insurance-market/aave");
    });
  });
});
