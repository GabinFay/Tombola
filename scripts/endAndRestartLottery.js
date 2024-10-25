const hre = require("hardhat");
const fs = require('fs');
const path = require('path');
const { ethers } = require("hardhat");

async function main() {
  const [owner] = await hre.ethers.getSigners();
  
  const Tombola = await hre.ethers.getContractFactory("Tombola");
  const tombola = await Tombola.attach(process.env.AMOY_CONTRACT_ADDRESS);

  console.log("Ending current lottery...");
  const endTx = await tombola.connect(owner).endTombola();
  await endTx.wait();
  console.log("Tombola ended. Waiting for VRF callback...");

  // Wait for the TombolaEnded event
  return new Promise((resolve, reject) => {
    Tombola.once("TombolaEnded", async (winnerAddress, prize, event) => {
      console.log("TombolaEnded event received!");
      console.log("Winner:", winnerAddress);
      console.log("Prize:", ethers.utils.formatEther(prize), "POL");

      // Store the winner and prize information
      const winnerInfo = {
        address: winnerAddress,
        prize: ethers.utils.formatEther(prize)
      };
      
      // const dataFilePath = path.join(__dirname, '..', 'frontend', 'src', 'lastWinner.json');
      // fs.writeFileSync(dataFilePath, JSON.stringify(winnerInfo, null, 2));
      // console.log("Winner information saved to frontend/src/lastWinner.json");

      // Start a new lottery
      console.log("Starting a new lottery...");
      // const ticketPrice = ethers.utils.parseEther("0.001"); // 0.001 MATIC
      const lotteryDuration = 3600; // 1 hour
      const newTombolaTx = await tombola.connect(owner).startNewTombola(lotteryDuration);
      await newTombolaTx.wait();
      console.log("New lottery started successfully!");

      // Get the new lottery balance (should be 0)
      // const lotteryInfo = {
      //   currentJackpot: "0", // Assume the starting balance is zero
      //   ticketPrice: ethers.formatEther(ticketPrice) // Use the ticketPrice variable directly
      // };
      
      // const lotteryInfoPath = path.join(__dirname, '..', 'frontend', 'src', 'lotteryInfo.json');
      // fs.writeFileSync(lotteryInfoPath, JSON.stringify(lotteryInfo, null, 2));
      // console.log("New lottery information saved to frontend/src/lotteryInfo.json");

      resolve();
    });

    // Set a timeout in case the event is not received
    setTimeout(() => {
      reject(new Error("Timeout: TombolaEnded event not received"));
    }, 300000); // 5 minutes timeout
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
