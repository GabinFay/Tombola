const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  // Define private keys for two users
  const privateKey1 = process.env.PRIVATE_KEY_TEST_1;
  const privateKey2 = process.env.PRIVATE_KEY_TEST_2;


  // Create wallet instances
  const wallet1 = new ethers.Wallet(privateKey1, hre.ethers.provider);
  const wallet2 = new ethers.Wallet(privateKey2, hre.ethers.provider);
  
  const Tombola = await hre.ethers.getContractFactory("Tombola");
  const tombola = Tombola.attach(process.env.AMOY_CONTRACT_ADDRESS);

  // Define ticket price in wei (0.001 POL)
  // const ticketPrice = BigInt("1000000000000000");
//   console.log("Current ticket price:", ethers.formatEther(ticketPrice), "POL");

  // First user buys 2 tickets
  console.log("First user buying 2 tickets...");
  const tx1 = await tombola.connect(wallet1).buyTickets({ 
    value: ethers.utils.parseEther("0.01"),
    maxFeePerGas: ethers.utils.parseUnits("30", "gwei"),
    maxPriorityFeePerGas: ethers.utils.parseUnits("25", "gwei")
  });
  await tx1.wait();
  console.log("First user successfully bought 2 tickets!");

  // Second user buys 3 tickets
  console.log("Second user buying 3 tickets...");
  const tx2 = await tombola.connect(wallet2).buyTickets({ 
    value: ethers.utils.parseEther("0.001"),
    maxFeePerGas: ethers.utils.parseUnits("30", "gwei"),
    maxPriorityFeePerGas: ethers.utils.parseUnits("25", "gwei")
  });
  await tx2.wait();
  console.log("Second user successfully bought 3 tickets!");

//   // Get current jackpot

//   const currentJackpot = await tombola.getCurrentJackpot();
//   console.log("Current jackpot:", ethers.formatEther(currentJackpot), "POL");

  // Get ticket count for each user
  // const addr1TicketCount = await tombola.getTicketCount(wallet1.address);
  // const addr2TicketCount = await tombola.getTicketCount(wallet2.address);
  // console.log("First user ticket count:", addr1TicketCount.toString());
  // console.log("Second user ticket count:", addr2TicketCount.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
