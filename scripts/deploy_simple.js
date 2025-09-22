const hre = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy the simplified Auction contract
  const Auction = await ethers.getContractFactory("Auction");
  const auction = await Auction.deploy();
  
  await auction.deployed();
  
  console.log("Auction deployed to:", auction.address);
  console.log("Deployer address:", deployer.address);
  
  // Save the deployment info
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: auction.address,
    deployer: deployer.address,
    deploymentTime: new Date().toISOString(),
    transactionHash: auction.deployTransaction.hash
  };
  
  console.log("\n=== Deployment Summary ===");
  console.log("Network:", deploymentInfo.network);
  console.log("Contract Address:", deploymentInfo.contractAddress);
  console.log("Deployer:", deploymentInfo.deployer);
  console.log("Transaction Hash:", deploymentInfo.transactionHash);
  
  console.log("\n=== Next Steps ===");
  console.log("1. Copy the contract address above");
  console.log("2. Update your frontend with the new contract address");
  console.log("3. Start your frontend: cd frontend && npm run dev");
  console.log("4. Connect MetaMask to localhost:8545");
  console.log("5. Import one of the Hardhat test accounts");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
