import React, { useState, useEffect } from 'react'
import FallingCoin from './components/UI/FallingCoin'
import PolyLotteryABI from './json/PolyLotteryABI.json'
import lastWinnerData from './json/lastWinner.json'
import lotteryInfoData from './json/lotteryInfo.json'
import { useEnsName } from 'wagmi'
import logo from './assets/logo.svg'
import './AnimatedBackground.css';

const INFURA_API_KEY = process.env.REACT_APP_INFURA_API_KEY;

if (!INFURA_API_KEY) {
  console.error("Infura API key is not set in the .env file");
}

import { DynamicWidget, useDynamicContext, useIsLoggedIn } from "@dynamic-labs/sdk-react-core";
import { isEthereumWallet } from '@dynamic-labs/ethereum'
import { WalletClient, formatEther } from 'viem'
import { getContract } from 'viem'

const CONTRACT_ADDRESS = '0xf4e53F35b1e8665928518D1511BB1Ff3Fa30B791'

const SUPPORTED_NETWORKS = {
  BASE_SEPOLIA: 84532, // Chain ID for Base Sepolia
  AMOY_TESTNET: 12345, // Replace with the actual chain ID for Amoy Testnet
}

function App() {
  const [winningNumber, setWinningNumber] = useState<number | null>(null)
  const [ticketCount, setTicketCount] = useState<number>(1)
  const [prevTicketCount, setPrevTicketCount] = useState<number>(1)
  const [lastWinner, setLastWinner] = useState<string>(lastWinnerData.address)
  const [timeLeft, setTimeLeft] = useState<string>('')
  const [fallingCoins, setFallingCoins] = useState<{ id: number; left: number }[]>([])
  const [totalPrize, setTotalPrize] = useState(lotteryInfoData.currentJackpot)
  const [ticketPrice, setTicketPrice] = useState(lotteryInfoData.ticketPrice)
  const [contract, setContract] = useState<Contract | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const isLoggedIn = useIsLoggedIn()
  const {  primaryWallet } = useDynamicContext()
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);

  useEffect(() => {
    const init = async () => {
      if (isLoggedIn) {
        if (primaryWallet && isEthereumWallet(primaryWallet)) {
        const walletClient = await primaryWallet.getWalletClient()

        setUpContract(walletClient)
      }
      }
    }
    init()

    const timer = setInterval(() => {
      const now = new Date()
      const nextMonday = new Date(now)
      nextMonday.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7))
      nextMonday.setHours(7, 0, 0, 0)
      
      const timeDiff = nextMonday.getTime() - now.getTime()
      
      if (timeDiff > 0) {
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000)
        
        setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`)
      } else {
        setTimeLeft('Drawing now!')
      }
    }, 1000)

    const checkNetwork = async () => {
      if (window.ethereum) {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        setCurrentChainId(parseInt(chainId, 16));
      }
    };

    checkNetwork();

    if (window.ethereum) {
      window.ethereum.on('chainChanged', checkNetwork);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('chainChanged', checkNetwork);
      }
    };
  }, [])

  const setUpContract = async (walletClient: WalletClient) => {
    const lotteryContract = getContract({
      address: CONTRACT_ADDRESS,
      abi: PolyLotteryABI,
      client: walletClient,
    })
    
    setContract(lotteryContract)
    setIsConnected(true)
    updateLotteryInfo(lotteryContract)
  }


  const updateLotteryInfo = async (lotteryContract: Contract) => {
    const balance = await lotteryContract.read.getLotteryBalance()
    setTotalPrize(formatEther(balance.toString()))

    const price = await lotteryContract.read.ticketPrice()
    setTicketPrice(formatEther(price.toString()))
  }

  const isSupportedNetwork = () => {
    return (
      currentChainId === SUPPORTED_NETWORKS.BASE_SEPOLIA ||
      currentChainId === SUPPORTED_NETWORKS.AMOY_TESTNET
    );
  };

  const buyTickets = async () => {
    if (!contract) return;
    if (!isSupportedNetwork()) {
      alert('Please connect to a supported network (Base Sepolia or Amoy Testnet) to buy tickets.');
      return;
    }
    try {
      const price = await contract.read.ticketPrice()
      const totalCost = price.mul(ticketCount)
      const tx = await contract.write.buyTickets(ticketCount, { value: totalCost })
      await tx.wait()
      alert('Tickets purchased successfully!')
      updateLotteryInfo(contract)
    } catch (error) {
      console.error('Error buying tickets:', error)
      alert('Error buying tickets. Please try again.')
    }
  }

  const adjustTicketCount = (amount: number) => {
    setPrevTicketCount(ticketCount);
    setTicketCount((prev) => Math.max(1, prev + amount));
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 150); // Reset after 0.1 seconds
    if (amount > 0) {
      const coinCount = Math.floor(Math.random() * 4) + 1;
      const newCoins = Array.from({ length: coinCount }, () => ({
        id: Date.now() + Math.random(),
        left: Math.random() * window.innerWidth,
      }));
      setFallingCoins((prevCoins) => [...prevCoins, ...newCoins]);
    }
  };

  const removeCoin = (id: number) => {
    setFallingCoins((prevCoins) => prevCoins.filter((coin) => coin.id !== id));
  };

  const { data: winnerEnsName } = useEnsName({
    address: lastWinner as `0x${string}`,
  })

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div className="animated-background"></div>
      <div className="relative z-10 min-h-screen text-white flex flex-col items-center justify-start p-4 w-full">
        <img src={logo} alt="Tombola Logo" className="absolute top-8 left-8 w-20 h-20" />
        {fallingCoins.map((coin) => (
          <FallingCoin key={coin.id} left={coin.left} onFinish={() => removeCoin(coin.id)} />
        ))}
        <div className="absolute top-8 right-8">
          <DynamicWidget />
        </div>
        <h1 className="text-6xl font-bold mb-16 text-yellow-400 mt-5">Tombola</h1>
        <div className="rounded-lg max-w-4xl w-full">
          <div className="p-8 flex justify-between items-center">
            <h2 className="text-3xl font-semibold text-white">Next Draw:</h2>
            <p className="text-4xl font-bold text-yellow-400">{timeLeft}</p>
          </div>
          <div className="p-8 flex justify-between items-center">
            <h2 className="text-3xl font-semibold text-white">Current Jackpot:</h2>
            <p className="text-4xl font-bold text-green-400">
              {totalPrize} USDT
            </p>
          </div>
          <div className="mt-12 flex justify-between mb-6 items-end p-10 bg-black bg-opacity-50">
            <div>
              <label htmlFor="ticketCount" className="block text-3xl font-semibold mb-8">Number of Tickets:</label>
              <div className="flex items-center">
                <button
                  className="bg-yellow-400 text-black font-bold px-5 py-3 hover:bg-yellow-500 transition-colors mr-3 text-xl"
                  onClick={() => adjustTicketCount(-1)}
                >
                  -
                </button>
                <button
                  className="bg-yellow-400 text-black font-bold px-5 py-3 hover:bg-yellow-500 transition-colors mr-3 text-xl"
                  onClick={() => adjustTicketCount(1)}
                >
                  +
                </button>
                <span 
                  className={`text-4xl font-bold transition-all duration-100 ${
                    isAnimating
                      ? ticketCount > prevTicketCount
                        ? 'text-blue-500 text-5xl'
                        : ticketCount < prevTicketCount
                        ? 'text-red-500 text-2xl'
                        : ''
                      : 'text-white scale-100'
                  }`}
                >
                  {ticketCount}
                </span>
              </div>
            </div>
            <button
              className="bg-yellow-400 hover:bg-yellow-500 text-black px-8 py-3 rounded-lg font-bold text-xl"
              onClick={buyTickets}
              disabled={!isConnected || !isSupportedNetwork()}
            >
              Buy Tickets ({(ticketCount * parseFloat(ticketPrice)).toFixed(2)} USDT)
            </button>
          </div>
            <div className="text-center p-6 bg-black bg-opacity-50">
              <h2 className="text-3xl font-semibold mb-6">Last Winner</h2>
              <p className="text-green-400 font-mono text-3xl mb-3">
                {winnerEnsName || lastWinner}
              </p>
              <p className="text-yellow-400 font-mono text-3xl">
                Won: {lastWinnerData.prize} USDT
              </p>
            </div>
          </div>
        </div>
      </div>
  )
}

export default App
