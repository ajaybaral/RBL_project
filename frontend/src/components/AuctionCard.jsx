import React, { useMemo } from 'react';

export default function AuctionCard({ auction, onBid, onEnd, loading, account, owner }) {
	const [bidAmount, setBidAmount] = React.useState('0.01');

	const timeRemaining = useMemo(() => {
		const now = Math.floor(Date.now() / 1000);
		const remain = Math.max(0, (auction?.biddingEndTime || 0) - now);
		const hours = Math.floor(remain / 3600);
		const minutes = Math.floor((remain % 3600) / 60);
		const seconds = remain % 60;
		
		if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
		if (minutes > 0) return `${minutes}m ${seconds}s`;
		return `${seconds}s`;
	}, [auction?.biddingEndTime]);

	const isOwner = account && owner && account.toLowerCase() === owner.toLowerCase();
	const isActive = auction?.active && !auction?.ended;
	const canBid = isActive && account && !loading;

	const getAuctionTypeLabel = (type) => {
		const types = {
			0: 'English',
			1: 'Sealed-Bid',
			2: 'Dutch',
			3: 'Vickrey'
		};
		return types[type] || 'Unknown';
	};

	const getStatusBadge = () => {
		if (auction?.ended) return <span className="status-badge status-ended">Ended</span>;
		if (isActive) return <span className="status-badge status-active">Active</span>;
		return <span className="status-badge status-pending">Pending</span>;
	};

	return (
		<div className="auction-card fade-in bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-105">
			{/* Header */}
			<div className="flex items-start justify-between mb-5">
				<div>
					<h3 className="text-2xl font-bold text-gray-900 text-shadow">Auction #{auction?.auctionId}</h3>
					<p className="text-sm font-medium text-gray-600 mt-1">{getAuctionTypeLabel(auction?.auctionType)} Auction</p>
				</div>
				{getStatusBadge()}
			</div>

			{/* Metrics */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
				<div className="space-y-4">
					<div className="metric-card">
						<label className="metric-label">Highest Bid</label>
						<p className="metric-value text-blue-600">{(Number(auction?.highestBid || 0) / 1e18).toFixed(4)} ETH</p>
					</div>
					<div className="metric-card">
						<label className="metric-label">Highest Bidder</label>
						<p className="text-sm font-mono text-gray-900 bg-gray-100 px-3 py-2 rounded-lg truncate">
							{auction?.highestBidder ? `${auction.highestBidder.slice(0, 6)}...${auction.highestBidder.slice(-4)}` : 'No bids yet'}
						</p>
					</div>
				</div>

				<div className="space-y-4">
					<div className="metric-card">
						<label className="metric-label">Time Remaining</label>
						<p className="metric-value text-orange-600">{timeRemaining}</p>
					</div>
					<div className="metric-card">
						<label className="metric-label">Reserve Price</label>
						<p className="text-lg font-bold text-gray-900">{(Number(auction?.reservePrice || 0) / 1e18).toFixed(4)} ETH</p>
					</div>
				</div>
			</div>

			{/* Min increment note */}
			{auction?.minIncrement && Number(auction.minIncrement) > 0 && (
				<div className="mb-4 text-xs text-gray-500">Minimum increment: {(Number(auction.minIncrement) / 1e18).toFixed(4)} ETH</div>
			)}

			{/* Buy Now */}
			{auction?.buyItNowPrice && Number(auction.buyItNowPrice) > 0 && (
				<div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl shadow-lg">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-semibold text-yellow-800">Buy It Now</p>
							<p className="text-xl font-bold text-yellow-900">{(Number(auction.buyItNowPrice) / 1e18).toFixed(4)} ETH</p>
						</div>
						{canBid && (
							<button onClick={() => onBid(auction.auctionId, Number(auction.buyItNowPrice) / 1e18)} disabled={loading} className="btn-warning">
								Buy Now
							</button>
						)}
					</div>
				</div>
			)}

			{/* Bid controls */}
			{isActive && (
				<div className="space-y-3">
					<div className="flex space-x-2">
						<input
							type="number"
							min="0"
							step="0.001"
							value={bidAmount}
							onChange={(e) => setBidAmount(e.target.value)}
							className="flex-1 input-field"
							placeholder="Bid amount in ETH"
						/>
						<button onClick={() => onBid(auction.auctionId, bidAmount)} disabled={!canBid || !bidAmount || Number(bidAmount) <= 0} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
							{loading ? 'Placing...' : 'Place Bid'}
						</button>
					</div>
				</div>
			)}

			{/* Owner controls */}
			{isOwner && !auction?.ended && (
				<div className="mt-5 pt-4 border-t border-gray-200">
					<button onClick={() => onEnd(auction.auctionId)} disabled={loading} className="btn-danger w-full">
						{loading ? 'Ending...' : 'End Auction (Owner)'}
					</button>
				</div>
			)}

			{/* NFT badge */}
			{auction?.nftAddress && auction.nftAddress !== '0x0000000000000000000000000000000000000000' && (
				<div className="mt-4 pt-4 border-t border-gray-200">
					<div className="flex items-center space-x-2">
						<svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
						</svg>
						<span className="text-sm font-medium text-purple-600">NFT Auction</span>
					</div>
					<p className="text-xs text-gray-500 mt-1">Token ID: {auction.tokenId} | Amount: {auction.tokenAmount}</p>
				</div>
			)}
		</div>
	);
}
