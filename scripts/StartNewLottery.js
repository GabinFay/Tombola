const hre = require("hardhat");
const fs = require('fs');
const path = require('path');
const { ethers } = require("hardhat");

async function main() {
  const [owner] = await hre.ethers.getSigners();
  
  const Tombola = await hre.ethers.getContractFactory("Tombola");
  // const tombola = Tombola.attach("0xs78FE644f0aCEbbe3F2e3294ED0a6a6F0f21bbEb0"); //sur amoy
  const tombola = Tombola.attach(process.env.AMOY_CONTRACT_ADDRESS); //sur amoy

  
  // Start a new lottery
  console.log("Starting a new lottery...");
  // const ticketPrice = ethers.utils.parseEther("0.001") // 0.001 POL in wei
  const lotteryDuration = 1 // 1 second
  const newTombolaTx = await tombola.connect(owner).startNewTombola(lotteryDuration);
  await newTombolaTx.wait();
  console.log("New lottery started successfully!");

  // // Update lottery information
  // const lotteryInfo = {
  //   currentJackpot: "0", // Assume the starting balance is zero
  //   ticketPrice: ethers.formatEther(ticketPrice)
  // };
  
//   const lotteryInfoPath = path.join(__dirname, '..', 'frontend', 'src', 'lotteryInfo.json');
//   fs.writeFileSync(lotteryInfoPath, JSON.stringify(lotteryInfo, null, 2));
//   console.log("New lottery information saved to frontend/src/lotteryInfo.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });