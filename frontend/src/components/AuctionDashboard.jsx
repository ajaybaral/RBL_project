import React, { useMemo, useState } from 'react'

export default function AuctionDashboard({ account, owner, state, onRefresh, onBid, onEnd, loading }) {
  const [bidEth, setBidEth] = useState('0.01')

  const timeRemaining = useMemo(() => {
    const now = Math.floor(Date.now() / 1000)
    const remain = Math.max(0, (state?.endTime || 0) - now)
    const m = Math.floor(remain / 60)
    const s = remain % 60
    return `${m}m ${s}s`
  }, [state?.endTime])

  const isOwner = account && owner && account.toLowerCase() === owner.toLowerCase()

  return (
    <div style={{ border: '1px solid #ddd', padding: 16, borderRadius: 8 }}>
      <div style={{ marginBottom: 8 }}>
        <strong>Highest bid</strong>: {Number(state.highestBid)/1e18} ETH
      </div>
      <div style={{ marginBottom: 8 }}>
        <strong>Highest bidder</strong>: {state.highestBidder || '-'}
      </div>
      <div style={{ marginBottom: 8 }}>
        <strong>Ends in</strong>: {timeRemaining} {state.ended ? '(ended)' : ''}
      </div>
      <div style={{ marginBottom: 16 }}>
        <button onClick={onRefresh}>Refresh</button>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
        <input type="number" min="0" step="0.001" value={bidEth} onChange={(e)=>setBidEth(e.target.value)} />
        <button disabled={!account || loading} onClick={()=>onBid(bidEth)}>Place Bid</button>
      </div>

      {isOwner && (
        <div>
          <button disabled={loading} onClick={onEnd}>End Auction (Owner)</button>
        </div>
      )}
    </div>
  )}


