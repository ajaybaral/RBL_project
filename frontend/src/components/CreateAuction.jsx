import React, { useState } from 'react'
import { createAuction } from '../ethersContract'

export default function CreateAuction({ account, onAuctionCreated }) {
  const [formData, setFormData] = useState({
    startTime: '',
    endTime: '',
    reservePrice: '0.01',
    minIncrement: '0.001',
    buyItNowPrice: '0',
    antiSnipingWindow: '30',
    antiSnipingExtension: '60',
    ipfsCid: ''
  })
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!account) {
      alert('Please connect your wallet first')
      return
    }

    try {
      setLoading(true)
      
      // Convert times to Unix timestamps
      const startTimestamp = Math.floor(new Date(formData.startTime).getTime() / 1000)
      const endTimestamp = Math.floor(new Date(formData.endTime).getTime() / 1000)
      
      // Validate times
      const now = Math.floor(Date.now() / 1000)
      if (startTimestamp < now) {
        alert('Start time must be in the future')
        return
      }
      
      if (endTimestamp <= startTimestamp) {
        alert('End time must be after start time')
        return
      }

      // Create auction
      await createAuction(
        startTimestamp,
        endTimestamp,
        ethers.parseEther(formData.reservePrice),
        ethers.parseEther(formData.minIncrement),
        ethers.parseEther(formData.buyItNowPrice),
        parseInt(formData.antiSnipingWindow),
        parseInt(formData.antiSnipingExtension),
        formData.ipfsCid
      )

      alert('Auction created successfully!')
      
      // Reset form
      setFormData({
        startTime: '',
        endTime: '',
        reservePrice: '0.01',
        minIncrement: '0.001',
        buyItNowPrice: '0',
        antiSnipingWindow: '30',
        antiSnipingExtension: '60',
        ipfsCid: ''
      })
      setShowForm(false)
      
      // Notify parent component
      if (onAuctionCreated) {
        onAuctionCreated()
      }
      
    } catch (error) {
      console.error('Error creating auction:', error)
      alert('Error creating auction: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const getDefaultTimes = () => {
    const now = new Date()
    const start = new Date(now.getTime() + 60000) // 1 minute from now
    const end = new Date(now.getTime() + 30 * 60000) // 30 minutes from now
    
    return {
      start: start.toISOString().slice(0, 16), // Format for datetime-local input
      end: end.toISOString().slice(0, 16)
    }
  }

  const defaultTimes = getDefaultTimes()

  if (!showForm) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ready to Sell?</h3>
          <p className="text-gray-600 mb-6">Create a new auction and let bidders compete for your item.</p>
          <button
            onClick={() => setShowForm(true)}
            disabled={!account}
            className="btn-primary"
          >
            Create New Auction
          </button>
          {!account && (
            <p className="text-sm text-red-600 mt-2">Please connect your wallet first</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Create New Auction</h3>
        <button
          onClick={() => setShowForm(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Time
            </label>
            <input
              type="datetime-local"
              name="startTime"
              value={formData.startTime || defaultTimes.start}
              onChange={handleInputChange}
              className="input-field"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Time
            </label>
            <input
              type="datetime-local"
              name="endTime"
              value={formData.endTime || defaultTimes.end}
              onChange={handleInputChange}
              className="input-field"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reserve Price (ETH)
            </label>
            <input
              type="number"
              name="reservePrice"
              value={formData.reservePrice}
              onChange={handleInputChange}
              className="input-field"
              min="0"
              step="0.001"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Bid Increment (ETH)
            </label>
            <input
              type="number"
              name="minIncrement"
              value={formData.minIncrement}
              onChange={handleInputChange}
              className="input-field"
              min="0"
              step="0.001"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Buy It Now Price (ETH) - Leave 0 to disable
          </label>
          <input
            type="number"
            name="buyItNowPrice"
            value={formData.buyItNowPrice}
            onChange={handleInputChange}
            className="input-field"
            min="0"
            step="0.001"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Anti-Sniping Window (seconds)
            </label>
            <input
              type="number"
              name="antiSnipingWindow"
              value={formData.antiSnipingWindow}
              onChange={handleInputChange}
              className="input-field"
              min="0"
              placeholder="30"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Anti-Sniping Extension (seconds)
            </label>
            <input
              type="number"
              name="antiSnipingExtension"
              value={formData.antiSnipingExtension}
              onChange={handleInputChange}
              className="input-field"
              min="0"
              placeholder="60"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            IPFS CID (for item metadata)
          </label>
          <input
            type="text"
            name="ipfsCid"
            value={formData.ipfsCid}
            onChange={handleInputChange}
            className="input-field"
            placeholder="QmYourIpfsCidHere"
          />
          <p className="text-xs text-gray-500 mt-1">
            Upload your item image/details to IPFS and paste the CID here
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading || !account}
            className="btn-primary flex-1"
          >
            {loading ? 'Creating...' : 'Create Auction'}
          </button>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>

        {!account && (
          <p className="text-sm text-red-600 text-center">Please connect your wallet first</p>
        )}
      </form>
    </div>
  )
}
