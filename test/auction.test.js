const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Auction", function () {
  async function deployFixture() {
    const [owner, bidder1, bidder2] = await ethers.getSigners();
    const latest = await ethers.provider.getBlock('latest');
    const now = Number(latest.timestamp);
    const endTimestamp = now + 60; // 1 minute from current chain time
    const Auction = await ethers.getContractFactory("Auction");
    const auction = await Auction.deploy(endTimestamp);
    await auction.waitForDeployment();
    return { auction, owner, bidder1, bidder2, endTimestamp };
  }

  it("accepts a single bid and updates highestBid", async () => {
    const { auction, bidder1 } = await deployFixture();
    await auction.connect(bidder1)["bid()"]({ value: ethers.parseEther("0.1") });
    expect(await auction.highestBidder()).to.equal(bidder1.address);
    expect(await auction.highestBid()).to.equal(ethers.parseEther("0.1"));
  });

  it("requires higher bids and tracks pendingReturns", async () => {
    const { auction, bidder1, bidder2 } = await deployFixture();
    await auction.connect(bidder1)["bid()"]({ value: ethers.parseEther("0.1") });
    await auction.connect(bidder2)["bid()"]({ value: ethers.parseEther("0.2") });
    expect(await auction.highestBidder()).to.equal(bidder2.address);
    expect(await auction.pendingReturns(0, bidder1.address)).to.equal(ethers.parseEther("0.1"));
  });

  it("allows withdraw of outbid funds", async () => {
    const { auction, bidder1, bidder2 } = await deployFixture();
    await auction.connect(bidder1)["bid()"]({ value: ethers.parseEther("0.1") });
    await auction.connect(bidder2)["bid()"]({ value: ethers.parseEther("0.2") });
    const before = await ethers.provider.getBalance(bidder1.address);
    const tx = await auction.connect(bidder1)["withdraw()"]();
    const rc = await tx.wait();
    const gasCost = rc.gasUsed * rc.gasPrice;
    const after = await ethers.provider.getBalance(bidder1.address);
    // after ≈ before + 0.1 ETH - gas
    expect(after + gasCost).to.be.closeTo(before + ethers.parseEther("0.1"), ethers.parseEther("0.001"));
  });

  it("cannot bid after end", async () => {
    const { auction, bidder1, endTimestamp } = await deployFixture();
    // move time forward
    await ethers.provider.send("evm_setNextBlockTimestamp", [endTimestamp + 1]);
    await ethers.provider.send("evm_mine", []);
    await expect(auction.connect(bidder1)["bid()"]({ value: 1 })).to.be.revertedWith("Auction already ended");
  });

  it("owner can end auction and winner is highestBidder", async () => {
    const { auction, owner, bidder1, bidder2, endTimestamp } = await deployFixture();
    await auction.connect(bidder1)["bid()"]({ value: ethers.parseEther("0.1") });
    await auction.connect(bidder2)["bid()"]({ value: ethers.parseEther("0.3") });
    await ethers.provider.send("evm_setNextBlockTimestamp", [endTimestamp + 1]);
    await ethers.provider.send("evm_mine", []);
    await auction.connect(owner)["endAuction()"]();
    expect(await auction.ended()).to.equal(true);
    expect(await auction.highestBidder()).to.equal(bidder2.address);
  });
});

