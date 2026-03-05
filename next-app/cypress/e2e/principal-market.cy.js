describe("Principal Market", () => {
  beforeEach(() => {
    cy.visit("/principal-market");
    cy.get("nav").should("be.visible");
  });

  describe("Tab Navigation", () => {
    it("should display the two market tabs", () => {
      cy.contains("Trade Principal Token").should("be.visible");
      cy.contains("My Principal Token").should("be.visible");
    });

    it("should show the browse tokens view by default", () => {
      cy.contains("Browse Tokens").should("be.visible");
    });

    it("should switch to 'My Principal Token' tab", () => {
      cy.contains("My Principal Token").click();
      cy.contains("Browse Tokens").should("not.exist");
    });
  });

  describe("Search Functionality", () => {
    it("should display the search input", () => {
      cy.get("input[placeholder='Search for a principal token listing']").should(
        "be.visible"
      );
    });

    it("should filter listings by search term", () => {
      cy.get("input[placeholder='Search for a principal token listing']").type(
        "Compound"
      );
      cy.contains("Compound (6M)").should("be.visible");
      cy.contains("Compound (12M)").should("be.visible");
      cy.contains("SushiSwap (6M)").should("not.exist");
    });

    it("should show no results for non-matching search", () => {
      cy.get("input[placeholder='Search for a principal token listing']").type(
        "InvalidToken"
      );
      cy.contains("No principal listings found").should("be.visible");
    });
  });

  describe("Category Filtering", () => {
    it("should filter by Exchange category", () => {
      cy.contains("All categories").click();
      cy.get('[role="listbox"]').contains("Exchange").click();
      cy.contains("6 Listings").should("be.visible");
    });

    it("should filter by Lending category", () => {
      cy.contains("All categories").click();
      cy.get('[role="listbox"]').contains("Lending").click();
      cy.contains("4 Listings").should("be.visible");
    });
  });

  describe("Listing Cards", () => {
    it("should display all 12 principal listings by default", () => {
      cy.contains("12 Listings").should("be.visible");
    });

    it("should display results label specific to principal market", () => {
      cy.contains("Lowest Price / TVL").should("be.visible");
    });

    it("should navigate to protocol detail page when clicking a listing", () => {
      cy.contains("Aave (6M)").click();
      cy.url().should("include", "/principal-market/aave");
    });
  });
});
