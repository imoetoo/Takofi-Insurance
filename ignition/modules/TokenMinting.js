import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import MockStablecoinsModule from "./MockStablecoins.js";

export default buildModule("TokenMintingModule", (m) => {
  // Get the deployed MockStablecoin contracts from the MockStablecoins module
  const { USDT, USDC } = m.useModule(MockStablecoinsModule);

  // Deploy the ProtocolInsurance contract
  // Constructor will automatically set up SushiSwap, Uniswap, Curve, Aave, Compound, PancakeSwap protocols
  const protocolInsurance = m.contract("ProtocolInsurance", [USDT, USDC]);

  return { protocolInsurance };
});
