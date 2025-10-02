const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("TokenMintingModule", (m) => {
  // Use deployed MockStablecoin addresses for localhost testing
  const usdtAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"; // MockUSDT
  const usdcAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // MockUSDC

  // Deploy the ProtocolInsurance contract
  // Constructor will automatically set up SushiSwap, Uniswap, Curve, Aave, Compound, MakerDAO protocols
  const protocolInsurance = m.contract("ProtocolInsurance", [
    usdtAddress,
    usdcAddress,
  ]);

  return { protocolInsurance };
});
