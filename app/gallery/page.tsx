"use client";

import { useState, useEffect } from "react";
import { useContractRead, useContractReads } from "wagmi";
import { StoryClient, StoryConfig } from "@story-protocol/core-sdk";
import { custom } from "viem";
import { useAccount, useWalletClient } from "wagmi";
import { useRouter } from "next/navigation";
import WalletProvider from "../../components/wallet-provider";
import NavigationHeader from "@/components/NavigationHeader";
import { Loader2, ExternalLink, Music, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";


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
}

function GalleryContent() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [nfts, setNfts] = useState<NFTItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mintingTokens, setMintingTokens] = useState<Set<number>>(new Set());

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

  
  useEffect(() => {
    if (!tokenURIs || tokenURIsLoading) return;

    const fetchMetadata = async () => {
      setLoading(true);
      const nftItems: NFTItem[] = [];


      for (let i = 0; i < tokenURIs.length; i++) {
        const result = tokenURIs[i];
        const tokenId = i + 1; // Token IDs start from 1
        
        if (result.status === 'success' && result.result) {
          const tokenURI = String(result.result);
          nftItems.push({
            tokenId,
            tokenURI,
            loading: true,
          });
        } else {

          nftItems.push({
            tokenId,
            tokenURI: '',
            loading: false,
            metadata: {
              name: `Token #${tokenId} (Error)`,
              description: 'Failed to load token URI'
            }
          });
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
  }, [tokenURIs, tokenURIsLoading, totalSupply]);

  const handleNFTClick = (tokenId: number) => {
    router.push(`/nft/${tokenId}`);
  };

  const handleMintLicenseToken = async (tokenId: number, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent navigation when clicking the button
    
    if (!isConnected || !address || !walletClient) {
      toast.error("Please connect your wallet");
      return;
    }

    setMintingTokens(prev => new Set(prev).add(tokenId));

    try {
      const config: StoryConfig = {
        wallet: walletClient,
        transport: custom(walletClient.transport),
        chainId: "aeneid",
      };

      const client = StoryClient.newClient(config);


      let ipAssetId: string;
      try {

        const ipAssetResponse = await client.ipAsset.register({
          nftContract: CONTRACT_ADDRESS as `0x${string}`,
          tokenId: BigInt(tokenId),
        });
        if (!ipAssetResponse.ipId) {
          throw new Error("Failed to get IP ID from registration response");
        }
        ipAssetId = ipAssetResponse.ipId;
      } catch (error) {
        const paddedTokenId = BigInt(tokenId).toString(16).padStart(24, '0');
        ipAssetId = `0x${CONTRACT_ADDRESS.slice(2).toLowerCase()}${paddedTokenId}`;
      }

      const defaultLicenseTermsId = "1788"
      await client.license.mintLicenseTokens({
        licensorIpId: ipAssetId as `0x${string}`,
        licenseTermsId: BigInt(defaultLicenseTermsId),
        receiver: address as `0x${string}`,
        amount: 1,
        maxMintingFee: BigInt(1e18),
        maxRevenueShare: 100,
      });

      toast.success("License token minted successfully!");
    } catch (error) {
      toast.error("Failed to mint license token. Please try again.");
    } finally {
      setMintingTokens(prev => {
        const newSet = new Set(prev);
        newSet.delete(tokenId);
        return newSet;
      });
    }
  };

  if (totalSupplyError || tokenURIsError) {
    return (
      <div className="min-h-screen bg-white dark:bg-black transition-colors">
        <NavigationHeader />
        <main className="flex flex-col items-center justify-center px-4 py-20">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-black dark:text-white mb-8 transition-colors">
              NFT Gallery
            </h1>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 p-4 max-w-md transition-all">
              <p className="text-red-700 dark:text-red-400 text-sm transition-colors">
                Failed to load NFTs from contract. Please check your connection and try again.
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
              NFT Gallery
            </h1>
            <p className="text-gray-600 dark:text-gray-400 transition-colors">
              {totalSupply ? `${totalSupply} NFTs minted` : 'Loading...'}
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 animate-spin text-gray-400 dark:text-gray-600 mb-4" />
              <p className="text-gray-600 dark:text-gray-400 transition-colors">Loading NFTs...</p>
            </div>
          ) : nfts.length === 0 ? (
            <div className="text-center py-20">
              <Music className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
              <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2 transition-colors">
                No NFTs Found
              </h3>
              <p className="text-gray-500 dark:text-gray-500 transition-colors">
                No albums have been minted yet. Be the first to create one!
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
                        src={`https://gateway.pinata.cloud/ipfs/${nft.metadata.coverImage}`}
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
                    
                    <p className="text-xs text-gray-500 dark:text-gray-500 font-mono mb-3 transition-colors">
                      Token #{nft.tokenId}
                    </p>

                    <Button
                      onClick={(e) => handleMintLicenseToken(nft.tokenId, e)}
                      disabled={mintingTokens.has(nft.tokenId) || !isConnected}
                      size="sm"
                      className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium transition-all disabled:opacity-50"
                    >
                      {mintingTokens.has(nft.tokenId) ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                          Minting...
                        </>
                      ) : (
                        <>
                          <FileText className="w-3 h-3 mr-2" />
                          Mint License Token
                        </>
                      )}
                    </Button>
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

export default function Gallery() {
  return (
    <WalletProvider>
      <GalleryContent />
    </WalletProvider>
  );
} 