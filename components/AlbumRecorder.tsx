"use client";

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Upload, Music, Image, Check, AlertCircle, Loader2 } from 'lucide-react';
import { SongRecorder } from './SongRecorder';
import { StoryClient, StoryConfig } from '@story-protocol/core-sdk';
import { custom, keccak256, toBytes } from 'viem';
import { useAccount, useWalletClient } from 'wagmi';
import toast from 'react-hot-toast';


interface Song {
  id: string;
  name: string;
  audioBlob?: Blob;
  ipfsHash?: string;
  isRecording?: boolean;
  isUploading?: boolean;
  uploaded?: boolean;
}

interface Album {
  name: string;
  coverImage?: File;
  coverImageIpfs?: string;
  songs: Song[];
}

export default function AlbumRecorder() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [album, setAlbum] = useState<Album>({
    name: '',
    songs: []
  });
  const [isUploadingAlbum, setIsUploadingAlbum] = useState(false);
  const [isMintingAlbum, setIsMintingAlbum] = useState(false);
  const [albumIpfsHash, setAlbumIpfsHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const coverImageRef = useRef<HTMLInputElement>(null);

  const handleAlbumNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAlbum(prev => ({ ...prev, name: e.target.value }));
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAlbum(prev => ({ ...prev, coverImage: file }));
    }
  };

  const addSong = () => {
    const newSong: Song = {
      id: Date.now().toString(),
      name: `Track ${album.songs.length + 1}`,
    };
    setAlbum(prev => ({
      ...prev,
      songs: [...prev.songs, newSong]
    }));
  };

  const updateSong = (songId: string, updates: Partial<Song>) => {
    setAlbum(prev => ({
      ...prev,
      songs: prev.songs.map(song => 
        song.id === songId ? { ...song, ...updates } : song
      )
    }));
  };

  const removeSong = (songId: string) => {
    setAlbum(prev => ({
      ...prev,
      songs: prev.songs.filter(song => song.id !== songId)
    }));
  };

  const uploadCoverImage = async (): Promise<string | null> => {
    if (!album.coverImage) return null;
    
    try {
      const formData = new FormData();
      formData.append('file', album.coverImage);
      
      const response = await fetch('/api/upload-to-pinata', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Cover image upload failed');
      
      const data = await response.json();
      return data.IpfsHash;
    } catch (error) {
      return null;
    }
  };

  const uploadSong = async (song: Song): Promise<string | null> => {
    if (!song.audioBlob) return null;
    
    try {
      const formData = new FormData();
      formData.append('file', song.audioBlob, `${song.name.replace(/\s+/g, '-')}.webm`);
      
      const response = await fetch('/api/upload-to-pinata', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Song upload failed');
      
      const data = await response.json();
      return data.IpfsHash;
    } catch (error) {
      throw error;
    }
  };

  const mintAlbumAsNFT = async (albumMetadataHash: string) => {
    if (!isConnected || !address || !walletClient) {
      throw new Error("Please connect your wallet to mint the album");
    }

    setIsMintingAlbum(true);

    try {
      const config: StoryConfig = {
        wallet: walletClient,
        transport: custom(walletClient.transport),
        chainId: "aeneid",
      };

      const client = StoryClient.newClient(config);

      const response = await client.ipAsset.mintAndRegisterIp({
  
        spgNftContract: process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS! as `0x${string}`,
        
        
        allowDuplicates: true,
        

        ipMetadata: {
          ipMetadataURI: "",
          ipMetadataHash: "0x290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563",
          nftMetadataURI: `https://gateway.pinata.cloud/ipfs/${albumMetadataHash}`,
          nftMetadataHash: keccak256(toBytes(`https://gateway.pinata.cloud/ipfs/${albumMetadataHash}`)),
        },        
      });

      return response;
      
    } catch (error) {
      throw error;
    } finally {
      setIsMintingAlbum(false);
    }
  };

  const createAlbumMetadata = async () => {
    if (!album.name.trim()) {
      toast.error('Album name is required');
      return;
    }

    if (album.songs.length === 0) {
      toast.error('At least one song is required');
      return;
    }

    const songsWithAudio = album.songs.filter(song => song.audioBlob);
    if (songsWithAudio.length === 0) {
      toast.error('Please record at least one song');
      return;
    }

    setIsUploadingAlbum(true);
    setError(null);
    
    const loadingToast = toast.loading('Creating your album...');

    try {
      let coverImageIpfs = null;
      if (album.coverImage) {
        coverImageIpfs = await uploadCoverImage();
      }

      const uploadedSongs = [];
      for (let i = 0; i < album.songs.length; i++) {
        const song = album.songs[i];
        if (song.audioBlob) {
          updateSong(song.id, { isUploading: true });
          const songIpfsHash = await uploadSong(song);
          if (songIpfsHash) {
            uploadedSongs.push({
              name: song.name,
              ipfsHash: songIpfsHash
            });
            updateSong(song.id, { ipfsHash: songIpfsHash, uploaded: true, isUploading: false });
          }
        }
      }

      const albumMetadata = {
        name: album.name,
        coverImage: coverImageIpfs,
        songs: uploadedSongs,
        createdAt: new Date().toISOString(),
        totalSongs: uploadedSongs.length
      };

      const metadataBlob = new Blob([JSON.stringify(albumMetadata, null, 2)], {
        type: 'application/json'
      });
      
      const formData = new FormData();
      formData.append('file', metadataBlob, `${album.name.replace(/\s+/g, '-')}-album.json`);
      
      const response = await fetch('/api/upload-to-pinata', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Album metadata upload failed');
      
      const data = await response.json();
      
      setIsUploadingAlbum(false);
      
      await mintAlbumAsNFT(data.IpfsHash);
      setAlbumIpfsHash(data.IpfsHash);
      
      toast.dismiss(loadingToast);
      toast.success('Album created and minted successfully!');
      
    } catch (error) {
      toast.dismiss(loadingToast);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create album. Please try again.';
      toast.error(errorMessage);
      setError(errorMessage);
      setIsMintingAlbum(false);
    } finally {
      setIsUploadingAlbum(false);
    }
  };

  const resetAlbum = () => {
    setAlbum({ name: '', songs: [] });
    setAlbumIpfsHash(null);
    setError(null);
    setIsMintingAlbum(false);
    if (coverImageRef.current) {
      coverImageRef.current.value = '';
    }
  };

  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);

  React.useEffect(() => {
    if (album.coverImage) {
      const url = URL.createObjectURL(album.coverImage);
      setCoverImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setCoverImageUrl(null);
    }
  }, [album.coverImage]);

  return (
    <div className="w-full max-w-7xl mx-auto">
      {!albumIpfsHash ? (
        <div className="space-y-8">
          <div className="bg-gradient-to-b from-gray-200 to-gray-100 dark:from-gray-700 dark:to-gray-900 p-8 transition-colors">
            <div className="flex flex-col lg:flex-row gap-8 items-end">
              <div className="flex-shrink-0">
                <div 
                  className="w-60 h-60 bg-gray-100 dark:bg-gray-800 shadow-2xl border border-gray-300 dark:border-gray-700 overflow-hidden cursor-pointer group relative transition-all"
                  onClick={() => coverImageRef.current?.click()}
                >
                  {coverImageUrl ? (
                    <img 
                      src={coverImageUrl} 
                      alt="Album cover" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                      <Image className="w-16 h-16 mb-2" />
                      <span className="text-sm font-medium">Add Cover</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-black bg-opacity-60 p-3">
                        <Image className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverImageChange}
                  ref={coverImageRef}
                  className="hidden"
                />
              </div>

              <div className="flex-1 space-y-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wide transition-colors">Album</p>
                
                <Input
                  value={album.name}
                  onChange={handleAlbumNameChange}
                  placeholder="Untitled Album"
                  className="text-5xl lg:text-6xl xl:text-7xl font-black text-black dark:text-white bg-transparent border-none p-0 h-auto resize-none placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-0 focus:outline-none transition-colors"
                  style={{ fontFamily: 'inherit' }}
                />
                
                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 transition-colors">
                  <span>{album.songs.filter(song => song.audioBlob).length} songs</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900 px-8 py-6 transition-colors">
            <div className="flex items-center space-x-4">
              <Button
                onClick={addSong}
                size="lg"
                className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-black dark:text-white border-gray-300 dark:border-gray-600 px-8 transition-all"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Song
              </Button>
              
              {album.songs.filter(song => song.audioBlob).length > 0 && (
                <Button
                  onClick={createAlbumMetadata}
                  disabled={isUploadingAlbum || isMintingAlbum || album.songs.filter(song => song.audioBlob).length === 0}
                  size="lg"
                  className="bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black font-semibold px-8 transition-all"
                >
                  {isUploadingAlbum ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Uploading to IPFS...
                    </>
                  ) : isMintingAlbum ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Minting NFT...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 mr-2" />
                      Create Album
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900 transition-colors">
            {album.songs.length === 0 ? (
              <div className="text-center py-16 text-gray-500 dark:text-gray-400 transition-colors">
                <Music className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No songs yet</p>
                <p className="text-sm">Click "Add Song" to start recording your album</p>
              </div>
            ) : (
              <div className="px-8 pb-8">
                <div className="grid grid-cols-12 gap-4 py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-300 dark:border-gray-800 transition-colors">
                  <div className="col-span-1">#</div>
                  <div className="col-span-6">Title</div>
                  <div className="col-span-3">Status</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>
                
                <div className="space-y-2 mt-4">
                  {album.songs.map((song, index) => (
                    <SongRecorder
                      key={song.id}
                      song={song}
                      songNumber={index + 1}
                      onUpdate={(updates) => updateSong(song.id, updates)}
                      onRemove={() => removeSong(song.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 transition-all">
              <div className="flex items-center text-red-700 dark:text-red-400 transition-colors">
                <AlertCircle className="w-5 h-5 mr-2" />
                <span className="font-semibold">Error</span>
              </div>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1 transition-colors">{error}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center space-y-6">
          <div className="space-y-4 p-6 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 transition-all">
            <div className="flex items-center justify-center text-black dark:text-white transition-colors">
              <Check className="w-8 h-8 mr-3" />
              <span className="text-xl font-semibold">Album Created Successfully!</span>
            </div>
            
            <div className="space-y-3 text-left">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 transition-colors">Album Name:</p>
                <p className="text-black dark:text-white font-mono transition-colors">{album.name}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 transition-colors">Total Songs:</p>
                <p className="text-black dark:text-white transition-colors">{album.songs.length}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 transition-colors">View Album:</p>
                <a
                  href={`https://gateway.pinata.cloud/ipfs/${albumIpfsHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 hover:underline text-sm transition-colors"
                >
                  Open Album Metadata
                </a>
              </div>
            </div>
          </div>
          
          <Button
            onClick={resetAlbum}
            className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-black dark:text-white border border-gray-300 dark:border-gray-600 transition-all"
          >
            Create Another Album
          </Button>
        </div>
      )}
    </div>
  );
} 