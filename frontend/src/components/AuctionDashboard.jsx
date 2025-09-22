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
		<div className="card">
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-lg font-semibold text-gray-900">Legacy Auction (ID: 0)</h3>
				<button onClick={onRefresh} className="btn-secondary flex items-center space-x-2" disabled={loading}>
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
					</svg>
					<span>Refresh</span>
				</button>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
				<div className="metric-card">
					<div className="metric-label">Highest Bid</div>
					<div className="metric-value text-blue-600">{(Number(state?.highestBid || 0) / 1e18).toFixed(4)} ETH</div>
				</div>
				<div className="metric-card">
					<div className="metric-label">Highest Bidder</div>
					<div className="text-sm font-mono text-gray-900 bg-gray-100 px-3 py-2 rounded-lg truncate">{state?.highestBidder || '-'}</div>
				</div>
				<div className="metric-card">
					<div className="metric-label">Ends In</div>
					<div className="metric-value text-orange-600">{timeRemaining} {state?.ended ? '(ended)' : ''}</div>
				</div>
			</div>

			<div className="flex flex-col sm:flex-row gap-3 items-center">
				<input
					type="number"
					min="0"
					step="0.001"
					value={bidEth}
					onChange={(e)=>setBidEth(e.target.value)}
					className="input-field flex-1"
					placeholder="Bid amount in ETH"
				/>
				<button disabled={!account || loading} onClick={()=>onBid(bidEth)} className="btn-primary w-full sm:w-auto">
					{loading ? 'Placing...' : 'Place Bid'}
				</button>
			</div>

			{isOwner && (
				<div className="mt-6 pt-4 border-t border-gray-200">
					<button disabled={loading} onClick={onEnd} className="btn-danger w-full">
						{loading ? 'Ending...' : 'End Auction (Owner)'}
					</button>
				</div>
			)}
		</div>
	)
}


