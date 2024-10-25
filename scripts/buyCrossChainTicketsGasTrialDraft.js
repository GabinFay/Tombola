const hre = require("hardhat");
const { ethers } = require("hardhat");
const dotenv = require('dotenv');

dotenv.config();

const { Options } = require('@layerzerolabs/lz-v2-utilities');


async function main() {
  // Define private keys for two users
  const privateKey1 = process.env.PRIVATE_KEY_TEST_1;
  const privateKey2 = process.env.PRIVATE_KEY_TEST_2;

  // Create wallet instances
  const wallet1 = new ethers.Wallet(privateKey1, hre.ethers.provider);
//   const wallet2 = new ethers.Wallet(privateKey2, hre.ethers.provider);
  
  const Tombola = await hre.ethers.getContractFactory("Tombola", wallet1);
//   const tombola = Tombola.attach("0x78FE644f0aCEbbe3F2e3294ED0a6a6F0f21bbEb0"); // Contract address on Amoy
  const tombola = Tombola.attach(process.env.BASE_CONTRACT_ADDRESS);

  // Define ticket price in wei (0.001 POL)
  ;
//   console.log("Current ticket price:", ethers.formatEther(ticketPrice), "POL");

  // Define destination EID
  const dstEid = 40267; //amoy EID
  const amountToBuy = ethers.utils.parseEther("0.001")
  // First user buys 2 tickets cross-chain
  console.log("Quoting cross-chain ticket purchase...");
  const options = Options.newOptions().addExecutorLzReceiveOption(1000000, amountToBuy).toHex().toString()
  // const numberOfTickets = 2;


  // function quoteBuyTicketsCrossChain(
  //   uint32 _dstEid,
  //   bytes memory _options) external payable returns (MessagingFee memory fee) {
  //   bytes memory payload = abi.encode(MSG_BUY_TICKETS);
  //   fee = _quote(_dstEid, payload, _options, false);
  //   }

  // Quote the cross-chain fee
  const fee = await Tombola.quoteBuyTicketsCrossChain(dstEid, options);
  console.log("Fee object:", fee);
  // process.exit(0);
  // Add this new section to process and display BigNumber values
  // console.log("\nProcessed fee details:");
  // if (fee.maxPriorityFeePerGas) {
  //   console.log(`Max Priority Fee Per Gas: ${ethers.utils.formatEther(fee.maxPriorityFeePerGas)} ETH`);
  // }
  // if (fee.maxFeePerGas) {
  //   console.log(`Max Fee Per Gas: ${ethers.utils.formatEther(fee.maxFeePerGas)} ETH`);
  // }
  // if (fee.gasLimit) {
  //   console.log(`Gas Limit: ${fee.gasLimit.toString()} units`);
  // }
  // if (fee.value) {
  //   console.log(`Value: ${ethers.utils.formatEther(fee.value)} ETH`);
  // }

  // process.exit(0);

  // Calculate total cost including tickets, native fee, and additional 0.1 ETH
  // const additionalFee = ethers.utils.parseEther("0.13");
  // const totalCost = amountToBuy.add(additionalFee).add(additionalFee);

  // Hardcoded gas values
  // const gasLimit = 250000; // 1 million gas units
  // const maxPriorityFeePerGas = ethers.utils.parseUnits("2", "gwei");
  // const maxFeePerGas = ethers.utils.parseUnits("5", "gwei");
  const maxGas = ethers.utils.parseEther("0.01"); // Set aside 0.01 ETH for gas

  // const totalCost = amountToBuy.add(maxGas)


  // const totalCost = ticketPrice.mul(numberOfTickets).add(fee.nativeFee).add(additionalFee);

  // console.log(`Total cost: ${ethers.utils.formatEther(totalCost)} ETH`);
  // console.log(`Buying ${numberOfTickets} tickets cross-chain...`);
  // Implement a retry mechanism with increasing gas prices
  let tx;
  let retries = 3;
  let multiplier = 1.21;  // Increase gas by 10% each retry

  while (retries > 0) {
    try {
      tx = await Tombola.connect(wallet1).buyTicketsCrossChain(
        dstEid,
        options,
        { 
          value: maxGas
        }
      );
      // tx = await Tombola.connect(wallet1).buyTicketsCrossChain(
      //   dstEid,
      //   options,
      //   { 
      //     value: totalCost,
      //     maxFeePerGas: maxFeePerGas,
      //     maxPriorityFeePerGas: maxPriorityFeePerGas,
      //     gasLimit: gasLimit
      //   }
      // );     
      console.log("Transaction sent. Waiting for confirmation...");
      const receipt = await tx.wait();
      console.log(`Transaction confirmed. Gas used: ${receipt.gasUsed.toString()}`);
      console.log(`Transaction hash: ${receipt.transactionHash}`);
      break;
    } catch (error) {
      if (error.code === 'TRANSACTION_REPLACED') {
        if (error.replacement && error.replacement.hash) {
          console.log(`Transaction was replaced by tx with hash: ${error.replacement.hash}`);
          console.log(`Replacement transaction was ${error.receipt.status === 1 ? 'successful' : 'failed'}`);
          if (error.receipt.status === 1) {
            console.log(`Transaction confirmed. Gas used: ${error.receipt.gasUsed.toString()}`);
            break;
          }
        }
      } else {
        console.log(`Transaction failed. Retrying with higher gas price. Retries left: ${retries}`);
        retries--;
        multiplier *= 1.1;
        if (retries === 0) throw error;
      }
    }
  }

  // After successful transaction, create a new provider for Amoy testnet
  console.log("Setting up listener for Amoy testnet...");
  const amoyProvider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL_AMOY);
  const amoyUnifiedTombola = Tombola.attach(process.env.AMOY_CONTRACT_ADDRESS).connect(amoyProvider);

  console.log("Listening for events on Amoy testnet...");

  // Set up event filters
  const filters = [
    amoyUnifiedTombola.filters.LzReceiveStarted(),
    amoyUnifiedTombola.filters.MessageTypeDecoded(),
    amoyUnifiedTombola.filters.BuyTicketsMessageReceived(),
    amoyUnifiedTombola.filters.ParticipantAddressDecoded(),
    amoyUnifiedTombola.filters.AmountReceived(),
    amoyUnifiedTombola.filters.ParticipantAdded(),
    amoyUnifiedTombola.filters.LzReceiveCompleted()
  ];

  // Listen for events
  const eventPromises = filters.map(filter => 
    new Promise((resolve) => {
      amoyUnifiedTombola.once(filter, (...args) => {
        console.log(`Event ${filter.eventName} received:`, args);
        resolve();
      });
    })
  );

  // Wait for all events or timeout after 5 minutes
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error("Timeout waiting for events")), 300000)
  );

  try {
    await Promise.race([Promise.all(eventPromises), timeoutPromise]);
    console.log("All expected events received");
  } catch (error) {
    console.error("Error or timeout while waiting for events:", error.message);
  }

  console.log("Script completed");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
