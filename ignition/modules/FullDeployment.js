const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("FullDeploymentModule", (m) => {
  // First: Deploy Mock Stablecoins
  const mockUSDT = m.contract(
    "MockStablecoin",
    ["Mock Tether USD", "USDT", 6],
    { id: "MockUSDT" }
  );

  const mockUSDC = m.contract("MockStablecoin", ["Mock USD Coin", "USDC", 6], {
    id: "MockUSDC",
  });

  // Second: Deploy ProtocolInsurance with the freshly deployed stablecoin addresses
  // Constructor will automatically set up SushiSwap, Uniswap, and Curve protocols with 0% fee
  const protocolInsurance = m.contract("ProtocolInsurance", [
    mockUSDT, // Use the deployed contract reference
    mockUSDC, // Use the deployed contract reference
  ]);

  return {
    mockUSDT,
    mockUSDC,
    protocolInsurance,
  };
});
