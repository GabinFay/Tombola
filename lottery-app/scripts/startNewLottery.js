const hre = require("hardhat");
const fs = require('fs');
const path = require('path');
const { ethers } = require("hardhat");

async function main() {
  const [owner] = await hre.ethers.getSigners();
  
  const PolyLottery = await hre.ethers.getContractFactory("PolyLottery");
  const polyLottery = PolyLottery.attach("0xf4e53F35b1e8665928518D1511BB1Ff3Fa30B791");

  // Start a new lottery
  console.log("Starting a new lottery...");
  const ticketPrice = ethers.parseEther("0.001"); // 0.001 MATIC
  const lotteryDuration = 3600; // 1 hour
  const newLotteryTx = await polyLottery.connect(owner).startNewLottery(ticketPrice, lotteryDuration);
  await newLotteryTx.wait();
  console.log("New lottery started successfully!");

  // Update lottery information
  const lotteryInfo = {
    currentJackpot: "0", // Assume the starting balance is zero
    ticketPrice: ethers.formatEther(ticketPrice)
  };
  
  const lotteryInfoPath = path.join(__dirname, '..', 'frontend', 'src', 'lotteryInfo.json');
  fs.writeFileSync(lotteryInfoPath, JSON.stringify(lotteryInfo, null, 2));
  console.log("New lottery information saved to frontend/src/lotteryInfo.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });