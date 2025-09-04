const hre = require("hardhat");

async function main() {
  const address = process.env.CONTRACT_ADDRESS;
  if (!address) throw new Error('Set CONTRACT_ADDRESS env');
  const endTimestamp = process.env.END_TIMESTAMP || Math.floor(Date.now() / 1000) + 300;

  console.log('Verifying contract at', address);
  await hre.run('verify:verify', {
    address,
    constructorArguments: [Number(endTimestamp)]
  });
  console.log('Verification submitted');
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