// Additional tests for intermediate features
describe("Advanced Auction Features", function () {
  it("supports buy-it-now ending immediately", async () => {
    const [owner, buyer] = await ethers.getSigners();
    const latest = await ethers.provider.getBlock('latest');
    const now = Number(latest.timestamp);
    const endTimestamp = now + 600;
    const Auction = await ethers.getContractFactory("Auction");
    const auction = await Auction.deploy(endTimestamp);
    await auction.waitForDeployment();

    // create a new auction with buy-it-now
    const now2 = Number((await ethers.provider.getBlock('latest')).timestamp);
    const start = now2 + 60;
    const biddingEnd = start + 300;
    const tx = await auction.connect(owner).createAuction(0, start, biddingEnd, 0, 0, 0, ethers.parseEther("1"), 0, 0);
    await tx.wait();

    // move time to start
    await ethers.provider.send("evm_setNextBlockTimestamp", [start + 1]);
    await ethers.provider.send("evm_mine", []);
    // bid hitting buy-it-now
    await auction.connect(buyer)["bid(uint256)"](1, { value: ethers.parseEther("1") });
    const cfg = await auction.auctions(1);
    expect(cfg.ended).to.equal(true);
    const state = await auction.getEnglishState(1);
    expect(state[0]).to.equal(buyer.address);
    expect(state[1]).to.equal(ethers.parseEther("1"));
  });

  it("extends time on anti-sniping window", async () => {
    const [owner, b1] = await ethers.getSigners();
    const latest = await ethers.provider.getBlock('latest');
    const now = Number(latest.timestamp);
    const endTimestamp = now + 600;
    const Auction = await ethers.getContractFactory("Auction");
    const auction = await Auction.deploy(endTimestamp);
    await auction.waitForDeployment();

    const now2 = Number((await ethers.provider.getBlock('latest')).timestamp);
    const start = now2 + 60;
    const biddingEnd = start + 120;
    // window 60s, extension 120s
    await (await auction.createAuction(0, start, biddingEnd, 0, 0, 0, 0, 60, 120)).wait();

    // move to after start, then fast forward close to end (within 60s)
    await ethers.provider.send("evm_setNextBlockTimestamp", [start + 1]);
    await ethers.provider.send("evm_mine", []);
    // fast forward close to end (within 60s)
    await ethers.provider.send("evm_setNextBlockTimestamp", [biddingEnd - 10]);
    await ethers.provider.send("evm_mine", []);

    await auction.connect(b1)["bid(uint256)"](1, { value: ethers.parseEther("0.5") });
    const cfg = await auction.auctions(1);
    // should have extended by 120s
    expect(Number(cfg.biddingEndTime)).to.equal(biddingEnd + 120);
  });

  it("runs sealed-bid commit/reveal flow", async () => {
    const [owner, a, b] = await ethers.getSigners();
    const latest = await ethers.provider.getBlock('latest');
    const now = Number(latest.timestamp);
    const endTimestamp = now + 600;
    const Auction = await ethers.getContractFactory("Auction");
    const auction = await Auction.deploy(endTimestamp);
    await auction.waitForDeployment();

    const now2 = Number((await ethers.provider.getBlock('latest')).timestamp);
    const start = now2 + 60;
    const commitEnd = start + 120;
    const revealEnd = commitEnd + 120;
    await (await auction.createAuction(1, start, commitEnd, revealEnd, ethers.parseEther("0.2"), ethers.parseEther("0.05"), 0, 0, 0)).wait();

    // move to start
    await ethers.provider.send("evm_setNextBlockTimestamp", [start + 1]);
    await ethers.provider.send("evm_mine", []);
    // commit phase
    const cA = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["uint256","bytes32"],[ethers.parseEther("0.3"), ethers.id("saltA")]));
    const cB = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["uint256","bytes32"],[ethers.parseEther("0.35"), ethers.id("saltB")]));
    await (await auction.connect(a).commitBid(1, cA)).wait();
    await (await auction.connect(b).commitBid(1, cB)).wait();

    // move to reveal phase
    await ethers.provider.send("evm_setNextBlockTimestamp", [commitEnd + 1]);
    await ethers.provider.send("evm_mine", []);

    await (await auction.connect(a).revealBid(1, ethers.parseEther("0.3"), ethers.id("saltA"), { value: ethers.parseEther("0.3") })).wait();
    await (await auction.connect(b).revealBid(1, ethers.parseEther("0.35"), ethers.id("saltB"), { value: ethers.parseEther("0.35") })).wait();

    // end after reveal
    await ethers.provider.send("evm_setNextBlockTimestamp", [revealEnd + 1]);
    await ethers.provider.send("evm_mine", []);
    await (await auction["endAuction(uint256)"](1)).wait();

    const sealed = await auction.getSealedHighest(1);
    expect(sealed[0]).to.equal(b.address);
    expect(sealed[1]).to.equal(ethers.parseEther("0.35"));
  });

  it("supports multiple concurrent auctions", async () => {
    const [owner, b1, b2] = await ethers.getSigners();
    const latest = await ethers.provider.getBlock('latest');
    const now = Number(latest.timestamp);
    const endTimestamp = now + 600;
    const Auction = await ethers.getContractFactory("Auction");
    const auction = await Auction.deploy(endTimestamp);
    await auction.waitForDeployment();

    const now2 = Number((await ethers.provider.getBlock('latest')).timestamp);
    const start = now2 + 60;
    await (await auction.createAuction(0, start, start + 100, 0, 0, 0, 0, 0, 0)).wait(); // id 1
    await (await auction.createAuction(0, start, start + 200, 0, 0, 0, 0, 0, 0)).wait(); // id 2
    await ethers.provider.send("evm_setNextBlockTimestamp", [start + 1]);
    await ethers.provider.send("evm_mine", []);
    await auction.connect(b1)["bid(uint256)"](1, { value: ethers.parseEther("0.2") });
    await auction.connect(b2)["bid(uint256)"](2, { value: ethers.parseEther("0.4") });

    const s1 = await auction.getEnglishState(1);
    const s2 = await auction.getEnglishState(2);
    expect(s1[0]).to.equal(b1.address);
    expect(s2[0]).to.equal(b2.address);
  });
});


