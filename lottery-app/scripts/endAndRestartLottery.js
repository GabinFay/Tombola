const hre = require("hardhat");
const fs = require('fs');
const path = require('path');
const { ethers } = require("hardhat");

async function main() {
  const [owner] = await hre.ethers.getSigners();
  
  const Lottery = await hre.ethers.getContractFactory("Lottery");
  const lottery = await Lottery.attach("0xf4e53F35b1e8665928518D1511BB1Ff3Fa30B791");

  console.log("Ending current lottery...");
  const endTx = await lottery.connect(owner).endLottery();
  await endTx.wait();
  console.log("Lottery ended. Waiting for VRF callback...");

  // Wait for the LotteryEnded event
  return new Promise((resolve, reject) => {
    lottery.once("LotteryEnded", async (winnerAddress, prize, event) => {
      console.log("LotteryEnded event received!");
      console.log("Winner:", winnerAddress);
      console.log("Prize:", ethers.formatEther(prize), "MATIC");

      // Store the winner and prize information
      const winnerInfo = {
        address: winnerAddress,
        prize: ethers.formatEther(prize)
      };
      
      const dataFilePath = path.join(__dirname, '..', 'frontend', 'src', 'lastWinner.json');
      fs.writeFileSync(dataFilePath, JSON.stringify(winnerInfo, null, 2));
      console.log("Winner information saved to frontend/src/lastWinner.json");

      // Start a new lottery
      console.log("Starting a new lottery...");
      const ticketPrice = ethers.parseEther("0.001"); // 0.001 MATIC
      const lotteryDuration = 3600; // 1 hour
      const newLotteryTx = await lottery.connect(owner).startNewLottery(ticketPrice, lotteryDuration);
      await newLotteryTx.wait();
      console.log("New lottery started successfully!");

      // Get the new lottery balance (should be 0)
      const lotteryInfo = {
        currentJackpot: "0", // Assume the starting balance is zero
        ticketPrice: ethers.formatEther(ticketPrice) // Use the ticketPrice variable directly
      };
      
      const lotteryInfoPath = path.join(__dirname, '..', 'frontend', 'src', 'lotteryInfo.json');
      fs.writeFileSync(lotteryInfoPath, JSON.stringify(lotteryInfo, null, 2));
      console.log("New lottery information saved to frontend/src/lotteryInfo.json");

      resolve();
    });

    // Set a timeout in case the event is not received
    setTimeout(() => {
      reject(new Error("Timeout: LotteryEnded event not received"));
    }, 300000); // 5 minutes timeout
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
