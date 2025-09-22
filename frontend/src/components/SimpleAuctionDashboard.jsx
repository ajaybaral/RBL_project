import React, { useState, useEffect } from 'react'
import { getAllAuctions, placeBid, withdrawRefund, withdrawSellerProceeds, endAuction } from '../ethersContract'

export default function SimpleAuctionDashboard({ account, onRefresh }) {
  const [auctions, setAuctions] = useState([])
  const [loading, setLoading] = useState(false)
  const [bidAmounts, setBidAmounts] = useState({})
  const [selectedAuction, setSelectedAuction] = useState(null)

  useEffect(() => {
    loadAuctions()
  }, [])

  const loadAuctions = async () => {
    try {
      setLoading(true)
      const auctionList = await getAllAuctions()
      setAuctions(auctionList)
    } catch (error) {
      console.error('Error loading auctions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBid = async (auctionId) => {
    if (!account) {
      alert('Please connect your wallet first')
      return
    }
    
    const bidAmount = bidAmounts[auctionId]
    if (!bidAmount || parseFloat(bidAmount) <= 0) {
      alert('Please enter a valid bid amount')
      return
    }

    try {
      setLoading(true)
      await placeBid(auctionId, bidAmount)
      setBidAmounts({ ...bidAmounts, [auctionId]: '' })
      await loadAuctions() // Refresh after bid
      alert('Bid placed successfully!')
    } catch (error) {
      console.error('Error placing bid:', error)
      alert('Error placing bid: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleWithdrawRefund = async (auctionId) => {
    try {
      setLoading(true)
      await withdrawRefund(auctionId)
      await loadAuctions()
      alert('Refund withdrawn successfully!')
    } catch (error) {
      console.error('Error withdrawing refund:', error)
      alert('Error withdrawing refund: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleWithdrawProceeds = async () => {
    try {
      setLoading(true)
      await withdrawSellerProceeds()
      await loadAuctions()
      alert('Proceeds withdrawn successfully!')
    } catch (error) {
      console.error('Error withdrawing proceeds:', error)
      alert('Error withdrawing proceeds: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEndAuction = async (auctionId) => {
    try {
      setLoading(true)
      await endAuction(auctionId)
      await loadAuctions()
      alert('Auction ended successfully!')
    } catch (error) {
      console.error('Error ending auction:', error)
      alert('Error ending auction: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString()
  }

  const getTimeRemaining = (endTime) => {
    const now = Math.floor(Date.now() / 1000)
    const remain = Math.max(0, endTime - now)
    const hours = Math.floor(remain / 3600)
    const minutes = Math.floor((remain % 3600) / 60)
    const seconds = remain % 60
    return `${hours}h ${minutes}m ${seconds}s`
  }

  const isActive = (auction) => {
    const now = Math.floor(Date.now() / 1000)
    return !auction.ended && now >= auction.startTime && now < auction.endTime
  }

  const canEnd = (auction) => {
    const now = Math.floor(Date.now() / 1000)
    return !auction.ended && now >= auction.endTime
  }

  const isSeller = (auction) => {
    return account && auction.seller.toLowerCase() === account.toLowerCase()
  }

  const isHighestBidder = (auction) => {
    return account && auction.currentHighestBidder.toLowerCase() === account.toLowerCase()
  }

  if (loading && auctions.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading auctions...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Simple Auction Platform</h2>
        <button 
          onClick={loadAuctions} 
          className="btn-secondary flex items-center space-x-2"
          disabled={loading}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      {auctions.length === 0 ? (
        <div className="card">
          <div className="text-center py-8">
            <p className="text-gray-500">No auctions found. Create one to get started!</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6">
          {auctions.map((auction) => (
            <div key={auction.id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Auction #{auction.id}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Seller: {auction.seller.slice(0, 6)}...{auction.seller.slice(-4)}
                  </p>
                  {auction.ipfsCid && (
                    <p className="text-sm text-blue-600 mt-1">
                      <a 
                        href={`https://ipfs.io/ipfs/${auction.ipfsCid}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        View Item Details (IPFS)
                      </a>
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    auction.ended ? 'bg-red-100 text-red-800' : 
                    isActive(auction) ? 'bg-green-100 text-green-800' : 
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {auction.ended ? 'Ended' : 
                     isActive(auction) ? 'Active' : 
                     'Not Started'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="metric-card">
                  <div className="metric-label">Current Bid</div>
                  <div className="metric-value text-blue-600">
                    {(Number(auction.currentHighestBid || 0) / 1e18).toFixed(4)} ETH
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Reserve Price</div>
                  <div className="metric-value text-gray-600">
                    {(Number(auction.reservePrice || 0) / 1e18).toFixed(4)} ETH
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Ends In</div>
                  <div className="metric-value text-orange-600">
                    {auction.ended ? 'Ended' : getTimeRemaining(auction.endTime)}
                  </div>
                </div>
              </div>

              {auction.currentHighestBidder !== '0x0000000000000000000000000000000000000000' && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">
                    Highest Bidder: {auction.currentHighestBidder.slice(0, 6)}...{auction.currentHighestBidder.slice(-4)}
                  </div>
                </div>
              )}

              {isActive(auction) && (
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={bidAmounts[auction.id] || ''}
                    onChange={(e) => setBidAmounts({ ...bidAmounts, [auction.id]: e.target.value })}
                    className="input-field flex-1"
                    placeholder="Bid amount in ETH"
                  />
                  <button
                    disabled={!account || loading}
                    onClick={() => handleBid(auction.id)}
                    className="btn-primary w-full sm:w-auto"
                  >
                    {loading ? 'Placing...' : 'Place Bid'}
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {canEnd(auction) && (
                  <button
                    disabled={loading}
                    onClick={() => handleEndAuction(auction.id)}
                    className="btn-danger"
                  >
                    End Auction
                  </button>
                )}
                
                {isSeller(auction) && (
                  <button
                    disabled={loading}
                    onClick={handleWithdrawProceeds}
                    className="btn-secondary"
                  >
                    Withdraw Proceeds
                  </button>
                )}

                {isHighestBidder(auction) && !auction.ended && (
                  <button
                    disabled={loading}
                    onClick={() => handleWithdrawRefund(auction.id)}
                    className="btn-secondary"
                  >
                    Withdraw Refund
                  </button>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
                <div>Start: {formatTime(auction.startTime)}</div>
                <div>End: {formatTime(auction.endTime)}</div>
                <div>Min Increment: {(Number(auction.minIncrement || 0) / 1e18).toFixed(4)} ETH</div>
                {auction.buyItNowPrice > 0 && (
                  <div>Buy It Now: {(Number(auction.buyItNowPrice) / 1e18).toFixed(4)} ETH</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
