// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Advanced Auction Manager
/// @notice Supports English and Sealed-Bid auctions, reserve price, min increment, buy-it-now, anti-sniping, and multiple concurrent auctions. Backwards compatible with single-auction usage.
/// @dev Uses withdraw pattern for safe refunds and Solidity ^0.8 overflow checks
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";

contract Auction is Ownable, IERC721Receiver, IERC1155Receiver {
    enum AuctionType {
        English,
        SealedBid,
        Dutch,
        Vickrey
    }

    struct AuctionConfig {
        AuctionType auctionType;
        uint256 startTime;
        uint256 biddingEndTime; // For English: endTime; For SealedBid: commit end
        uint256 revealEndTime; // Only used for SealedBid; 0 for English
        uint256 reservePrice;
        uint256 minIncrement;
        uint256 buyItNowPrice; // 0 disables buy-it-now
        uint256 antiSnipingWindow; // N seconds
        uint256 antiSnipingExtension; // M seconds
        bool ended;
        address payable seller;
        // NFT details (optional)
        address nftAddress; // 0 if not NFT auction
        uint256 tokenId;
        uint256 tokenAmount; // for ERC1155
        bool isERC1155;
        // Off-chain metadata reference
        string ipfsCid;
        // Identity gate
        bool requireVerification;
    }

    struct AuctionStateEnglish {
        address highestBidder;
        uint256 highestBid;
    }

    // For Sealed Bid we store commitments and revealed amounts per bidder
    struct AuctionStateSealed {
        address highestBidder;
        uint256 highestBid;
        mapping(address => bytes32) bidCommitment;
        mapping(address => uint256) revealedAmount;
        uint256 secondHighestBid; // For Vickrey settlement
    }

    struct AuctionStateDutch {
        uint256 startPrice;
        uint256 endPrice;
        uint256 priceDecrementPerSec;
        address taker;
        uint256 paid;
    }

    // Pending refunds per auction per bidder
    mapping(uint256 => mapping(address => uint256)) public pendingReturns;

    // Auction storage
    uint256 public auctionsCount;
    mapping(uint256 => AuctionConfig) public auctions;
    mapping(uint256 => AuctionStateEnglish) private englishState;
    mapping(uint256 => AuctionStateSealed) private sealedState;
    mapping(uint256 => AuctionStateDutch) private dutchState;

    // Optional bidder verification mapping
    mapping(address => bool) public isVerifiedBidder;

    // Backward-compatibility variables mapping to auctionId 0
    // These getters keep old frontend/backends working without changes
    address public highestBidder; // mirrors auctions[0]
    uint256 public highestBid; // mirrors auctions[0]
    uint256 public immutable auctionEndTime; // mirrors auctions[0].biddingEndTime
    bool public ended; // mirrors auctions[0].ended

    // Events
    event AuctionCreated(uint256 indexed auctionId, AuctionType auctionType, uint256 startTime, uint256 biddingEndTime, uint256 revealEndTime, uint256 reservePrice, uint256 minIncrement, uint256 buyItNowPrice);
    event BidCommitted(uint256 indexed auctionId, address indexed bidder, bytes32 commitment);
    event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount);
    event BuyItNowTriggered(uint256 indexed auctionId, address indexed buyer, uint256 amount);
    event AuctionExtended(uint256 indexed auctionId, uint256 newEndTime);
    event AuctionEnded(uint256 indexed auctionId, address indexed winner, uint256 amount);
    event DutchAccepted(uint256 indexed auctionId, address indexed buyer, uint256 price);
    event IdentityVerified(address indexed bidder);

    /// @notice Deploys and creates a default English auction (id 0) for backwards compatibility
    /// @param endTimestamp UNIX timestamp when the default auction should end
    constructor(uint256 endTimestamp) Ownable(msg.sender) {
        require(endTimestamp > block.timestamp, "End time must be in future");
        auctionEndTime = endTimestamp;

        uint256 auctionId = _createAuction(
            AuctionType.English,
            block.timestamp,
            endTimestamp,
            0, // revealEndTime not used for English
            0, // reservePrice default 0
            0, // minIncrement default 0
            0, // buyItNow disabled by default
            0,
            0
        );
        // Mirror legacy vars
        highestBidder = englishState[auctionId].highestBidder;
        highestBid = englishState[auctionId].highestBid;
        ended = auctions[auctionId].ended;
    }

    // ============ Owner functions ============

    /// @notice Create a new auction with custom parameters
    /// @dev For SealedBid, set revealEndTime > biddingEndTime. For English, pass revealEndTime = 0.
    function createAuction(
        AuctionType auctionType,
        uint256 startTime,
        uint256 biddingEndTime,
        uint256 revealEndTime,
        uint256 reservePrice,
        uint256 minIncrement,
        uint256 buyItNowPrice,
        uint256 antiSnipingWindow,
        uint256 antiSnipingExtension
    ) external onlyOwner returns (uint256 auctionId) {
        return _createAuction(
            auctionType,
            startTime,
            biddingEndTime,
            revealEndTime,
            reservePrice,
            minIncrement,
            buyItNowPrice,
            antiSnipingWindow,
            antiSnipingExtension
        );
    }

    function _createAuction(
        AuctionType auctionType,
        uint256 startTime,
        uint256 biddingEndTime,
        uint256 revealEndTime,
        uint256 reservePrice,
        uint256 minIncrement,
        uint256 buyItNowPrice,
        uint256 antiSnipingWindow,
        uint256 antiSnipingExtension
    ) internal returns (uint256 auctionId) {
        require(biddingEndTime > startTime && startTime >= block.timestamp, "Invalid times");
        if (auctionType == AuctionType.SealedBid || auctionType == AuctionType.Vickrey) {
            require(revealEndTime > biddingEndTime, "Reveal must be after bidding");
        } else {
            require(revealEndTime == 0, "Reveal not used for English");
        }

        auctionId = auctionsCount++;
        auctions[auctionId] = AuctionConfig({
            auctionType: auctionType,
            startTime: startTime,
            biddingEndTime: biddingEndTime,
            revealEndTime: revealEndTime,
            reservePrice: reservePrice,
            minIncrement: minIncrement,
            buyItNowPrice: buyItNowPrice,
            antiSnipingWindow: antiSnipingWindow,
            antiSnipingExtension: antiSnipingExtension,
            ended: false,
            seller: payable(owner()),
            nftAddress: address(0),
            tokenId: 0,
            tokenAmount: 0,
            isERC1155: false,
            ipfsCid: "",
            requireVerification: false
        });
        emit AuctionCreated(auctionId, auctionType, startTime, biddingEndTime, revealEndTime, reservePrice, minIncrement, buyItNowPrice);
    }

    /// @notice Configure NFT details and pull custody into the contract. Caller must own/approve the NFT.
    function setAuctionNFT(
        uint256 auctionId,
        address nftAddress,
        uint256 tokenId,
        uint256 tokenAmount,
        bool isERC1155
    ) external onlyOwner {
        AuctionConfig storage cfg = auctions[auctionId];
        require(!cfg.ended, "Auction ended");
        cfg.nftAddress = nftAddress;
        cfg.tokenId = tokenId;
        cfg.tokenAmount = tokenAmount;
        cfg.isERC1155 = isERC1155;
        // Pull NFT into escrow
        if (nftAddress != address(0)) {
            if (isERC1155) {
                IERC1155(nftAddress).safeTransferFrom(owner(), address(this), tokenId, tokenAmount, "");
            } else {
                IERC721(nftAddress).safeTransferFrom(owner(), address(this), tokenId);
            }
        }
    }

    /// @notice Set IPFS CID metadata and optional identity requirement for an auction
    function setAuctionMetadata(uint256 auctionId, string calldata ipfsCid, bool requireVerification) external onlyOwner {
        AuctionConfig storage cfg = auctions[auctionId];
        require(!cfg.ended, "Auction ended");
        cfg.ipfsCid = ipfsCid;
        cfg.requireVerification = requireVerification;
    }

    /// @notice Self-verify wallet by providing a signature over a known message
    /// @dev For demo: message is keccak256(abi.encodePacked("Verify Auction Identity", msg.sender))
    function verifyIdentity(uint8 v, bytes32 r, bytes32 s) external {
        bytes32 message = keccak256(abi.encodePacked("Verify Auction Identity", msg.sender));
        address signer = ecrecover(message, v, r, s);
        require(signer == msg.sender, "Invalid signature");
        isVerifiedBidder[msg.sender] = true;
        emit IdentityVerified(msg.sender);
    }

    // ============ English auction ============

    /// @notice Place a bid on a specific auction (English or during reveal for SealedBid)
    function bid(uint256 auctionId) public payable {
        AuctionConfig storage cfg = auctions[auctionId];
        require(!cfg.ended, "Auction ended");
        require(block.timestamp >= cfg.startTime, "Auction not started");

        if (cfg.auctionType == AuctionType.English) {
            if (cfg.requireVerification) {
                require(isVerifiedBidder[msg.sender], "Not verified");
            }
            require(block.timestamp < cfg.biddingEndTime, "Auction already ended");

            // Buy-it-now
            if (cfg.buyItNowPrice > 0 && msg.value >= cfg.buyItNowPrice) {
                _recordOutbidRefundIfNeeded(auctionId);
                englishState[auctionId].highestBidder = msg.sender;
                englishState[auctionId].highestBid = msg.value;
                cfg.ended = true;
                _payout(cfg.seller, msg.value);
                emit BuyItNowTriggered(auctionId, msg.sender, msg.value);
                emit AuctionEnded(auctionId, msg.sender, msg.value);
                _mirrorLegacyIfZero(auctionId);
                return;
            }

            uint256 current = englishState[auctionId].highestBid;
            require(msg.value >= cfg.reservePrice, "Below reserve");
            require(msg.value >= current + cfg.minIncrement, "Increment too low");

            // Refund previous highest using withdraw pattern
            if (current != 0) {
                pendingReturns[auctionId][englishState[auctionId].highestBidder] += current;
            }

            englishState[auctionId].highestBidder = msg.sender;
            englishState[auctionId].highestBid = msg.value;
            emit BidPlaced(auctionId, msg.sender, msg.value);

            // Anti-sniping: extend if within window
            if (
                cfg.antiSnipingWindow > 0 &&
                cfg.antiSnipingExtension > 0 &&
                cfg.biddingEndTime > block.timestamp &&
                cfg.biddingEndTime - block.timestamp <= cfg.antiSnipingWindow
            ) {
                cfg.biddingEndTime += cfg.antiSnipingExtension;
                emit AuctionExtended(auctionId, cfg.biddingEndTime);
            }
            _mirrorLegacyIfZero(auctionId);
        } else if (cfg.auctionType == AuctionType.SealedBid || cfg.auctionType == AuctionType.Vickrey) {
            // Sealed bid: any direct ETH sent during commit or reveal must match flow
            revert("Use commit/reveal for sealed bid");
        } else if (cfg.auctionType == AuctionType.Dutch) {
            revert("Use acceptDutch for Dutch auction");
        }
    }

    /// @notice Backwards compatible bid() that targets auctionId 0
    function bid() external payable {
        bid(0);
    }

    // ============ Sealed-bid auction (commit-reveal) ============
    /// @notice Commit a sealed bid. Commitment is keccak256(abi.encodePacked(amount, secret))
    function commitBid(uint256 auctionId, bytes32 commitment) external {
        AuctionConfig storage cfg = auctions[auctionId];
        require(cfg.auctionType == AuctionType.SealedBid || cfg.auctionType == AuctionType.Vickrey, "Not sealed-bid");
        require(block.timestamp >= cfg.startTime && block.timestamp < cfg.biddingEndTime, "Not in commit phase");
        if (cfg.requireVerification) {
            require(isVerifiedBidder[msg.sender], "Not verified");
        }
        require(sealedState[auctionId].bidCommitment[msg.sender] == bytes32(0), "Already committed");
        sealedState[auctionId].bidCommitment[msg.sender] = commitment;
        emit BidCommitted(auctionId, msg.sender, commitment);
    }

    /// @notice Reveal your sealed bid by sending the bid amount and the secret used in commitment
    /// @dev We only track the highest revealed bid that meets reserve and increment vs current highest; losers can withdraw their funds.
    function revealBid(uint256 auctionId, uint256 amount, bytes32 secret) external payable {
        AuctionConfig storage cfg = auctions[auctionId];
        require(cfg.auctionType == AuctionType.SealedBid, "Not sealed-bid");
        require(block.timestamp >= cfg.biddingEndTime && block.timestamp < cfg.revealEndTime, "Not in reveal phase");
        bytes32 commitment = sealedState[auctionId].bidCommitment[msg.sender];
        require(commitment != bytes32(0), "No commitment");
        require(commitment == keccak256(abi.encodePacked(amount, secret)), "Invalid reveal");
        require(msg.value == amount, "Send exact amount");

        uint256 current = sealedState[auctionId].highestBid;
        if (amount < cfg.reservePrice) {
            // Below reserve, allow withdraw later
            pendingReturns[auctionId][msg.sender] += amount;
            return;
        }
        if (current == 0) {
            sealedState[auctionId].highestBidder = msg.sender;
            sealedState[auctionId].highestBid = amount;
        } else {
            require(amount >= current + cfg.minIncrement, "Increment too low");
            // Refund previous highest to withdrawable balance
            // Track second highest for Vickrey
            if (amount > current) {
                sealedState[auctionId].secondHighestBid = current;
            }
            pendingReturns[auctionId][sealedState[auctionId].highestBidder] += current;
            sealedState[auctionId].highestBidder = msg.sender;
            sealedState[auctionId].highestBid = amount;
        }
        emit BidPlaced(auctionId, msg.sender, amount);
    }

    // ============ Dutch auction ============
    /// @notice Configure Dutch auction pricing
    function setDutchPricing(uint256 auctionId, uint256 startPrice, uint256 endPrice, uint256 priceDecrementPerSec) external onlyOwner {
        AuctionConfig storage cfg = auctions[auctionId];
        require(cfg.auctionType == AuctionType.Dutch, "Not Dutch");
        require(startPrice > endPrice, "start>end");
        dutchState[auctionId].startPrice = startPrice;
        dutchState[auctionId].endPrice = endPrice;
        dutchState[auctionId].priceDecrementPerSec = priceDecrementPerSec;
    }

    function getCurrentDutchPrice(uint256 auctionId) public view returns (uint256) {
        AuctionConfig storage cfg = auctions[auctionId];
        require(cfg.auctionType == AuctionType.Dutch, "Not Dutch");
        if (block.timestamp <= cfg.startTime) return dutchState[auctionId].startPrice;
        uint256 elapsed = block.timestamp - cfg.startTime;
        uint256 decrement = elapsed * dutchState[auctionId].priceDecrementPerSec;
        uint256 sp = dutchState[auctionId].startPrice;
        if (decrement >= sp - dutchState[auctionId].endPrice) return dutchState[auctionId].endPrice;
        return sp - decrement;
    }

    function acceptDutch(uint256 auctionId) external payable {
        AuctionConfig storage cfg = auctions[auctionId];
        require(cfg.auctionType == AuctionType.Dutch, "Not Dutch");
        require(!cfg.ended, "Auction ended");
        require(block.timestamp >= cfg.startTime && block.timestamp < cfg.biddingEndTime, "Not active");
        if (cfg.requireVerification) {
            require(isVerifiedBidder[msg.sender], "Not verified");
        }
        uint256 price = getCurrentDutchPrice(auctionId);
        require(msg.value >= price, "Insufficient");
        cfg.ended = true;
        dutchState[auctionId].taker = msg.sender;
        dutchState[auctionId].paid = msg.value;
        _payout(cfg.seller, price);
        // refund extra
        if (msg.value > price) {
            (bool sent, ) = payable(msg.sender).call{value: msg.value - price}("");
            require(sent, "Refund failed");
        }
        _transferNftIfAny(auctionId, msg.sender);
        emit DutchAccepted(auctionId, msg.sender, price);
        emit AuctionEnded(auctionId, msg.sender, price);
    }

    // ============ Settlement / Withdraw ============
    /// @notice Withdraw pending refunds for a specific auction
    function withdraw(uint256 auctionId) public returns (bool success) {
        uint256 amount = pendingReturns[auctionId][msg.sender];
        require(amount > 0, "Nothing to withdraw");
        pendingReturns[auctionId][msg.sender] = 0;
        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        if (!sent) {
            pendingReturns[auctionId][msg.sender] = amount;
            return false;
        }
        return true;
    }

    /// @notice Backwards compatible withdraw for auctionId 0
    function withdraw() external returns (bool success) {
        return withdraw(0);
    }

    /// @notice End the auction and transfer funds to seller if there is a valid highest bid
    function endAuction(uint256 auctionId) public {
        AuctionConfig storage cfg = auctions[auctionId];
        require(!cfg.ended, "Auction end already called");
        if (cfg.auctionType == AuctionType.English) {
            require(block.timestamp >= cfg.biddingEndTime, "Auction not yet ended");
            cfg.ended = true;
            uint256 amount = englishState[auctionId].highestBid;
            address winner = englishState[auctionId].highestBidder;
            if (amount >= cfg.reservePrice && amount > 0) {
                _payout(cfg.seller, amount);
                _transferNftIfAny(auctionId, winner);
            } else if (amount > 0) {
                // If reserve not met, allow highest to withdraw
                pendingReturns[auctionId][winner] += amount;
                winner = address(0);
                amount = 0;
            }
            emit AuctionEnded(auctionId, winner, amount);
            _mirrorLegacyIfZero(auctionId);
        } else if (cfg.auctionType == AuctionType.SealedBid) {
            // Sealed-bid must be ended after reveal phase
            require(block.timestamp >= cfg.revealEndTime, "Reveal not yet ended");
            cfg.ended = true;
            uint256 amount = sealedState[auctionId].highestBid;
            address winner = sealedState[auctionId].highestBidder;
            if (amount >= cfg.reservePrice && amount > 0) {
                _payout(cfg.seller, amount);
                _transferNftIfAny(auctionId, winner);
            } else if (amount > 0) {
                pendingReturns[auctionId][winner] += amount;
                winner = address(0);
                amount = 0;
            }
            emit AuctionEnded(auctionId, winner, amount);
        } else if (cfg.auctionType == AuctionType.Vickrey) {
            require(block.timestamp >= cfg.revealEndTime, "Reveal not yet ended");
            cfg.ended = true;
            uint256 highest = sealedState[auctionId].highestBid;
            uint256 second = sealedState[auctionId].secondHighestBid;
            address winner = sealedState[auctionId].highestBidder;
            uint256 payAmount = second; // winner pays second price
            if (highest >= cfg.reservePrice && highest > 0) {
                _payout(cfg.seller, payAmount);
                // refund difference to winner
                uint256 refund = highest - payAmount;
                if (refund > 0) {
                    pendingReturns[auctionId][winner] += refund;
                }
                _transferNftIfAny(auctionId, winner);
            } else if (highest > 0) {
                pendingReturns[auctionId][winner] += highest;
                winner = address(0);
                payAmount = 0;
            }
            emit AuctionEnded(auctionId, winner, payAmount);
        }
    }

    /// @notice Backwards compatible endAuction for auctionId 0
    function endAuction() external {
        endAuction(0);
    }

    // ============ Views for convenience ============
    function getEnglishState(uint256 auctionId) external view returns (address _highestBidder, uint256 _highestBid) {
        return (englishState[auctionId].highestBidder, englishState[auctionId].highestBid);
    }

    function getSealedHighest(uint256 auctionId) external view returns (address _highestBidder, uint256 _highestBid) {
        return (sealedState[auctionId].highestBidder, sealedState[auctionId].highestBid);
    }

    // ============ Internal helpers ============
    function _payout(address payable to, uint256 amount) internal {
        (bool sent, ) = to.call{value: amount}("");
            require(sent, "Payout failed");
        }

    function _recordOutbidRefundIfNeeded(uint256 auctionId) internal {
        uint256 current = englishState[auctionId].highestBid;
        if (current != 0) {
            pendingReturns[auctionId][englishState[auctionId].highestBidder] += current;
        }
    }

    function _mirrorLegacyIfZero(uint256 auctionId) internal {
        if (auctionId == 0) {
            highestBidder = englishState[0].highestBidder;
            highestBid = englishState[0].highestBid;
            ended = auctions[0].ended;
        }
    }

    function _transferNftIfAny(uint256 auctionId, address to) internal {
        AuctionConfig storage cfg = auctions[auctionId];
        if (cfg.nftAddress == address(0)) return;
        if (cfg.isERC1155) {
            IERC1155(cfg.nftAddress).safeTransferFrom(address(this), to, cfg.tokenId, cfg.tokenAmount, "");
        } else {
            IERC721(cfg.nftAddress).safeTransferFrom(address(this), to, cfg.tokenId);
        }
    }

    // IERC721Receiver
    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
    // IERC1155Receiver
    function onERC1155Received(address, address, uint256, uint256, bytes calldata) external pure returns (bytes4) {
        return IERC1155Receiver.onERC1155Received.selector;
    }
    function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata) external pure returns (bytes4) {
        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }
    function supportsInterface(bytes4 interfaceId) public view virtual returns (bool) {
        return interfaceId == type(IERC1155Receiver).interfaceId || interfaceId == type(IERC721Receiver).interfaceId;
    }
}


