import React, { useState } from 'react';

export default function MetaMaskSetup() {
  const [currentStep, setCurrentStep] = useState(1);

  const steps = [
    {
      id: 1,
      title: "Install MetaMask",
      description: "Download and install the MetaMask browser extension",
      content: (
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Install MetaMask Extension</h3>
            <p className="text-gray-600 mb-4">
              MetaMask is a browser extension that allows you to interact with Ethereum applications.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <span className="font-medium">Chrome</span>
            </a>
            
            <a
              href="https://addons.mozilla.org/en-US/firefox/addon/ether-metamask/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <span className="font-medium">Firefox</span>
            </a>
            
            <a
              href="https://microsoftedge.microsoft.com/addons/detail/metamask/ejbalbakoplchlghecdalmeeeajnimhm"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <span className="font-medium">Edge</span>
            </a>
          </div>
        </div>
      )
    },
    {
      id: 2,
      title: "Create Wallet",
      description: "Set up your MetaMask wallet",
      content: (
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Create Your Wallet</h3>
            <p className="text-gray-600 mb-4">
              Follow these steps to create your MetaMask wallet:
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">1</div>
              <div>
                <p className="font-medium text-gray-900">Click "Create a new wallet"</p>
                <p className="text-sm text-gray-600">Choose to create a new wallet when prompted</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">2</div>
              <div>
                <p className="font-medium text-gray-900">Set a strong password</p>
                <p className="text-sm text-gray-600">Create a secure password for your wallet</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">3</div>
              <div>
                <p className="font-medium text-gray-900">Save your seed phrase</p>
                <p className="text-sm text-gray-600">Write down your 12-word recovery phrase in a safe place</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">4</div>
              <div>
                <p className="font-medium text-gray-900">Confirm your seed phrase</p>
                <p className="text-sm text-gray-600">Verify you've saved your recovery phrase correctly</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: "Add Localhost Network",
      description: "Configure MetaMask for local development",
      content: (
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Add Localhost Network</h3>
            <p className="text-gray-600 mb-4">
              Configure MetaMask to connect to your local Hardhat network:
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">1</div>
              <div>
                <p className="font-medium text-gray-900">Click the network dropdown</p>
                <p className="text-sm text-gray-600">In MetaMask, click on the network name at the top</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">2</div>
              <div>
                <p className="font-medium text-gray-900">Add a custom network</p>
                <p className="text-sm text-gray-600">Click "Add network" or "Custom RPC"</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">3</div>
              <div>
                <p className="font-medium text-gray-900">Enter network details</p>
                <p className="text-sm text-gray-600">Use these settings:</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Network Configuration:</h4>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Network Name:</span> Localhost</div>
              <div><span className="font-medium">RPC URL:</span> http://localhost:8545</div>
              <div><span className="font-medium">Chain ID:</span> 31337</div>
              <div><span className="font-medium">Currency Symbol:</span> ETH</div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 4,
      title: "Get Test ETH",
      description: "Add test ETH to your wallet",
      content: (
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Get Test ETH</h3>
            <p className="text-gray-600 mb-4">
              You need test ETH to interact with the auction system:
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-medium">1</div>
              <div>
                <p className="font-medium text-gray-900">Start Hardhat node</p>
                <p className="text-sm text-gray-600">Run: <code className="bg-gray-100 px-1 rounded">npx hardhat node</code></p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-medium">2</div>
              <div>
                <p className="font-medium text-gray-900">Import test account</p>
                <p className="text-sm text-gray-600">Import the first Hardhat account with private key:</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Test Account Details:</h4>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Address:</span> 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266</div>
              <div><span className="font-medium">Private Key:</span> 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80</div>
              <div><span className="font-medium">Balance:</span> 10,000 ETH</div>
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">How to import:</h4>
            <div className="space-y-2 text-sm text-blue-800">
              <div>1. Click MetaMask account icon</div>
              <div>2. Select "Import Account"</div>
              <div>3. Choose "Private Key"</div>
              <div>4. Paste the private key above</div>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">MetaMask Setup Guide</h2>
        <p className="text-gray-600">Follow these steps to set up MetaMask for the auction system</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep >= step.id 
                ? 'bg-primary-600 text-white' 
                : 'bg-gray-200 text-gray-600'
            }`}>
              {step.id}
            </div>
            {index < steps.length - 1 && (
              <div className={`w-16 h-1 mx-2 ${
                currentStep > step.id ? 'bg-primary-600' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Current Step Content */}
      <div className="card">
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Step {currentStep}: {steps[currentStep - 1].title}
          </h3>
          <p className="text-gray-600">{steps[currentStep - 1].description}</p>
        </div>
        
        {steps[currentStep - 1].content}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
          className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        
        <button
          onClick={() => setCurrentStep(Math.min(steps.length, currentStep + 1))}
          disabled={currentStep === steps.length}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-600 mb-4">Need help? Check these resources:</p>
        <div className="flex justify-center space-x-4">
          <a
            href="https://metamask.io/faqs/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary-600 hover:text-primary-800 underline"
          >
            MetaMask FAQ
          </a>
          <a
            href="https://hardhat.org/hardhat-network/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary-600 hover:text-primary-800 underline"
          >
            Hardhat Network Guide
          </a>
        </div>
      </div>
    </div>
  );
}
