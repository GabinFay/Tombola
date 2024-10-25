const hre = require("hardhat");
const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Setting up Lottery and VRF with account:", deployer.address);

  // Get the deployed Tombola contract address from .env
  const LOTTERY_CONTRACT_ADDRESS = process.env.AMOY_CONTRACT_ADDRESS;
  if (!LOTTERY_CONTRACT_ADDRESS) {
    throw new Error("AMOY_CONTRACT_ADDRESS not set in .env file");
  }

  // Hardcoded values from deployment scripts
  const VRF_COORDINATOR = process.env.VRF_COORDINATOR_ADDRESS_AMOY;
  const SUBSCRIPTION_ID = process.env.SUBSCRIPTION_ID_AMOY; // Replace with your actual subscription ID
  const KEY_HASH = "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15";

  // Attach VRFHandler
  console.log("Attaching VRFHandler...");
  const VRFHandler = await ethers.getContractFactory("VRFHandler");
  const vrfHandler = await VRFHandler.attach(process.env.VRF_HANDLER_AMOY);

  // Attach VRFCoordinator using the interface
  console.log("Attaching VRFCoordinator...");
  const VRFCoordinatorABI = require('../node_modules/@chainlink/contracts/abi/v0.8/IVRFCoordinatorV2Plus.json');
  const vrfCoordinator = await ethers.getContractAt(VRFCoordinatorABI, VRF_COORDINATOR);

//   // Add Lottery contract to Chainlink VRF subscription
//   console.log("Adding Lottery contract to Chainlink VRF subscription...");
//   const addConsumerTx = await vrfCoordinator.addConsumer(SUBSCRIPTION_ID, LOTTERY_CONTRACT_ADDRESS);
//   await addConsumerTx.wait();
//   console.log("Lottery contract added to VRF subscription");

  // Set Lottery contract in VRFHandler
  console.log("Setting Lottery contract in VRFHandler...");
  const setLotteryTx = await vrfHandler.setTombolaContract(LOTTERY_CONTRACT_ADDRESS);
  await setLotteryTx.wait();
  console.log("Lottery contract set in VRFHandler");

  // Set VRFHandler in Lottery contract
  console.log("Setting VRFHandler in Lottery contract...");
  const Tombola = await ethers.getContractFactory("Tombola");
  const tombola = Tombola.attach(LOTTERY_CONTRACT_ADDRESS);
  const setVRFHandlerTx = await tombola.setVRFHandler(vrfHandler.address);
  await setVRFHandlerTx.wait();
  console.log("VRFHandler set in Lottery contract");

  console.log("Setup completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
