require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1, // lower runs implies higher deployment cost but smaller contract size (max contract size is 24576)
      },
      viaIR: true, // Enable IR-based compiler to avoid "Stack too deep" errors
    },
  },
};
