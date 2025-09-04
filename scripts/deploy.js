// Advanced deployment script for Auction Manager
const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const now = Math.floor(Date.now() / 1000);
  const endTimestamp = now + 5 * 60; // 5 minutes from now for demo

  const Auction = await hre.ethers.getContractFactory("Auction");
  const auction = await Auction.deploy(endTimestamp);
  await auction.waitForDeployment();

  const address = await auction.getAddress();
  console.log("\n=== Auction Manager Deployed ===");
  console.log("Contract address:", address);
  console.log("Default auction (id 0) end time:", endTimestamp);
  console.log("Deployer (owner):", deployer.address);

  // Create additional demo auctions
  console.log("\n=== Creating Demo Auctions ===");
  
  // English auction with reserve and min increment
  const start1 = now + 10;
  const end1 = start1 + 300; // 5 min
  const tx1 = await auction.createAuction(0, start1, end1, 0, ethers.parseEther("0.1"), ethers.parseEther("0.01"), 0, 0, 0);
  await tx1.wait();
  console.log("English auction created (id 1): reserve 0.1 ETH, min increment 0.01 ETH");

  // Sealed-bid auction
  const start2 = now + 15;
  const commitEnd2 = start2 + 180; // 3 min commit
  const revealEnd2 = commitEnd2 + 120; // 2 min reveal
  const tx2 = await auction.createAuction(1, start2, commitEnd2, revealEnd2, ethers.parseEther("0.2"), ethers.parseEther("0.05"), 0, 0, 0);
  await tx2.wait();
  console.log("Sealed-bid auction created (id 2): reserve 0.2 ETH, min increment 0.05 ETH");

  // English auction with buy-it-now and anti-sniping
  const start3 = now + 20;
  const end3 = start3 + 240; // 4 min
  const tx3 = await auction.createAuction(0, start3, end3, 0, ethers.parseEther("0.15"), ethers.parseEther("0.02"), ethers.parseEther("0.5"), 60, 120);
  await tx3.wait();
  console.log("English auction with buy-it-now created (id 3): reserve 0.15 ETH, buy-now 0.5 ETH, anti-sniping 60s window + 120s extension");

  console.log("\n=== Deployment Complete ===");
  console.log("Total auctions created:", (await auction.auctionsCount()).toString());
  console.log("\nTo interact with auctions:");
  console.log("- Use auction ID 0 for legacy compatibility");
  console.log("- Use auction IDs 1-3 for new features");
  console.log("- Backend endpoints available at /create-auction, /auctions, /bid/:id, /end/:id");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


