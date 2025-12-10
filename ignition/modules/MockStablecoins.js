import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("MockStablecoinsModule", (m) => {
  const specs = [
    {name: "Mock Tether USD", symbol: "USDT", decimals: 6},
    {name: "Mock USD Coin", symbol: "USDC", decimals: 6},
  ];

  const deployed = {};

  for (const spec of specs) {
    const id = `Mock${spec.symbol}`;
    deployed[spec.symbol] = m.contract(
      "MockStablecoin",
      [spec.name, spec.symbol, spec.decimals],
      { id }
    );
  }

  return deployed; //{USDT, USDC}
});
