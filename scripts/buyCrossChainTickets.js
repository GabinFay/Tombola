const hre = require("hardhat");
const { ethers } = require("hardhat");
const dotenv = require('dotenv');

dotenv.config();

const { Options } = require('@layerzerolabs/lz-v2-utilities');


async function buyTicketForUser(wallet) {
  const Tombola = await hre.ethers.getContractFactory("Tombola", wallet);
  const tombola = Tombola.attach(process.env.BASE_CONTRACT_ADDRESS);

  // Define destination EID
  const dstEid = 40267; // amoy EID
  const amountToBuy = ethers.utils.parseEther("0.01");

  console.log(`Buying ticket for user ${wallet.address}...`);
  const options = Options.newOptions().addExecutorLzReceiveOption(1000000, amountToBuy).toHex().toString();

  const maxGas = ethers.utils.parseEther("0.01");
  
  try {
    const tx = await tombola.connect(wallet).buyTicketsCrossChain(
      dstEid,
      options,
      { 
        value: maxGas
      }
    );

    console.log("Transaction sent. Waiting for confirmation...");
    const receipt = await tx.wait();
    console.log(`Transaction confirmed for ${wallet.address}. Gas used: ${receipt.gasUsed.toString()}`);
    console.log(`Transaction hash: ${receipt.transactionHash}`);
  } catch (error) {
    console.error(`Error buying ticket for ${wallet.address}:`, error.message);
  }
}

async function main() {
  // Define private keys for two users
  const privateKey1 = process.env.PRIVATE_KEY_TEST_1;
  const privateKey2 = process.env.PRIVATE_KEY_TEST_2;

  // Create wallet instances
  const wallet1 = new ethers.Wallet(privateKey1, hre.ethers.provider);
  const wallet2 = new ethers.Wallet(privateKey2, hre.ethers.provider);

  // Buy tickets for both users
  await buyTicketForUser(wallet1);
  await buyTicketForUser(wallet2);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
