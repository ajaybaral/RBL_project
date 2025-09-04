// Quick setup script to configure frontend with contract address
const fs = require('fs');
const path = require('path');

console.log('🔧 Frontend Setup Helper');
console.log('========================');

// Check if contract address is provided
const contractAddress = process.argv[2];

if (!contractAddress) {
  console.log('❌ Please provide contract address:');
  console.log('   node setup-frontend.js <CONTRACT_ADDRESS>');
  console.log('');
  console.log('📋 To get contract address:');
  console.log('   1. Deploy: npx hardhat run scripts/deploy.js --network localhost');
  console.log('   2. Copy the contract address from output');
  console.log('   3. Run: node setup-frontend.js <CONTRACT_ADDRESS>');
  process.exit(1);
}

// Validate address format
if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
  console.log('❌ Invalid contract address format');
  console.log('   Expected: 0x followed by 40 hex characters');
  process.exit(1);
}

// Create .env file in frontend directory
const frontendEnvPath = path.join(__dirname, 'frontend', '.env');
const envContent = `VITE_CONTRACT_ADDRESS=${contractAddress}\n`;

try {
  fs.writeFileSync(frontendEnvPath, envContent);
  console.log('✅ Frontend configured successfully!');
  console.log(`   Contract address: ${contractAddress}`);
  console.log(`   Environment file: ${frontendEnvPath}`);
  console.log('');
  console.log('🚀 Next steps:');
  console.log('   1. cd frontend');
  console.log('   2. npm install');
  console.log('   3. npm run dev');
  console.log('');
  console.log('💡 Make sure your Hardhat node is running:');
  console.log('   npx hardhat node');
} catch (error) {
  console.log('❌ Error writing environment file:', error.message);
  process.exit(1);
}
