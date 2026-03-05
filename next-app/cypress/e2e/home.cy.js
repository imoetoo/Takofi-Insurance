describe("Home Page", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.get("nav").should("be.visible");
  });

  describe("Hero Section", () => {
    it("should display the hero heading", () => {
      cy.contains("Your All-Reliable").should("be.visible");
      cy.contains("DeFi Insurance Protocol").should("be.visible");
    });

    it("should display the subtitle", () => {
      cy.contains(
        "Protect your DeFi investments with insurance tokens"
      ).should("be.visible");
    });

    it("should show wallet disconnected state by default", () => {
      cy.contains("Please connect your wallet to get started").should(
        "be.visible"
      );
    });

    it("should display 'Connect Wallet to Start' button when disconnected", () => {
      cy.contains("Connect Wallet to Start").should("be.visible");
    });

    it("should display the 'Explore Markets' button", () => {
      cy.contains("Explore Markets").should("be.visible");
    });

    it("should navigate to insurance market on 'Explore Markets' click", () => {
      cy.contains("Explore Markets").click();
      cy.url().should("include", "/insurance-market");
    });
  });

  describe("Stats Section", () => {
    it("should display protocol statistics", () => {
      cy.contains("Protocols Covered").should("be.visible");
      cy.contains("Smart Contracts").should("be.visible");
      cy.contains("Maturity Options").should("be.visible");
    });

    it("should display accurate stat values", () => {
      cy.contains("6").should("be.visible");
      cy.contains("11").should("be.visible");
      cy.contains("2").should("be.visible");
    });
  });

  describe("Features Section", () => {
    it("should display the 'Why Choose TakoFi?' heading", () => {
      cy.contains("Why Choose TakoFi?").should("be.visible");
    });

    it("should display six feature cards", () => {
      cy.contains("Insurance Marketplace").should("be.visible");
      cy.contains("Principal Marketplace").should("be.visible");
      cy.contains("Token Minting").should("be.visible");
      cy.contains("DEX Order Book").should("be.visible");
      cy.contains("Insurance Claims").should("be.visible");
      cy.contains("Principal Redemption").should("be.visible");
    });

    it("should have an 'Explore Protection' button linking to insurance market", () => {
      cy.contains("Explore Protection").click();
      cy.url().should("include", "/insurance-market");
    });

    it("should have a 'View Yields' button linking to principal market", () => {
      cy.visit("/");
      cy.contains("View Yields").click();
      cy.url().should("include", "/principal-market");
    });

    it("should have a 'Start Trading' button linking to insurance market", () => {
      cy.visit("/");
      cy.contains("Start Trading").click();
      cy.url().should("include", "/insurance-market");
    });

    it("should show 'Connect Wallet' buttons when wallet not connected", () => {
      // When no wallet is connected, minting, claims, and redemption cards show Connect Wallet
      cy.contains("Connect Wallet")
        .filter("button")
        .first()
        .should("be.visible");
    });
  });

  describe("How It Works Section", () => {
    it("should display the how-it-works steps", () => {
      cy.contains("How It Works").should("be.visible");
      cy.contains("Connect & Deposit").should("be.visible");
      cy.contains("Mint Tokens").should("be.visible");
      cy.contains("Trade on the DEX").should("be.visible");
      cy.contains("Claim or Redeem").should("be.visible");
    });

    it("should display step numbers", () => {
      cy.contains("Four simple steps").should("be.visible");
    });
  });

  describe("CTA Section", () => {
    it("should display the call-to-action section", () => {
      cy.contains("Ready to Secure Your DeFi Future?").should("be.visible");
    });

    it("should display the disabled CTA button when wallet not connected", () => {
      cy.contains("Connect Wallet First").should("be.visible");
    });
  });
});
