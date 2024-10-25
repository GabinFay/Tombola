const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  // Address of the contract
  const contractAddress = process.env.AMOY_CONTRACT_ADDRESS;

  // Get the contract factory
  const Contract = await ethers.getContractFactory("Tombola");

  // Attach to the deployed contract
  const contract = await Contract.attach(contractAddress);

  console.log("Setting VRF handler...");

  // Get the signer
  const [signer] = await ethers.getSigners();
  console.log("Signer address:", signer.address);

  // Check if the signer is the owner
  const owner = await contract.owner();
  console.log("Contract owner:", owner);

  if (signer.address.toLowerCase() !== owner.toLowerCase()) {
    console.error("The signer is not the contract owner. Only the owner can set the VRF handler.");
    return;
  }

  // Set the VRF handler
  const tx = await contract.setVRFHandler(process.env.VRF_HANDLER_AMOY, {
    gasLimit: 300000 // Adjust this value as needed
  });

  // Wait for the transaction to be mined
  await tx.wait();

  console.log("VRF handler set successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
