describe("Mint Tokens Page", () => {
  beforeEach(() => {
    cy.visit("/mint-tokens");
    cy.get("nav").should("be.visible");
  });

  describe("Page Layout", () => {
    it("should display the page title", () => {
      cy.contains("Mint Insurance Tokens").should("be.visible");
    });

    it("should display the 'How it works' explanatory card", () => {
      cy.contains("How it works").should("be.visible");
      cy.contains("Select a protocol to mint insurance tokens for").should(
        "be.visible"
      );
      cy.contains("Choose a maturity bucket").should("be.visible");
      cy.contains("Enter USDT/USDC amount to mint tokens").should(
        "be.visible"
      );
      cy.contains("Receive both Insurance and Principal tokens").should(
        "be.visible"
      );
    });
  });

  describe("Protocol Selection", () => {
    it("should display the protocol selector", () => {
      // The selector shows protocol names; first protocol is SushiSwap
      cy.contains("SushiSwap").should("be.visible");
    });

    it("should show protocol options when clicking the selector", () => {
      // ProtocolSelector uses MUI Select – click the combobox to open the dropdown
      cy.get('[role="combobox"]').first().click();
      cy.get('[role="listbox"]').should("be.visible");
      cy.get('[role="option"]').should("have.length.greaterThan", 1);
    });
  });

  describe("Maturity Selection", () => {
    it("should display both maturity options", () => {
      cy.contains("6-Month").should("be.visible");
      cy.contains("12-Month").should("be.visible");
    });

    it("should display 'Select Token Maturity' label", () => {
      cy.contains("Select Token Maturity").should("be.visible");
    });

    it("should highlight the selected maturity card", () => {
      // 6-Month is selected by default (has orange border)
      cy.contains("6-Month")
        .parents("[class*='MuiCard']")
        .first()
        .should("have.css", "border-color")
        .and("not.eq", "transparent");
    });
  });

  describe("Token Input", () => {
    it("should display the stablecoin selector (USDT/USDC)", () => {
      cy.contains("USDT").should("be.visible");
    });

    it("should display the amount input field", () => {
      cy.get("input[placeholder='0']").should("be.visible");
    });

    it("should allow typing an amount", () => {
      cy.get("input[placeholder='0']").type("1000");
      cy.get("input[placeholder='0']").should("have.value", "1000");
    });
  });

  describe("Output Display", () => {
    it("should display Insurance Token output section", () => {
      cy.contains("Insurance Token").should("be.visible");
    });

    it("should display Principal Token output section", () => {
      cy.contains("Principal Token").should("be.visible");
    });
  });

  describe("Additional Options", () => {
    it("should display the 'Send to another address' toggle", () => {
      cy.contains("Send to another address").should("be.visible");
    });

    it("should show recipient field when toggle is enabled", () => {
      // Find and click the switch
      cy.contains("Send to another address")
        .parent()
        .find('input[type="checkbox"]')
        .click({ force: true });
      cy.get("input[placeholder='Enter recipient address']").should(
        "be.visible"
      );
    });
  });

  describe("Fee & Transaction Info", () => {
    it("should display protocol fee as 0%", () => {
      cy.contains("Protocol fee (0%)").should("be.visible");
    });

    it("should display the 'You'll receive' label", () => {
      cy.contains("You'll receive").should("be.visible");
    });
  });

  describe("Wallet Connection State", () => {
    it("should show connect wallet button when not connected", () => {
      // When no wallet is connected the mint button should say 'Connect wallet'
      cy.contains("button", /connect wallet/i).should("be.visible");
    });
  });
});
