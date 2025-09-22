// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Simple English Auction Manager (IPFS metadata, MetaMask auth)
/// @notice Any wallet can create an auction (seller = msg.sender). Item metadata is off-chain (IPFS CID).
/// @dev Withdraw pattern used for refunds and seller proceeds. Single auction type: English.

contract Auction {
    struct AuctionItem {
        address payable seller;
        uint256 startTime;
        uint256 endTime;
        uint256 reservePrice;
        uint256 minIncrement;
        uint256 buyItNowPrice; // 0 disables
        uint256 antiSnipingWindow; // seconds within endTime that trigger extension
        uint256 antiSnipingExtension; // seconds to extend
        bool ended;
        string ipfsCid; // off-chain metadata
    }

    uint256 public auctionsCount;
    mapping(uint256 => AuctionItem) public auctions;

    // Highest bid state
    mapping(uint256 => address) public highestBidder;
    mapping(uint256 => uint256) public highestBid;

    // Pending refunds per auction per bidder
    mapping(uint256 => mapping(address => uint256)) public pendingReturns;

    // Seller proceeds (withdraw by seller)
    mapping(address => uint256) public sellerProceeds;

    // Events
    event AuctionCreated(uint256 indexed auctionId, address indexed seller, uint256 startTime, uint256 endTime, uint256 reservePrice, string ipfsCid);
    event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount);
    event AuctionExtended(uint256 indexed auctionId, uint256 newEndTime);
    event BuyItNowTriggered(uint256 indexed auctionId, address indexed buyer, uint256 amount);
    event AuctionEnded(uint256 indexed auctionId, address indexed winner, uint256 amount);
    event Withdrawn(address indexed who, uint256 amount);

    // ============ Create auction ============
    /// @notice Create a new English auction. Seller is msg.sender.
    function createAuction(
        uint256 startTime,
        uint256 endTime,
        uint256 reservePrice,
        uint256 minIncrement,
        uint256 buyItNowPrice,
        uint256 antiSnipingWindow,
        uint256 antiSnipingExtension,
        string calldata ipfsCid
    ) external returns (uint256 auctionId) {
        require(endTime > startTime, "end must be > start");
        require(startTime >= block.timestamp, "start must be >= now");
        auctionId = auctionsCount++;
        auctions[auctionId] = AuctionItem({
            seller: payable(msg.sender),
            startTime: startTime,
            endTime: endTime,
            reservePrice: reservePrice,
            minIncrement: minIncrement,
            buyItNowPrice: buyItNowPrice,
            antiSnipingWindow: antiSnipingWindow,
            antiSnipingExtension: antiSnipingExtension,
            ended: false,
            ipfsCid: ipfsCid
        });
        emit AuctionCreated(auctionId, msg.sender, startTime, endTime, reservePrice, ipfsCid);
    }

    // ============ Place bid / buy-it-now ============
    /// @notice Place a bid (English auction).
    function bid(uint256 auctionId) external payable {
        AuctionItem storage a = auctions[auctionId];
        require(!a.ended, "auction ended");
        require(block.timestamp >= a.startTime, "not started");
        require(block.timestamp < a.endTime, "already ended");

        // Buy-it-now
        if (a.buyItNowPrice > 0 && msg.value >= a.buyItNowPrice) {
            // record refund for previous highest if any
            _recordOutbidRefundIfNeeded(auctionId);
            highestBidder[auctionId] = msg.sender;
            highestBid[auctionId] = msg.value;
            a.ended = true;

            // credit seller proceeds
            sellerProceeds[a.seller] += a.buyItNowPrice;

            // refund any extra to buyer (store as pendingReturn so buyer can withdraw)
            uint256 extra = msg.value - a.buyItNowPrice;
            if (extra > 0) {
                pendingReturns[auctionId][msg.sender] += extra;
            }

            emit BuyItNowTriggered(auctionId, msg.sender, msg.value);
            emit AuctionEnded(auctionId, msg.sender, a.buyItNowPrice);
            return;
        }

        require(msg.value >= a.reservePrice, "below reserve");
        uint256 current = highestBid[auctionId];
        require(msg.value >= current + a.minIncrement, "increment too low");

        // refund previous highest via pendingReturns
        if (current != 0) {
            pendingReturns[auctionId][highestBidder[auctionId]] += current;
        }

        highestBidder[auctionId] = msg.sender;
        highestBid[auctionId] = msg.value;
        emit BidPlaced(auctionId, msg.sender, msg.value);

        // Anti-sniping: extend if within window
        if (
            a.antiSnipingWindow > 0 &&
            a.antiSnipingExtension > 0 &&
            a.endTime > block.timestamp &&
            a.endTime - block.timestamp <= a.antiSnipingWindow
        ) {
            a.endTime += a.antiSnipingExtension;
            emit AuctionExtended(auctionId, a.endTime);
        }
    }

    // ============ Withdraw (bidders + sellers) ============
    /// @notice Withdraw bidder refunds for a specific auction.
    function withdraw(uint256 auctionId) external returns (bool) {
        uint256 amount = pendingReturns[auctionId][msg.sender];
        require(amount > 0, "nothing to withdraw");
        pendingReturns[auctionId][msg.sender] = 0;
        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        require(sent, "withdraw failed");
        emit Withdrawn(msg.sender, amount);
        return true;
    }

    /// @notice Withdraw proceeds (for sellers).
    function withdrawProceeds() external returns (bool) {
        uint256 amount = sellerProceeds[msg.sender];
        require(amount > 0, "no proceeds");
        sellerProceeds[msg.sender] = 0;
        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        require(sent, "payout failed");
        emit Withdrawn(msg.sender, amount);
        return true;
    }

    // ============ End auction ============
    /// @notice End auction and credit seller if reserve met; otherwise allow winner to withdraw.
    function endAuction(uint256 auctionId) external {
        AuctionItem storage a = auctions[auctionId];
        require(!a.ended, "already ended");
        require(block.timestamp >= a.endTime, "not yet ended");
        a.ended = true;
        uint256 amount = highestBid[auctionId];
        address winner = highestBidder[auctionId];

        if (amount >= a.reservePrice && amount > 0) {
            // credit seller (withdraw pattern)
            sellerProceeds[a.seller] += amount;
            emit AuctionEnded(auctionId, winner, amount);
        } else if (amount > 0) {
            // reserve not met: allow winner to withdraw their bid
            pendingReturns[auctionId][winner] += amount;
            emit AuctionEnded(auctionId, address(0), 0);
        } else {
            // no bids
            emit AuctionEnded(auctionId, address(0), 0);
        }
    }

    // ============ Views ============
    function getAuction(uint256 auctionId) external view returns (
        address seller,
        uint256 startTime,
        uint256 endTime,
        uint256 reservePrice,
        uint256 minIncrement,
        uint256 buyItNowPrice,
        uint256 antiSnipingWindow,
        uint256 antiSnipingExtension,
        bool ended,
        string memory ipfsCid,
        address currentHighestBidder,
        uint256 currentHighestBid
    ) {
        AuctionItem storage a = auctions[auctionId];
        seller = a.seller;
        startTime = a.startTime;
        endTime = a.endTime;
        reservePrice = a.reservePrice;
        minIncrement = a.minIncrement;
        buyItNowPrice = a.buyItNowPrice;
        antiSnipingWindow = a.antiSnipingWindow;
        antiSnipingExtension = a.antiSnipingExtension;
        ended = a.ended;
        ipfsCid = a.ipfsCid;
        currentHighestBidder = highestBidder[auctionId];
        currentHighestBid = highestBid[auctionId];
    }

    // ============ Internal helpers ============
    function _recordOutbidRefundIfNeeded(uint256 auctionId) internal {
        uint256 current = highestBid[auctionId];
        if (current != 0) {
            pendingReturns[auctionId][highestBidder[auctionId]] += current;
        }
    }
}