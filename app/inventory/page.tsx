"use client";

import { useState, useEffect } from "react";
import { useContractRead, useContractReads } from "wagmi";
import { useAccount } from "wagmi";
import WalletProvider from "../../components/wallet-provider";
import NavigationHeader from "@/components/NavigationHeader";
import { Loader2, ExternalLink, Music, Wallet } from "lucide-react";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS!
const CONTRACT_ABI = [
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "name": "tokenURI",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "name": "ownerOf",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

interface NFTMetadata {
  name?: string;
  description?: string;
  image?: string;
  coverImage?: string;
  songs?: Array<{
    name: string;
    ipfsHash: string;
  }>;
  totalSongs?: number;
}

interface NFTItem {
  tokenId: number;
  tokenURI: string;
  metadata?: NFTMetadata;
  loading: boolean;
  owner: string;
}

function InventoryContent() {
  const { address, isConnected } = useAccount();
  const [nfts, setNfts] = useState<NFTItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { data: totalSupply, isError: totalSupplyError } = useContractRead({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'totalSupply',
  });

  
  const tokenIds = totalSupply ? Array.from({ length: Number(totalSupply) }, (_, i) => i + 1) : [];

  const { data: tokenURIs, isError: tokenURIsError, isLoading: tokenURIsLoading } = useContractReads({
    contracts: tokenIds.map((tokenId) => ({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI,
      functionName: 'tokenURI',
      args: [BigInt(tokenId)],
    })),
    query: {
      enabled: !!totalSupply && Number(totalSupply) > 0,
    },
  });

  const { data: owners, isError: ownersError, isLoading: ownersLoading } = useContractReads({
    contracts: tokenIds.map((tokenId) => ({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI,
      functionName: 'ownerOf',
      args: [BigInt(tokenId)],
    })),
    query: {
      enabled: !!totalSupply && Number(totalSupply) > 0,
    },
  });

  
  useEffect(() => {
    if (!tokenURIs || tokenURIsLoading || !owners || ownersLoading || !address) return;

    const fetchMetadata = async () => {
      setLoading(true);
      const nftItems: NFTItem[] = [];


      for (let i = 0; i < tokenURIs.length; i++) {
        const tokenURIResult = tokenURIs[i];
        const ownerResult = owners[i];
        const tokenId = i + 1; // Token IDs start from 1
        
        if (ownerResult.status === 'success' && ownerResult.result) {
          const owner = String(ownerResult.result).toLowerCase();
          const walletAddress = address.toLowerCase();
          

          if (owner === walletAddress) {
            if (tokenURIResult.status === 'success' && tokenURIResult.result) {
              const tokenURI = String(tokenURIResult.result);
              nftItems.push({
                tokenId,
                tokenURI,
                loading: true,
                owner,
              });
            } else {

              nftItems.push({
                tokenId,
                tokenURI: '',
                loading: false,
                owner,
                metadata: {
                  name: `Token #${tokenId} (Error)`,
                  description: 'Failed to load token URI'
                }
              });
            }
          }
        } else {
        }
      }

      setNfts(nftItems);


      for (let i = 0; i < nftItems.length; i++) {
        const nftItem = nftItems[i];
        if (!nftItem.tokenURI) continue;
        
        try {
          const response = await fetch(nftItem.tokenURI);
          if (response.ok) {
            const metadata: NFTMetadata = await response.json();
            setNfts(prev => prev.map((nft, index) => 
              index === i ? { ...nft, metadata, loading: false } : nft
            ));
          } else {
            setNfts(prev => prev.map((nft, index) => 
              index === i ? { ...nft, loading: false } : nft
            ));
          }
        } catch (error) {
          setNfts(prev => prev.map((nft, index) => 
            index === i ? { ...nft, loading: false } : nft
          ));
        }
      }

      setLoading(false);
    };

    fetchMetadata();
  }, [tokenURIs, tokenURIsLoading, owners, ownersLoading, totalSupply, address]);

  const handleNFTClick = (tokenId: number) => {
    window.location.href = `/nft/${tokenId}`;
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-white dark:bg-black transition-colors">
        <NavigationHeader />
        <main className="flex flex-col items-center justify-center px-4 py-20">
          <div className="text-center space-y-6">
            <Wallet className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600" />
            <h1 className="text-4xl font-bold text-black dark:text-white mb-4 transition-colors">
              Connect Your Wallet
            </h1>
            <p className="text-gray-600 dark:text-gray-400 transition-colors max-w-md">
              Please connect your wallet to view your NFT inventory. Only albums you own will be displayed here.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (totalSupplyError || tokenURIsError || ownersError) {
    return (
      <div className="min-h-screen bg-white dark:bg-black transition-colors">
        <NavigationHeader />
        <main className="flex flex-col items-center justify-center px-4 py-20">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-black dark:text-white mb-8 transition-colors">
              My Inventory
            </h1>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 p-4 max-w-md transition-all">
              <p className="text-red-700 dark:text-red-400 text-sm transition-colors">
                Failed to load your NFT inventory. Please check your connection and try again.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors">
      <NavigationHeader />
      
      <main className="px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-black dark:text-white mb-4 transition-colors">
              My Inventory
            </h1>
            <p className="text-gray-600 dark:text-gray-400 transition-colors">
              {loading ? 'Loading your NFTs...' : 
               nfts.length === 0 ? 'You don\'t own any albums yet' :
               `You own ${nfts.length} album${nfts.length === 1 ? '' : 's'}`}
            </p>
            {address && (
              <p className="text-xs text-gray-500 dark:text-gray-500 font-mono mt-2 transition-colors">
                {address}
              </p>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 animate-spin text-gray-400 dark:text-gray-600 mb-4" />
              <p className="text-gray-600 dark:text-gray-400 transition-colors">Loading your inventory...</p>
            </div>
          ) : nfts.length === 0 ? (
            <div className="text-center py-20">
              <Music className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
              <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2 transition-colors">
                No Albums Found
              </h3>
              <p className="text-gray-500 dark:text-gray-500 transition-colors mb-4">
                You don't own any album NFTs yet.
              </p>
              <p className="text-gray-500 dark:text-gray-500 transition-colors">
                Create your first album on the{' '}
                <a href="/" className="text-blue-500 dark:text-blue-400 hover:underline">
                  Record page
                </a>{' '}
                or check out the{' '}
                <a href="/gallery" className="text-blue-500 dark:text-blue-400 hover:underline">
                  Gallery
                </a>
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {nfts.map((nft) => (
                <div
                  key={nft.tokenId}
                  onClick={() => handleNFTClick(nft.tokenId)}
                  className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer group hover:shadow-lg transition-all duration-200"
                >
                  <div className="aspect-square bg-gray-100 dark:bg-gray-800 relative overflow-hidden">
                    {nft.loading ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                      </div>
                    ) : nft.metadata?.coverImage ? (
                      <img
                        src={`https://yellow-witty-orca-603.mypinata.cloud/ipfs/${nft.metadata.coverImage}`}
                        alt={nft.metadata.name || `NFT #${nft.tokenId}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Music className="w-12 h-12 text-gray-400 dark:text-gray-600" />
                      </div>
                    )}
                    
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-black bg-opacity-60 p-2">
                        <ExternalLink className="w-4 h-4 text-white" />
                      </div>
                    </div>

                    <div className="absolute top-2 left-2">
                      <div className="bg-green-500 text-white text-xs px-2 py-1 font-medium">
                        OWNED
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-black dark:text-white mb-2 transition-colors">
                      {nft.metadata?.name || `Album #${nft.tokenId}`}
                    </h3>
                    
                    {nft.metadata?.totalSongs && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 transition-colors">
                        {nft.metadata.totalSongs} tracks
                      </p>
                    )}
                    
                    <p className="text-xs text-gray-500 dark:text-gray-500 font-mono transition-colors">
                      Token #{nft.tokenId}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function Inventory() {
  return (
    <WalletProvider>
      <InventoryContent />
    </WalletProvider>
  );
} 