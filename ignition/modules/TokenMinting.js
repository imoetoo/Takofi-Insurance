const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("TokenMintingModule", (m) => {
  // Use deployed MockStablecoin addresses for localhost testing
  const usdtAddress = "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0"; // MockUSDT
  const usdcAddress = "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e"; // MockUSDC

  // Deploy the ProtocolInsurance contract
  // Constructor will automatically set up SushiSwap, Uniswap, and Curve protocols
  const protocolInsurance = m.contract("ProtocolInsurance", [
    usdtAddress,
    usdcAddress,
  ]);

  return { protocolInsurance };
});
