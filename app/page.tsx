"use client";

import WalletProvider from "../components/wallet-provider";
import NavigationHeader from "@/components/NavigationHeader";
import AlbumRecorder from "@/components/AlbumRecorder";

export default function Home() {
  return (
    <WalletProvider>
      <div className="min-h-screen bg-white dark:bg-black transition-colors">
        <NavigationHeader />
        <main className="flex flex-col items-center justify-start px-4 py-8">
          <div className="w-full max-w-7xl mx-auto">
            <div className="text-center space-y-8 mb-8">
              <div>
                <h1 className="text-4xl font-bold text-black dark:text-white mb-4 transition-colors">
                  Story Protocol Demo
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-400 transition-colors">
                  Record audio and create albums on IPFS
                </p>
              </div>
            </div>
            <AlbumRecorder />
          </div>
        </main>
      </div>
    </WalletProvider>
  );
}
