const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  // Address of the VRF handler contract
  const vrfHandlerAddress = "0xcd81bB01D59BB0Cb9118C795a2E8842046fE8B8F";

  // Address of the lottery contract to be set
  const lotteryContractAddress = process.env.AMOY_CONTRACT_ADDRESS;

  // Get the contract factory
  const VRFHandler = await ethers.getContractFactory("VRFHandler");

  // Attach to the deployed VRF handler contract
  const vrfHandler = await VRFHandler.attach(vrfHandlerAddress);

  console.log("Setting lottery contract on VRF handler...");

  // Get the signer
  const [signer] = await ethers.getSigners();
  console.log("Signer address:", signer.address);

  // Check if the signer is the owner
  const owner = await vrfHandler.owner();
  console.log("Contract owner:", owner);

  if (signer.address.toLowerCase() !== owner.toLowerCase()) {
    console.error("The signer is not the contract owner. Only the owner can set the lottery contract.");
    return;
  }

  // Set the lottery contract
  const tx = await vrfHandler.setTombolaContract(lotteryContractAddress, {
    gasLimit: 300000 // Adjust this value as needed
  });

  // Wait for the transaction to be mined
  await tx.wait();

  console.log("Tombola contract set successfully on VRF handler!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
