"use client";

import { useState } from "react";
import { parseEther, custom, formatEther } from "viem";
import { StoryClient, StoryConfig } from "@story-protocol/core-sdk";
import { useAccount, useWalletClient, useBalance } from "wagmi";
import WalletProvider from "../../components/wallet-provider";
import NavigationHeader from "@/components/NavigationHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowUpDown } from "lucide-react";
import toast from "react-hot-toast";

function SwapContent() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  
  const [fromToken, setFromToken] = useState<'IP' | 'WIP'>('IP');
  const [toToken, setToToken] = useState<'IP' | 'WIP'>('WIP');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const IP_TOKEN_ADDRESS = "0x";
  const WIP_TOKEN_ADDRESS = "0x1514000000000000000000000000000000000000";

  const { data: ethBalance } = useBalance({ address });
  const { data: wipBalance } = useBalance({ 
    address,
    token: WIP_TOKEN_ADDRESS as `0x${string}`,
  });

  const getTokenBalance = (token: 'IP' | 'WIP') => {
    if (token === 'IP') {
      return ethBalance ? formatEther(ethBalance.value) : '0.00';
    } else {
      return wipBalance ? formatEther(wipBalance.value) : '0.00';
    }
  };

  const fromTokenBalance = getTokenBalance(fromToken);
  const toTokenBalance = getTokenBalance(toToken);

  const handleSwapTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  const handleFromAmountChange = (value: string) => {
    setFromAmount(value);
    setToAmount(value);
  };

  const handleSwap = async () => {
    if (!isConnected || !address || !walletClient || !fromAmount) {
      toast.error("Please connect your wallet and enter an amount");
      return;
    }

    const amount = parseFloat(fromAmount);
    if (amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const availableBalance = parseFloat(fromTokenBalance);
    if (amount > availableBalance) {
      toast.error(`Insufficient ${fromToken} balance. You have ${availableBalance.toFixed(4)} ${fromToken}`);
      return;
    }

    setIsSwapping(true);
    setError(null);
    setTxHash(null);
    
    const loadingToast = toast.loading(`Swapping ${fromAmount} ${fromToken} to ${toToken}...`);

    try {
      const config: StoryConfig = {
        wallet: walletClient,
        transport: custom(walletClient.transport),
        chainId: "aeneid",
      };

      const client = StoryClient.newClient(config);

      let response;
      if (fromToken === 'IP' && toToken === 'WIP') {
        response = await client.wipClient.deposit({
          amount: parseEther(fromAmount),
        });
      } else if (fromToken === 'WIP' && toToken === 'IP') {
        response = await client.wipClient.withdraw({
          amount: parseEther(fromAmount),
        });
      } else {
        throw new Error("Invalid swap direction");
      }

      setTxHash(response.txHash);
      setFromAmount('');
      setToAmount('');
      
      toast.dismiss(loadingToast);
      toast.success(`Successfully swapped ${fromAmount} ${fromToken} to ${toToken}!`);
      
    } catch (err) {
      toast.dismiss(loadingToast);
      const errorMessage = err instanceof Error ? err.message : "Swap failed. Please try again.";
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors">
      <NavigationHeader />
      
      <main className="flex flex-col items-center justify-center px-4 py-20">
        <div className="text-center space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-black dark:text-white mb-8 transition-colors">
              Swap {fromToken} ↔ {toToken}
            </h1>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-8 max-w-md mx-auto transition-all">
            
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-700 dark:text-gray-400 text-sm font-medium transition-colors">From</span>
                <span className="text-gray-500 dark:text-gray-500 text-xs transition-colors">
                  Balance: {parseFloat(fromTokenBalance).toFixed(4)} {fromToken}
                </span>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 p-4 transition-all">
                <div className="flex items-center justify-between">
                  <Input
                    value={fromAmount}
                    onChange={(e) => handleFromAmountChange(e.target.value)}
                    placeholder="0.0"
                    className="bg-transparent border-0 text-2xl text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none flex-1 transition-colors"
                    type="number"
                    step="0.01"
                    max={fromTokenBalance}
                  />
                  <span className="text-black dark:text-white font-medium text-lg ml-4 transition-colors">{fromToken}</span>
                </div>
                <div className="flex justify-end mt-3">
                  <button
                    onClick={() => handleFromAmountChange(fromTokenBalance)}
                    className="text-blue-500 dark:text-blue-400 text-xs hover:text-blue-600 dark:hover:text-blue-300 transition-colors font-medium"
                  >
                    MAX
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-center my-6">
              <Button
                onClick={handleSwapTokens}
                variant="outline"
                size="sm"
                className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 w-12 h-12 p-0 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              >
                <ArrowUpDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </Button>
            </div>

            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-700 dark:text-gray-400 text-sm font-medium transition-colors">To</span>
                <span className="text-gray-500 dark:text-gray-500 text-xs transition-colors">
                  Balance: {parseFloat(toTokenBalance).toFixed(4)} {toToken}
                </span>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 p-4 transition-all">
                <div className="flex items-center justify-between">
                  <Input
                    value={toAmount}
                    placeholder="0.0"
                    className="bg-transparent border-0 text-2xl text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none flex-1 transition-colors"
                    type="number"
                    readOnly
                  />
                  <span className="text-black dark:text-white font-medium text-lg ml-4 transition-colors">{toToken}</span>
                </div>
              </div>
            </div>

            {!isConnected && (
              <div className="text-center mb-4">
                <p className="text-amber-600 dark:text-yellow-400 text-sm transition-colors">Connect your wallet</p>
              </div>
            )}

            <Button
              onClick={handleSwap}
              disabled={isSwapping || !isConnected || !fromAmount}
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium py-4 transition-all disabled:opacity-50"
            >
              {isSwapping ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Swapping...
                </>
              ) : !isConnected ? (
                "Connect Wallet"
              ) : !fromAmount ? (
                "Enter Amount"
              ) : (
                `Swap ${fromAmount} ${fromToken} → ${toAmount} ${toToken}`
              )}
            </Button>

            {txHash && (
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 transition-all">
                <p className="text-green-700 dark:text-green-400 text-sm font-medium transition-colors">Swap successful!</p>
              </div>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 transition-all">
                <p className="text-red-700 dark:text-red-400 text-sm transition-colors">{error}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function Swap() {
  return (
    <WalletProvider>
      <SwapContent />
    </WalletProvider>
  );
} 