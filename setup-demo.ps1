# Simple Web3 Auction Platform - Demo Setup Script
# Run this script to set up the demo environment

Write-Host "🏆 Setting up Simple Web3 Auction Platform Demo..." -ForegroundColor Cyan

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Please run this script from the RBL_project directory" -ForegroundColor Red
    exit 1
}

Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

Write-Host "🔨 Compiling smart contracts..." -ForegroundColor Yellow
npx hardhat compile

Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Next steps:" -ForegroundColor Cyan
Write-Host "1. Start Hardhat node: npx hardhat node" -ForegroundColor White
Write-Host "2. Deploy contract: npx hardhat run scripts/deploy_simple.js --network localhost" -ForegroundColor White
Write-Host "3. Start frontend: cd frontend && npm install && npm run dev" -ForegroundColor White
Write-Host "4. Open browser: http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "📋 Demo script available at: DEMO_SCRIPT.md" -ForegroundColor Cyan
