// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that,
// Hardhat will compile your contracts, add the Hardhat Runtime Environment's
// members to the global scope, and execute the script.
const hre = require("hardhat");

async function main() {
  console.log("Deploying ContributionTracker contract...");

  // Get the contract factory
  const ContributionTracker = await hre.ethers.getContractFactory("ContributionTracker");

  // Deploy the contract
  // The deployer account (usually the first account in Hardhat Network) will be the owner
  const contributionTracker = await ContributionTracker.deploy();

  // Wait for the deployment transaction to be mined
  await contributionTracker.waitForDeployment();

  // Get the contract address
  const contractAddress = await contributionTracker.getAddress();
  
  console.log(
    `ContributionTracker deployed to: ${contractAddress}`
  );

  // Optional: You can add verification logic here if deploying to a testnet/mainnet
  // using @nomicfoundation/hardhat-verify
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 