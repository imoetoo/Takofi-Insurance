import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ClaimManagerModule", (m) => {
  // You need to pass the deployed ProtocolInsurance contract address
  // This should be deployed first using the TokenMinting module
  const protocolInsuranceAddress = m.getParameter(
    "protocolInsuranceAddress",
    "0x0000000000000000000000000000000000000000", // Placeholder - will be set during deployment
  );

  // Deploy ClaimManager contract
  const claimManager = m.contract("ClaimManager", [protocolInsuranceAddress]);

  return { claimManager };
});
