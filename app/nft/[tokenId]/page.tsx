"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useContractRead } from "wagmi";
import { StoryClient, StoryConfig } from "@story-protocol/core-sdk";
import { custom, parseEther } from "viem";
import { useAccount, useWalletClient } from "wagmi";
import WalletProvider from "../../../components/wallet-provider";
import NavigationHeader from "@/components/NavigationHeader";
import { Loader2, ArrowLeft, Play, Pause, Music, ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Link from "next/link";
import toast from "react-hot-toast";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS!
const CONTRACT_ABI = [
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
  createdAt?: string;
}

interface AudioState {
  currentTrack: number | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

function NFTViewContent() {
  const params = useParams();
  const tokenId = params.tokenId as string;
  
  // Always call hooks before any early returns
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [audioState, setAudioState] = useState<AudioState>({
    currentTrack: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
  });
  const [showLicenseDialog, setShowLicenseDialog] = useState(false);
  const [mintingFee, setMintingFee] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [, setIpId] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  const { data: tokenURI, isError: tokenURIError, isLoading: tokenURILoading } = useContractRead({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'tokenURI',
    args: tokenId ? [BigInt(tokenId)] : undefined,
    query: {
      enabled: !!tokenId && !isNaN(parseInt(tokenId)),
    },
  });

  const { data: owner } = useContractRead({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'ownerOf',
    args: tokenId ? [BigInt(tokenId)] : undefined,
    query: {
      enabled: !!tokenId && !isNaN(parseInt(tokenId)),
    },
  });

  const isOwner = address && owner && String(owner).toLowerCase() === address.toLowerCase();

  useEffect(() => {
    if (!tokenURI || tokenURILoading) return;

    const fetchMetadata = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(String(tokenURI));
        if (response.ok) {
          const data: NFTMetadata = await response.json();
          setMetadata(data);
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        setError('Failed to load NFT metadata');
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [tokenURI, tokenURILoading]);
  
  // Early return check after all hooks
  if (!tokenId || isNaN(parseInt(tokenId))) {
    return <div>Invalid token ID</div>;
  }


  const playTrack = (trackIndex: number) => {
    if (!metadata?.songs?.[trackIndex] || !audioRef.current) return;

    const song = metadata.songs[trackIndex];
    const audioUrl = `https://yellow-witty-orca-603.mypinata.cloud/ipfs/${song.ipfsHash}`;
    
    if (audioState.currentTrack === trackIndex && audioState.isPlaying) {

      audioRef.current.pause();
      setAudioState(prev => ({ ...prev, isPlaying: false }));
    } else {

      if (audioState.currentTrack !== trackIndex) {
        audioRef.current.src = audioUrl;
        setAudioState(prev => ({ ...prev, currentTrack: trackIndex, currentTime: 0 }));
      }
      
      audioRef.current.play();
      setAudioState(prev => ({ ...prev, isPlaying: true }));
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  const registerLicense = async () => {
    if (!isConnected || !address || !walletClient || !mintingFee) {
      toast.error('Please connect your wallet and enter a minting fee');
      return;
    }

    if (!isOwner) {
      toast.error('You must own this NFT to register a license');
      return;
    }

    setIsRegistering(true);

    try {
      const config: StoryConfig = {
        wallet: walletClient,
        transport: custom(walletClient.transport),
        chainId: "aeneid",
      };

      const client = StoryClient.newClient(config);


      const { licenseTermsId } = await client.license.registerCommercialUsePIL({
        defaultMintingFee: parseEther(mintingFee),
        currency: "0x1514000000000000000000000000000000000000"
});

      if (!licenseTermsId) {
        throw new Error("Failed to register license terms");
      }


      let ipAssetId: string;
      try {

        const ipAssetResponse = await client.ipAsset.register({
          nftContract: CONTRACT_ADDRESS as `0x${string}`,
          tokenId: BigInt(parseInt(tokenId)),
        });
        if (!ipAssetResponse.ipId) {
          throw new Error("Failed to get IP ID from registration response");
        }
        ipAssetId = ipAssetResponse.ipId;
      } catch (error) {
        if (!tokenId || isNaN(parseInt(tokenId))) {
          throw new Error("Valid token ID is required");
        }
        const paddedTokenId = BigInt(parseInt(tokenId)).toString(16).padStart(24, '0');
        ipAssetId = `0x${CONTRACT_ADDRESS.slice(2).toLowerCase()}${paddedTokenId}`;
      }
      
      await client.license.attachLicenseTerms({
        ipId: ipAssetId as `0x${string}`,
        licenseTermsId,
      });

      setIpId(ipAssetId);
      setShowLicenseDialog(false);
      setMintingFee('');
      toast.success('License registered successfully!');

    } catch (error) {
      toast.error(`License registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRegistering(false);
    }
  };

  if (tokenURIError) {
    return (
      <div className="min-h-screen bg-white dark:bg-black transition-colors">
        <NavigationHeader />
        <main className="flex flex-col items-center justify-center px-4 py-20">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-black dark:text-white mb-8 transition-colors">
              NFT Not Found
            </h1>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 p-4 max-w-md transition-all">
              <p className="text-red-700 dark:text-red-400 text-sm transition-colors">
                Token #{tokenId} could not be found or loaded.
              </p>
            </div>
            <Link href="/gallery">
              <Button className="bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Gallery
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (loading || !metadata) {
    return (
      <div className="min-h-screen bg-white dark:bg-black transition-colors">
        <NavigationHeader />
        <main className="flex flex-col items-center justify-center px-4 py-20">
          <Loader2 className="w-12 h-12 animate-spin text-gray-400 dark:text-gray-600 mb-4" />
          <p className="text-gray-600 dark:text-gray-400 transition-colors">Loading NFT...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors">
      <NavigationHeader />
      
      <main className="px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <Link href="/gallery">
              <Button 
                variant="outline" 
                className="bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600 text-black dark:text-white transition-all"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Gallery
              </Button>
            </Link>
          </div>


          <div className="bg-gradient-to-b from-gray-200 to-gray-100 dark:from-gray-700 dark:to-gray-900 p-8 mb-8 transition-colors">
            <div className="flex flex-col lg:flex-row gap-8 items-end">
              <div className="flex-shrink-0">
                <div className="w-60 h-60 bg-gray-100 dark:bg-gray-800 shadow-2xl border border-gray-300 dark:border-gray-700 overflow-hidden transition-all">
                  {metadata.coverImage ? (
                    <img 
                      src={`https://yellow-witty-orca-603.mypinata.cloud/ipfs/${metadata.coverImage}`} 
                      alt={metadata.name || `NFT #${tokenId}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                      <Music className="w-16 h-16" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wide transition-colors">
                  NFT Album • Token #{tokenId}
                </p>
                
                <h1 className="text-5xl lg:text-6xl xl:text-7xl font-black text-black dark:text-white transition-colors">
                  {metadata.name || `Album #${tokenId}`}
                </h1>
                
                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 transition-colors">
                  <span>{metadata.totalSongs || metadata.songs?.length || 0} songs</span>
                  {metadata.createdAt && (
                    <>
                      <span>•</span>
                      <span>{formatDate(metadata.createdAt)}</span>
                    </>
                  )}
                </div>

                <div className="flex items-center space-x-4 pt-4">
                  <Button
                    onClick={() => metadata.songs?.[0] && playTrack(0)}
                    disabled={!metadata.songs || metadata.songs.length === 0}
                    size="lg"
                    className="bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black font-semibold px-8 h-14 transition-all"
                  >
                    {audioState.isPlaying && audioState.currentTrack === 0 ? (
                      <Pause className="w-6 h-6 mr-2" />
                    ) : (
                      <Play className="w-6 h-6 mr-2" />
                    )}
                    {audioState.isPlaying && audioState.currentTrack === 0 ? 'Pause' : 'Play'}
                  </Button>

                  {isOwner && (
                    <Button
                      onClick={() => setShowLicenseDialog(true)}
                      variant="outline"
                      size="lg"
                      className="bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600 text-black dark:text-white transition-all"
                    >
                      <FileText className="w-5 h-5 mr-2" />
                      Register License
                    </Button>
                  )}

                  <Button
                    onClick={() => window.open(String(tokenURI), '_blank')}
                    variant="outline"
                    size="lg"
                    className="bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600 text-black dark:text-white transition-all"
                  >
                    <ExternalLink className="w-5 h-5 mr-2" />
                    View Metadata
                  </Button>
                </div>
              </div>
            </div>
          </div>


          <div className="bg-gray-50 dark:bg-gray-900 transition-colors">
            {!metadata.songs || metadata.songs.length === 0 ? (
              <div className="text-center py-16 text-gray-500 dark:text-gray-400 transition-colors">
                <Music className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No tracks available</p>
                <p className="text-sm">This NFT doesn't contain any audio tracks</p>
              </div>
            ) : (
              <div className="px-8 pb-8">
                <div className="grid grid-cols-12 gap-4 py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-300 dark:border-gray-800 transition-colors">
                  <div className="col-span-1">#</div>
                  <div className="col-span-6">Title</div>
                  <div className="col-span-3">Duration</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>
                
                <div className="space-y-2 mt-4">
                  {metadata.songs.map((song, index) => (
                    <div
                      key={index}
                      className={`grid grid-cols-12 gap-4 py-3 px-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all group cursor-pointer ${
                        audioState.currentTrack === index ? 'bg-gray-100 dark:bg-gray-800' : ''
                      }`}
                      onClick={() => playTrack(index)}
                    >
                      <div className="col-span-1 flex items-center">
                        {audioState.currentTrack === index && audioState.isPlaying ? (
                          <Pause className="w-4 h-4 text-black dark:text-white" />
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400 group-hover:hidden transition-colors">
                            {index + 1}
                          </span>
                        )}
                        {audioState.currentTrack !== index && (
                          <Play className="w-4 h-4 text-black dark:text-white hidden group-hover:block" />
                        )}
                      </div>
                      
                      <div className="col-span-6 flex items-center">
                        <div>
                          <p className="text-black dark:text-white font-medium transition-colors">
                            {song.name}
                          </p>
                          {audioState.currentTrack === index && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors">
                              {audioState.isPlaying ? 'Playing' : 'Paused'}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="col-span-3 flex items-center text-gray-500 dark:text-gray-400 transition-colors">
                        {audioState.currentTrack === index ? (
                          <span>
                            {formatTime(audioState.currentTime)} / {formatTime(audioState.duration)}
                          </span>
                        ) : (
                          <span>--:--</span>
                        )}
                      </div>
                      
                      <div className="col-span-2 flex items-center justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="opacity-0 group-hover:opacity-100 transition-opacity bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600 text-black dark:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`https://yellow-witty-orca-603.mypinata.cloud/ipfs/${song.ipfsHash}`, '_blank');
                          }}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      
      <audio
        ref={audioRef}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setAudioState(prev => ({
              ...prev,
              currentTime: audioRef.current!.currentTime,
              duration: audioRef.current!.duration || 0,
            }));
          }
        }}
        onEnded={() => {
          setAudioState(prev => ({ ...prev, isPlaying: false }));
        }}
      />

      
      <Dialog open={showLicenseDialog} onOpenChange={setShowLicenseDialog}>
        <DialogContent className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 transition-all">
          <DialogHeader>
            <DialogTitle className="text-black dark:text-white transition-colors">
              Register Commercial License
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400 transition-colors">
              Set the minting fee for users who want to license this album for commercial use.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-black dark:text-white transition-colors">
                Minting Fee (IP)
              </label>
              <Input
                type="number"
                step="0.001"
                placeholder="0.01"
                value={mintingFee}
                onChange={(e) => setMintingFee(e.target.value)}
                className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-black dark:text-white transition-all"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors">
                This is the fee users will pay to mint a license token for commercial use of your album.
              </p>
            </div>
          </div>

          <DialogFooter className="space-x-2">
            <Button
              onClick={() => setShowLicenseDialog(false)}
              variant="outline"
              disabled={isRegistering}
              className="bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600 text-black dark:text-white transition-all"
            >
              Cancel
            </Button>
            <Button
              onClick={registerLicense}
              disabled={isRegistering || !mintingFee || parseFloat(mintingFee) <= 0}
              className="bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black transition-all"
            >
              {isRegistering ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Registering...
                </>
              ) : (
                'Register License'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function NFTView() {
  return (
    <WalletProvider>
      <NFTViewContent />
    </WalletProvider>
  );
} 