// Example script to place a bid using a JSON-RPC provider (localhost)
require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "http://127.0.0.1:8545");
  const privateKey = process.env.PRIVATE_KEY; // Use one of Hardhat local accounts for demo
  const contractAddress = process.env.CONTRACT_ADDRESS;
  const bidEth = process.env.BID_ETH || "0.01";

  if (!privateKey || !contractAddress) {
    throw new Error("Missing PRIVATE_KEY or CONTRACT_ADDRESS in env");
  }

  const wallet = new ethers.Wallet(privateKey, provider);

  const abi = [
    "function bid() external payable",
  ];

  const contract = new ethers.Contract(contractAddress, abi, wallet);
  console.log(`Placing bid of ${bidEth} ETH...`);
  const tx = await contract.bid({ value: ethers.parseEther(bidEth) });
  const receipt = await tx.wait();
  console.log("Bid tx mined in block:", receipt.blockNumber);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


